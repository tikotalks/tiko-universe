-- Seed admin-manageable Type starter prompts for deployments that already have app_defaults.
INSERT OR IGNORE INTO app_defaults (app, resource, data_json, updated_at, version)
VALUES (
  'type',
  'state',
  '{"text":"","prompts":["I need help","I want a break","I am finished","Thank you"],"completedPrompts":[]}',
  CURRENT_TIMESTAMP,
  1
);

UPDATE app_defaults
SET
  data_json = '{"text":"","prompts":["I need help","I want a break","I am finished","Thank you"],"completedPrompts":[]}',
  updated_at = CURRENT_TIMESTAMP,
  version = version + 1
WHERE app = 'type'
  AND resource = 'state'
  AND data_json = '{"text":"","completedPrompts":[]}';
