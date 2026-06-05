# Talk App — Architecture

> Technical architecture for the Talk sentence-building app. Product direction lives in SPEC.md. Principles in DOCTRINE.md.

## Architecture Principle

**Dumb frontend, smart backend.**

The web, iOS, and Android apps are thin render layers. They contain no grammar logic, no language packs, no POS knowledge, no suggestion algorithms. Every sentence-building interaction is an API call. The backend is the brain. The frontend is the face.

When the backend gets smarter, the apps get smarter — without updating the apps.

---

## System Overview

```
┌─────────────────────────────────────────────────────────┐
│                     Frontend (Thin)                      │
│  ┌──────────┐  ┌───────────┐  ┌──────────┐  ┌────────┐ │
│  │ Sentence  │  │   Word    │  │ Template │  │ Saved  │ │
│  │  Strip    │  │   Grid    │  │  Picker  │  │Phrases │ │
│  └────┬─────┘  └─────┬─────┘  └────┬─────┘  └───┬────┘ │
│       │              │              │             │      │
│       └──────────────┴──────┬───────┴─────────────┘      │
│                             │                            │
│                    Sentence API Client                    │
└─────────────────────────────┼────────────────────────────┘
                              │ HTTPS
┌─────────────────────────────┼────────────────────────────┐
│                   workers/sentence-api/                   │
│                             │                            │
│  ┌──────────────┐  ┌───────┴────────┐  ┌──────────────┐ │
│  │   Pack       │  │  Transition    │  │   Usage      │ │
│  │   Loader     │  │  Engine        │  │   Logger     │ │
│  └──────┬───────┘  └───────┬────────┘  └──────┬───────┘ │
│         │                  │                   │         │
│  ┌──────┴──────────────────┴───────────────────┴──────┐  │
│  │                  KV Cache Layer                    │  │
│  └──────────────────────┬─────────────────────────────┘  │
│                         │                                │
│  ┌──────────────────────┴─────────────────────────────┐  │
│  │                  D1: sentence_db                    │  │
│  │  ┌────────────┐ ┌─────────────┐ ┌──────────────┐  │  │
│  │  │ language_  │ │ transitions │ │ sentence_    │  │  │
│  │  │ packs      │ │             │ │ usage        │  │  │
│  │  └────────────┘ └─────────────┘ └──────────────┘  │  │
│  │  ┌────────────┐ ┌─────────────┐ ┌──────────────┐  │  │
│  │  │ word_      │ │ user_       │ │ templates    │  │  │
│  │  │ inventory  │ │ phrases     │ │              │  │  │
│  │  └────────────┘ └─────────────┘ └──────────────┘  │  │
│  └───────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
                              │
                              │ TTS audio via
                              ▼
                   workers/generation-api/
                    (existing TTS pipeline)
```

---

## Components

### 1. `workers/sentence-api/` — The Brain

New Cloudflare Worker. Owns all sentence intelligence.

**Responsibilities:**
- Serve vocabulary tiles organized by POS category
- Serve sentence templates
- Compute and cache grammar-aware suggestions
- Format completed sentences (capitalization, punctuation)
- Log usage for learning
- Manage per-user saved phrases
- Periodically recalculate transition weights from usage data

**Does NOT:**
- Call LLMs at runtime
- Generate audio (delegates to `generation-api`)
- Handle identity (uses `@tiko/identity` / Ankore session validation)
- Store raw sentence logs indefinitely

**Bindings:**
- D1: `DB` — persistent relational data (follows existing worker convention)
- KV: `CACHE` — hot transition/suggestion cache (follows existing worker convention)

### 2. Frontend (`apps/talk/web/`)

Thin Vue 3 SPA. Renders what the API returns.

**Responsibilities:**
- Render sentence strip (word tiles in sequence)
- Render word grid (organized by categories from API)
- Render template picker (templates from API)
- Render suggestion bar (suggestions from API)
- Render saved phrases (phrases from API)
- On tap: POST current state to API, render response
- On speak: play audio URL from API
- Offline fallback: bundled minimal language pack (limited vocabulary, no suggestions)

