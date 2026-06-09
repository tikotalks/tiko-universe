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

-- Cards app: default collections and cards served to all clients
CREATE TABLE IF NOT EXISTS cards_collections (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  color_hex INTEGER NOT NULL DEFAULT 0,
  display_order INTEGER NOT NULL DEFAULT 0,
  media_categories TEXT,                   -- JSON array e.g. '["animals"]'
  language_code TEXT NOT NULL DEFAULT 'en',
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS cards_tiles (
  id TEXT PRIMARY KEY,
  collection_id TEXT NOT NULL,
  title TEXT NOT NULL,
  speech TEXT NOT NULL,
  color_hex INTEGER NOT NULL DEFAULT 0,
  display_order INTEGER NOT NULL DEFAULT 0,
  image_ref TEXT,
  FOREIGN KEY (collection_id) REFERENCES cards_collections(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_cards_collections_order ON cards_collections(display_order, language_code);
CREATE INDEX IF NOT EXISTS idx_cards_tiles_collection ON cards_tiles(collection_id, display_order);

CREATE TABLE IF NOT EXISTS user_images (
  id TEXT PRIMARY KEY,
  r2_key TEXT NOT NULL,
  content_type TEXT NOT NULL DEFAULT 'image/png',
  file_size_bytes INTEGER,
  width INTEGER,
  height INTEGER,
  uploaded_by TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_user_images_uploaded_by ON user_images(uploaded_by);
