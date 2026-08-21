export type DraftStatus =
  | "collecting"
  | "ready"
  | "batching"
  | "committed"
  | "published"
  | "failed"
  | "cancelled";

export type PublicationStatus =
  | "not_published"
  | "published"
  | "unpublish_requested"
  | "unpublishing"
  | "unpublished";

// `title` remains readable for drafts created by the first deployed version,
// but new conversations no longer collect a separate title.
export type SessionStep = "title" | "caption" | "alt" | "date" | "location" | "review";

export type Env = {
  DB: D1Database;
  PHOTO_STAGING: R2Bucket;
  TELEGRAM_BOT_TOKEN: string;
  TELEGRAM_WEBHOOK_SECRET: string;
  INTERNAL_API_TOKEN: string;
  OWNER_CHAT_ID: string;
  GITHUB_ACTIONS_TOKEN?: string;
  GITHUB_REPOSITORY?: string;
  MAX_FILE_BYTES?: string;
};

export type PhotoDraft = {
  id: string;
  object_key: string;
  original_name: string | null;
  mime_type: string;
  file_size: number;
  status: DraftStatus;
  publication_status: PublicationStatus;
  publication_updated_at: string | null;
  title: string | null;
  caption: string | null;
  alt: string | null;
  taken_at_override: string | null;
  location: string | null;
  metadata_json: string | null;
  created_at: string;
  updated_at: string;
  batch_id: string | null;
  published_commit_sha: string | null;
  staging_delete_after: string | null;
  staging_deleted_at: string | null;
};

export type TelegramSession = {
  chat_id: string;
  draft_id: string;
  step: SessionStep;
  message_id: number | null;
  updated_at: string;
};

export type DraftMessage = {
  draft_id: string;
  chat_id: string;
  message_id: number;
};

export type TelegramPhotoSize = {
  file_id: string;
  file_size?: number;
  width: number;
  height: number;
};

export type TelegramMessage = {
  message_id: number;
  chat: { id: number };
  date: number;
  text?: string;
  caption?: string;
  photo?: TelegramPhotoSize[];
  document?: {
    file_id: string;
    file_name?: string;
    mime_type?: string;
    file_size?: number;
  };
};

export type TelegramCallbackQuery = {
  id: string;
  data?: string;
  message?: TelegramMessage;
};

export type TelegramUpdate = {
  update_id: number;
  message?: TelegramMessage;
  callback_query?: TelegramCallbackQuery;
};

export type TelegramFile = {
  file_path?: string;
  file_size?: number;
};

export type TelegramInlineKeyboardMarkup = {
  inline_keyboard: Array<Array<{ text: string; callback_data: string }>>;
};
