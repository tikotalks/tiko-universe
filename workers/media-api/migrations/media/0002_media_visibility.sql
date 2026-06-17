-- Add is_active and is_hidden columns to the media table.
-- is_active: when false, the media is fully deactivated (not served, not listed anywhere except admin).
-- is_hidden: when true, the media is excluded from public search/list results but still served by direct URL/download.
-- Both default to active=1 / hidden=0 so existing media is visible and served as before.

ALTER TABLE media ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1;
ALTER TABLE media ADD COLUMN is_hidden INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS media_active_hidden_created_idx ON media (is_active, is_hidden, created_at DESC);
