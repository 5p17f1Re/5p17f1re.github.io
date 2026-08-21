import {
  answerCallbackQuery,
  deleteMessage,
  downloadTelegramFile,
  editMessageText,
  sendMessage,
} from "./telegram";
import exifr from "exifr";
import { parseQueueCancelCommand, parseUnpublishCommand } from "./commands";
import type {
  Env,
  DraftMessage,
  PhotoDraft,
  SessionStep,
  TelegramMessage,
  TelegramInlineKeyboardMarkup,
  TelegramSession,
  TelegramUpdate,
} from "./types";

const JSON_HEADERS = { "content-type": "application/json; charset=utf-8" };
const MAX_TEXT_LENGTH = 1000;
const CLEANUP_GRACE_DAYS = 7;
const IMAGE_EXTENSIONS = new Set([
  "jpg",
  "jpeg",
  "jpe",
  "jfif",
  "png",
  "webp",
  "avif",
  "gif",
  "tif",
  "tiff",
  "heic",
  "heif",
]);
const RAW_EXTENSIONS = new Set([
  "arw",
  "cr2",
  "cr3",
  "dng",
  "erf",
  "iiq",
  "kdc",
  "mef",
  "mos",
  "mrw",
  "nef",
  "nrw",
  "orf",
  "pef",
  "raf",
  "raw",
  "rw2",
  "rwl",
  "sr2",
  "srf",
  "srw",
  "x3f",
]);
const RUSSIAN_MONTHS = [
  "Январь",
  "Февраль",
  "Март",
  "Апрель",
  "Май",
  "Июнь",
  "Июль",
  "Август",
  "Сентябрь",
  "Октябрь",
  "Ноябрь",
  "Декабрь",
];
const RUSSIAN_WEEKDAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

function jsonResponse(body: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: { ...JSON_HEADERS, ...(init?.headers ?? {}) },
  });
}

function nowIso() {
  return new Date().toISOString();
}

function isOwnerChat(env: Env, chatId: string | number) {
  return String(chatId) === env.OWNER_CHAT_ID.trim();
}

function trimUserText(value: string | undefined) {
  return value?.trim().slice(0, MAX_TEXT_LENGTH) ?? "";
}

function extensionFromFileName(fileName: string | undefined) {
  return fileName?.split(".").pop()?.toLowerCase() ?? "";
}

function isSupportedPhotoFile(fileName: string | undefined, mimeType: string | undefined) {
  const extension = extensionFromFileName(fileName);
  return Boolean(
    (mimeType?.startsWith("image/") && mimeType !== "image/svg+xml") ||
      IMAGE_EXTENSIONS.has(extension) ||
      RAW_EXTENSIONS.has(extension),
  );
}

function isSkip(value: string) {
  return value.toLowerCase() === "/skip" || value.toLowerCase() === "skip";
}

function isValidDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const candidate = new Date(Date.UTC(year, month - 1, day));
  return (
    candidate.getUTCFullYear() === year &&
    candidate.getUTCMonth() === month - 1 &&
    candidate.getUTCDate() === day
  );
}

function normalizeDateInput(value: string) {
  if (isValidDate(value)) return value;

  const russianDate = value.match(/^(\d{2})\.(\d{2})\.(\d{2}|\d{4})$/);
  if (!russianDate) return undefined;

  const [, day, month, shortOrFullYear] = russianDate;
  const year = shortOrFullYear.length === 2 ? `20${shortOrFullYear}` : shortOrFullYear;
  const normalized = `${year}-${month}-${day}`;
  return isValidDate(normalized) ? normalized : undefined;
}

function formatRussianDate(value: string) {
  const [year, month, day] = value.split("-");
  return `${day}.${month}.${year}`;
}

function dateOnly(value: unknown) {
  if (!value) return undefined;
  const parsed = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(parsed.getTime())) return undefined;
  return parsed.toISOString().slice(0, 10);
}

