-- Manager-created child/student-style access-code credentials.
-- Product-specific profile/group/app assignments stay outside Ankore; this table
-- only lets a managed subject receive a child session from a stable resettable code.

CREATE TABLE IF NOT EXISTS identity_managed_credentials (
  id TEXT PRIMARY KEY,
  subject_id TEXT NOT NULL REFERENCES identity_subjects(id),
  manager_subject_id TEXT NOT NULL REFERENCES identity_subjects(id),
  product TEXT NOT NULL,
  handle TEXT NOT NULL,
  handle_norm TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  display_name TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  revoked_at TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_identity_managed_credentials_manager ON identity_managed_credentials(manager_subject_id, product, revoked_at);
CREATE INDEX IF NOT EXISTS idx_identity_managed_credentials_subject ON identity_managed_credentials(subject_id, product, revoked_at);
CREATE UNIQUE INDEX IF NOT EXISTS idx_identity_managed_credentials_handle_active ON identity_managed_credentials(product, handle_norm) WHERE revoked_at IS NULL;
