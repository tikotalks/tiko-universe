-- Product-scoped roles for Tiko identity subjects. These are explicit
-- assignments, not global platform roles. The first configured admin email is
-- bootstrapped into this table by admin-api, then admin access is role-based.

CREATE TABLE IF NOT EXISTS identity_role_assignments (
  id TEXT PRIMARY KEY,
  subject_id TEXT NOT NULL REFERENCES identity_subjects(id),
  product TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('guest', 'user', 'child', 'profile_manager', 'content_editor', 'admin')),
  source TEXT NOT NULL CHECK (source IN ('default', 'bootstrap', 'manual', 'managed_login')),
  actor_subject_id TEXT REFERENCES identity_subjects(id),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  revoked_at TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_identity_role_assignments_subject ON identity_role_assignments(subject_id, product, revoked_at);
CREATE INDEX IF NOT EXISTS idx_identity_role_assignments_role ON identity_role_assignments(product, role, revoked_at);
CREATE UNIQUE INDEX IF NOT EXISTS idx_identity_role_assignments_active_unique ON identity_role_assignments(subject_id, product, role) WHERE revoked_at IS NULL;