function cleanMetadataText(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function uniqueMetadataParts(values: Array<unknown>) {
  return [...new Set(values.map(cleanMetadataText).filter(Boolean) as string[])].join(", ") || undefined;
}

function formatExifLocation(exif: Record<string, unknown> | undefined) {
  return uniqueMetadataParts([
    exif?.Location,
    exif?.LocationName,
    exif?.City,
    exif?.SubLocation,
    exif?.Country,
  ]);
}

type ExifPreview = {
  status?: "read" | "empty" | "error";
  date?: string;
  location?: string;
  latitude?: number;
  longitude?: number;
  gpsAvailable?: boolean;
};

async function readExifPreview(bytes: ArrayBuffer): Promise<ExifPreview> {
  try {
    const exif = (await exifr.parse(new Uint8Array(bytes), {
      pick: [
        "DateTimeOriginal",
        "CreateDate",
        "DateTimeDigitized",
        "Location",
        "LocationName",
        "City",
        "SubLocation",
        "Country",
        "latitude",
        "longitude",
      ],
    })) as Record<string, unknown> | undefined;
    if (!exif) return { status: "empty" };

    const latitude = typeof exif.latitude === "number" && Number.isFinite(exif.latitude)
      ? exif.latitude
      : undefined;
    const longitude = typeof exif.longitude === "number" && Number.isFinite(exif.longitude)
      ? exif.longitude
      : undefined;

    return {
      status: "read",
      date: dateOnly(exif.DateTimeOriginal) ?? dateOnly(exif.CreateDate) ?? dateOnly(exif.DateTimeDigitized),
      location: formatExifLocation(exif),
      ...(latitude !== undefined && longitude !== undefined ? { latitude, longitude } : {}),
      gpsAvailable: latitude !== undefined && longitude !== undefined,
    };
  } catch (error) {
    console.warn("Could not read EXIF preview", error);
    return { status: "error" };
  }
}

function getExifPreview(draft: PhotoDraft): ExifPreview {
  if (!draft.metadata_json) return {};
  try {
    const metadata = JSON.parse(draft.metadata_json) as { exif?: ExifPreview };
    return metadata.exif ?? {};
  } catch {
    return {};
  }
}

function currentMonth() {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

function shiftMonth(value: string, offset: number) {
  const [year, month] = value.split("-").map(Number);
  const shifted = new Date(Date.UTC(year, month - 1 + offset, 1));
  return `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, "0")}`;
}

function datePickerKeyboard(draftId: string, monthValue = currentMonth()): TelegramInlineKeyboardMarkup {
  const [year, month] = monthValue.split("-").map(Number);
  const firstDay = new Date(Date.UTC(year, month - 1, 1));
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const mondayBasedOffset = (firstDay.getUTCDay() + 6) % 7;
  const rows: Array<Array<{ text: string; callback_data: string }>> = [
    [
      { text: "‹", callback_data: `photo:month:${draftId}:${shiftMonth(monthValue, -1)}` },
      { text: `${RUSSIAN_MONTHS[month - 1]} ${year}`, callback_data: "photo:noop" },
      { text: "›", callback_data: `photo:month:${draftId}:${shiftMonth(monthValue, 1)}` },
    ],
    RUSSIAN_WEEKDAYS.map((text) => ({ text, callback_data: "photo:noop" })),
  ];

  let week: Array<{ text: string; callback_data: string }> = [];
  for (let index = 0; index < mondayBasedOffset; index += 1) {
    week.push({ text: "·", callback_data: "photo:noop" });
  }
  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    week.push({ text: String(day), callback_data: `photo:date:${draftId}:${date}` });
    if (week.length === 7) {
      rows.push(week);
      week = [];
    }
  }
  while (week.length > 0 && week.length < 7) {
    week.push({ text: "·", callback_data: "photo:noop" });
  }
  if (week.length) rows.push(week);

  rows.push([
    { text: "Пропустить — взять из EXIF", callback_data: `photo:date-skip:${draftId}` },
  ]);
  return { inline_keyboard: rows };
}

function datePrompt(
  draftId: string,
  selectedDate?: string | null,
  error?: string,
): { text: string; replyMarkup: TelegramInlineKeyboardMarkup } {
  return {
    text: [
      "Изменить дату съёмки",
      selectedDate ? `Сейчас выбрано: ${formatRussianDate(selectedDate)}` : "Выбери дату в календаре.",
      "Если пропустить, возьму дату из EXIF. Если EXIF нет — дату загрузки.",
      error ? `\n${error}` : "",
      "\nМожно также написать дату вручную: ДД.ММ.ГГГГ.",
    ].join("\n"),
    replyMarkup: datePickerKeyboard(
      draftId,
      selectedDate?.slice(0, 7) ?? currentMonth(),
    ),
  };
}

function extensionForMimeType(mimeType: string, fileName?: string) {
  const knownExtensions: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/avif": "avif",
    "image/tiff": "tiff",
    "image/heic": "heic",
    "image/heif": "heif",
  };
  const knownExtension = knownExtensions[mimeType];
  if (knownExtension) return knownExtension;

  const fileExtension = fileName?.split(".").pop()?.toLowerCase();
  if (fileExtension && /^[a-z0-9]{2,5}$/.test(fileExtension)) {
    return fileExtension;
  }

  return "bin";
}

function getImageInput(message: TelegramMessage) {
  const largestPhoto = message.photo?.at(-1);
  if (largestPhoto) {
    return {
      fileId: largestPhoto.file_id,
      mimeType: "image/jpeg",
      originalName: `telegram-${message.message_id}.jpg`,
      fileSize: largestPhoto.file_size,
    };
  }

  const document = message.document;
  if (!document?.file_id || !isSupportedPhotoFile(document.file_name, document.mime_type)) {
    return undefined;
  }

  return {
    fileId: document.file_id,
    mimeType: document.mime_type ?? "application/octet-stream",
    originalName: document.file_name ?? `telegram-${message.message_id}`,
    fileSize: document.file_size,
  };
}

async function getSession(env: Env, chatId: string) {
  return env.DB.prepare(
    "SELECT chat_id, draft_id, step, message_id, updated_at FROM telegram_sessions WHERE chat_id = ?",
  )
  .bind(chatId)
    .first<TelegramSession>();
}

async function getDraft(env: Env, draftId: string) {
  return env.DB.prepare("SELECT * FROM photo_drafts WHERE id = ?")
    .bind(draftId)
    .first<PhotoDraft>();
}

async function recordDraftMessage(
  env: Env,
  draftId: string,
  chatId: string,
  messageId: number,
) {
  await env.DB.prepare(
    "INSERT OR IGNORE INTO photo_draft_messages (draft_id, chat_id, message_id) VALUES (?, ?, ?)",
  )
    .bind(draftId, chatId, messageId)
    .run();
}

async function deleteDraftMessagesExcept(
  env: Env,
  draftId: string,
  keepMessageId: number,
) {
  const messages = await env.DB.prepare(
    "SELECT draft_id, chat_id, message_id FROM photo_draft_messages WHERE draft_id = ?",
  )
    .bind(draftId)
    .all<DraftMessage>();

  await Promise.allSettled(
    messages.results
      .filter((message) => message.message_id !== keepMessageId)
      .map((message) => deleteMessage(env, message.chat_id, message.message_id)),
  );

  await env.DB.prepare("DELETE FROM photo_draft_messages WHERE draft_id = ?")
    .bind(draftId)
    .run();
}

async function setSession(
  env: Env,
  chatId: string,
  draftId: string,
  step: SessionStep,
  messageId: number | null = null,
) {
  await env.DB.prepare(
    `INSERT INTO telegram_sessions (chat_id, draft_id, step, message_id, updated_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(chat_id) DO UPDATE SET draft_id = excluded.draft_id,
       step = excluded.step, message_id = excluded.message_id,
       updated_at = excluded.updated_at`,
  )
    .bind(chatId, draftId, step, messageId, nowIso())
    .run();
}

