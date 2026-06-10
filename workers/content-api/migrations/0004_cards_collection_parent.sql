ALTER TABLE cards_collections ADD COLUMN parent_id TEXT;
CREATE INDEX IF NOT EXISTS idx_cards_collections_parent ON cards_collections(parent_id, display_order);
