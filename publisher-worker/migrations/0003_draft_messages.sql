CREATE TABLE IF NOT EXISTS photo_draft_messages (
  draft_id TEXT NOT NULL,
  chat_id TEXT NOT NULL,
  message_id INTEGER NOT NULL,
  PRIMARY KEY (draft_id, message_id)
);

CREATE INDEX IF NOT EXISTS photo_draft_messages_draft_idx
  ON photo_draft_messages (draft_id);
