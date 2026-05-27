CREATE TABLE IF NOT EXISTS app_settings (
  user_id TEXT NOT NULL,
  app TEXT NOT NULL CHECK (app IN ('yes-no', 'type', 'cards', 'sequence', 'timer')),
  data_json TEXT NOT NULL DEFAULT '{}',
  updated_at TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (user_id, app)
);

CREATE INDEX IF NOT EXISTS idx_app_settings_user_id ON app_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_app_settings_app ON app_settings(app);

CREATE TABLE IF NOT EXISTS app_state (
  user_id TEXT NOT NULL,
  app TEXT NOT NULL CHECK (app IN ('yes-no', 'type', 'cards', 'sequence', 'timer')),
  data_json TEXT NOT NULL DEFAULT '{}',
  updated_at TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (user_id, app)
);

CREATE INDEX IF NOT EXISTS idx_app_state_user_id ON app_state(user_id);
CREATE INDEX IF NOT EXISTS idx_app_state_app ON app_state(app);
