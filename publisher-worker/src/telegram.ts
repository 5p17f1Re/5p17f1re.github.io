import type {
  Env,
  TelegramFile,
  TelegramInlineKeyboardMarkup,
  TelegramMessage,
} from "./types";

type TelegramResponse<T> = {
  ok: boolean;
  result: T;
  description?: string;
};

async function telegramRequest<T>(
  env: Env,
  method: string,
  body: Record<string, unknown>,
): Promise<T> {
  const response = await fetch(
    `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/${method}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    },
  );

  if (!response.ok) {
    throw new Error(`Telegram ${method} failed with HTTP ${response.status}`);
  }

  const payload = (await response.json()) as TelegramResponse<T>;
  if (!payload.ok) {
    throw new Error(`Telegram ${method} failed: ${payload.description ?? "unknown error"}`);
  }

  return payload.result;
}

export function sendMessage(
  env: Env,
  chatId: string,
  text: string,
  replyMarkup?: TelegramInlineKeyboardMarkup,
) {
  return telegramRequest<TelegramMessage>(env, "sendMessage", {
    chat_id: chatId,
    text,
    ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
  });
}

export function answerCallbackQuery(env: Env, callbackQueryId: string, text?: string) {
  return telegramRequest<boolean>(env, "answerCallbackQuery", {
    callback_query_id: callbackQueryId,
    ...(text ? { text } : {}),
  });
}

export function editMessageText(
  env: Env,
  chatId: string,
  messageId: number,
  text: string,
  replyMarkup?: TelegramInlineKeyboardMarkup,
) {
  return telegramRequest<TelegramMessage>(env, "editMessageText", {
    chat_id: chatId,
    message_id: messageId,
    text,
    reply_markup: replyMarkup ?? { inline_keyboard: [] },
  });
}

export function deleteMessage(env: Env, chatId: string, messageId: number) {
  return telegramRequest<boolean>(env, "deleteMessage", {
    chat_id: chatId,
    message_id: messageId,
  });
}

export async function getTelegramFile(env: Env, fileId: string) {
  return telegramRequest<TelegramFile>(env, "getFile", { file_id: fileId });
}

export async function downloadTelegramFile(env: Env, fileId: string) {
  const file = await getTelegramFile(env, fileId);

  if (!file.file_path) {
    throw new Error("Telegram returned no file path");
  }

  const response = await fetch(
    `https://api.telegram.org/file/bot${env.TELEGRAM_BOT_TOKEN}/${file.file_path}`,
  );

  if (!response.ok) {
    throw new Error(`Telegram file download failed with HTTP ${response.status}`);
  }

  const bytes = await response.arrayBuffer();
  const maxFileBytes = Number(env.MAX_FILE_BYTES ?? 20 * 1024 * 1024);
  if (bytes.byteLength > maxFileBytes) {
    throw new Error("Telegram file is larger than the configured limit");
  }

  return bytes;
}