**Does NOT:**
- Know what a verb is
- Contain grammar rules
- Compute suggestions
- Contain full language packs (only offline fallback)
- Do POS tagging

### 3. `workers/generation-api/` — TTS (Existing)

Already built. Talk uses the existing TTS pipeline through the `GENERATION_SERVICE` Worker service binding:
- Sentence API sends the completed sentence text to the generation worker's TTS handler.
- The public route equivalent is `POST /v1/generation/tts`, but Worker-to-Worker calls should use the service binding, not a browser-facing HTTP dependency.
- Returns cached audio URL or generates new audio.
- Talk does not rebuild this; it consumes it.

---

## API Contract

### `GET /v1/sentence/start`

Start a new sentence session. Returns initial state.

**Query params:** `locale` (required), `userId` (optional — Ankore subject ID for personalized suggestions)

**Response:**
```typescript
{
  templates: Template[],           // sentence frames available
  initialCategories: Category[],   // word categories to show first
  initialWords: WordTile[],        // starter words (pronouns, common starters)
  savedPhrases: SavedPhrase[],     // user's frequent/saved sentences
  stripState: {
    words: [],                     // empty strip
    validNext: string[],           // valid POS types for first word
    canComplete: false
  }
}
```

### `POST /v1/sentence/next`

Get suggestions and valid next words after adding a word to the strip.

**Request:**
```typescript
{
  currentWords: string[],   // word IDs currently in the strip
  locale: string,
  userId?: string           // Ankore subject ID
}
```

**Response:**
```typescript
{
  suggestions: WordTile[],         // ranked next-word suggestions (up to 12)
  categories: Category[],          // categories relevant to current state
  words: Record<string, WordTile[]>, // full word lists per category
  stripState: {
    display: string,               // "I want ___"
    validNext: string[],           // valid POS types
    canComplete: boolean           // can this be spoken now?
  }
}
```

### `POST /v1/sentence/complete`

Finalize and speak a sentence.

**Request:**
```typescript
{
  wordIds: string[],        // ordered word IDs from the strip
  locale: string,
  userId?: string,          // Ankore subject ID
  autoSave?: boolean        // save to user phrases?
}
```

**Response:**
```typescript
{
  sentence: string,               // "I want juice."
  audioUrl: string,               // TTS audio URL from generation-api
  audioCached: boolean,           // was audio already cached?
  savedPhraseId?: string,         // if saved/found as frequent phrase
  templateMatch?: string          // if this matches a known template pattern
}
```

### `GET /v1/sentence/vocabulary`

Browse full vocabulary for a locale.

**Query params:** `locale` (required), `category` (optional), `pos` (optional)

**Response:**
```typescript
{
  words: WordTile[],
  categories: Category[],
  totalWords: number
}
```

### `GET /v1/sentence/phrases`

Get user's saved/frequent phrases.

**Query params:** `locale` (required), `userId` (required — Ankore subject ID)

**Response:**
```typescript
{
  phrases: SavedPhrase[]
}
```

### `POST /v1/sentence/phrases`

Save a phrase manually.

**Request:**
```typescript
{
  wordIds: string[],
  locale: string,
  userId: string,           // Ankore subject ID
  label?: string            // optional custom label
}
```

### `DELETE /v1/sentence/phrases/:phraseId`

Remove a saved phrase.

### `POST /v1/sentence-admin/generate-pack` (admin only)

AI-generate a new language pack from an existing one.

**Request:**
```typescript
{
  baseLocale: string,       // e.g. "en"
  targetLocale: string      // e.g. "nl"
}
```

**Response:**
```typescript
{
  pack: LanguagePack,        // generated pack, pending review
  warnings: string[]         // any issues found during generation
}
```

---

## Data Model

### D1 Tables

