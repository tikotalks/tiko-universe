-- Initial content-api D1 schema. Kept in sync with ../schema.sql.
CREATE TABLE IF NOT EXISTS content_projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS content_pages (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  is_published INTEGER NOT NULL DEFAULT 0,
  language_code TEXT NOT NULL DEFAULT 'en',
  navigation_order INTEGER NOT NULL DEFAULT 0,
  metadata TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (project_id) REFERENCES content_projects(id)
);

CREATE TABLE IF NOT EXISTS content_page_sections (
  id TEXT PRIMARY KEY,
  page_id TEXT NOT NULL,
  section_id TEXT,
  section_template_id TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  metadata TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (page_id) REFERENCES content_pages(id)
);

CREATE TABLE IF NOT EXISTS content_sections (
  id TEXT PRIMARY KEY,
  name TEXT,
  slug TEXT,
  template_id TEXT,
  data TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS content_items (
  id TEXT PRIMARY KEY,
  template_id TEXT,
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  language_code TEXT NOT NULL DEFAULT 'en',
  tags TEXT,
  categories TEXT,
  data TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS languages (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_content_projects_slug ON content_projects(slug);
CREATE INDEX IF NOT EXISTS idx_content_pages_project ON content_pages(project_id);
CREATE INDEX IF NOT EXISTS idx_content_pages_slug ON content_pages(slug);
CREATE INDEX IF NOT EXISTS idx_content_pages_published ON content_pages(is_published, status);
CREATE INDEX IF NOT EXISTS idx_content_page_sections_page ON content_page_sections(page_id);
CREATE INDEX IF NOT EXISTS idx_content_items_slug ON content_items(slug);
CREATE INDEX IF NOT EXISTS idx_content_items_template ON content_items(template_id);
