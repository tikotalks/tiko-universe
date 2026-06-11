-- App content stores media IDs only. Render URLs are resolved from image_ref.
ALTER TABLE content_items DROP COLUMN image_url;