#### `language_packs`

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT PK | UUID |
| locale | TEXT | BCP 47 locale code |
| version | INTEGER | Pack version for cache invalidation |
| pack_data | TEXT | JSON — full pack (words, templates, grammar) |
| source | TEXT | 'curated' \| 'ai-generated' \| 'community' |
| status | TEXT | 'draft' \| 'active' \| 'deprecated' |
| created_at | TEXT | ISO timestamp |
| updated_at | TEXT | ISO timestamp |

#### `word_inventory`

Denormalized from packs for fast querying.

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT PK | UUID |
| locale | TEXT | Locale code |
| word | TEXT | Display text |
| pos | TEXT | Part of speech tag |
| category | TEXT | Category name |
| frequency | INTEGER | Usage frequency rank (1-10) |
| icon | TEXT | open-icon name (nullable) |
| inflections | TEXT | JSON — inflection map (nullable) |
| pack_version | INTEGER | Pack version this word came from |

#### `transitions`

Pre-computed and learned transition weights.

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT PK | UUID |
| locale | TEXT | Locale code |
| from_pos_sequence | TEXT | JSON array of POS tags, e.g. ["pron","verb"] |
| to_pos | TEXT | Target POS tag |
| suggested_words | TEXT | JSON array of word IDs, ranked by weight |
| weight | REAL | Aggregate weight (pack + learned) |
| source | TEXT | 'pack' \| 'learned' \| 'hybrid' |
| updated_at | TEXT | ISO timestamp |

#### `sentence_usage`

Aggregated usage statistics. This table intentionally stores pattern aggregates, not per-child sentence logs. `word_sequence_hash` is derived from normalized word IDs plus locale and a server-side salt/pepper so the system can count repeated patterns without retaining readable sentence text.

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT PK | UUID |
| locale | TEXT | Locale code |
| pos_sequence | TEXT | JSON array of POS tags |
| word_sequence_hash | TEXT | Hash of normalized word IDs + locale + server-side salt; no readable sentence text |
| word_count | INTEGER | Number of words in sentence |
| usage_count | INTEGER | How many times this pattern was built |
| first_seen | TEXT | ISO timestamp |
| last_seen | TEXT | ISO timestamp |

#### `user_phrases`

Per-user saved and auto-saved phrases.

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT PK | UUID |
| user_id | TEXT | Identity subject ID |
| locale | TEXT | Locale code |
| word_ids | TEXT | JSON array of word IDs |
| sentence | TEXT | Formatted sentence text |
| is_auto | INTEGER | 1 = auto-saved from frequent use |
| usage_count | INTEGER | Times spoken |
| label | TEXT | Custom label (nullable) |
| created_at | TEXT | ISO timestamp |
| last_used | TEXT | ISO timestamp |

#### `templates`

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT PK | UUID |
| locale | TEXT | Locale code |
| pattern | TEXT | Display pattern, e.g. "I want ___" |
| slot_defs | TEXT | JSON array of SlotDef |
| category | TEXT | Template category (request, feeling, question) |
| icon | TEXT | open-icon name (nullable) |
| sort_order | INTEGER | Display order |

### KV Cache

**Binding:** `CACHE` (Cloudflare KV namespace named `sentence-cache` / `tiko-sentence-cache-dev`)

**Keys:**
- `next:{locale}:{word_ids_hash}` → cached `/next` response (TTL: 1 hour)
- `vocab:{locale}:{category}` → cached vocabulary slice (TTL: 6 hours)
- `templates:{locale}` → cached template list (TTL: 6 hours)
- `phrases:{userId}:{locale}` → cached user phrases (TTL: 15 minutes)
- `start:{locale}:{userId}` → cached `/start` response (TTL: 30 minutes)

**Invalidation:**
- Pack version bump → flush all vocabulary/template/transition caches for that locale
- User phrase change → flush that user's phrase cache
- Weight recalculation → flush transition caches for affected locales

---

## Learning Pipeline

### At completion time (synchronous)

