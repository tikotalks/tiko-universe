CREATE TABLE IF NOT EXISTS identity_pin_grants (
  id TEXT PRIMARY KEY,
  subject_id TEXT NOT NULL REFERENCES identity_subjects(id),
  product TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  purpose TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  expires_at TEXT NOT NULL,
  consumed_at TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_identity_pin_grants_subject ON identity_pin_grants(subject_id, purpose, expires_at);
CREATE INDEX IF NOT EXISTS idx_identity_pin_grants_token ON identity_pin_grants(token_hash);
