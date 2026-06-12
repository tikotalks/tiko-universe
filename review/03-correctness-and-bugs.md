# 03 — Correctness & Bugs

Scope: functional bugs, race conditions, error handling, unhandled rejections, state-machine errors. Authorization-class bugs live in `04-security.md`; this file covers "the product does the wrong thing."

## Critical

### [Critical] Timer (web): the countdown display never updates while running
File: `apps/timer/web/src/composables/useTimer.ts:26-56`
Why: `remaining` is a computed reading `targetMs.value - Date.now()`. `Date.now()` is not reactive and `tick()` mutates nothing until expiry, so Vue caches the computed: the display and progress ring freeze at the start value, then jump to "expired". The unit test that should catch it has no assertions (`App.spec.ts:164-186`) and the e2e suite is stale, so nothing does.
Fix: Introduce a reactive clock the interval updates:
```ts
const now = ref(Date.now())
function tick() { now.value = Date.now(); if (targetMs.value - now.value <= 0) { ... } }
const remaining = computed(() => mode.value === 'running' ? Math.max(0, targetMs.value - now.value) : ...)
```

### [Critical] Radio (web): pressing Pause auto-advances to the next track
File: `apps/radio/web/src/App.vue:488-505` with `composables/useAudioPlayer.ts:203-225`
Why: Auto-advance watches `isPlaying` flipping false while `currentTrack` is set — which is also exactly what `pause()` does. Tapping pause immediately starts the next track (or restarts the current one with repeat on). HTML5 `error` and the YouTube `PAUSED` state hit the same path. The pause control is functionally broken.
Fix: Expose an explicit `ended` signal (counter ref bumped by the `ended` event / YT `ENDED` state) and advance on that, never on `isPlaying`.

### [Critical] Admin cleanup cron hard-deletes managed child accounts and wedges on FK violations
File: `workers/admin-api/src/index.ts:581-613, 626-633`
Why: `cleanupAnonymousSubjects` selects subjects without a *verified email* — managed children have no `identity_accounts` row at all, so a child idle 30 days (summer break) is hard-deleted. Worse, `deleteSubjectIdentity` never deletes `identity_managed_credentials` or `identity_audit_events`, both FK-referencing subjects; D1 enforces FKs, so one such row throws, and with no try/catch in `scheduled` the whole cron rejects — permanently wedging cleanup, after app data was already deleted for earlier subjects in the loop (silent partial state).
Fix: Exclude subjects with active managed credentials (and/or `child` role); delete dependent rows inside `deleteSubjectIdentity`; wrap each subject in try/catch. Related: the documented "1-day no-data cleanup" is dead logic — the SQL pre-filters to 30 days (`:598, 605-612`).

## High

### [High] `TikoMediaClient` targets endpoints that do not exist on any worker
File: `packages/data/src/media.ts:51-88`
Why: `extractYouTube()` calls `POST /media/extract`, `getTrack()`/`deleteTrack()` call `/media/tracks/:id` — no such routes exist in media-api (`workers/media-api/src/index.ts:1044-1107`). `uploadAudio()` hits a real route but the worker returns a different shape than the client's typed `{ track: RadioTrack }`. Zero consumers exist; the entire typed contract is false.
Fix: Delete the client (and re-exports at `packages/data/src/index.ts:298-299`), or implement matching routes plus a contract test before shipping it.

### [High] PIN popup accepts sparse digit arrays — 1-digit PINs can be created and auto-submitted
File: `packages/ui/src/TikoPinPopup.vue:89-95, 119-121`
Why: `digits` starts `[]`; tapping a later input first creates a sparse array whose holes `Array.prototype.every` **skips**, so completeness passes with one digit, the 200 ms auto-submit fires, and `join('')` collapses holes. In setup mode a parent can unknowingly save a 1-digit PIN (confirm reproduces the same holes, so it matches) — after which normal 4-digit entry never matches, locking parent mode behind a code nobody knows. Related fail-open: in verify mode with no verifier and no hash, **every code passes** (`:144-148`).
Fix: Pre-fill with `Array(CODE_LENGTH).fill('')`, check `filter(d => d !== '').length === CODE_LENGTH`, and fail closed in verify mode.

