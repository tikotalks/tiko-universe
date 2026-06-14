-- Durable image generation queue. Jobs are enqueued by clients, processed
-- asynchronously by waitUntil/cron, and polled for status. Survives client
-- disconnects (the whole point: closing the laptop must not lose the queue).
CREATE TABLE IF NOT EXISTS generation_jobs (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('generate', 'edit', 'upscale')),
  input_json TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'done', 'error')),
  result_json TEXT,
  error_code TEXT,
  error_message TEXT,
  created_by TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  processed_at TEXT
);

-- The processor claims the oldest pending job (cron + waitUntil race safely).
CREATE INDEX IF NOT EXISTS generation_jobs_status_idx ON generation_jobs (status, created_at);
CREATE INDEX IF NOT EXISTS generation_jobs_owner_idx ON generation_jobs (created_by, created_at DESC);
