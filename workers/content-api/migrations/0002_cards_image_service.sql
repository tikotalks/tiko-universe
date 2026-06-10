ALTER TABLE cards_tiles ADD COLUMN image_ref TEXT;

CREATE TABLE IF NOT EXISTS user_images (
  id TEXT PRIMARY KEY,
  r2_key TEXT NOT NULL,
  content_type TEXT NOT NULL DEFAULT 'image/png',
  file_size_bytes INTEGER,
  width INTEGER,
  height INTEGER,
  uploaded_by TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