### [High] TTS cache check/insert races cause paid generation followed by a 500
File: `workers/atlas-api/src/domains.ts:49, 84-112`; `workers/generation-api/src/index.ts:395-412`; `workers/tts-api/src/index.ts:79-95`
Why: All three TTS paths do find → provider call → INSERT with a UNIQUE request-hash. Two concurrent identical requests both miss, both pay the provider, and the second INSERT throws — surfaced as a 500 (in generation-api/tts-api with no top-level catch, as a raw 1101 without CORS) after the audio was generated and stored.
Fix: `INSERT OR IGNORE` / `ON CONFLICT DO NOTHING`, then re-SELECT the winning row.

### [High] Optimistic-version writes are check-then-write races (lost updates)
File: `workers/app-api/src/index.ts:263-282`; `workers/admin-api/src/index.ts:221-242, 289-303, 327-341`
Why: Read version → compare in JS → upsert. Two concurrent writers both read N, both pass, both write N+1 — one update silently lost despite the conflict machinery. Omitting `version` bypasses the check entirely. The client side makes this worse: yes-no/timer/type fire a PUT **per keystroke** with the same captured version and silently swallow rejections (`apps/type/web/src/App.vue:262-265, 233-245`), and cards echo-writes settings right after hydration with no `bootstrapped` guard (`apps/cards/web/src/App.vue:487-489`).
Fix: Enforce in SQL — `UPDATE ... SET version = version + 1 WHERE ... AND version = ?`, check `meta.changes`; client-side, debounce and serialize writes through a single in-flight promise chain.

### [High] content-api admin bulk PUTs wipe the catalog non-atomically
File: `workers/content-api/src/index.ts:779-831, 844-905`
Why: Delete all default items **and their translations**, then insert row-by-row with separate `run()` calls. A mid-loop failure leaves the production catalog empty or partial; concurrent readers see an empty catalog during the window; translations are destroyed even on success.
Fix: `env.CONTENT_DB.batch([...])` for atomicity; reconcile (upsert + delete-missing) instead of wipe-and-rewrite.

