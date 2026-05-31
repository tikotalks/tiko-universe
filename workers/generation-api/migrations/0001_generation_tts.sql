CREATE TABLE IF NOT EXISTS generated_audio (
  id TEXT PRIMARY KEY,
  request_hash TEXT NOT NULL UNIQUE,
  text TEXT NOT NULL,
  language TEXT NOT NULL,
  provider TEXT NOT NULL,
  voice TEXT NOT NULL,
  model TEXT NOT NULL,
  speed REAL NOT NULL DEFAULT 1.0,
  pitch REAL NOT NULL DEFAULT 0,
  audio_url TEXT NOT NULL,
  r2_key TEXT NOT NULL,
  content_type TEXT NOT NULL DEFAULT 'audio/mpeg',
  file_size_bytes INTEGER,
  duration_seconds REAL,
  generated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_generated_audio_request_hash ON generated_audio(request_hash);
CREATE INDEX IF NOT EXISTS idx_generated_audio_language ON generated_audio(language);
CREATE INDEX IF NOT EXISTS idx_generated_audio_generated_at ON generated_audio(generated_at);
