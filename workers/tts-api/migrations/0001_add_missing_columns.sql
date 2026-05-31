-- Migration 0001: Add columns expected by new tts-api code
-- The old tts_audio table has: id, text_hash, text, language, voice, model,
--   provider, audio_url, file_size_bytes, duration, generated_at
-- but is missing: speed, pitch, r2_key, duration_seconds

ALTER TABLE tts_audio ADD COLUMN speed REAL NOT NULL DEFAULT 1.0;
ALTER TABLE tts_audio ADD COLUMN pitch REAL NOT NULL DEFAULT 0;
ALTER TABLE tts_audio ADD COLUMN r2_key TEXT NOT NULL DEFAULT '';
ALTER TABLE tts_audio ADD COLUMN duration_seconds REAL;