### [High] No timeouts or retries on any external AI call; story render is 40 sequential un-resumable calls
File: `workers/generation-api/src/index.ts:572-1901` (multiple fetches), `:733-738` (renderStory); `workers/tts-api/src/index.ts:157`; `workers/sentence-api/src/index.ts:627, 874`
Why: Every OpenAI/ElevenLabs/Atlas fetch is awaited with no `AbortSignal.timeout` and no retry. A hung provider hangs the client request; one transient failure at story segment 39 discards 38 paid segments (the schema's `rendering`/`error` states are never used). generation-api and tts-api also have **no top-level error handler**, so provider/network throws become raw 500s without CORS (`generation-api:143-173`, `tts-api:42-52`).
Fix: `AbortSignal.timeout(30_000)` everywhere; one retry on 429/5xx; per-segment caching for renders; add the missing top-level try/catch.

### [High] Admin: magic-link token read before the router is ready — emailed sign-in intermittently fails
File: `apps/admin/web/src/App.vue:99-104`, `main.ts:49-52`
Why: The root `onMounted` reads `route.query.token`, but the app mounts without awaiting `router.isReady()`; the initial async navigation means `useRoute()` is still `START_LOCATION` with empty query, silently dropping the token.
Fix: `router.isReady().then(() => app.mount('#app'))` or read `window.location.search` directly.

### [High] Admin: role change is revoke-all-then-assign with swallowed errors
File: `apps/admin/web/src/pages/UsersPage.vue:49-60`; `composables/useAdminUsers.ts:58-87`
Why: `setSingleRole` revokes every current role then assigns the new one; `assignRole`/`revokeRole` swallow errors, so a mid-sequence failure leaves the user with **zero roles** — including the acting admin demoting themselves with no confirmation.
Fix: Single server-side role-replace call, or assign-then-revoke with rethrow + abort; confirm on self-demotion.

### [High] Radio (web): three more player-breaking bugs
File: `apps/radio/web/src/App.vue:536-546, 592-604`; `composables/useAudioPlayer.ts:116-165`
Why: (a) The volume popup wires a native `<input type="range">` with `'onUpdate:modelValue'` — a Vue component event a native input never fires; the slider does nothing. (b) Uploaded audio is stored as `URL.createObjectURL(...)` blob URLs, persisted to localStorage *and* synced to remote state — dead after any reload, on every other device, and never revoked. (c) `play()` creates the YouTube player inside an unguarded `.then()`; a second tap before the API loads leaves an orphaned, audible iframe with no handle (two tracks playing simultaneously).
Fix: `onInput` handler; upload files to the media API (or mark blob tracks session-only); generation-token guard around the async player creation.

### [High] Cards (web): bootstrap has no error handling — offline first run hangs forever
File: `apps/cards/web/src/App.vue:495-501`
Why: `runtime.bootstrapIdentity()` throws when the identity API is unreachable; yes-no/timer/type wrap it in try/catch, cards does not — `loadCollections()` never runs and a first-run user sees "loading cards" forever, plus an unhandled rejection.
Fix: try/catch the bootstrap; always run `loadCollections` (it has its own try/finally).

### [High] Cards (web): bulk move deletes the card before recreating it
File: `apps/cards/web/src/composables/useCardsStore.ts:282-297`
Why: `moveSelected` awaits `deleteCard` then `createCard`; a failure between them permanently loses the card. Moving a *default* card also mints a new `user_` id and issues a DELETE on default content the API will refuse, desyncing local and server state.
Fix: Move via update (PUT with new collectionID), or create-first-then-delete; skip/copy non-user cards.

### [High] sentence-api's learning loop never runs: `scheduled` handler exists, cron trigger doesn't
File: `workers/sentence-api/src/index.ts:130-133, 201-205`; `wrangler.toml` (no `[triggers]`)
Why: `recalculateLearnedTransitions`/`recalculatePredictionScores` are the entire usage-learning mechanism. Without `crons = [...]` they never execute: predictions stay frozen at the initial AI score while click data accumulates unbounded.
Fix: Add `[triggers] crons = ["0 3 * * *"]` to both envs (and see the ranking-poisoning finding in 04-security before enabling).

### [High] iOS: speech is silenced by the mute switch in every app except Radio
File: `apps/yes-no/ios/Sources/YesNoSpeechService.swift:41-47, 95-105`; `apps/cards/ios/Sources/CardsSpeechService.swift`; `apps/talk/ios/Sources/TalkSpeechService.swift`
Why: No speech service sets an `AVAudioSession` category, so playback uses `.soloAmbient`, which respects the ringer switch. For an AAC product whose core function is a child's voice output, the app going silent because the ringer is muted is a functional failure.
Fix: `setCategory(.playback, mode: .spokenAudio)` once in a shared TikoKit speech service.

### [High] iOS: Talk ships pointing at the dev API; Cards always speaks with an en-US voice
File: `apps/talk/ios/Sources/TalkAPIClient.swift:53` + `TalkStore.swift:30`; `apps/cards/ios/Sources/CardsView.swift:399` + `CardsSpeechService.swift:7`
Why: `TalkAPIClient` defaults to `.development` (`dev-api.tikotalks.com`) with no build-config switch — release builds talk to the dev backend. Cards never passes the user's language to TTS, so Dutch card text is read by an English voice (yes-no does this correctly).
Fix: `#if DEBUG` environment default; `speechService.speak(card.speech, languageCode: languageCode)`.

### [High] @tiko/i18n is not reactive but mimics a Vue ref API
File: `packages/i18n/src/index.ts:1163-1207`
Why: `i18n.language` is a plain getter shaped like a `Ref`; `setLanguage()`/`addBundle()` mutate non-reactive state, so computeds/templates using `i18n.t(...)` never re-render on language change. Every app must hack around it, and four divergent variants of the hack now exist — including bugs the hack itself caused (yes-no's stale `defaultSentence` when switching back to a loaded language, `apps/yes-no/web/src/App.vue:203-206`; talk calling `setLanguage` inside a computed getter, `apps/talk/web/src/App.vue:21-34`). The iOS twin has the same bug: `TikoI18n.addBundle` never fires `objectWillChange`, so remote translations never trigger a re-render (`packages/tikokit-ios/Sources/TikoKit/TikoI18n.swift:55-62`).
Fix: Back the store with `@vue/reactivity` (`shallowRef` + revision bump in `t()`/`addBundle()`) keeping the existing API; mark the Swift `bundles` dict `@Published`.

## Medium (selected — grouped)

### Workers
- **app-api session fallback reads the identity DB directly with copied token hashing** — doctrine-violating compatibility fallback that masks identity outages and risks drift (`workers/app-api/src/index.ts:386-400`).
- **`clearAppProgress` responds `version: 1`** while the SQL bumps `version = version + 1` — guarantees a client 409 on the next conditional write (`workers/app-api/src/index.ts:372-379`). Use `RETURNING version`.
- **content-api cache invalidation misses every language outside a hardcoded 10-language list**; admin edits stay stale for other locales until TTL (`workers/content-api/src/index.ts:114-132`).
- **content-api non-admin `saveAsDefault` silently degrades to a personal override** with a 200 (`:1330-1359`) — doctrine violation; return 403 or an explicit flag.
- **content-api default-card DELETE removes translations before verifying the card matches** (`:1477-1478`); `handlePromoteCollection` can silently overwrite an existing default via `INSERT OR REPLACE` on a stripped id (`:1517-1536`).
- **`makeSilentMp3Padding` returns 0 bytes** — story segment pauses are validated, persisted, and entirely ignored (`workers/generation-api/src/index.ts:737, 839-841`).
- **Multi-image preview hardcodes quality/background and forwards DALL·E sizes gpt-image rejects** — non-square multi-previews fail on every variation (`:1224-1231`).
- **ElevenLabs `voice_settings.speed` receives the OpenAI range (0.25–4)** while the provider accepts ~0.7–1.2 → provider 400s surfaced as generic 502 (`:523, 605`).
- **`deletePhrase` reports success without checking `meta.changes`** (`workers/sentence-api/src/index.ts:465-477`); `autoSave` creates unbounded duplicate phrase rows (`:406-409`).
- **identity-api: `identity_deletion_requests` exists only as runtime `CREATE TABLE IF NOT EXISTS` inside `.catch()` blocks**, duplicated twice, swallowing the real insert error (`workers/identity-api/src/index.ts:315-325, 509-521`). Add a real migration.
- **Un-awaited fire-and-forget `email_plain` UPDATE without `ctx.waitUntil`** — pending I/O after the response may be cancelled (`:77, 921-925`).
- **Session cookie cleared on every deletion-request POST regardless of scope** — deleting a child account logs the parent out of the browser (`:979-984`).
- **`createManagedChild` is non-atomic**: duplicate handle → unhandled 500 + orphaned subject (`:350-356`).
- **admin-api: malformed JSON body silently resets configs to defaults** — `readJson` returns `{}`, which normalizes to a full default payload and is written with a bumped version (`workers/admin-api/src/index.ts:432-439`). Return 400.
- **admin-api: Lezu sync throws after the DB write committed** — client sees a 500 for a successful save, then a version conflict on retry (`:243, 304, 364-377`).
- **identity client throws raw `SyntaxError` on non-JSON responses** (parses before checking `response.ok`), misclassifying outages (`packages/identity/src/index.ts:459-462`); `verifyEmail` throws synchronously from a Promise-returning method (`:287-291`).
- **`EmailChallengeRequest.purpose` advertises purposes the worker silently rewrites to `'recover'`** (`packages/identity/src/index.ts:97-100` vs `workers/identity-api/src/index.ts:130-133`); `UserCapabilities` is missing `canEditContent`, which app-api's admin gate reads (`packages/identity/src/index.ts:52-58`).
- **`TikoDataClient` silently rewrites `identity.tikoapi.org` → `app.tikoapi.org`** — and only for some input shapes (`packages/data/src/index.ts:212-215`). Fail loudly instead.
- **Magic-link delivery silently no-ops when `COMMUNICATION_API_KEY` is unset** — challenges "succeed", no email is ever sent (`workers/identity-api/src/index.ts:1011-1016`).

### Web apps
- **Sequence & Todo read settings from remote but never write back** — `putSettings` doesn't exist in either app, so remote always overwrites local changes on next launch (`apps/sequence/web/src/App.vue:233-236`, `apps/todo/web/src/App.vue:195-198`).
- **Admin defaults page: stale-response race when switching apps** — a slow cards response can land in the timer editor and then be saved as timer state (`apps/admin/web/src/pages/AppDefaultsPage.vue:139-161`).
- **Admin: transient network failure on load wipes stored identity** — any failure (offline, 5xx) is treated as invalid credentials (`useAdminAuth.ts:130-138`).
- **TTS client permanently caches failure responses** — a transient backend hiccup mutes a phrase for the whole session (`packages/ui/src/index.ts:332-334, 362-365`).
- **TikoPagedTileGrid measures via global `document.querySelector`** — second instance computes from the first one's size (`packages/ui/src/TikoPagedTileGrid.vue:39-42`); current page not clamped when items shrink (`:74-76`).
- **Overlapping audio on rapid taps** in yes-no tiles, cards, sequence, todo, and talk — no reentrancy guard or cancel-previous anywhere (`apps/yes-no/web/src/App.vue:465-471`, `apps/talk/web/src/composables/useSentenceApi.ts:249-268`, etc.).
- **`colorMode: 'system'` resolved once, never subscribed** — OS theme flips are ignored until reload, in all seven small apps.
- **Radio `applyState` re-derives category ids/orders**, duplicating/discarding remote data (`apps/radio/web/src/App.vue:310-316`); `removeTrackById` corrupts `currentTrackIndex` (`:687-702`); upload handler discards the chosen category (`:592-599`); fresh `addedAt` stamps cause a remote PUT on every boot (`:405-427`).
- **Talk: non-en/nl languages silently reset to English on reload** (`useTalkApp.ts:37-40`); concurrent `start()`/`next()` can apply stale responses (`useSentenceApi.ts:125-206`).
- **Cards: `hydrateMedia` failures unhandled and permanently un-retryable** — ID added to the fetched set before the await (`useCardsStore.ts:203-225`); grid layout reads `window.innerWidth` non-reactively — rotation breaks layout (`App.vue:160-178`); `isAdmin = emailVerified` exposes default-content edit affordances to any verified parent with optimistic updates that don't roll back (`App.vue:181`, `useCardsStore.ts:118-132`).
- **Type: keyboard toggle label lies** (says ABC, switches to AZERTY, `App.vue:156-160`); speak uses raw `speechSynthesis` with no `utterance.lang` — wrong-language voice for the app's core function (`App.vue:280-290`).

### iOS
- **Cards reordering is never persisted** — drag-and-drop mutates memory only; gone on next launch (`apps/cards/ios/Sources/CardsStore.swift:109-150`). Add operations swallow persistence failures silently (`:152-160`).
- **Radio: tracks never auto-advance** (no end-of-track observation; `repeat` is dead) and next/previous ignore the open collection (`apps/radio/ios/Sources/RadioPlaybackService.swift:104-131`, `RadioView.swift:440-460`).
- **Deleting the "Unsorted" category orphans its tracks forever** (`RadioLibraryStore.swift:139-158`).
- **`as!` force cast on 204 responses** in the shared identity client — server behavior can crash the app (`TikoIdentity.swift:424`).
- **"Resend code" doesn't resend** (`TikoPopupSheets.swift:1118-1122`); all PIN-verify failures report "Incorrect PIN" including network errors (`:1397-1400`); Talk identity refresh can drop the device secret by skipping `preservingSession(from:)` (`TalkIdentityProvider.swift:24-31`).
- **Yes-No tile editor save drops translations** for all languages (`apps/yes-no/ios/Sources/YesNoView.swift:1126-1133`).
- **Type's Speak button is a no-op TODO** — the central feature of a type-to-talk app does nothing (`apps/type/ios/Sources/TypeView.swift:141-144`); Timer's completion sound is likewise a TODO.

## Low (selected)

- content-api `order: 0` falsy bug appends instead of placing first (`workers/content-api/src/index.ts:1043`).
- Corrupt stored JSON silently becomes `{}` in app/content/media workers — invisible corruption, doctrine violation (`workers/app-api/src/index.ts:459-465` et al.).
- timer `startedAt` precedence bug `(a - b) || null`, and restore loses `totalDuration` so the ring shows 0% (`apps/timer/web/src/composables/useTimer.ts:89-125`).
- sequence `labels.step` renders the raw `{current}` template in the create form (`apps/sequence/web/src/App.vue:512`).
- Admin StoryNarrator UI has a fake player (hardcoded 0:00/2:48) and falsely claims autosave (`apps/admin/web/src/pages/StoryNarratorPage.vue:540-547, 594`); dead audio-album state on the media library page makes failures invisible (`MediaLibraryPage.vue:18-126`).
- yes-no sentence button shows a pause icon while disabled; stalled audio locks the state machine (`apps/yes-no/web/src/App.vue:512-519, 431-437`).
- Radio `loadYouTubeIframeAPI` overwrites earlier resolvers and never rejects — first caller's promise can hang forever (`useAudioPlayer.ts:7-18`).
- iOS image cache: unbounded growth in a backed-up directory (`TikoCachedRemoteImage.swift:18-23`); random library image silently persisted as the user's avatar (`TikoAppShell.swift:448-457`).
- `useTikoMedia().loading` is a plain object masquerading as a ref, and `search` clears it before the request finishes (`packages/media/src/index.ts:100, 124-133`).
