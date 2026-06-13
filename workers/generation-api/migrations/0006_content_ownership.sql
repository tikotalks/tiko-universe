ALTER TABLE generated_images ADD COLUMN created_by TEXT;
ALTER TABLE stories ADD COLUMN created_by TEXT;
ALTER TABLE story_drafts ADD COLUMN created_by TEXT;

CREATE INDEX IF NOT EXISTS generated_images_owner_idx ON generated_images (created_by, created_at DESC);
CREATE INDEX IF NOT EXISTS stories_owner_idx ON stories (created_by, created_at DESC);
CREATE INDEX IF NOT EXISTS story_drafts_owner_updated_idx ON story_drafts (created_by, updated_at DESC);
