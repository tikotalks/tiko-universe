-- Talk sentence-api D1 schema.
-- D1 is the source of truth. KV is cache only.

CREATE TABLE IF NOT EXISTS talk_language_packs (
  id TEXT PRIMARY KEY,
  locale TEXT NOT NULL,
  version INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'retired')),
  source TEXT NOT NULL DEFAULT 'curated' CHECK (source IN ('curated', 'generated', 'fallback')),
  grammar_json TEXT NOT NULL CHECK (json_valid(grammar_json)),
  metadata_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(metadata_json)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  published_at TEXT,
  UNIQUE (locale, version)
);

CREATE TABLE IF NOT EXISTS talk_word_inventory (
  id TEXT PRIMARY KEY,
  pack_id TEXT NOT NULL REFERENCES talk_language_packs(id) ON DELETE CASCADE,
  locale TEXT NOT NULL,
  text TEXT NOT NULL,
  normalized_text TEXT NOT NULL,
  pos TEXT NOT NULL,
  category TEXT NOT NULL,
  icon TEXT,
  image TEXT,
  frequency INTEGER NOT NULL DEFAULT 0 CHECK (frequency >= 0),
  inflections_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(inflections_json)),
  metadata_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(metadata_json)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_talk_word_inventory_locale_category ON talk_word_inventory(locale, category, frequency DESC);
CREATE INDEX IF NOT EXISTS idx_talk_word_inventory_pack_pos ON talk_word_inventory(pack_id, pos, frequency DESC);

CREATE TABLE IF NOT EXISTS talk_transitions (
  id TEXT PRIMARY KEY,
  pack_id TEXT NOT NULL REFERENCES talk_language_packs(id) ON DELETE CASCADE,
  locale TEXT NOT NULL,
  from_pos TEXT NOT NULL,
  to_pos TEXT NOT NULL,
  weight REAL NOT NULL DEFAULT 1 CHECK (weight >= 0),
  source TEXT NOT NULL DEFAULT 'curated' CHECK (source IN ('curated', 'learned', 'generated')),
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (pack_id, from_pos, to_pos, source)
);

CREATE INDEX IF NOT EXISTS idx_talk_transitions_locale_from ON talk_transitions(locale, from_pos, weight DESC);

CREATE TABLE IF NOT EXISTS talk_sentence_usage (
  id TEXT PRIMARY KEY,
  locale TEXT NOT NULL,
  pack_id TEXT REFERENCES talk_language_packs(id) ON DELETE SET NULL,
  pos_sequence_json TEXT NOT NULL CHECK (json_valid(pos_sequence_json)),
  word_sequence_hash TEXT NOT NULL,
  word_count INTEGER NOT NULL CHECK (word_count > 0),
  usage_count INTEGER NOT NULL DEFAULT 1 CHECK (usage_count > 0),
  first_seen_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_seen_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  metadata_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(metadata_json)),
  UNIQUE (locale, word_sequence_hash)
);

CREATE INDEX IF NOT EXISTS idx_talk_sentence_usage_locale_last_seen ON talk_sentence_usage(locale, last_seen_at DESC);

CREATE TABLE IF NOT EXISTS talk_user_phrases (
  id TEXT PRIMARY KEY,
  subject_id TEXT NOT NULL,
  locale TEXT NOT NULL,
  sentence TEXT NOT NULL,
  word_ids_json TEXT NOT NULL CHECK (json_valid(word_ids_json)),
  label TEXT,
  is_auto INTEGER NOT NULL DEFAULT 0 CHECK (is_auto IN (0, 1)),
  usage_count INTEGER NOT NULL DEFAULT 0 CHECK (usage_count >= 0),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_talk_user_phrases_subject_locale_usage ON talk_user_phrases(subject_id, locale, usage_count DESC, updated_at DESC);

CREATE TABLE IF NOT EXISTS talk_templates (
  id TEXT PRIMARY KEY,
  pack_id TEXT NOT NULL REFERENCES talk_language_packs(id) ON DELETE CASCADE,
  locale TEXT NOT NULL,
  pattern TEXT NOT NULL,
  category TEXT NOT NULL,
  icon TEXT,
  slots_json TEXT NOT NULL CHECK (json_valid(slots_json)),
  priority INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_talk_templates_locale_category ON talk_templates(locale, category, priority DESC);