async function deleteSession(env: Env, chatId: string) {
  await env.DB.prepare("DELETE FROM telegram_sessions WHERE chat_id = ?")
    .bind(chatId)
    .run();
}

async function updateDraftField(
  env: Env,
  draftId: string,
  field: "title" | "caption" | "alt" | "taken_at_override" | "location",
  value: string | null,
) {
  const allowedFields = new Set([
    "title",
    "caption",
    "alt",
    "taken_at_override",
    "location",
  ]);
  if (!allowedFields.has(field)) throw new Error("Unsupported draft field");

  await env.DB.prepare(
    `UPDATE photo_drafts SET ${field} = ?, updated_at = ? WHERE id = ?`,
  )
    .bind(value, nowIso(), draftId)
    .run();
}

async function sendSessionPrompt(
  env: Env,
  chatId: string,
  draftId: string,
  step: SessionStep,
  text: string,
  replyMarkup?: TelegramInlineKeyboardMarkup,
) {
  const sentMessage = await sendMessage(env, chatId, text, replyMarkup);
  await recordDraftMessage(env, draftId, chatId, sentMessage.message_id);
  await setSession(env, chatId, draftId, step, sentMessage.message_id);
  return sentMessage;
}

async function replaceSessionPrompt(
  env: Env,
  chatId: string,
  session: TelegramSession,
  step: SessionStep,
  text: string,
  replyMarkup?: TelegramInlineKeyboardMarkup,
) {
  // Keep Telegram chronology natural: a bot prompt that has already received
  // an answer is removed, and the next prompt is sent below that answer.
  if (session.message_id !== null) {
    await deleteMessage(env, chatId, session.message_id).catch(() => undefined);
  }
  return sendSessionPrompt(env, chatId, session.draft_id, step, text, replyMarkup);
}

async function startDraft(env: Env, message: TelegramMessage) {
  const imageInput = getImageInput(message);
  if (!imageInput) {
    await sendMessage(
      env,
      String(message.chat.id),
      "Пришли фотофайл: JPEG, PNG, WebP, AVIF, TIFF, HEIC или RAW (CR2, CR3, NEF, ARW, DNG и другие).",
    );
    return;
  }

  const existingSession = await getSession(env, String(message.chat.id));
  if (existingSession) {
    await sendMessage(
      env,
      String(message.chat.id),
      "Сначала закончи текущий черновик или отправь /cancel.",
    );
    return;
  }

  const draftId = crypto.randomUUID();
  const extension = extensionForMimeType(imageInput.mimeType, imageInput.originalName);
  const objectKey = `staging/${draftId}/source.${extension}`;
  const bytes = await downloadTelegramFile(env, imageInput.fileId);
  const exifPreview = await readExifPreview(bytes);
  const metadataJson = JSON.stringify({ exif: exifPreview });
  const caption = trimUserText(message.caption) || null;
  const now = nowIso();

  await env.PHOTO_STAGING.put(objectKey, bytes, {
    httpMetadata: { contentType: imageInput.mimeType },
    customMetadata: { draftId, source: "telegram" },
  });

  try {
    await env.DB.batch([
      env.DB.prepare(
        `INSERT INTO photo_drafts
          (id, object_key, original_name, mime_type, file_size, status, caption, metadata_json, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 'collecting', ?, ?, ?, ?)`,
      ).bind(
        draftId,
        objectKey,
        imageInput.originalName,
        imageInput.mimeType,
        bytes.byteLength,
        caption,
        metadataJson,
        now,
        now,
      ),
      env.DB.prepare(
        `INSERT INTO telegram_sessions (chat_id, draft_id, step, message_id, updated_at)
         VALUES (?, ?, 'review', NULL, ?)`,
      ).bind(String(message.chat.id), draftId, now),
    ]);
  } catch (error) {
    await env.PHOTO_STAGING.delete(objectKey);
    throw error;
  }

  const draft = await getDraft(env, draftId);
  if (!draft) throw new Error("Draft disappeared after creation");
  await sendSessionPrompt(env, String(message.chat.id), draftId, "review", reviewMessage(draft), reviewKeyboard(draftId));
  await recordDraftMessage(env, draftId, String(message.chat.id), message.message_id);
}

function displayPhotoDate(draft: PhotoDraft) {
  const preview = getExifPreview(draft);
  if (draft.taken_at_override) return `${formatRussianDate(draft.taken_at_override)} (вручную)`;
  if (preview.date) return `${formatRussianDate(preview.date)} (EXIF)`;
  if (preview.status === "error") return "не удалось прочитать EXIF; возьмём дату загрузки";
  if (preview.status === "empty") return "EXIF отсутствует; возьмём дату загрузки";
  return "не найдена в EXIF; возьмём дату загрузки";
}

function displayPhotoLocation(draft: PhotoDraft) {
  const preview = getExifPreview(draft);
  if (draft.location) return `${draft.location} (вручную)`;
  if (preview.location) return `${preview.location} (EXIF)`;
  if (preview.gpsAvailable) return "GPS найден, название места не указано";
  if (preview.status === "error") return "не удалось прочитать EXIF";
  if (preview.status === "empty") return "EXIF отсутствует";
  return "не найдено в EXIF";
}

function compactReviewDate(draft: PhotoDraft) {
  const preview = getExifPreview(draft);
  if (draft.taken_at_override) return `${formatRussianDate(draft.taken_at_override)} (manual)`;
  if (preview.date) return `${formatRussianDate(preview.date)} (exif)`;
  if (preview.status === "error") return "no date (exif unreadable)";
  return "no date (exif)";
}

function formatCoordinate(value: number) {
  return value.toFixed(6).replace(/\.?0+$/, "");
}

