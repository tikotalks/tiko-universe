-- Align Radio default category icons with shared icon names instead of emoji glyphs.
UPDATE app_defaults
SET
  data_json = replace(
    replace(
      replace(
        replace(data_json, '"icon":"🐾"', '"icon":"animals/cat-head"'),
        '"icon":"📖"', '"icon":"ui/books"'
      ),
      '"icon":"🌙"', '"icon":"media/headphones"'
    ),
    '"icon":"🎵"', '"icon":"media/music-note"'
  ),
  updated_at = CURRENT_TIMESTAMP,
  version = version + 1
WHERE app = 'radio'
  AND resource = 'state'
  AND (
    data_json LIKE '%"icon":"🐾"%'
    OR data_json LIKE '%"icon":"📖"%'
    OR data_json LIKE '%"icon":"🌙"%'
    OR data_json LIKE '%"icon":"🎵"%'
  );
