# Talk App — Implementation Plan

> Pre-build checklist and phased implementation plan. Architecture detail in ARCHITECTURE.md. Product direction in SPEC.md.

---

## Status

**Current state:** Source implementation exists on `development`: shared Talk types, English seed pack, D1 schema, Sentence API Worker, Talk web app, generation-api TTS contract, offline fallback pack, and targeted tests/builds. The app is not yet certified live-operational because Cloudflare Pages/Worker deployment and custom-domain provisioning still need live verification.

**Target:** Shippable v1 — English language pack, sentence building, TTS, saved phrases, offline fallback, live dev/prod domains, and browser smoke against the deployed app.

---

## Pre-Build Checklist

These items now track source and deployment readiness.

### P0 — Blocking

- [x] **Complete domain ADR and doc readiness fixes** — `docs/adrs/2026-06-05-talk-app-and-sentence-api-domains.md` exists. Architecture uses the `DB`/`CACHE` binding model and privacy keeps child-facing runtime away from raw indefinite sentence storage.

- [x] **Create `packages/talk-types/`** — shared TypeScript interfaces for `WordTile`, `Category`, `Template`, `SavedPhrase`, `StripState`, `LanguagePack`, etc. Both the worker and the frontend depend on this package.

- [x] **Write the English language pack seed** (`workers/sentence-api/db/seed-en.sql`) — curated English seed exists with word inventory, templates, and initial transitions.

- [x] **Register `talk.*` i18n namespace** in `@tiko/i18n` — Talk UI strings and tests exist.

### P1 — Required before first deploy

- [x] **Scaffold `workers/sentence-api/`** with `wrangler.toml`, `package.json`, `tsconfig.json`, entry `src/index.ts`. Binding names follow `DB`, `CACHE`, `IDENTITY_SERVICE`, `GENERATION_SERVICE`.

- [ ] **Apply D1 schema** (`workers/sentence-api/schema.sql`) to dev first (`tiko-sentence-db-dev`), then prod only during approved production promotion (`tiko-sentence-db`). Source schema exists; live application must be verified against Cloudflare D1.

- [x] **Bundle fallback pack** (`apps/talk/web/src/data/fallback-pack-en.json`) — scoped English offline fallback is checked in for the web app.

- [x] **Register Talk in workspace/deploy graph** — package workspaces include Talk paths; deployment workflow includes `talk`; `sentence-api` remains scaffold-only for deployment until Cloudflare D1/KV binding IDs are provisioned.

### P2 — Required before user testing

- [x] **Wire up Cloudflare cron triggers** in `wrangler.toml` (daily weight recalculation, weekly template discovery).

- [ ] **Set up and verify Cloudflare Pages projects** `tiko-talk` / `tiko-talk-dev` with deploy hooks for `apps/talk/web/`.

---

## Phase 1 — Worker Foundation

**Goal:** `GET /v1/sentence/start` and `POST /v1/sentence/next` return real data from D1.

### Tasks

1. **`db/schema.sql`** — create all 6 physical tables with the shared-D1 `talk_` namespace: `talk_language_packs`, `talk_word_inventory`, `talk_transitions`, `talk_sentence_usage`, `talk_user_phrases`, `talk_templates`

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
