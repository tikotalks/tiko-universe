ALTER TABLE generated_images ADD COLUMN is_preview INTEGER NOT NULL DEFAULT 0 CHECK (is_preview IN (0, 1));
