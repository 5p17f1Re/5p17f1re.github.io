CREATE TABLE IF NOT EXISTS photo_drafts (
  id TEXT PRIMARY KEY,
  object_key TEXT NOT NULL UNIQUE,
  original_name TEXT,
  mime_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('collecting', 'ready', 'batching', 'committed', 'published', 'failed', 'cancelled')),
  title TEXT,
  caption TEXT,
  alt TEXT,
  taken_at_override TEXT,
  location TEXT,
  metadata_json TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  batch_id TEXT,
  published_commit_sha TEXT,
  staging_delete_after TEXT,
  staging_deleted_at TEXT
);

CREATE INDEX IF NOT EXISTS photo_drafts_status_idx
  ON photo_drafts (status, created_at);

CREATE TABLE IF NOT EXISTS telegram_sessions (
  chat_id TEXT PRIMARY KEY,
  draft_id TEXT NOT NULL,
  step TEXT NOT NULL CHECK (step IN ('title', 'caption', 'alt', 'date', 'location')),
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS photo_batches (
  id TEXT PRIMARY KEY,
  status TEXT NOT NULL CHECK (status IN ('batching', 'committed', 'published', 'failed')),
  created_at TEXT NOT NULL,
  claimed_at TEXT NOT NULL,
  commit_sha TEXT,
  deployed_at TEXT,
  error TEXT
);

CREATE TABLE IF NOT EXISTS telegram_updates (
  update_id INTEGER PRIMARY KEY,
  received_at TEXT NOT NULL
);
