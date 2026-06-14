-- Apply the Ankore identity core schema to databases that already applied the
-- Tiko-local identity migrations 0001/0002. Removed tables are left in place for
-- audit visibility, but the Worker no longer reads or writes them.

CREATE TABLE IF NOT EXISTS identity_subjects (
  id TEXT PRIMARY KEY,
  product TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('anonymous', 'device', 'account', 'service')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  disabled_at TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS identity_devices (
  id TEXT PRIMARY KEY,
  subject_id TEXT NOT NULL REFERENCES identity_subjects(id),
  product TEXT NOT NULL,
  secret_hash TEXT NOT NULL,
  label TEXT,
  user_agent_hash TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  last_seen_at TEXT,
  revoked_at TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_identity_devices_subject ON identity_devices(subject_id);
CREATE INDEX IF NOT EXISTS idx_identity_devices_secret_hash ON identity_devices(secret_hash);

CREATE TABLE IF NOT EXISTS identity_sessions (
  id TEXT PRIMARY KEY,
  subject_id TEXT NOT NULL REFERENCES identity_subjects(id),
  device_id TEXT REFERENCES identity_devices(id),
  product TEXT NOT NULL,
  transport TEXT NOT NULL CHECK (transport IN ('bearer', 'cookie')),
  token_hash TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  expires_at TEXT NOT NULL,
  last_seen_at TEXT,
  revoked_at TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_identity_sessions_subject ON identity_sessions(subject_id);
CREATE INDEX IF NOT EXISTS idx_identity_sessions_token_hash ON identity_sessions(token_hash);

CREATE TABLE IF NOT EXISTS identity_accounts (
  id TEXT PRIMARY KEY,
  subject_id TEXT NOT NULL REFERENCES identity_subjects(id),
  product TEXT NOT NULL,
  email_hash TEXT,
  email_plain TEXT,
  email_verified_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  disabled_at TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_identity_accounts_subject ON identity_accounts(subject_id);
CREATE INDEX IF NOT EXISTS idx_identity_accounts_email_hash ON identity_accounts(email_hash);

CREATE TABLE IF NOT EXISTS identity_email_challenges (
  id TEXT PRIMARY KEY,
  subject_id TEXT REFERENCES identity_subjects(id),
  account_id TEXT REFERENCES identity_accounts(id),
  product TEXT NOT NULL,
  purpose TEXT NOT NULL CHECK (purpose IN ('verify_email', 'recover', 'link_account', 'admin_login')),
  email_hash TEXT NOT NULL,
  token_hash TEXT,
  otp_hash TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  expires_at TEXT NOT NULL,
  consumed_at TEXT,
  attempt_count INTEGER NOT NULL DEFAULT 0,
  metadata_json TEXT NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_identity_email_challenges_email ON identity_email_challenges(email_hash, purpose, expires_at);
CREATE INDEX IF NOT EXISTS idx_identity_email_challenges_token ON identity_email_challenges(token_hash);
CREATE INDEX IF NOT EXISTS idx_identity_email_challenges_otp ON identity_email_challenges(otp_hash);

CREATE TABLE IF NOT EXISTS identity_api_keys (
  id TEXT PRIMARY KEY,
  subject_id TEXT NOT NULL REFERENCES identity_subjects(id),
  product TEXT NOT NULL,
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL UNIQUE,
  key_prefix TEXT NOT NULL,
  scopes_json TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  expires_at TEXT,
  last_used_at TEXT,
  revoked_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_identity_api_keys_subject ON identity_api_keys(subject_id);
CREATE INDEX IF NOT EXISTS idx_identity_api_keys_hash ON identity_api_keys(key_hash);

CREATE TABLE IF NOT EXISTS identity_entitlements (
  id TEXT PRIMARY KEY,
  subject_id TEXT NOT NULL REFERENCES identity_subjects(id),
  product TEXT NOT NULL,
  key TEXT NOT NULL,
  value_json TEXT NOT NULL DEFAULT '{}',
  source TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  expires_at TEXT,
  revoked_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_identity_entitlements_subject ON identity_entitlements(subject_id);
CREATE INDEX IF NOT EXISTS idx_identity_entitlements_key ON identity_entitlements(product, key);

CREATE TABLE IF NOT EXISTS identity_audit_events (
  id TEXT PRIMARY KEY,
  subject_id TEXT REFERENCES identity_subjects(id),
  actor_subject_id TEXT REFERENCES identity_subjects(id),
  product TEXT NOT NULL,
  type TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  ip_hash TEXT,
  user_agent_hash TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_identity_audit_subject ON identity_audit_events(subject_id, created_at);
CREATE INDEX IF NOT EXISTS idx_identity_audit_type ON identity_audit_events(product, type, created_at);
