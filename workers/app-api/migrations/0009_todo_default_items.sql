-- Add starter Todo items so new Todo installs are useful from first launch.
INSERT INTO app_defaults (app, resource, data_json, updated_at, version)
VALUES (
  'todo',
  'settings',
  '{"language":"en","colorMode":"system"}',
  CURRENT_TIMESTAMP,
  1
)
ON CONFLICT(app, resource) DO UPDATE SET
  data_json = excluded.data_json,
  updated_at = CURRENT_TIMESTAMP,
  version = app_defaults.version + 1
WHERE app_defaults.data_json = '{}';

INSERT INTO app_defaults (app, resource, data_json, updated_at, version)
VALUES (
  'todo',
  'state',
  '{"items":[{"id":"morning-routine","name":"Morning routine","done":false,"steps":[{"name":"Brush teeth","done":false},{"name":"Get dressed","done":false},{"name":"Pack bag","done":false}]},{"id":"after-school","name":"After school","done":false,"steps":[{"name":"Hang up coat","done":false},{"name":"Wash hands","done":false},{"name":"Choose a snack","done":false}]},{"id":"bedtime","name":"Bedtime","done":false,"steps":[{"name":"Put on pajamas","done":false},{"name":"Brush teeth","done":false},{"name":"Choose a story","done":false}]}]}',
  CURRENT_TIMESTAMP,
  1
)
ON CONFLICT(app, resource) DO UPDATE SET
  data_json = excluded.data_json,
  updated_at = CURRENT_TIMESTAMP,
  version = app_defaults.version + 1
WHERE app_defaults.data_json = '{}';
