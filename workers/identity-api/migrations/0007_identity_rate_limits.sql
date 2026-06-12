CREATE TABLE IF NOT EXISTS identity_rate_limits (
  subject_key TEXT NOT NULL,
  action TEXT NOT NULL,
  fail_count INTEGER NOT NULL DEFAULT 0,
  locked_until TEXT,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (subject_key, action)
);

CREATE INDEX IF NOT EXISTS idx_identity_rate_limits_locked
  ON identity_rate_limits (action, locked_until);
