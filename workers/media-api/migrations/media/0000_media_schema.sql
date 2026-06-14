CREATE TABLE IF NOT EXISTS media (
  id TEXT PRIMARY KEY,
  name TEXT,
  filename TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type TEXT NOT NULL,
  width INTEGER,
  height INTEGER,
  alt_text TEXT,
  title TEXT,
  description TEXT,
  categories TEXT NOT NULL DEFAULT '[]',
  tags TEXT NOT NULL DEFAULT '[]',
  is_private INTEGER NOT NULL DEFAULT 0 CHECK (is_private IN (0, 1)),
  original_url TEXT NOT NULL,
  thumbnail_url TEXT,
  medium_url TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS media_private_created_idx
  ON media (is_private, created_at DESC);

CREATE TABLE IF NOT EXISTS audio_albums (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  cover_media_id TEXT,
  visibility TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('public', 'private')),
  radio_enabled INTEGER NOT NULL DEFAULT 0 CHECK (radio_enabled IN (0, 1)),
  sort_mode TEXT NOT NULL DEFAULT 'manual' CHECK (sort_mode IN ('manual', 'created_desc', 'title_asc')),
  settings TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (cover_media_id) REFERENCES media(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS audio_albums_radio_idx
  ON audio_albums (visibility, radio_enabled, created_at DESC);

CREATE TABLE IF NOT EXISTS audio_tracks (
  id TEXT PRIMARY KEY,
  album_id TEXT NOT NULL,
  media_id TEXT NOT NULL,
  title TEXT NOT NULL,
  artist TEXT,
  duration_seconds REAL,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (album_id) REFERENCES audio_albums(id) ON DELETE CASCADE,
  FOREIGN KEY (media_id) REFERENCES media(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS audio_tracks_album_position_idx
  ON audio_tracks (album_id, position ASC, created_at ASC);
