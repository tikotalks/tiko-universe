ALTER TABLE media ADD COLUMN owner_user_id TEXT;

CREATE INDEX IF NOT EXISTS media_owner_created_idx
  ON media (owner_user_id, created_at DESC);
