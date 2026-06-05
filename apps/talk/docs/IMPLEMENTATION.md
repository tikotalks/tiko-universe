# Talk App — Implementation Plan

> Pre-build checklist and phased implementation plan. Architecture detail in ARCHITECTURE.md. Product direction in SPEC.md.

---

## Status

**Current state:** Documentation only. No source files exist.

**Target:** Shippable v1 — English language pack, sentence building, TTS, saved phrases, offline fallback.

---

## Pre-Build Checklist

These must be resolved before writing the first line of implementation code.

### P0 — Blocking

- [ ] **Complete domain ADR and doc readiness fixes** — `docs/adrs/2026-06-05-talk-app-and-sentence-api-domains.md` must exist before provisioning `talk.tikoapps.org`, `dev.talk.tikoapps.org`, `sentence.tikoapi.org`, or `dev.sentence.tikoapi.org`. ARCHITECTURE.md must use `DB`/`CACHE` binding names and the privacy model must avoid readable raw sentence logs in `sentence_usage`.

- [ ] **Create `packages/talk-types/`** — shared TypeScript interfaces for `WordTile`, `Category`, `Template`, `SavedPhrase`, `StripState`, `LanguagePack`, etc. Both the worker and the frontend depend on this package. See ARCHITECTURE.md → Type Sharing Strategy.

- [ ] **Write the English language pack seed** (`workers/sentence-api/db/seed-en.sql`) — without this, the worker has nothing to serve and v1 cannot ship. Minimum: 200+ words, 20+ templates, initial transition seeds. See ARCHITECTURE.md → Language Pack Bootstrap.

- [ ] **Register `talk.*` i18n namespace** in `@tiko/i18n` — Talk UI strings must be declared before the frontend can be built. See ARCHITECTURE.md → i18n Namespace.

### P1 — Required before first deploy

- [ ] **Scaffold `workers/sentence-api/`** with `wrangler.toml`, `package.json`, `tsconfig.json`, entry `src/index.ts`. Follow binding naming conventions (`DB`, `CACHE`, `IDENTITY_SERVICE`, `GENERATION_SERVICE`). Provision D1 and KV namespaces in Cloudflare dashboard.

- [ ] **Apply D1 schema** (`db/schema.sql`) to dev first (`tiko-sentence-db-dev`), then prod only during approved production promotion (`tiko-sentence-db`).

- [ ] **Write the fallback pack generator script** (`workers/sentence-api/scripts/generate-fallback.ts`) — filters English seed to frequency ≥ 8, writes `apps/talk/web/src/data/fallback-pack-en.json`. Must run before any frontend build.

- [ ] **Register Talk in Turborepo pipeline** — add `packages/talk-types`, `workers/sentence-api`, `apps/talk/web` to workspace and Turborepo build graph.

### P2 — Required before user testing

- [ ] **Wire up Cloudflare cron triggers** in `wrangler.toml` (daily weight recalculation, weekly template discovery).

- [ ] **Set up Cloudflare Pages project** `tiko-talk` with deploy hooks for `apps/talk/web/`.

---

## Phase 1 — Worker Foundation

**Goal:** `GET /v1/sentence/start` and `POST /v1/sentence/next` return real data from D1.

### Tasks

1. **`db/schema.sql`** — create all 6 tables: `language_packs`, `word_inventory`, `transitions`, `sentence_usage`, `user_phrases`, `templates`

2. **`db/seed-en.sql`** — English pack seed (this is the most time-intensive task in the whole project)
   - ~250 words across all POS categories
   - ~25 templates
   - Initial transition weights derived from grammar rules

3. **`db/queries.ts`** — typed D1 query helpers for each table

4. **`services/pack-loader.ts`** — load `language_packs` row by locale, parse `pack_data` JSON

5. **`services/transition-engine.ts`** — given a `from_pos_sequence`, query `transitions` table, return ranked `WordTile[]`

6. **`services/cache.ts`** — typed KV read/write with the key schema defined in ARCHITECTURE.md

7. **`routes/start.ts`** — `GET /v1/sentence/start?locale=en` → load templates, initial words, strip state from D1/KV

8. **`routes/next.ts`** — `POST /v1/sentence/next` → run transition engine, cache result, return suggestions

9. **Auth** — validate/extract the Ankore session subject into `userId` where available; do not use a legacy user id and do not create a login wall

**Done when:** `curl`ing `/start` and `/next` returns plausible data; KV caching works on second request.

---

## Phase 2 — Completion + Learning

**Goal:** `POST /v1/sentence/complete` returns a spoken sentence; usage is logged.

### Tasks

1. **`services/sentence-formatter.ts`** — capitalize first word, add terminal punctuation, handle article agreement for English

2. **`services/tts-client.ts`** — POST to `GENERATION_SERVICE` binding (`/v1/generation/tts`), return audio URL

3. **`services/usage-logger.ts`** — upsert `sentence_usage` row (POS sequence + word sequence + count)

4. **`routes/complete.ts`** — format → TTS → log usage → check auto-save threshold → return `{ sentence, audioUrl, audioCached }`

5. **`routes/phrases.ts`** — GET/POST/DELETE for `user_phrases` table

