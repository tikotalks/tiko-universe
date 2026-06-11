ALTER TABLE app_config ADD COLUMN supported_languages_mode TEXT NOT NULL DEFAULT 'tiko-defaults';
ALTER TABLE app_config ADD COLUMN supported_languages_json TEXT;
