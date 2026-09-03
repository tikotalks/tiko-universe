-- Shareable Radio collections.
--
-- A collection is published once and handed around by its share code: a QR code
-- on a poster, a link in a message, or eight characters read out loud. Curated
-- sets built in Admin ("Disney", "Bedtime") are the same rows with featured = 1,
-- which is what the app lists when a parent opens the import screen.
--
-- Songs are stored as the JSON array the app reads back, because a shared
-- collection is a snapshot: it must keep playing exactly as published even after
-- the family that made it edits their own copy.

CREATE TABLE IF NOT EXISTS radio_shared_collections (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT 'red',
  image_url TEXT,
  songs TEXT NOT NULL DEFAULT '[]',
  song_count INTEGER NOT NULL DEFAULT 0,
  featured INTEGER NOT NULL DEFAULT 0 CHECK (featured IN (0, 1)),
  owner_user_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS radio_shared_collections_featured_idx
  ON radio_shared_collections (featured, created_at DESC);

CREATE INDEX IF NOT EXISTS radio_shared_collections_owner_idx
  ON radio_shared_collections (owner_user_id, created_at DESC);