function compactReviewLocation(draft: PhotoDraft) {
  const preview = getExifPreview(draft);
  if (draft.location) return `${draft.location} (manual)`;
  if (preview.latitude !== undefined && preview.longitude !== undefined) {
    return `${formatCoordinate(preview.latitude)}, ${formatCoordinate(preview.longitude)} (exif)`;
  }
  if (preview.location) return `${preview.location} (exif)`;
  if (preview.status === "error") return "no location (exif unreadable)";
  return "no location (exif)";
}

function reviewMessage(draft: PhotoDraft) {
  return [
    draft.caption ?? "no caption",
    compactReviewDate(draft),
    compactReviewLocation(draft),
  ].join("\n");
}

function reviewKeyboard(draftId: string): TelegramInlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [
        { text: "Изменить подпись", callback_data: `photo:edit:caption:${draftId}` },
      ],
      [
        { text: "Изменить дату", callback_data: `photo:edit:date:${draftId}` },
        { text: "Изменить место", callback_data: `photo:edit:location:${draftId}` },
      ],
      [
        { text: "✅ Отправить в очередь", callback_data: `photo:confirm:${draftId}` },
        { text: "🗑 Отменить", callback_data: `photo:cancel:${draftId}` },
      ],
    ],
  };
}

function queuedDraftMessage(draft: PhotoDraft, queueCount: number) {
  return [
    `${queueCount} фото добавили в очередь.`,
    "Опубликуем в ближайшую среду.",
    "",
    `Подпись: ${draft.caption ?? "—"}`,
    `Дата съёмки: ${displayPhotoDate(draft)}`,
    `Место съёмки: ${displayPhotoLocation(draft)}`,
  ].join("\n");
}

async function countReadyDrafts(env: Env) {
  const result = await env.DB.prepare(
    "SELECT COUNT(*) AS count FROM photo_drafts WHERE status = 'ready'",
  ).first<{ count: number | string }>();
  return Number(result?.count ?? 0);
}

function textPrompt(step: "caption" | "location") {
  return step === "caption"
    ? "Напиши новую подпись к фотографии или ответь /skip, чтобы очистить её."
    : "Напиши человекочитаемое место съёмки или ответь /skip, чтобы очистить ручное значение.";
}

const DEFAULT_GITHUB_REPOSITORY = "5p17f1Re/5p17f1re.github.io";

async function getReadyQueue(env: Env) {
  const result = await env.DB.prepare(
    `SELECT * FROM photo_drafts
     WHERE status = 'ready' AND batch_id IS NULL
     ORDER BY created_at ASC`,
  ).all<PhotoDraft>();
  return result.results;
}

async function getPublishedDrafts(env: Env) {
  const result = await env.DB.prepare(
    `SELECT * FROM photo_drafts
     WHERE status = 'published' AND publication_status = 'published'
     ORDER BY created_at DESC`,
  ).all<PhotoDraft>();
  return result.results;
}

function queueCaption(draft: PhotoDraft) {
  return (draft.caption ?? "no caption").replace(/\s+/g, " ").slice(0, 120);
}

function queueMessage(drafts: PhotoDraft[]) {
  if (!drafts.length) return "Очередь пуста.";

  return [
    "Очередь:",
    ...drafts.map(
      (draft, index) =>
        `${index + 1}. ${queueCaption(draft)} — ${compactReviewDate(draft)} — ${compactReviewLocation(draft)}`,
    ),
    "",
    "Отмена: /1 2 5 cancel или /cancel all",
    "Публикация сейчас: /publish",
  ].join("\n");
}

function publishedDateLabel(draft: PhotoDraft) {
  const preview = getExifPreview(draft);
  if (draft.taken_at_override) return `${formatRussianDate(draft.taken_at_override)} (manual)`;
  if (preview.date) return `${formatRussianDate(preview.date)} (exif)`;
  const uploadDate = dateOnly(draft.created_at);
  return uploadDate ? `${formatRussianDate(uploadDate)} (upload)` : "no date";
}

function publishedMessage(drafts: PhotoDraft[]) {
  if (!drafts.length) return "Опубликованных фотографий нет.";

  return [
    "Опубликованные фотографии:",
    ...drafts.map(
      (draft, index) =>
        `${index + 1}. ${queueCaption(draft)} — ${publishedDateLabel(draft)}`,
    ),
    "",
    "Снять с сайта: /unpublish 1 3",
  ].join("\n");
}

async function cancelReadyDrafts(env: Env, drafts: PhotoDraft[]) {
  if (!drafts.length) return 0;

  const now = nowIso();
  const results = await env.DB.batch(
    drafts.map((draft) =>
      env.DB.prepare(
        "UPDATE photo_drafts SET status = 'cancelled', updated_at = ? WHERE id = ? AND status = 'ready' AND batch_id IS NULL",
      ).bind(now, draft.id),
    ),
  );
  const cancelled = drafts.filter((_, index) => results[index]?.meta.changes === 1);

  await Promise.allSettled(
    cancelled.map((draft) => env.PHOTO_STAGING.delete(draft.object_key)),
  );
  return cancelled.length;
}

function helpMessage() {
  return [
    "Команды:",
    "/help — показать эту справку",
    "/q — показать очередь с номерами",
    "/1 2 5 cancel — отменить выбранные фотографии",
    "/cancel all — отменить всю неподанную очередь",
    "/publish — запустить публикацию сейчас",
    "/published — показать опубликованные фотографии",
    "/unpublish 3 — снять выбранную фотографию с сайта",
    "/cancel — отменить текущий черновик",
    "/start — начать загрузку фотографии",
  ].join("\n");
}

