CREATE TABLE IF NOT EXISTS atlas_requests (
  id TEXT PRIMARY KEY,
  capability TEXT NOT NULL,
  app TEXT NOT NULL,
  purpose TEXT NOT NULL,
  subject_id TEXT,
  provider TEXT NOT NULL,
  model TEXT,
  status TEXT NOT NULL,
  cache_status TEXT NOT NULL DEFAULT 'none',
  request_hash TEXT,
  input_redacted_json TEXT,
  output_redacted_json TEXT,
  error_code TEXT,
  error_message TEXT,
  input_units INTEGER,
  output_units INTEGER,
  estimated_cost_usd REAL,
  duration_ms INTEGER,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_atlas_requests_app_created
  ON atlas_requests(app, created_at);

CREATE INDEX IF NOT EXISTS idx_atlas_requests_capability_created
  ON atlas_requests(capability, created_at);

CREATE INDEX IF NOT EXISTS idx_atlas_requests_subject_created
  ON atlas_requests(subject_id, created_at);

CREATE TABLE IF NOT EXISTS atlas_cached_assets (
  id TEXT PRIMARY KEY,
  capability TEXT NOT NULL,
  request_hash TEXT NOT NULL UNIQUE,
  provider TEXT NOT NULL,
  model TEXT,
  r2_key TEXT NOT NULL,
  public_url TEXT NOT NULL,
  content_type TEXT NOT NULL,
  byte_size INTEGER,
  metadata_json TEXT,
  created_at TEXT NOT NULL,
  expires_at TEXT
);

CREATE TABLE IF NOT EXISTS atlas_provider_status (
  provider TEXT PRIMARY KEY,
  enabled INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'unknown',
  last_checked_at TEXT,
  last_error TEXT,
  metadata_json TEXT
);

CREATE TABLE IF NOT EXISTS atlas_route_overrides (
  id TEXT PRIMARY KEY,
  capability TEXT NOT NULL,
  app TEXT,
  purpose TEXT,
  provider TEXT NOT NULL,
  model TEXT,
  priority INTEGER NOT NULL DEFAULT 0,
  enabled INTEGER NOT NULL DEFAULT 1,
  policy_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_atlas_route_overrides_lookup
  ON atlas_route_overrides(capability, app, purpose, priority);
