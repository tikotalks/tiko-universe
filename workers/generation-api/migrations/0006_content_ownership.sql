CREATE TABLE IF NOT EXISTS story_drafts (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  cover_media_id TEXT,
  default_voice TEXT NOT NULL DEFAULT 'nova',
  default_speed REAL NOT NULL DEFAULT 1.0,
  target_album_id TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'rendering', 'complete', 'error')),
  chapters TEXT NOT NULL DEFAULT '[]',
  settings TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS story_drafts_status_updated_idx ON story_drafts (status, updated_at DESC);

ALTER TABLE generated_images ADD COLUMN created_by TEXT;
ALTER TABLE stories ADD COLUMN created_by TEXT;
ALTER TABLE story_drafts ADD COLUMN created_by TEXT;

CREATE INDEX IF NOT EXISTS generated_images_owner_idx ON generated_images (created_by, created_at DESC);
CREATE INDEX IF NOT EXISTS stories_owner_idx ON stories (created_by, created_at DESC);
CREATE INDEX IF NOT EXISTS story_drafts_owner_updated_idx ON story_drafts (created_by, updated_at DESC);