async function dispatchPhotoWorkflow(env: Env, mode: "publish" | "unpublish") {
  const token = env.GITHUB_ACTIONS_TOKEN?.trim();
  if (!token) return false;

  const repository = env.GITHUB_REPOSITORY?.trim() || DEFAULT_GITHUB_REPOSITORY;
  try {
    const response = await fetch(
      `https://api.github.com/repos/${repository}/actions/workflows/publish-photos.yml/dispatches`,
      {
        method: "POST",
        headers: {
          accept: "application/vnd.github+json",
          authorization: `Bearer ${token}`,
          "content-type": "application/json",
          "user-agent": "photo-publisher-5555",
          "x-github-api-version": "2022-11-28",
        },
        body: JSON.stringify({ ref: "main", inputs: { mode } }),
      },
    );

    if (!response.ok) {
      console.error("Could not dispatch GitHub photo workflow", mode, response.status);
      return false;
    }
    return true;
  } catch (error) {
    console.error("Could not dispatch GitHub photo workflow", mode, error);
    return false;
  }
}

async function dispatchImmediatePublish(env: Env, chatId: string) {
  const drafts = await getReadyQueue(env);
  if (!drafts.length) {
    await sendMessage(env, chatId, "Очередь пуста. Нечего публиковать.");
    return;
  }

  if (!(await dispatchPhotoWorkflow(env, "publish"))) {
    await sendMessage(
      env,
      chatId,
      "Не получилось запустить публикацию. Проверь GITHUB_ACTIONS_TOKEN и попробуй ещё раз.",
    );
    return;
  }

  await sendMessage(env, chatId, `Публикация запущена. В batch уйдёт ${drafts.length} фото.`);
}

async function requestUnpublish(env: Env, chatId: string, indexes: number[]) {
  const published = await getPublishedDrafts(env);
  if (!published.length) {
    await sendMessage(env, chatId, "Опубликованных фотографий нет.");
    return;
  }

  const selected = indexes
    .map((index) => published[index - 1])
    .filter((draft): draft is PhotoDraft => Boolean(draft));
  const missing = indexes.filter((index) => index < 1 || index > published.length);
  if (!selected.length) {
    await sendMessage(env, chatId, `Не найдены номера: ${missing.join(", ")}. Сначала отправь /published.`);
    return;
  }

  const now = nowIso();
  const results = await env.DB.batch(
    selected.map((draft) =>
      env.DB.prepare(
        `UPDATE photo_drafts
         SET publication_status = 'unpublish_requested', publication_updated_at = ?, updated_at = ?
         WHERE id = ? AND status = 'published' AND publication_status = 'published'`,
      ).bind(now, now, draft.id),
    ),
  );
  const requested = selected.filter((_, index) => results[index]?.meta.changes === 1);
  if (!requested.length) {
    await sendMessage(env, chatId, "Эти фотографии уже ожидают снятия с публикации или недоступны.");
    return;
  }

  if (!(await dispatchPhotoWorkflow(env, "unpublish"))) {
    await env.DB.batch(
      requested.map((draft) =>
        env.DB.prepare(
          `UPDATE photo_drafts
           SET publication_status = 'published', publication_updated_at = ?, updated_at = ?
           WHERE id = ? AND publication_status = 'unpublish_requested'`,
        ).bind(nowIso(), nowIso(), draft.id),
      ),
    );
    await sendMessage(env, chatId, "Не получилось запустить снятие с публикации. Проверь GITHUB_ACTIONS_TOKEN.");
    return;
  }

  const suffix = missing.length ? ` Не найдены номера: ${missing.join(", ")}.` : "";
  await sendMessage(
    env,
    chatId,
    `Снятие с публикации запущено: ${requested.length} фото. После deploy они исчезнут с сайта.${suffix}`,
  );
}

async function advanceSession(env: Env, message: TelegramMessage, value: string) {
  const chatId = String(message.chat.id);
  const session = await getSession(env, chatId);
  if (!session) {
    await sendMessage(env, chatId, "Отправь фотографию, чтобы создать черновик.");
    return;
  }

  const draft = await getDraft(env, session.draft_id);
  if (!draft || draft.status !== "collecting") {
    await deleteSession(env, chatId);
    await sendMessage(env, chatId, "Черновик больше недоступен. Отправь фото заново.");
    return;
  }

  const normalized = trimUserText(value);

  if (session.step === "date") {
    const normalizedDate = isSkip(normalized) ? null : normalizeDateInput(normalized);
    if (!isSkip(normalized) && normalized && !normalizedDate) {
      const prompt = datePrompt(
        draft.id,
        draft.taken_at_override,
        "Не получилось распознать дату. Используй календарь или формат ДД.ММ.ГГГГ.",
      );
      await replaceSessionPrompt(env, chatId, session, "date", prompt.text, prompt.replyMarkup);
      return;
    }
    await updateDraftField(env, draft.id, "taken_at_override", normalizedDate ?? null);
  } else if (session.step === "location") {
    await updateDraftField(env, draft.id, "location", isSkip(normalized) ? null : normalized || null);
  } else {
    // `review` is the only new free-text state: a direct reply after the
    // receipt edits the optional Telegram caption. The legacy states are
    // handled the same way so an old unfinished draft can still be closed.
    await updateDraftField(env, draft.id, "caption", isSkip(normalized) ? null : normalized || null);
  }

  const updatedDraft = await getDraft(env, draft.id);
  if (!updatedDraft) throw new Error("Draft disappeared after metadata update");

  await replaceSessionPrompt(
    env,
    chatId,
    session,
    "review",
    reviewMessage(updatedDraft),
    reviewKeyboard(updatedDraft.id),
  );
}

