CREATE TABLE IF NOT EXISTS cards_collections (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  color_hex INTEGER NOT NULL DEFAULT 0,
  display_order INTEGER NOT NULL DEFAULT 0,
  media_categories TEXT,
  language_code TEXT NOT NULL DEFAULT 'en',
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS cards_tiles (
  id TEXT PRIMARY KEY,
  collection_id TEXT NOT NULL,
  title TEXT NOT NULL,
  speech TEXT NOT NULL,
  color_hex INTEGER NOT NULL DEFAULT 0,
  display_order INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (collection_id) REFERENCES cards_collections(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_cards_collections_order ON cards_collections(display_order, language_code);
CREATE INDEX IF NOT EXISTS idx_cards_tiles_collection ON cards_tiles(collection_id, display_order);

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
