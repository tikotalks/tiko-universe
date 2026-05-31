CREATE TABLE IF NOT EXISTS api_keys (
  key_hash TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  scopes TEXT DEFAULT 'tts,media,generation',
  created_at TEXT DEFAULT (datetime('now')),
  expires_at TEXT,
  active INTEGER DEFAULT 1
);