async function handleCommand(env: Env, message: TelegramMessage) {
  const chatId = String(message.chat.id);
  const text = message.text?.trim() ?? "";
  const normalized = text.toLowerCase().replace(/\s+/g, " ");
  const command = normalized.split(" ", 1)[0];

  if (command === "/start" || command === "start") {
    await sendMessage(env, chatId, "Пришли фотофайл с подписью, если она нужна. Я покажу дату и место из EXIF, а перед очередью дам всё проверить.");
    return true;
  }

  if (command === "help" || command === "/help") {
    await sendMessage(env, chatId, helpMessage());
    return true;
  }

  if (command === "q" || command === "/q" || command === "queue" || command === "/queue") {
    await sendMessage(env, chatId, queueMessage(await getReadyQueue(env)));
    return true;
  }

  if (command === "/published") {
    await sendMessage(env, chatId, publishedMessage(await getPublishedDrafts(env)));
    return true;
  }

  if (normalized === "/unpublish") {
    await sendMessage(env, chatId, "Укажи номера фотографий: /unpublish 3 или /unpublish 1 2.");
    return true;
  }

  const unpublishRequest = parseUnpublishCommand(text);
  if (unpublishRequest) {
    await requestUnpublish(env, chatId, unpublishRequest);
    return true;
  }

  const cancelRequest = parseQueueCancelCommand(text);
  if (cancelRequest) {
    const queue = await getReadyQueue(env);
    if (cancelRequest === "all") {
      const cancelledCount = await cancelReadyDrafts(env, queue);
      await sendMessage(env, chatId, `Отменено фотографий: ${cancelledCount}.`);
      return true;
    }

    const selected = cancelRequest
      .map((index) => queue[index - 1])
      .filter((draft): draft is PhotoDraft => Boolean(draft));
    const missing = cancelRequest.filter((index) => index < 1 || index > queue.length);
    const cancelledCount = await cancelReadyDrafts(env, selected);
    const suffix = missing.length ? ` Не найдены номера: ${missing.join(", ")}.` : "";
    await sendMessage(env, chatId, `Отменено фотографий: ${cancelledCount}.${suffix}`);
    return true;
  }

  if (normalized === "publish" || normalized === "/publish") {
    await dispatchImmediatePublish(env, chatId);
    return true;
  }

  if (normalized === "/cancel") {
    const session = await getSession(env, chatId);
    if (!session) {
      await sendMessage(env, chatId, "Активного черновика нет.");
      return true;
    }
    const draft = await getDraft(env, session.draft_id);
    await deleteSession(env, chatId);
    if (draft) {
      await env.DB.prepare(
        "UPDATE photo_drafts SET status = 'cancelled', updated_at = ? WHERE id = ? AND status = 'collecting'",
      )
        .bind(nowIso(), draft.id)
        .run();
      await env.PHOTO_STAGING.delete(draft.object_key);
    }
    await sendMessage(env, chatId, "Черновик отменён. Временная копия удалена.");
    return true;
  }

  return false;
}

async function handleCallbackQuery(env: Env, update: TelegramUpdate) {
  const callback = update.callback_query;
  const message = callback?.message;
  const data = callback?.data;
  if (!callback || !message || !data) return;

  if (data === "photo:noop") {
    await answerCallbackQuery(env, callback.id);
    return;
  }

  const [prefix, action, firstArgument, secondArgument] = data.split(":");
  if (prefix !== "photo") return;

  const isEditAction = action === "edit";
  const draftId = isEditAction ? secondArgument : firstArgument;
  if (!draftId) return;

  const chatId = String(message.chat.id);
  const draft = await getDraft(env, draftId);
  if (!draft || draft.status !== "collecting") {
    await answerCallbackQuery(env, callback.id, "Черновик уже обработан");
    return;
  }

  if (action === "edit") {
    const field = firstArgument;
    if (field === "date") {
      const prompt = datePrompt(draft.id, draft.taken_at_override);
      await editMessageText(env, chatId, message.message_id, prompt.text, prompt.replyMarkup);
      await setSession(env, chatId, draft.id, "date", message.message_id);
      await answerCallbackQuery(env, callback.id, "Выбери новую дату");
      return;
    }

    if (field === "caption" || field === "alt" || field === "location") {
      const editableField = field === "location" ? "location" : "caption";
      await editMessageText(env, chatId, message.message_id, textPrompt(editableField));
      await setSession(env, chatId, draft.id, editableField, message.message_id);
      await answerCallbackQuery(env, callback.id, "Жду новое значение");
      return;
    }

    await answerCallbackQuery(env, callback.id, "Этот пункт уже нельзя изменить");
    return;
  }

  if (action === "month") {
    if (!/^\d{4}-\d{2}$/.test(secondArgument ?? "")) {
      await answerCallbackQuery(env, callback.id, "Неизвестный месяц");
      return;
    }
    const prompt = datePrompt(draft.id, draft.taken_at_override);
    await editMessageText(
      env,
      chatId,
      message.message_id,
      prompt.text,
      datePickerKeyboard(draft.id, secondArgument),
    );
    await setSession(env, chatId, draft.id, "date", message.message_id);
    await answerCallbackQuery(env, callback.id);
    return;
  }

  if (action === "date" || action === "date-skip") {
    const selectedDate = action === "date" ? normalizeDateInput(secondArgument ?? "") : null;
    if (action === "date" && !selectedDate) {
      await answerCallbackQuery(env, callback.id, "Неверная дата");
      return;
    }

    await updateDraftField(env, draft.id, "taken_at_override", selectedDate ?? null);
    const updatedDraft = await getDraft(env, draft.id);
    if (!updatedDraft) throw new Error("Draft disappeared after date update");
    await editMessageText(
      env,
      chatId,
      message.message_id,
      reviewMessage(updatedDraft),
      reviewKeyboard(updatedDraft.id),
    );
    await setSession(env, chatId, draft.id, "review", message.message_id);
    await answerCallbackQuery(
      env,
      callback.id,
      selectedDate ? `Дата: ${formatRussianDate(selectedDate)}` : "Дата будет взята из EXIF",
    );
    return;
  }

  if (action === "cancel") {
    await env.DB.prepare(
      "UPDATE photo_drafts SET status = 'cancelled', updated_at = ? WHERE id = ? AND status = 'collecting'",
    )
      .bind(nowIso(), draft.id)
      .run();
    await env.PHOTO_STAGING.delete(draft.object_key);
    await deleteSession(env, chatId);
    await answerCallbackQuery(env, callback.id, "Черновик отменён");
    await editMessageText(
      env,
      chatId,
      message.message_id,
      "Черновик отменён. Временная копия удалена.",
      { inline_keyboard: [] },
    );
    return;
  }

  if (action === "confirm") {
    await env.DB.prepare(
      "UPDATE photo_drafts SET status = 'ready', updated_at = ? WHERE id = ? AND status = 'collecting'",
    )
      .bind(nowIso(), draft.id)
      .run();
    const updatedDraft = await getDraft(env, draft.id);
    if (!updatedDraft) throw new Error("Draft disappeared after queue confirmation");
    const queueCount = await countReadyDrafts(env);
    await deleteSession(env, chatId);
    await answerCallbackQuery(env, callback.id, "Добавлено в недельную очередь");
    await editMessageText(
      env,
      chatId,
      message.message_id,
      queuedDraftMessage(updatedDraft, queueCount),
      { inline_keyboard: [] },
    );
    await deleteDraftMessagesExcept(env, draft.id, message.message_id);
  }
}