When `/complete` is called:
1. Parse the POS sequence and normalized word IDs
2. Hash the normalized word ID sequence with locale and a server-side salt/pepper
3. Upsert into `sentence_usage`: increment `usage_count`, update `last_seen`
4. Check if this completes a frequent pattern → auto-save as user phrase if threshold met (e.g. used 5+ times)

### Weight recalculation (periodic, via cron or on-demand)

Run daily or when usage crosses a threshold:
1. For each locale, query `sentence_usage` grouped by POS transitions and hashed word sequence patterns
2. Calculate learned weights based on frequency and recency
3. Merge with pack-derived weights: `final = pack_weight * 0.3 + learned_weight * 0.7` (weights configurable)
4. Update `transitions` table with hybrid weights
5. Flush affected KV cache entries

### Template discovery (periodic)

Run weekly:
1. Find hashed sequence patterns and POS patterns with high usage_count across multiple subjects
2. Generalize to POS patterns; use pack/template metadata rather than readable raw logs
3. If a pattern matches a candidate template (e.g. "I want [NOUN]" appears 500+ times), surface for admin review
4. Admin approves → promoted to template

---

## Type Sharing Strategy

Shared types live in a dedicated package: `packages/talk-types/`. This matches the `@tiko/data` and `@tiko/identity` pattern — no worker exports types directly to frontend apps.

```
packages/talk-types/
├── src/
│   └── index.ts          # All exported interfaces (WordTile, Category, Template, etc.)
├── package.json          # name: "@tiko/talk-types"
└── tsconfig.json
```

Both `workers/sentence-api/` and `apps/talk/web/` add `"@tiko/talk-types": "workspace:*"` to their dependencies.

The `types.ts` files in each package are thin re-exports:
```typescript
// workers/sentence-api/src/types.ts
export type * from '@tiko/talk-types'
// apps/talk/web/src/types.ts
export type * from '@tiko/talk-types'
```

---

## i18n Namespace

Talk registers its strings under the `talk.*` namespace in `@tiko/i18n`, matching the pattern used by `yesNo.*`, `cards.*`, `radio.*`.

**Minimum v1 strings:**
```typescript
// packages/i18n/src/namespaces/talk.ts
export const talk = {
  'talk.speak': 'Speak',
  'talk.clear': 'Clear',
  'talk.save': 'Save phrase',
  'talk.saved': 'Saved',
  'talk.phrases': 'Saved phrases',
  'talk.templates': 'Templates',
  'talk.buildSentence': 'Build a sentence',
  'talk.tapToSpeak': 'Tap a word to start',
  'talk.offline': 'Working offline',
  'talk.offlineNote': 'Limited vocabulary available',
  'talk.speakError': 'Could not play audio. Try again.',
}
```

---

## Language Pack Bootstrap

The v1 English pack is seeded into D1 at deployment time via a migration SQL file.

### Pack location in repo

```
workers/sentence-api/
├── src/
│   └── ...
├── db/
│   ├── schema.sql             # Table creation (already defined above)
│   ├── seed-en.sql            # English pack seed (words + templates + grammar)
│   └── queries.ts
```

### Seed format

`seed-en.sql` inserts one row into `language_packs` with the full pack JSON, then populates `word_inventory` and `templates` from it:

```sql
-- 1. Insert pack metadata
INSERT INTO language_packs (id, locale, version, pack_data, source, status, created_at, updated_at)
VALUES (
  'en-v1',
  'en',
  1,
  '{ "locale": "en", "version": 1, "words": [...], "templates": [...], "grammar": {...} }',
  'curated',
  'active',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
);

-- 2. Populate denormalized word_inventory
INSERT INTO word_inventory (id, locale, word, pos, category, frequency, icon, inflections, pack_version)
VALUES
  ('en-i',    'en', 'I',     'pron', 'pronouns', 10, NULL, NULL, 1),
  ('en-you',  'en', 'you',   'pron', 'pronouns', 10, NULL, NULL, 1),
  ('en-want', 'en', 'want',  'verb', 'actions',  10, 'hand-point-right', '{"1sg":"want","3sg":"wants"}', 1),
  -- ... ~250 total rows
  ;

-- 3. Populate templates
INSERT INTO templates (id, locale, pattern, slot_defs, category, icon, sort_order)
VALUES
  ('en-t1', 'en', 'I want ___',     '[{"acceptedPos":["noun"],"categoryFilter":null}]', 'request',  NULL, 1),
  ('en-t2', 'en', 'I feel ___',     '[{"acceptedPos":["adj"]}]',                        'feeling',  NULL, 2),
  -- ...
  ;

-- 4. Seed initial transitions (from pack grammar rules)
INSERT INTO transitions (id, locale, from_pos_sequence, to_pos, suggested_words, weight, source, updated_at)
VALUES
  ('en-tr1', 'en', '[]',           'pron', '["en-i","en-you","en-he","en-she"]', 1.0, 'pack', CURRENT_TIMESTAMP),
  ('en-tr2', 'en', '["pron"]',     'verb', '["en-want","en-need","en-feel","en-am"]', 1.0, 'pack', CURRENT_TIMESTAMP),
  ('en-tr3', 'en', '["pron","verb"]', 'noun', '["en-juice","en-water","en-food"]', 1.0, 'pack', CURRENT_TIMESTAMP),
  -- ...
  ;
```

### Deployment procedure

```bash
# Apply schema (first deploy only)
wrangler d1 execute tiko-sentence-db-dev --file=db/schema.sql

# Seed English pack
wrangler d1 execute tiko-sentence-db-dev --file=db/seed-en.sql

# Verify
wrangler d1 execute tiko-sentence-db-dev --command="SELECT locale, COUNT(*) as words FROM word_inventory GROUP BY locale"
```

---

## Offline Fallback Pack

`apps/talk/web/src/data/fallback-pack-en.json` is a stripped-down subset of the English pack. It uses **the same schema** as the server-side `LanguagePack` type — no separate format.

**Contents:**
- ~50 highest-frequency words (frequency ≥ 8 only)
- ~5 core templates ("I want ___", "I feel ___", "I need help")
- Grammar rules (word order, valid transitions for the 50 words only)

**Maintenance rule:** The fallback pack is generated from the English seed at build time via a script — it is never hand-edited:

```
workers/sentence-api/scripts/generate-fallback.ts
```

This script reads `seed-en.sql`, filters to frequency ≥ 8, writes `fallback-pack-en.json`. Run it any time the English pack changes.

**Frontend fallback logic (in `useSentenceApi.ts`):**
```typescript
async function fetchNext(currentWords: string[]) {
  try {
    return await apiClient.postNext(currentWords)
  } catch (e) {
    if (!navigator.onLine) {
      return computeLocalNext(currentWords, fallbackPack)
    }
    throw e
  }
}
```

---

## Cron Jobs

Cloudflare Workers cron triggers are defined in `wrangler.toml`:

```toml
[triggers]
crons = [
  "0 3 * * *",    # daily at 03:00 UTC — weight recalculation
  "0 4 * * 0"     # weekly on Sunday at 04:00 UTC — template discovery
]
```

The worker entry handles cron events:

```typescript
// workers/sentence-api/src/index.ts
export default {
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    if (event.cron === '0 3 * * *') {
      ctx.waitUntil(recalculateWeights(env))
    }
    if (event.cron === '0 4 * * 0') {
      ctx.waitUntil(discoverTemplates(env))
    }
  },
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    // ... route handling
  }
}
```

Weight recalculation flushes affected KV cache keys after updating `transitions`.

---

## Error Handling

### TTS failure (Speak button)

If `generation-api` returns an error or times out:
1. Frontend shows an inline error message (`talk.speakError` i18n string) below the sentence strip
2. The Speak button becomes re-tappable immediately (no lockout)
3. The sentence strip is NOT cleared — the child can try again

