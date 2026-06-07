CREATE TABLE IF NOT EXISTS app_progress (
  user_id TEXT NOT NULL,
  app TEXT NOT NULL,
  data_json TEXT NOT NULL DEFAULT '{}',
  updated_at TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (user_id, app)
);

CREATE INDEX IF NOT EXISTS idx_app_progress_user_id ON app_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_app_progress_app ON app_progress(app);
