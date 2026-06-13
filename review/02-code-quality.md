# 02 — Code Quality

Scope: readability, duplication, naming, complexity hotspots, consistency, type safety, dead code. Pure-correctness issues live in `03-correctness-and-bugs.md`.

## What is done well

- **Consistent worker error envelopes** within each worker, with typed `HttpError` classes and structured `{ error: { code, message, field } }` responses (generation-api, app-api, sentence-api).
- **Defensive parsing at boundaries** is the norm in apps: `toLanguage`/`toColorMode` validators, `normalizeCollection`/`normalizePresets`, try/catch'd `readJson` everywhere.
- **Typed i18n key registry** (`packages/i18n/src/index.ts:104-463`): const-object keys, typo-proof, shared conceptually with iOS — a genuinely good pattern.
- **Typed per-app models**: `AppSettingsById`/`AppStateById` give full inference from a single app literal (`packages/data/src/index.ts`).
- **Modern Vue**: `generic="T extends { id: string }"` + `defineModel` in TikoPagedTileGrid; render-function components used judiciously; lazy-loaded routes everywhere.
- **Swift concurrency** is mostly textbook: actors for clients, `@MainActor` stores, `nonisolated` delegate methods hopping back correctly (`YesNoSpeechService.swift:69-83`).
- **Well-commented non-obvious code**: radio's WKWebView window-attachment fix, talk's golden-angle word-cloud layout (`useTalkPresentation.ts:119-194`), migration headers explaining legacy intent.

---

## Findings

### [High] No code linter exists anywhere in the repo
File: `package.json:14` (`"lint": "node tools/check-placeholders.mjs"`)
Why: The only "lint" gate asserts that eight scaffold files exist (honestly documented in AGENTS.md, to its credit). There is no ESLint/oxlint/Prettier in ~14 web workspaces and 13 workers. Several findings in this review are exactly what a linter catches mechanically: unused locals (dead identity wrappers in timer/type/sequence), `no-floating-promises` (the unhandled-rejection findings in admin), `vue/require-explicit-emits`, type-only imports (`apps/radio/web/src/App.vue:11` imports a type as a value — breaks under `verbatimModuleSyntax`).
Fix: Adopt oxlint or ESLint+`eslint-plugin-vue`, wire into `npm run check` and CI; rename the current script to `check:scaffold`.