```typescript
// SpeakButton.vue
async function speak() {
  speakError.value = false
  try {
    const result = await api.complete(strip.wordIds)
    await audioPlayer.play(result.audioUrl)
    strip.clear()
  } catch (e) {
    speakError.value = true  // renders "talk.speakError" string
  }
}
```

### API unavailable (building sentences)

If `/next` fails while building:
- If offline: fall back to local pack computation (see Offline Fallback Pack above)
- If online but error: show no suggestions (suggestion bar empty), allow the child to continue browsing the full grid manually

The sentence strip continues to function — the child can still add words from the grid; they just won't get smart suggestions.

---

## Monorepo Integration

### Workspace registration

Add to the root npm workspace configuration:
```
packages/talk-types
workers/sentence-api
apps/talk/web
```

### Build/check pipeline

`workers/sentence-api` and `apps/talk/web` follow the same npm workspace build/check shape as other workers and apps. If a Turborepo pipeline is present, add equivalent entries:

```json
// turbo.json (additions)
{
  "pipeline": {
    "build": {
      "dependsOn": ["^build"]
    }
  }
}
```

`apps/talk/web` depends on `@tiko/talk-types` → `@tiko/ui` → `@tiko/identity`. The npm workspace graph resolves this from `package.json` workspace references.

### Wrangler binding conventions

Following existing worker naming conventions:

```toml
# workers/sentence-api/wrangler.toml
name = "tiko-sentence-api-dev"
main = "src/index.ts"
compatibility_date = "2026-06-05"

# Development custom-domain routes under tikoapi.org require deploying in the
# account that owns the tikoapi.org zone while that zone remains there.
# If dev is intentionally left on workers.dev, omit this route until DNS is ready.
account_id = "dc2b7d14a69351375cab6de9a13ddee9"
routes = [
  { pattern = "dev.sentence.tikoapi.org/*", zone_name = "tikoapi.org" }
]

[[d1_databases]]
binding = "DB"                          # matches existing worker convention
database_name = "tiko-sentence-db-dev"
database_id = "<dev-id>"

[[kv_namespaces]]
binding = "CACHE"                       # matches existing worker convention
id = "<dev-kv-id>"

[[services]]
binding = "IDENTITY_SERVICE"
service = "tiko-identity-api-dev"

[[services]]
binding = "GENERATION_SERVICE"
service = "tiko-generation-api-dev"

[env.production]
name = "tiko-sentence-api"
account_id = "dc2b7d14a69351375cab6de9a13ddee9"
routes = [
  { pattern = "sentence.tikoapi.org/*", zone_name = "tikoapi.org" }
]

[[env.production.d1_databases]]
binding = "DB"
database_name = "tiko-sentence-db"
database_id = "<prod-id>"

[[env.production.kv_namespaces]]
binding = "CACHE"
id = "<prod-kv-id>"

[[env.production.services]]
binding = "IDENTITY_SERVICE"
service = "tiko-identity-api"

[[env.production.services]]
binding = "GENERATION_SERVICE"
service = "tiko-generation-api"
```

Account note: while `tikoapi.org`/`tikoapps.org` live in the older production-domain Cloudflare account, custom-domain Worker and Pages bindings for Talk must target that account. Generated `*.workers.dev` / `*.pages.dev` previews may still exist in the newer clean-rebuild account, but they are not the canonical custom-domain surfaces.

---

## TypeScript Types

