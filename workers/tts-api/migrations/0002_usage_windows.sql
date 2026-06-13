CREATE TABLE IF NOT EXISTS tts_usage_windows (
  subject_key TEXT NOT NULL,
  capability TEXT NOT NULL,
  window_kind TEXT NOT NULL,
  window_start TEXT NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 0,
  unit_count INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (subject_key, capability, window_kind, window_start)
);

CREATE INDEX IF NOT EXISTS tts_usage_windows_updated_idx ON tts_usage_windows (updated_at);
