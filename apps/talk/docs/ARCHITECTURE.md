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
- D1: `SENTENCE_DB` — persistent relational data
- KV: `SENTENCE_CACHE` — hot transition/suggestion cache

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

Already built. Talk uses the existing TTS pipeline:
- `POST /v1/generation/tts` with the completed sentence text
- Returns cached audio URL or generates new
- Talk does not rebuild this; it consumes it

---

## API Contract

### `GET /v1/sentence/start`

Start a new sentence session. Returns initial state.

**Query params:** `locale` (required), `userId` (optional, for personalized suggestions)

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
  userId?: string
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
  userId?: string,
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

**Query params:** `locale` (required), `userId` (required)

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
  userId: string,
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

Aggregated usage statistics. No raw sentence content stored long-term.

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT PK | UUID |
| locale | TEXT | Locale code |
| pos_sequence | TEXT | JSON array of POS tags |
| word_sequence | TEXT | JSON array of word texts |
| word_count | INTEGER | Number of words in sentence |
| usage_count | INTEGER | How many times this sequence was built |
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

**Namespace:** `SENTENCE_CACHE`

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
1. Parse the POS sequence and word sequence
2. Upsert into `sentence_usage`: increment `usage_count`, update `last_seen`
3. Check if this completes a frequent pattern → auto-save as user phrase if threshold met (e.g. used 5+ times)

### Weight recalculation (periodic, via cron or on-demand)

Run daily or when usage crosses a threshold:
1. For each locale, query `sentence_usage` grouped by `from_pos_sequence` → `to_pos`
2. Calculate learned weights based on frequency and recency
3. Merge with pack-derived weights: `final = pack_weight * 0.3 + learned_weight * 0.7` (weights configurable)
4. Update `transitions` table with hybrid weights
5. Flush affected KV cache entries

### Template discovery (periodic)

Run weekly:
1. Find word sequences with high usage_count across multiple users
2. Generalize to POS patterns
3. If a pattern matches a candidate template (e.g. "I want [NOUN]" appears 500+ times), surface for admin review
4. Admin approves → promoted to template

---

## TypeScript Types

```typescript
// Core domain types — shared between worker and frontend

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
     c. Upsert sentence_usage: { pos: ["pron","verb","noun"], words: ["I","want","juice"], count++ }
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
- **D1:** `sentence-db` — provision once, apply `schema.sql` migration
- **KV:** `sentence-cache` — provision once
- **Frontend:** `apps/talk/web/` deployed to Cloudflare Pages
- **Domain:** `talk.tikoapps.org` (production), `dev.talk.tikoapps.org` (development)
- **Pages project:** `tiko-talk`
- **TTS:** Uses existing `generation-api` — no new TTS infrastructure

---

## Security & Privacy

- Session validation via Ankore identity (shared `TOKEN_PEPPER`)
- No raw sentence content stored beyond aggregation
- Per-user data limited to saved phrases and frequency counts
- No cross-user sentence sharing
- Admin endpoints gated by identity role
- CORS locked to `*.tikoapps.org` origins
- Rate limiting on `/next` and `/complete` (reasonable per-device limits)
- No PII in KV cache keys
