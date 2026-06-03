-- Generated audio (TTS) records
CREATE TABLE IF NOT EXISTS generated_audio (
  id TEXT PRIMARY KEY,
  request_hash TEXT NOT NULL UNIQUE,
  text TEXT NOT NULL,
  language TEXT NOT NULL,
  provider TEXT NOT NULL,
  voice TEXT NOT NULL,
  model TEXT NOT NULL,
  speed REAL NOT NULL DEFAULT 1.0,
  pitch REAL NOT NULL DEFAULT 0.0,
  audio_url TEXT NOT NULL,
  r2_key TEXT NOT NULL,
  content_type TEXT NOT NULL DEFAULT 'audio/mpeg',
  file_size_bytes INTEGER,
  duration_seconds REAL,
  generated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS generated_audio_hash_idx ON generated_audio (request_hash);

-- Generated images (DALL-E 3) records
CREATE TABLE IF NOT EXISTS generated_images (
  id TEXT PRIMARY KEY,
  prompt TEXT NOT NULL,
  revised_prompt TEXT,
  model TEXT NOT NULL DEFAULT 'dall-e-3',
  size TEXT NOT NULL DEFAULT '1024x1024',
  quality TEXT NOT NULL DEFAULT 'standard',
  style TEXT NOT NULL DEFAULT 'vivid',
  image_url TEXT,
  r2_key TEXT NOT NULL,
  content_type TEXT NOT NULL DEFAULT 'image/png',
  file_size_bytes INTEGER,
  width INTEGER,
  height INTEGER,
  category TEXT NOT NULL DEFAULT 'generated',
  tags TEXT NOT NULL DEFAULT '[]',
  title TEXT,
  description TEXT,
  is_public INTEGER NOT NULL DEFAULT 1 CHECK (is_public IN (0, 1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS generated_images_created_idx ON generated_images (created_at DESC);
CREATE INDEX IF NOT EXISTS generated_images_public_idx ON generated_images (is_public, created_at DESC);

-- Story records (multi-segment TTS narratives)
CREATE TABLE IF NOT EXISTS stories (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  voice TEXT NOT NULL DEFAULT 'nova',
  speed REAL NOT NULL DEFAULT 1.0,
  segments TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'rendering', 'complete', 'error')),
  audio_url TEXT,
  r2_key TEXT,
  duration_seconds REAL,
  file_size_bytes INTEGER,
  category TEXT NOT NULL DEFAULT 'story',
  tags TEXT NOT NULL DEFAULT '[]',
  is_public INTEGER NOT NULL DEFAULT 1 CHECK (is_public IN (0, 1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS stories_status_idx ON stories (status, created_at DESC);
CREATE INDEX IF NOT EXISTS stories_public_idx ON stories (is_public, created_at DESC);

-- Story creator drafts: chapter model, cover, target audio album, settings.
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