async function markUpdateAsProcessed(env: Env, updateId: number) {
  const result = await env.DB.prepare(
    "INSERT OR IGNORE INTO telegram_updates (update_id, received_at) VALUES (?, ?)",
  )
    .bind(updateId, nowIso())
    .run();
  return result.meta.changes === 1;
}

async function handleTelegramUpdate(env: Env, update: TelegramUpdate) {
  if (!(await markUpdateAsProcessed(env, update.update_id))) return;

  const chatId = update.message?.chat.id ?? update.callback_query?.message?.chat.id;
  if (chatId === undefined || !isOwnerChat(env, chatId)) return;

  if (update.callback_query) {
    await handleCallbackQuery(env, update);
    return;
  }

  const message = update.message;
  if (!message) return;

  const activeSession = await getSession(env, String(chatId));
  if (activeSession) {
    await recordDraftMessage(env, activeSession.draft_id, String(chatId), message.message_id);
  }

  if (await handleCommand(env, message)) return;
  if (getImageInput(message)) {
    await startDraft(env, message);
    return;
  }
  if (message.text) {
    await advanceSession(env, message, message.text);
    return;
  }

  await sendMessage(env, String(chatId), "Отправь изображение или используй /cancel.");
}

function requireInternalToken(request: Request, env: Env) {
  const authorization = request.headers.get("authorization");
  return authorization === `Bearer ${env.INTERNAL_API_TOKEN}`;
}

function publicDraft(draft: PhotoDraft) {
  return {
    id: draft.id,
    objectKey: draft.object_key,
    originalName: draft.original_name,
    mimeType: draft.mime_type,
    fileSize: draft.file_size,
    publicationStatus: draft.publication_status,
    title: draft.title,
    caption: draft.caption,
    alt: draft.alt,
    takenAtOverride: draft.taken_at_override,
    location: draft.location,
    createdAt: draft.created_at,
  };
}

async function claimBatch(env: Env) {
  const drafts = await env.DB.prepare(
    `SELECT * FROM photo_drafts
     WHERE status IN ('ready', 'failed')
       AND batch_id IS NULL
       AND publication_status IN ('not_published', 'unpublished')
     ORDER BY created_at ASC`,
  )
    .all<PhotoDraft>();

  if (!drafts.results.length) return jsonResponse({ batch: null });

  const batchId = crypto.randomUUID();
  const now = nowIso();
  const statements = [
    env.DB.prepare(
      "INSERT INTO photo_batches (id, status, operation, created_at, claimed_at) VALUES (?, 'batching', 'publish', ?, ?)",
    ).bind(batchId, now, now),
    ...drafts.results.map((draft) =>
      env.DB.prepare(
        "UPDATE photo_drafts SET status = 'batching', batch_id = ?, updated_at = ? WHERE id = ? AND status IN ('ready', 'failed') AND batch_id IS NULL AND publication_status IN ('not_published', 'unpublished')",
      ).bind(batchId, now, draft.id),
    ),
  ];
  await env.DB.batch(statements);

  const claimedDrafts = await env.DB.prepare(
    "SELECT * FROM photo_drafts WHERE batch_id = ? AND status = 'batching' ORDER BY created_at ASC",
  )
    .bind(batchId)
    .all<PhotoDraft>();

  return jsonResponse({
    batch: {
      id: batchId,
      claimedAt: now,
      drafts: claimedDrafts.results.map(publicDraft),
    },
  });
}

async function claimUnpublishBatch(env: Env) {
  const drafts = await env.DB.prepare(
    `SELECT * FROM photo_drafts
     WHERE status = 'published'
       AND publication_status = 'unpublish_requested'
       AND batch_id IS NULL
     ORDER BY publication_updated_at ASC, created_at ASC`,
  ).all<PhotoDraft>();

  if (!drafts.results.length) return jsonResponse({ batch: null });

  const batchId = crypto.randomUUID();
  const now = nowIso();
  const statements = [
    env.DB.prepare(
      "INSERT INTO photo_batches (id, status, operation, created_at, claimed_at) VALUES (?, 'batching', 'unpublish', ?, ?)",
    ).bind(batchId, now, now),
    ...drafts.results.map((draft) =>
      env.DB.prepare(
        `UPDATE photo_drafts
         SET publication_status = 'unpublishing', batch_id = ?, updated_at = ?
         WHERE id = ? AND status = 'published' AND publication_status = 'unpublish_requested' AND batch_id IS NULL`,
      ).bind(batchId, now, draft.id),
    ),
  ];
  await env.DB.batch(statements);

  const claimedDrafts = await env.DB.prepare(
    "SELECT * FROM photo_drafts WHERE batch_id = ? AND publication_status = 'unpublishing' ORDER BY created_at ASC",
  )
    .bind(batchId)
    .all<PhotoDraft>();

  return jsonResponse({
    batch: {
      id: batchId,
      operation: "unpublish",
      claimedAt: now,
      drafts: claimedDrafts.results.map(publicDraft),
    },
  });
}

