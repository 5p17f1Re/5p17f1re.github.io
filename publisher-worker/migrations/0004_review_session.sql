CREATE TABLE telegram_sessions_v2 (
  chat_id TEXT PRIMARY KEY,
  draft_id TEXT NOT NULL,
  step TEXT NOT NULL CHECK (step IN ('title', 'caption', 'alt', 'date', 'location', 'review')),
  message_id INTEGER,
  updated_at TEXT NOT NULL
);

INSERT INTO telegram_sessions_v2 (chat_id, draft_id, step, message_id, updated_at)
SELECT chat_id, draft_id, step, message_id, updated_at
FROM telegram_sessions;

DROP TABLE telegram_sessions;
ALTER TABLE telegram_sessions_v2 RENAME TO telegram_sessions;