### [High] Duplication is the dominant quality issue, in three distinct layers
Why and where (each verified verbatim or near-verbatim):
1. **Across the 7 small web apps** (~150 lines each): base-URL resolvers, localStorage helpers, validators, identity-runtime wiring, hydrate/persist trio, standard watchers, settings-panel labels, and byte-identical `vite.config.ts` files. Already-measurable drift: radio's wrong API default, sequence/todo's missing `putSettings`, todo's hand-rolled identity bootstrap, four variants of the i18n hack. (See 01-architecture for the `useTikoAppRuntime` recommendation.)
2. **Across workers**: four near-identical CORS helpers, `getBearer`/`readJson`/`HttpError`/`json()` re-implemented per worker, six divergent hand-rolled `D1Database` interface declarations (shared/auth's lacks `run()` and generics — add `@cloudflare/workers-types` instead), admin role parsing duplicated verbatim (`workers/app-api/src/index.ts:406-423` vs `workers/content-api/src/index.ts:1293-1307`), and the peppered email-hash recipe duplicated across identity-api and admin-api (`identity-api:872-875` vs `admin-api:717-721`) where silent drift breaks admin bootstrap.
3. **In the admin console**: `adminApiBaseUrl()`, error-body parsing, and bearer-header assembly re-implemented in 8+ composables; a ~40-line shared `adminApi(path, init)` module would remove ~200 lines and make the 401-vs-network distinction fixable in one place. Plus two parallel cards editors (~400 lines each) editing different backends.
4. **On iOS**: `CardsSpeechService` and `TalkSpeechService` are byte-identical except the name; `YesNoSpeechService` is a superset. Hex parsing exists three times while `Color(hexString:)` already exists; CDN-resize helpers four times; `refreshIdentityBundle` twice.
Fix: Extract in this order: shared worker middleware (auth/CORS/HTTP helpers), `useTikoAppRuntime`, `adminApi`, `TikoSpeechService`. Do the dead-code pass first so extraction doesn't enshrine stale variants.

### [Medium] God files / complexity hotspots
File: `workers/generation-api/src/index.ts` (2,008 lines), `workers/content-api/src/index.ts` (1,581), `apps/admin/web/src/pages/StoryNarratorPage.vue` (1,530), `apps/admin/web/src/pages/ImageGeneratorPage.vue` (1,422), `workers/media-api/src/index.ts` (1,108), `packages/i18n/src/index.ts` (~1,250 incl. embedded bundles), `workers/identity-api/src/index.ts` (1,052)
Why: Single-file workers with 30+ routes and inline business logic; both admin god-pages combine three feature areas (library/drafts/creator) with shared loading state that already causes cross-tab bugs. generation-api's route matching is `startsWith`/`endsWith` string surgery with chained `.replace()` ID extraction — fragile for IDs containing keywords like `promote`.
Fix: Split workers by route module; split admin pages per tab; introduce a small path-pattern helper for generation-api.

### [Medium] Type-safety dilutions in the most security-relevant code
File: `workers/identity-api/src/index.ts:818-820` (`parseRecord` → `Record<string, any>`, `withTikoSessionContract` operating on `any` bodies); `workers/content-api/src/index.ts:1514` (`as CardCollection` on an unvalidated body); `packages/identity/src/index.ts:453-456` (`init.headers as Record<string, string>` silently drops a `Headers` instance); `packages/ui/src/identity-runtime.ts:225` (non-null `inject(...)!` later null-checked anyway), `:12-29` (`ReturnType<typeof ref<string>>` accidentally yields `Ref<string | undefined>`); `packages/media/src/index.ts:54-58` (one-field guard typed as the full shape)
Why: Strict mode is on, but casts and `any` at exactly the auth/session boundary are where lying types cost the most.
Fix: Type the session body shape; validate then narrow instead of asserting; replace the `!` with a guarded helper.

### [Medium] Two incompatible `ApiErrorEnvelope` types exported under one name
File: `packages/identity/src/index.ts:83-86` (flat) vs `packages/media/src/index.ts:42-52` (nested)
Why: Same exported name, different shapes, both importable in one app — error handling that never matches is one wrong import away. It also documents that the platform speaks two error dialects.
Fix: Rename per service (`IdentityErrorEnvelope`…) or unify worker envelopes long-term.

### [Medium] @tiko/ui package scripts are stubs and a dependency is undeclared
File: `packages/ui/package.json:14-17`
Why: `"typecheck": "echo scaffold-only:@tiko/ui"` and the same for `test` — per-package gates silently pass for the package containing the PIN popup. It also imports `@tiko/identity` (`identity-runtime.ts:3`) without declaring it, resolving only via hoisting. Same undeclared-imports problem in admin (`bemm`, `@sil/ui`, `@tiko/i18n`, `@tiko/data`), website (`@tiko/ui`, vitest stack), media (`@sil/ui`).
Fix: Wire real `vue-tsc`/`vitest` scripts; declare what you import.

### [Medium] Hardcoded English strings in an i18n'd, 13-language product
File: `packages/ui/src/index.ts:584, 603, 524`; `packages/ui/src/TikoSelectionBadge.vue:19`; `apps/sequence/web/src/App.vue:468-495`; `apps/radio/web/src/components/AddAudioPopup.vue:179-330`; `packages/tikokit-ios/Sources/TikoKit/TikoPopupSheets.swift:830-1444`
Why: Interactive a11y labels ('Back', 'Account', 'Deselect'), sequence's Speak/Stop buttons, radio's entire add-audio popup, and the iOS auth/PIN sheets are English-only while the rest of the UI localizes. Screen-reader users get English control names regardless of language. iOS additionally maintains *three* localization tiers (TikoI18n bundles, `TikoSettingsLabels` hand-switch, raw literals).
Fix: Route through the existing labels patterns; on iOS extend TikoI18n with a shared `shell` bundle and delete `TikoSettingsLabels`.

### [Medium] Doctrine violations: silent fallbacks the project's own rules forbid
File: `workers/translations-api/src/index.ts:96-111` (three accepted Lezu shapes, degrades to `raw as Record<...>`, errors → `{}` with a 200); `packages/data/src/index.ts:212-215` (silent host rewrite); `workers/app-api/src/index.ts:386-400` (self-described "backward-compatible local fallback"); `packages/media/src/index.ts:155-174` (`url`→`original_url` shape sniffing); `workers/identity-api/src/index.ts:208-211` (`/child-accounts` + `/managed/children` route aliases); `packages/identity/src/index.ts:276-278` (alias methods)
Why: `docs/doctrine/DOCTRINE.md` explicitly bans compatibility fallbacks and silent data-shape conversions; these are the live violations found. Each one hides whichever side of a contract is wrong.
Fix: Validate one shape and fail loudly; delete the aliases and fallbacks (each has a concrete fix in 03/04).

### [Low] Naming and small-confusion issues (selected)
- `hashToken` in admin-api actually hashes emails (`workers/admin-api/src/index.ts:717-721`).
- `showSettingsButton` hides **all** header actions, not the settings action (`packages/ui/src/index.ts:591`).
- `PinVerifyRequest.purpose: 'a' | 'b' | string` — the union collapses to `string` (`packages/identity/src/index.ts:119`).
- `VersionedAppData<T>` declares an unused type parameter (`packages/data/src/index.ts:8-12`); inconsistent `JsonObject` vs `[key: string]: unknown` index signatures across state models (`:50-180`).
- iOS Cards bulk delete is labeled "Delete Cards" when deleting collections (`CardsView.swift:318-327`); Type's speech toggle uses the `parentMode` translation key (`TypeView.swift:28`).
- Magic-link URL variable naming is inverted (`webMagicLinkUrl` hardcoded, configured URL demoted to `webLinkUrl`, `workers/identity-api/src/index.ts:1048-1052`).
- Two unrelated `useAudioPlayer` composables with the same name (talk's dead 29-line one, radio's 313-line player).
- Workspace naming is split between `@tiko-web/*` and `@tiko-universe/*-web` (`apps/cards/web/package.json:2` vs `apps/yes-no/web/package.json:2`).

### [Low] Dead code (full inventory in 01-architecture)
Why: ~1,500+ lines of confirmed-dead code across talk's legacy components, radio's AddVideoPopup, generation-api's PNG chain, the TikoMediaClient, parent-mode.ts, and assorted unused helpers/bindings. Beyond bloat, several dead pieces are traps: the dead `splitPngQuadrants` chain contains un-awaited stream writes (unhandled-rejection hazard, `workers/generation-api/src/index.ts:1711-1729`), and `disableParentMode`'s two branches return the same value (`packages/ui/src/parent-mode.ts:40-47`).

### [Low] (opinion) Stylistic observations, explicitly not defects
- Render-function components in `packages/ui/src/index.ts` mixed with SFCs in the same package — consistent SFCs would lower the entry barrier.
- `index.ts` in @tiko/ui is "two libraries in one file" (tokens + TTS client + meta injection + components); splitting modules would help discoverability.
- `talk-types`' plain `string` aliases (`TalkWordId` etc.) document intent but provide zero safety; branding is optional and only worth it if mixups have actually bitten.
