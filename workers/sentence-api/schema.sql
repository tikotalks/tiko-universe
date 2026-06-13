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

-- AI-powered word predictions per sequence, with usage-based score blending.
-- sequence_hash = sha256 of the ordered word IDs joined by comma (empty string for start).
-- ai_score is set once by the LLM. final_score is recalculated by the scheduled job
-- as a blend of ai_score and the observed click-through rate for this (sequence, word) pair.
CREATE TABLE IF NOT EXISTS talk_word_predictions (
  id TEXT PRIMARY KEY,
  pack_id TEXT NOT NULL REFERENCES talk_language_packs(id) ON DELETE CASCADE,
  locale TEXT NOT NULL,
  sequence_hash TEXT NOT NULL,
  sequence_text TEXT NOT NULL DEFAULT '',
  word_id TEXT NOT NULL REFERENCES talk_word_inventory(id) ON DELETE CASCADE,
  ai_score REAL NOT NULL DEFAULT 0 CHECK (ai_score >= 0 AND ai_score <= 1),
  click_count INTEGER NOT NULL DEFAULT 0 CHECK (click_count >= 0),
  final_score REAL NOT NULL DEFAULT 0 CHECK (final_score >= 0 AND final_score <= 1),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (pack_id, sequence_hash, word_id)
);

CREATE INDEX IF NOT EXISTS idx_talk_word_predictions_seq ON talk_word_predictions(pack_id, sequence_hash, final_score DESC);

-- User-added vocabulary: words a user typed in themselves (e.g. a name like "Sil")
-- that are not in the curated pack. Scoped per subject + locale. Surfaced in the
-- board and resolvable inside sentences/saved phrases for that user only.
CREATE TABLE IF NOT EXISTS talk_user_words (
  id TEXT PRIMARY KEY,
  subject_id TEXT NOT NULL,
  locale TEXT NOT NULL,
  text TEXT NOT NULL,
  normalized_text TEXT NOT NULL,
  pos TEXT NOT NULL DEFAULT 'noun',
  category TEXT NOT NULL DEFAULT 'mine',
  icon TEXT,
  usage_count INTEGER NOT NULL DEFAULT 1 CHECK (usage_count > 0),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (subject_id, locale, normalized_text)
);

CREATE INDEX IF NOT EXISTS idx_talk_user_words_subject ON talk_user_words(subject_id, locale, pos);

-- Per-user learning overlay: how often a specific subject picked a word after a
-- given sequence. Personalizes ranking on top of the global predictions without
-- polluting the shared model.
CREATE TABLE IF NOT EXISTS talk_user_affinity (
  subject_id TEXT NOT NULL,
  locale TEXT NOT NULL,
  sequence_hash TEXT NOT NULL,
  word_id TEXT NOT NULL,
  click_count INTEGER NOT NULL DEFAULT 1 CHECK (click_count > 0),
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (subject_id, sequence_hash, word_id)
);

CREATE INDEX IF NOT EXISTS idx_talk_user_affinity_lookup ON talk_user_affinity(subject_id, sequence_hash, click_count DESC);

-- Concept -> Tiko media image, keyed by the shared (English-derived) word id.
-- Single source of truth for word pictures: one row per concept, applied to
-- every language by id, editable from admin. source='auto' rows come from the
-- media-search enrichment; 'manual' rows are admin overrides and are preserved.
CREATE TABLE IF NOT EXISTS talk_media_map (
  concept_id TEXT PRIMARY KEY,
  image_url TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'auto' CHECK (source IN ('auto', 'manual')),
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
