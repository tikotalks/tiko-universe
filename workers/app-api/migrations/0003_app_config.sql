CREATE TABLE IF NOT EXISTS app_config (
  app TEXT PRIMARY KEY CHECK (app IN ('yes-no', 'type', 'cards', 'sequence', 'timer', 'radio', 'media', 'admin', 'tiko', 'todo', 'talk')),
  title TEXT NOT NULL,
  app_color TEXT NOT NULL,
  app_icon TEXT NOT NULL,
  app_icon_media_category TEXT,
  app_icon_image_url TEXT,
  theme_color TEXT,
  updated_at TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1
);