6. **`routes/vocabulary.ts`** — `GET /v1/sentence/vocabulary` with optional category/pos filter

**Done when:** Posting a full sentence returns audio URL and the usage row is visible in D1.

---

## Phase 3 — Learning Pipeline

**Goal:** Transition weights improve from real usage data.

### Tasks

1. **`services/weight-calculator.ts`** — merge pack weights (×0.3) with learned weights (×0.7); configurable ratio

2. **Cron handler in `index.ts`** — route `ScheduledEvent` to `recalculateWeights()` and `discoverTemplates()`

3. **`recalculateWeights()`** — query `sentence_usage` grouped by POS sequence → update `transitions` → flush KV cache

4. **`discoverTemplates()`** — surface high-usage patterns for admin review (log to D1, don't auto-promote)

5. **`routes/admin.ts`** — `POST /v1/sentence-admin/generate-pack` (AI-assisted pack generation, admin-role gated)

**Done when:** Running the cron handler manually updates at least one transition weight.

---

## Phase 4 — Frontend

**Goal:** Working Vue 3 SPA that builds and speaks sentences.

### Tasks

1. **`apps/talk/web/` scaffold** — `package.json`, `vite.config.ts`, `index.html`, `main.ts`, `App.vue`

2. **`composables/useSentenceApi.ts`** — HTTP client wrapping all Sentence API endpoints; offline fallback logic

3. **`composables/useSentenceStrip.ts`** — reactive strip state (word list, add, remove, reorder)

4. **`composables/useAudioPlayer.ts`** — play TTS audio URL; handle playback errors

5. **`components/SentenceStrip.vue`** — horizontal word tile bar, removable tiles, drag-to-reorder

6. **`components/WordGrid.vue`** — category tabs + tile grid, served from API

7. **`components/WordTile.vue`** — single tappable tile (text + optional icon)

8. **`components/SuggestionBar.vue`** — horizontal suggestion row above the grid

9. **`components/TemplatePicker.vue`** — template list, tap to pre-fill strip

10. **`components/SavedPhrases.vue`** — saved/frequent phrases, one-tap speak

11. **`components/SpeakButton.vue`** — calls `/complete`, plays audio, shows error state

12. **`data/fallback-pack-en.json`** — generated by the fallback script (not hand-written)

13. **TikoAppShell integration** — identity bootstrap, locale detection, settings panel

**Done when:** A child can tap "I" → "want" → "juice" → Speak and hear the sentence.

---

## Phase 5 — Polish + Hardening

**Goal:** Production-ready.

### Tasks

- [ ] Rate limiting on `/next` and `/complete` (Cloudflare rate limit rules on the Worker route)
- [ ] CORS locked to `*.tikoapps.org` origins
- [ ] Error states for all API failures (see ARCHITECTURE.md → Error Handling)
- [ ] Offline mode tested on real device (airplane mode)
- [ ] Accessibility: large tap targets, VoiceOver labels on tiles
- [ ] Sentence strip drag-to-reorder tested
- [ ] KV cache TTLs verified under load
- [ ] All v1 SPEC.md acceptance criteria checked off

---

## Acceptance Criteria (from SPEC.md, mapped to phases)

| Criterion | Phase |
|-----------|-------|
| Word tiles served from Sentence API | 1 |
| Grammar-aware suggestions after each word | 1 |
| Templates served from API, slot-filling works | 1 |
| Sentence strip renders, accepts tiles, allows removal and reorder | 4 |
| Speak button voices full sentence via TTS pipeline | 2 + 4 |
| Saved phrases: auto-save, manual save, one-tap speak | 2 + 4 |
| English pack ≥200 words, ≥20 templates | 1 |
| Backend learning: transition weights update from usage | 3 |
| Aggressive caching: repeated sequences from KV | 1 |
| Works offline with bundled fallback pack | 4 |
| App opens immediately, no login wall | 4 |
| Device identity bootstrap works | 4 |
| i18n for UI strings (`talk.*` namespace) | Pre-build |

---

## Known Risks

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| English seed quality is poor — bad suggestions out of the box | High | Manual review of all seed transitions before deploy; test with real child usage patterns |
| Offline fallback and server pack schema drift | Medium | Generated script (not hand-edited); run in CI on pack changes |
| TTS audio latency on first speak | Medium | `generation-api` caches by text hash; warm common phrases in dev |
| D1 query performance on transition lookup | Low | `transitions` table indexed on `(locale, from_pos_sequence)`; add index in schema |
| Weight recalculation flushes too aggressively | Low | Scope KV flush to affected locale only; log keys flushed |

---

## Open Questions

- **Dutch pack timeline:** v1 ships English only per DOCTRINE.md. When does Dutch seed work begin? Who authors it?
- **Admin pack generation:** The AI-assisted `generate-pack` endpoint requires an LLM API key in the worker environment. Which model? Which key? Scoped to admin role only — define role value.
- **Personal suggestion adaptation:** SPEC.md lists this as v2. Confirm: v1 uses only global transition weights, no per-user `userId`-specific weight boosting?
- **Caregiver/parent mode:** v2 feature per SPEC.md. No code hooks needed in v1 — confirm no placeholder UI either.
