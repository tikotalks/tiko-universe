-- Media table (ported from media-cache / media-upload)
CREATE TABLE IF NOT EXISTS media (
  id TEXT PRIMARY KEY,
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type TEXT NOT NULL,
  width INTEGER,
  height INTEGER,
  alt_text TEXT,
  title TEXT,
  description TEXT,
  folder TEXT,
  tags TEXT NOT NULL DEFAULT '[]',
  is_private INTEGER NOT NULL DEFAULT 0 CHECK (is_private IN (0, 1)),
  original_url TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS media_private_created_idx
  ON media (is_private, created_at DESC);

-- Assets table (ported from assets-upload)
CREATE TABLE IF NOT EXISTS assets (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  filename TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  file_path TEXT NOT NULL UNIQUE,
  file_size INTEGER NOT NULL,
  mime_type TEXT NOT NULL,
  file_extension TEXT NOT NULL,
  categories TEXT NOT NULL DEFAULT '[]',
  tags TEXT NOT NULL DEFAULT '[]',
  width INTEGER,
  height INTEGER,
  duration INTEGER,
  is_public INTEGER NOT NULL DEFAULT 0 CHECK (is_public IN (0, 1)),
  user_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS assets_public_created_idx
  ON assets (is_public, created_at DESC);

CREATE INDEX IF NOT EXISTS assets_user_created_idx
  ON assets (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS assets_mime_created_idx
  ON assets (mime_type, created_at DESC);
