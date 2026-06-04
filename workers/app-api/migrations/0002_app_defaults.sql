CREATE TABLE IF NOT EXISTS app_defaults (
  app TEXT NOT NULL CHECK (app IN ('yes-no', 'type', 'cards', 'sequence', 'timer')),
  resource TEXT NOT NULL CHECK (resource IN ('settings', 'state')),
  data_json TEXT NOT NULL DEFAULT '{}',
  updated_at TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (app, resource)
);
