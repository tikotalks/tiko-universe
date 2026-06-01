CREATE TABLE IF NOT EXISTS communication_messages (
  id TEXT PRIMARY KEY,
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  channel TEXT NOT NULL,
  type TEXT NOT NULL,
  status TEXT NOT NULL,
  from_address TEXT,
  to_address TEXT,
  subject TEXT,
  text_body TEXT,
  html_body TEXT,
  provider TEXT,
  provider_message_id TEXT,
  related_user_id TEXT,
  related_app TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_communication_messages_direction_status_created
  ON communication_messages(direction, status, created_at);

CREATE INDEX IF NOT EXISTS idx_communication_messages_provider_message
  ON communication_messages(provider, provider_message_id);

CREATE TABLE IF NOT EXISTS communication_delivery_attempts (
  id TEXT PRIMARY KEY,
  message_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  provider_message_id TEXT,
  status TEXT NOT NULL,
  error_code TEXT,
  error_message TEXT,
  attempt_number INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (message_id) REFERENCES communication_messages(id)
);

CREATE INDEX IF NOT EXISTS idx_communication_attempts_message
  ON communication_delivery_attempts(message_id, created_at);

CREATE TABLE IF NOT EXISTS communication_events (
  id TEXT PRIMARY KEY,
  message_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  provider TEXT,
  payload_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  FOREIGN KEY (message_id) REFERENCES communication_messages(id)
);

CREATE INDEX IF NOT EXISTS idx_communication_events_message
  ON communication_events(message_id, created_at);
