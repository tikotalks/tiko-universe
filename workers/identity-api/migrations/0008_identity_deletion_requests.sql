CREATE TABLE IF NOT EXISTS identity_deletion_requests (
  id TEXT PRIMARY KEY,
  subject_id TEXT NOT NULL REFERENCES identity_subjects(id),
  scope TEXT NOT NULL CHECK (scope IN ('account', 'child_account', 'local-device')),
  status TEXT NOT NULL DEFAULT 'requested' CHECK (status IN ('requested', 'awaiting-verification', 'completed', 'cancelled', 'failed')),
  child_account_id TEXT,
  pin_grant_token TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  completed_at TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(metadata_json))
);

CREATE INDEX IF NOT EXISTS idx_identity_deletion_requests_subject
  ON identity_deletion_requests(subject_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_identity_deletion_requests_status
  ON identity_deletion_requests(status, created_at);
