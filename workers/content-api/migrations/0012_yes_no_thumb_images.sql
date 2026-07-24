-- Add Tiko media thumbnails to default Yes/No answer tiles
-- Thumb up (yes) and thumb down (no) from the media library

UPDATE content_items
  SET image_ref = 'c8bfb9e8-0427-4cd9-89e2-74e09d20b8ec'
  WHERE id = 'yes-no-answer-yes-no-yes' AND app_id = 'yes-no';

UPDATE content_items
  SET image_ref = 'c3c40f22-8968-413c-82d5-8cbd5bf57c55'
  WHERE id = 'yes-no-answer-yes-no-no' AND app_id = 'yes-no';

-- Also add images to the quick-choices yes/no variants
UPDATE content_items
  SET image_ref = 'c8bfb9e8-0427-4cd9-89e2-74e09d20b8ec'
  WHERE id = 'yes-no-answer-quick-yes' AND app_id = 'yes-no';

UPDATE content_items
  SET image_ref = 'c3c40f22-8968-413c-82d5-8cbd5bf57c55'
  WHERE id = 'yes-no-answer-quick-no' AND app_id = 'yes-no';