```typescript
// Core domain types — shared between worker and frontend
// Source of truth: packages/talk-types/src/index.ts

interface WordTile {
  id: string
  text: string
  pos: string
  category: string
  icon?: string
  image?: string
}

interface Category {
  id: string
  label: string
  icon?: string
  posTypes: string[]
  wordCount: number
}

interface Template {
  id: string
  pattern: string
  category: string
  icon?: string
  slotCount: number
}

interface SavedPhrase {
  id: string
  sentence: string
  wordIds: string[]
  isAuto: boolean
  usageCount: number
  label?: string
}

interface StripState {
  display: string
  validNext: string[]
  canComplete: boolean
}

interface LanguagePack {
  locale: string
  version: number
  words: PackWord[]
  templates: PackTemplate[]
  grammar: GrammarRules
}

interface PackWord {
  id: string
  text: string
  pos: string
  category: string
  frequency: number
  icon?: string
  inflections?: Record<string, string>
}

interface PackTemplate {
  id: string
  pattern: string
  category: string
  icon?: string
  slots: SlotDef[]
}

interface SlotDef {
  acceptedPos: string[]
  categoryFilter?: string
}

interface GrammarRules {
  wordOrder: string
  validTransitions: Record<string, string[]>
  articles?: Record<string, ArticleRule>
  negation?: NegationPattern
}

interface ArticleRule {
  // e.g. English: { "a": { beforeConsonant: "a", beforeVowel: "an" } }
  [article: string]: {
    beforeConsonant: string
    beforeVowel: string
  }
}

interface NegationPattern {
  // e.g. English: { position: "beforeVerb", word: "not" | "don't" }
  position: string
  words: string[]
}
```

---

## Frontend Architecture

```
apps/talk/web/src/
├── App.vue                        # Shell: TikoAppShell + main layout
├── main.ts                        # Entry point
├── styles.scss                    # App-scoped styles
├── components/
│   ├── SentenceStrip.vue          # Horizontal word sequence bar
│   ├── WordGrid.vue               # Category-browsable tile grid
│   ├── WordTile.vue               # Single word tile (tappable)
│   ├── SuggestionBar.vue          # Horizontal next-word suggestions
│   ├── TemplatePicker.vue         # Sentence template starters
│   ├── SavedPhrases.vue           # Frequent/saved sentence list
│   └── SpeakButton.vue            # Speak + clear actions
├── composables/
│   ├── useSentenceApi.ts          # HTTP client for Sentence API
│   ├── useSentenceStrip.ts        # Strip state management
│   └── useAudioPlayer.ts          # Play TTS audio from URL
├── types.ts                       # TypeScript interfaces (from shared types)
└── data/
    └── fallback-pack-en.json      # Minimal offline fallback (~50 words)
```

**Estimated size:** 300-500 lines of Vue/TypeScript. No grammar logic. No language packs (except offline fallback).

---

## Worker Architecture

```
workers/sentence-api/
├── src/
│   ├── index.ts                   # Worker entry, routing
│   ├── routes/
│   │   ├── start.ts               # GET /v1/sentence/start
│   │   ├── next.ts                # POST /v1/sentence/next
│   │   ├── complete.ts            # POST /v1/sentence/complete
│   │   ├── vocabulary.ts          # GET /v1/sentence/vocabulary
│   │   ├── phrases.ts             # GET/POST/DELETE /v1/sentence/phrases
│   │   └── admin.ts               # POST /v1/sentence-admin/generate-pack
│   ├── services/
│   │   ├── pack-loader.ts         # Load and parse language packs from D1
│   │   ├── transition-engine.ts   # Compute suggestions from transitions table
│   │   ├── cache.ts               # KV read/write with typed keys
│   │   ├── usage-logger.ts        # Aggregate and store usage stats
│   │   ├── weight-calculator.ts   # Merge pack + learned weights
│   │   ├── sentence-formatter.ts  # Capitalize, punctuate, format
│   │   └── tts-client.ts          # Proxy to generation-api for TTS
│   ├── db/
│   │   ├── schema.sql             # D1 migration: all tables
│   │   └── queries.ts             # Typed D1 query helpers
│   └── types.ts                   # Shared TypeScript types
├── wrangler.toml                  # D1 + KV bindings
├── package.json
└── tsconfig.json
```

---

## Caching Strategy

