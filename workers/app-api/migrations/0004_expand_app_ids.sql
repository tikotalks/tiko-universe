-- Expand app-scoped data tables from the original five apps to all shared Tiko app IDs.

PRAGMA foreign_keys=off;

CREATE TABLE IF NOT EXISTS app_settings_next (
  user_id TEXT NOT NULL,
  app TEXT NOT NULL CHECK (app IN ('yes-no', 'type', 'cards', 'sequence', 'timer', 'radio', 'media', 'admin', 'tiko', 'todo', 'talk')),
  data_json TEXT NOT NULL DEFAULT '{}',
  updated_at TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (user_id, app)
);
INSERT OR REPLACE INTO app_settings_next (user_id, app, data_json, updated_at, version)
  SELECT user_id, app, data_json, updated_at, version FROM app_settings;
DROP TABLE app_settings;
ALTER TABLE app_settings_next RENAME TO app_settings;
CREATE INDEX IF NOT EXISTS idx_app_settings_user_id ON app_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_app_settings_app ON app_settings(app);

CREATE TABLE IF NOT EXISTS app_state_next (
  user_id TEXT NOT NULL,
  app TEXT NOT NULL CHECK (app IN ('yes-no', 'type', 'cards', 'sequence', 'timer', 'radio', 'media', 'admin', 'tiko', 'todo', 'talk')),
  data_json TEXT NOT NULL DEFAULT '{}',
  updated_at TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (user_id, app)
);
INSERT OR REPLACE INTO app_state_next (user_id, app, data_json, updated_at, version)
  SELECT user_id, app, data_json, updated_at, version FROM app_state;
DROP TABLE app_state;
ALTER TABLE app_state_next RENAME TO app_state;
CREATE INDEX IF NOT EXISTS idx_app_state_user_id ON app_state(user_id);
CREATE INDEX IF NOT EXISTS idx_app_state_app ON app_state(app);

CREATE TABLE IF NOT EXISTS app_defaults_next (
  app TEXT NOT NULL CHECK (app IN ('yes-no', 'type', 'cards', 'sequence', 'timer', 'radio', 'media', 'admin', 'tiko', 'todo', 'talk')),
  resource TEXT NOT NULL CHECK (resource IN ('settings', 'state')),
  data_json TEXT NOT NULL DEFAULT '{}',
  updated_at TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (app, resource)
);
INSERT OR REPLACE INTO app_defaults_next (app, resource, data_json, updated_at, version)
  SELECT app, resource, data_json, updated_at, version FROM app_defaults;
DROP TABLE app_defaults;
ALTER TABLE app_defaults_next RENAME TO app_defaults;

PRAGMA foreign_keys=on;
