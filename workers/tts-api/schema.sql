CREATE TABLE IF NOT EXISTS tts_audio (
  id TEXT PRIMARY KEY,
  text_hash TEXT NOT NULL UNIQUE,
  text TEXT NOT NULL,
  language TEXT NOT NULL,
  provider TEXT NOT NULL,
  voice TEXT NOT NULL,
  model TEXT NOT NULL,
  speed REAL NOT NULL DEFAULT 1.0,
  pitch REAL NOT NULL DEFAULT 0,
  audio_url TEXT NOT NULL,
  r2_key TEXT NOT NULL,
  file_size_bytes INTEGER,
  duration_seconds REAL,
  generated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_tts_audio_hash ON tts_audio(text_hash);
CREATE INDEX IF NOT EXISTS idx_tts_audio_language ON tts_audio(language);
