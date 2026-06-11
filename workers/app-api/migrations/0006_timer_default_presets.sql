-- Seed admin-manageable Timer presets for deployments that already have app_defaults.
INSERT OR IGNORE INTO app_defaults (app, resource, data_json, updated_at, version)
VALUES (
  'timer',
  'state',
  '{"presets":[{"id":"1m","label":"1 min","seconds":60},{"id":"3m","label":"3 min","seconds":180},{"id":"5m","label":"5 min","seconds":300},{"id":"10m","label":"10 min","seconds":600}]}',
  CURRENT_TIMESTAMP,
  1
);

UPDATE app_defaults
SET
  data_json = '{"presets":[{"id":"1m","label":"1 min","seconds":60},{"id":"3m","label":"3 min","seconds":180},{"id":"5m","label":"5 min","seconds":300},{"id":"10m","label":"10 min","seconds":600}]}',
  updated_at = CURRENT_TIMESTAMP,
  version = version + 1
WHERE app = 'timer'
  AND resource = 'state'
  AND data_json = '{}';
