# 09 — Talk Engine Deep Dive (sentence-api + Talk clients)

Focused follow-up to the full review: does the sentence-prediction engine work as designed, and how to improve it. Sources read directly: `workers/sentence-api/src/index.ts` (all 1,067 lines), `schema.sql`, `db/seed-en.sql` (grammar/transitions), `data/en-v1.json` (pack head), plus the prior reviews of `apps/talk/web`, `apps/talk/ios`, and `packages/talk-types`.

## How it's designed to work

1. **start** → starter tiles (pronoun/question/social POS, frequency-ranked), templates, saved phrases.
2. **next** → grammar gives `validNext` POS for the last word (POS-bigram from the pack's `grammar_json`); serve stored predictions for this exact word-sequence hash, else ask the Atlas LLM to rank up to 120 candidate words, store scores, fall back to grammar/frequency ranking.
3. **select** → `click_count++` on the chosen prediction row.
4. **complete** → join words into a sentence, log a privacy-safe usage aggregate (POS sequence + hash, no raw text), synthesize TTS via generation-api.
5. **nightly cron** → fold usage into learned POS-transition weights (`talk_transitions`), blend click counts into `final_score` (learned weight ramps 0→1 over 200 clicks), invalidate caches.

It's a sound v1 shape: curated vocabulary as the LLM's candidate set (which neatly bounds prompt-injection), privacy-aware aggregates, cache-first cost control, offline fallbacks on both clients.

## Verdict: the *suggestion* pipeline works; the *learning* engine does not exist at runtime

Three layered facts mean the adaptive half of the engine is currently inert, and would remain mostly inert even after the known missing-cron fix:

### [Critical] The learning loop has never run — no cron trigger
File: `workers/sentence-api/wrangler.toml` (no `[triggers]` block); handler at `src/index.ts:130-133, 201-205`
Why: `scheduled()` is fully implemented but nothing fires it. `final_score` stays equal to the initial `ai_score` forever; clicks accumulate unused; learned transitions are never computed.
Fix: `[triggers] crons = ["0 3 * * *"]` in both envs — **but only after** fixing select-endpoint abuse (04-security: unauthenticated ranking poisoning) and the finding below, or the cron will burn KV/D1 doing work nothing reads.

### [Critical] Learned (and even curated weighted) transitions are written but never read
File: `src/index.ts:841-845` (`validNextFor` reads `grammar.validTransitions` from `talk_language_packs.grammar_json`); `talk_transitions` appears only in `schema.sql:38`, `seed-en.sql:323+`, and the cron's own `mergePackTransitions` (`:236-264`)
Why: The request path derives both the *filter* and the *ranking order* from the static JSON in the language pack. The entire `talk_transitions` table — curated weights (10.0, 9.0, …) seeded per POS pair *and* the learned rows the cron would produce — influences nothing a child ever sees. The grammar the engine "learns" is write-only. This also means `rankSuggestions` (`:525-532`) ranks by the *array order* of `validTransitions[pos]`, silently re-encoding the curated weights as list position.
Fix: Make `validNextFor`/`rankSuggestions` read merged transitions (curated ⊕ learned) — load them with the pack (one indexed query, cacheable in the pack object), order `validNext` by weight, and use weight as a ranking term in the grammar fallback and as a prior blended with `ai_score`.

### [High] Learning is keyed to exact word sequences — the signal is too fragmented to ever converge
File: `src/index.ts:349, 668, 711-717` (`sequence_hash` = SHA-256 of the exact word-ID prefix; `learnedWeight = min(1, totalClicks/200)` per sequence)
Why: "I + want" and "you + want" are unrelated learning contexts. With a 380-word vocabulary, the space of prefixes is combinatorial; almost no single prefix will accumulate the 200 clicks needed for the learned signal to fully engage, so even a running cron would leave the engine ~AI-only in practice. Meanwhile every unique prefix stores up to 120 prediction rows (one per candidate), so `talk_word_predictions` grows ~120× faster than useful signal does.
Fix: Learn at back-off granularities, classic LM style: per (last word → next word) bigram and per (last POS → next POS), not per full prefix. Blend: `final = w1·ai + w2·wordBigram + w3·posTransition` with weights ramping on much smaller click counts (10–20 per bigram is plenty). Keep the exact-prefix cache for serving, but aggregate clicks into the bigram tables. This also collapses the storage explosion.

## Latency: the worst case hits exactly when a child is waiting

### [High] Cache-miss `next` = full candidate query + LLM round-trip + up to 120 sequential INSERTs, synchronously
File: `src/index.ts:355-357, 565-567, 627-638, 667-680`
Why: First time any child in a locale builds a given prefix, the response blocks on an Atlas text-generation call (seconds) plus a sequential insert loop. AAC interaction needs sub-300 ms; the web client's 6-scenario prefetch (`apps/talk/web/src/composables/useSentenceApi.ts:208-223`) only helps for paths it guessed. The worker receives `_ctx` and throws it away (`:126`).
Fix: Invert the flow — **serve the grammar/frequency ranking immediately on miss, and run the AI generation in `ctx.waitUntil`** to populate the store for the next request. The data model already supports this (predictions are durable). One-line contract change, order-of-magnitude p95 improvement. Batch the inserts (`db.batch()` / multi-row VALUES) regardless.

### [Medium] The LLM response is likely truncated and then silently discarded
File: `src/index.ts:618, 636, 643-644`
Why: The prompt asks for 50 `{"wordId":…,"probability":…}` entries but caps `maxTokens` at 1500 — 50 entries with realistic ids overflow that. A truncated array has no closing `]`, the regex fails, the function returns `null`, and the engine falls back to grammar ranking — **after paying for the tokens**. Some fraction of all AI prediction calls are pure waste.
Fix: Ask for 25 entries or raise maxTokens to ~2500; better, request `wordId` ranks only (probabilities add tokens and LLM probabilities are uncalibrated anyway) and assign scores server-side by rank. Also salvage truncated output by matching complete `{...}` objects instead of the whole array.

## Correctness gaps in the engine logic

### [High] Sentences can't end on a verb — many natural utterances are uncompletable
File: `src/index.ts:118` (`COMPLETABLE_POS = noun | adjective | social`), seed grammar (verbs transition to determiner/noun/adjective/preposition/social)
Why: "I want to eat", "we go", "help me stop" — a child who ends on a verb (or pronoun: "help **me**") gets `canComplete: false` and a disabled speak button with no path out except adding more words. For AAC, refusing to speak what the child built is the engine overriding the child.
Fix: Either add verb/pronoun to completable POS, or — better — let `canComplete` be true whenever `words.length > 0` and treat grammar as guidance for *suggestions*, never as a gate on speaking. (opinion on mechanism; the uncompletable-sentence fact is verifiable from the constants.)

### [Medium] Word inflections are dead weight; sentences are bare-stem concatenation
File: `schema.sql` (`inflections_json` column), `src/index.ts:867-871` (`formatSentence` joins `word.text` verbatim); no client reads `inflections` (grepped web src — zero hits)
Why: The schema anticipates morphology ("want"→"wants", "go"→"going") but nothing uses it; output is "I want eat" unless the pack pre-bakes multi-word entries. Acceptable for telegraphic AAC speech, but then the column and the JSON parsing per row are pure overhead — and TTS speaks ungrammatical text to the child.
Fix: Decide: either implement a minimal inflection pass in `formatSentence` (subject–verb agreement from the POS sequence is cheap for en), or drop the column and parsing.

### [Medium] Clicks only register on words already in the prediction set; vocabulary-browser picks are invisible
File: `src/index.ts:682-692` (UPDATE only), `:564-565` (candidates limited to `validNext` POS)
Why: `trackWordSelection` UPDATEs an existing row; selections made from the full vocabulary browser (or any word outside the candidate POS list) silently teach nothing. The feedback loop can reinforce only what the AI already proposed — a closed loop that can't discover the child's actual favorites.
Fix: `INSERT ... ON CONFLICT ... DO UPDATE click_count = click_count + 1` with a neutral `ai_score`, so every real selection becomes signal.

### [Medium] Saved phrases go stale in the `start` payload for up to 15 minutes
File: `src/index.ts:293` (start cache includes `savedPhrases`, TTL 900), `:460, 474` (save/delete invalidate only `sentence:phrases:*`)
Why: A parent saves a phrase; the home screen (start) keeps serving the cached copy without it. Self-inflicted confusion for the engine's most visible personalization feature.
Fix: Also delete `sentence:start:${locale}:${subjectId}` on save/delete — or exclude savedPhrases from the cached start response and let clients call `/phrases` (already cached separately).

### [Medium] Per-subject cache keys multiply KV entries for identical global data
File: `src/index.ts:336`
Why: `sentence:next:{locale}:{subjectId}:{prefix}` — but predictions are global (nothing per-subject is in the response). Every child caches an identical copy per prefix; KV writes scale with users × prefixes for zero personalization benefit.
Fix: Drop `subjectId` from the `next` key today. Reintroduce it only if/when predictions become per-subject (below).

## Already-filed issues that gate this engine (cross-references)

- **IDOR via caller-supplied `userId`** on phrases (04 — Critical) — must land before any per-child learning.
- **Unauthenticated `select`/`complete` can poison global rankings** (04 — High) — must land before enabling the cron.
- **No cap on `currentWords`** → D1 param-limit 500s and oversized KV keys (03).
- **32-bit phrase cache hash collisions** can serve one child's phrases to another (04).
- **`deletePhrase` reports success unconditionally; `autoSave` duplicates rows unboundedly** (03).
- Client side: stale-response races in `start`/`next`, overlapping speak audio, non-en/nl language silently reset on reload, iOS Talk pointing at the dev API, unbounded `prefetchCache` (03/05).

## Recommended evolution path (ordered)

1. **Safety prerequisites** (security items above) — small, independent. *(S)*
2. **Serve-then-learn**: grammar ranking on miss + `ctx.waitUntil` AI fill; batch inserts; fix the truncation. Cuts worst-case child-facing latency from seconds to ~100 ms and stops paying for discarded LLM output. *(M)*
3. **Close the loop**: cron trigger + make transitions readable at request time + upsert-on-click. After this, the engine actually learns — globally. *(M)*
4. **Back-off learning model** (word-bigram + POS-bigram instead of exact prefixes): the convergence fix. Migrate `talk_word_predictions` clicks into bigram aggregates; keep prefix rows as a serving cache only. *(L)*
5. **Per-child layer**: a small per-subject bigram overlay (the child's own top transitions) blended over the global model — this is where AAC personalization value really lives, and the privacy-conscious aggregate design extends naturally (per-subject rows, same no-raw-text hashing). Requires #1. *(L)*
6. **Speak-anything**: decouple `canComplete` from POS; grammar guides, never gates. *(S, product decision)*
7. **Unify the three vocabularies**: server seed pack, web offline fallback, and iOS `TalkOfflineFallback` are separate copies that will drift; generate both client fallbacks from `data/en-v1.json` at build time. *(M)*

## What's genuinely good here (keep it)

- Curated-vocabulary-as-candidate-set is the right LLM pattern: bounded cost, bounded output space, near-zero prompt-injection surface.
- Privacy posture: usage aggregates store POS sequences and hashes, never sentence text — and `packages/talk-types` has a test asserting exactly that.
- The fallback chain (stored → AI → grammar → client offline pack) means a child always gets *something*, instantly testable, never a blank screen.
- Clean typed contracts in `@tiko/talk-types` shared across server, web, and (conceptually) iOS; the web composable's request-contract tests are the best client tests in the repo.