| Layer | What | TTL | Invalidation |
|-------|------|-----|-------------|
| KV | Transition suggestions (`next:`) | 1 hour | Pack update, weight recalc |
| KV | Vocabulary slices (`vocab:`) | 6 hours | Pack update |
| KV | Template lists (`templates:`) | 6 hours | Pack update |
| KV | User phrases (`phrases:`) | 15 min | Phrase save/delete |
| KV | Start response (`start:`) | 30 min | Pack update, phrase change |
| D1 | All persistent data | — | Source of truth |
| generation-api | TTS audio | Permanent | By text hash (existing) |

**Target latency:** KV-cached `/next` responses under 50ms. Cold D1 queries under 200ms.

---

## Request Flow Example

### Building "I want juice"

```
1. GET /v1/sentence/start?locale=en&userId=child_123
   → KV hit or D1 → { templates, initialWords: [I, you, he, she, it, we, they], ... }
   → Frontend renders: pronoun tiles + templates

2. Child taps "I"
   → Frontend: POST /v1/sentence/next { currentWords: ["I"], locale: "en" }
   → KV miss → D1 transitions where from_pos = ["pron"]
   → Response: { suggestions: [want, need, feel, am, can, go], ... }
   → KV set: next:en:I → response (TTL 1hr)
   → Frontend renders: suggestion bar with verbs

3. Child taps "want"
   → Frontend: POST /v1/sentence/next { currentWords: ["I", "want"], locale: "en" }
   → KV miss → D1 transitions where from_pos_sequence = ["pron", "verb"]
   → Response: { suggestions: [juice, water, food, milk, apple, ...], categories: [food, drink, toys] }
   → KV set: next:en:I,want → response (TTL 1hr)
   → Frontend renders: food/drink tiles

4. Child taps "juice"
   → Frontend: POST /v1/sentence/next { currentWords: ["I", "want", "juice"], locale: "en" }
   → Response: { stripState: { canComplete: true, display: "I want juice" }, suggestions: [please, now, more] }
   → Frontend enables Speak button

5. Child taps Speak
   → Frontend: POST /v1/sentence/complete { wordIds: ["i", "want", "juice"], locale: "en", userId: "child_123" }
   → Backend:
     a. Format sentence: "I want juice."
     b. Call generation-api TTS → audio URL (or cache hit)
     c. Upsert sentence_usage: { pos: ["pron","verb","noun"], word_sequence_hash, count++ }
     d. Check auto-save threshold
   → Response: { sentence: "I want juice.", audioUrl: "https://...", audioCached: true }
   → Frontend plays audio
```

**Second time a child builds "I want":**
- Step 2 KV hit → 50ms response, no D1 query needed
- If global usage has boosted "want" to #1 after pronouns, suggestion order reflects that

---

## Deployment

- **Worker:** `workers/sentence-api/` deployed to Cloudflare Workers
- **D1:** `tiko-sentence-db-dev` / `tiko-sentence-db` — provision once per environment, apply `schema.sql` migration
- **KV:** `tiko-sentence-cache-dev` / `sentence-cache` — provision once per environment
- **Frontend:** `apps/talk/web/` deployed to Cloudflare Pages
- **App domain:** `talk.tikoapps.org` (production), `dev.talk.tikoapps.org` (development)
- **API domain:** `sentence.tikoapi.org` (production), `dev.sentence.tikoapi.org` (development if custom dev route is provisioned)
- **Pages project:** `tiko-talk`
- **Domain ADR:** `docs/adrs/2026-06-05-talk-app-and-sentence-api-domains.md`
- **TTS:** Uses existing `generation-api` via `GENERATION_SERVICE` — no new TTS infrastructure

---

## Security & Privacy

- Session validation via Ankore identity (shared `TOKEN_PEPPER`)
- No readable raw sentence content stored in shared usage aggregates; `sentence_usage` uses hashed word sequence patterns plus POS aggregates
- Per-user data limited to saved phrases and frequency counts
- No cross-user sentence sharing
- Admin endpoints gated by identity role
- CORS locked to `*.tikoapps.org` origins
- Rate limiting on `/next` and `/complete` (reasonable per-device limits)
- No PII in KV cache keys