async function updateBatchStatus(
  env: Env,
  batchId: string,
  status: "committed" | "published" | "failed",
  payload: { commitSha?: string; error?: string },
) {
  const now = nowIso();
  const batch = await env.DB.prepare("SELECT operation FROM photo_batches WHERE id = ?")
    .bind(batchId)
    .first<{ operation?: "publish" | "unpublish" }>();
  const operation = batch?.operation ?? "publish";
  if (status === "failed") {
    await env.DB.batch([
      env.DB.prepare(
        "UPDATE photo_batches SET status = 'failed', error = ? WHERE id = ?",
      ).bind(payload.error?.slice(0, MAX_TEXT_LENGTH) ?? "batch failed", batchId),
      operation === "unpublish"
        ? env.DB.prepare(
            "UPDATE photo_drafts SET publication_status = 'unpublish_requested', batch_id = NULL, updated_at = ? WHERE batch_id = ? AND publication_status = 'unpublishing'",
          ).bind(now, batchId)
        : env.DB.prepare(
            "UPDATE photo_drafts SET status = 'failed', batch_id = NULL, updated_at = ? WHERE batch_id = ? AND status IN ('batching', 'committed')",
          ).bind(now, batchId),
    ]);
  } else if (status === "committed") {
    await env.DB.batch([
      env.DB.prepare(
        "UPDATE photo_batches SET status = 'committed', commit_sha = ? WHERE id = ?",
      ).bind(payload.commitSha ?? null, batchId),
      operation === "unpublish"
        ? env.DB.prepare(
            "UPDATE photo_drafts SET published_commit_sha = ?, updated_at = ? WHERE batch_id = ? AND publication_status = 'unpublishing'",
          ).bind(payload.commitSha ?? null, now, batchId)
        : env.DB.prepare(
            "UPDATE photo_drafts SET status = 'committed', published_commit_sha = ?, updated_at = ? WHERE batch_id = ? AND status = 'batching'",
          ).bind(payload.commitSha ?? null, now, batchId),
    ]);
  } else {
    const cleanupAt = new Date(Date.now() + CLEANUP_GRACE_DAYS * 86400000).toISOString();
    await env.DB.batch([
      env.DB.prepare(
        "UPDATE photo_batches SET status = 'published', commit_sha = COALESCE(?, commit_sha), deployed_at = ? WHERE id = ?",
      ).bind(payload.commitSha ?? null, now, batchId),
      operation === "unpublish"
        ? env.DB.prepare(
            "UPDATE photo_drafts SET publication_status = 'unpublished', publication_updated_at = ?, updated_at = ? WHERE batch_id = ? AND publication_status = 'unpublishing'",
          ).bind(now, now, batchId)
        : env.DB.prepare(
            "UPDATE photo_drafts SET status = 'published', publication_status = 'published', publication_updated_at = ?, published_commit_sha = COALESCE(?, published_commit_sha), staging_delete_after = ?, updated_at = ? WHERE batch_id = ? AND status IN ('committed', 'batching')",
          ).bind(now, payload.commitSha ?? null, cleanupAt, now, batchId),
    ]);
  }

  return jsonResponse({ ok: true, batchId, status });
}

async function cleanupPublishedStaging(env: Env) {
  const now = nowIso();
  const drafts = await env.DB.prepare(
    "SELECT id, object_key FROM photo_drafts WHERE status = 'published' AND staging_deleted_at IS NULL AND staging_delete_after IS NOT NULL AND staging_delete_after <= ?",
  )
    .bind(now)
    .all<{ id: string; object_key: string }>();

  for (const draft of drafts.results) {
    await env.PHOTO_STAGING.delete(draft.object_key);
    await env.DB.prepare(
      "UPDATE photo_drafts SET staging_deleted_at = ?, updated_at = ? WHERE id = ? AND status = 'published'",
    )
      .bind(now, now, draft.id)
      .run();
  }
}

const worker = {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname === "/health") {
      return jsonResponse({ ok: true, service: "photo-publisher-5555" });
    }

    if (request.method === "POST" && url.pathname === "/telegram/webhook") {
      if (
        request.headers.get("x-telegram-bot-api-secret-token") !==
        env.TELEGRAM_WEBHOOK_SECRET
      ) {
        return jsonResponse({ error: "unauthorized" }, { status: 401 });
      }

      const update = (await request.json()) as TelegramUpdate;
      try {
        await handleTelegramUpdate(env, update);
      } catch (error) {
        console.error("Telegram update failed", error);
        const chatId = update.message?.chat.id;
        if (chatId !== undefined && isOwnerChat(env, chatId)) {
          await sendMessage(env, String(chatId), "Не удалось сохранить шаг. Попробуй ещё раз.");
        }
      }
      return jsonResponse({ ok: true });
    }

    if (url.pathname.startsWith("/internal/")) {
      if (!requireInternalToken(request, env)) {
        return jsonResponse({ error: "unauthorized" }, { status: 401 });
      }

      if (request.method === "POST" && url.pathname === "/internal/batches/claim") {
        return claimBatch(env);
      }

      if (request.method === "POST" && url.pathname === "/internal/publications/claim-unpublish") {
        return claimUnpublishBatch(env);
      }

      const statusMatch = url.pathname.match(/^\/internal\/batches\/([^/]+)\/(committed|published|failed)$/);
      if (request.method === "POST" && statusMatch) {
        const [, batchId, status] = statusMatch;
        const payload = (await request.json().catch(() => ({}))) as {
          commitSha?: string;
          error?: string;
        };
        return updateBatchStatus(
          env,
          batchId,
          status as "committed" | "published" | "failed",
          payload,
        );
      }
    }

    return jsonResponse({ error: "not_found" }, { status: 404 });
  },

  async scheduled(_controller: ScheduledController, env: Env) {
    await cleanupPublishedStaging(env);
  },
};

export default worker;
