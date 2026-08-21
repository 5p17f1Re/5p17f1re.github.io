ALTER TABLE photo_drafts ADD COLUMN publication_status TEXT NOT NULL DEFAULT 'not_published';
ALTER TABLE photo_drafts ADD COLUMN publication_updated_at TEXT;
ALTER TABLE photo_batches ADD COLUMN operation TEXT NOT NULL DEFAULT 'publish';

UPDATE photo_drafts
SET publication_status = 'published'
WHERE status = 'published' AND publication_status = 'not_published';
