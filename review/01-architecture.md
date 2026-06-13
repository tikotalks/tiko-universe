# 01 — Architecture & Structure

Scope: monorepo layout, module boundaries, coupling, service boundaries, dead code. Findings are facts unless marked *(opinion)*.

## Overview

The repo is an npm-workspaces monorepo with a product-first layout (`apps/<product>/<platform>`), shared TypeScript packages (`packages/*`), and one Cloudflare Worker per service domain (`workers/*`). Web is Vue 3 + Vite SPAs; iOS is SwiftUI sharing a local SPM package (`packages/tikokit-ios`); Android is Capacitor WebView wrappers around the web apps. ~68k LOC of TS/Vue plus a substantial Swift codebase.

### What works well

- **Product-first layout** (`apps/yes-no/{web,ios,android}`) keeps each product's platforms together and is consistently applied.
- **Source-as-distribution packages**: every `@tiko/*` package points `main`/`types` at `src/index.ts` with no build step; the root vitest/tsconfig alias workspace names to source. Simple and effective for this scale.
- **API-first is real, not aspirational**: web and iOS clients consume the same worker APIs; `tests/` contains genuine contract tests running real worker handlers against in-memory fakes.
- **TikoKit (iOS) is a clean shared kit**: identity actor client, i18n, design components, app shell — per-app boilerplate is ~5 lines (`TikoAppConfig` registry).
- **Schema discipline in identity**: CHECK constraints, partial unique indexes on active role assignments, FKs that do real work (`workers/identity-api/migrations/0004`, `0005`). Legacy `cards_collections`/`cards_tiles` were cleanly dropped after the content-items unification (`workers/content-api/migrations/0006`).
- **atlas-api observability design**: structured events + D1 audit with secret-redaction (`workers/atlas-api/src/observability.ts:3-77`) and "audit must never break a product request" isolation (`audit.ts:79-81`).

---

## Findings

### [High] Service boundaries exist in code but not in data: three workers share one D1 database with three migration histories
File: `workers/app-api/wrangler.toml:23-27`, `workers/atlas-api/wrangler.toml:10-13`, `workers/communication-api/wrangler.toml:13-16`
Why: app-api, atlas-api, and communication-api all target `tiko-db`, each with its own `migrations_dir`. Wrangler tracks applied migrations in one `d1_migrations` table per database keyed by filename; all three dirs contain a `0001_…` prefix. One rename away from a skipped or double-applied migration, and no single owner of the schema. app-api additionally binds the **identity** database directly for a session fallback (`workers/app-api/wrangler.toml:30-33`).
Fix: Give each worker its own database (preferred, matches the service-boundary doctrine) or consolidate `tiko-db` migrations into one directory owned by one worker. Remove app-api's `IDENTITY_DB` binding (see 04-security).

### [High] Auth is implemented at least five different ways across workers
File: `workers/shared/auth.ts` (media, app), `workers/app-api/src/index.ts:406-423` vs `workers/content-api/src/index.ts:1293-1307` (duplicated role parsing), `workers/content-api/src/index.ts:1060-1070` (static `ADMIN_SECRET`), `workers/atlas-api/src/index.ts:213` (static `SERVICE_API_KEYS`), `workers/communication-api/src/index.ts:435` / `workers/translations-api/src/index.ts:77-80` (service keys)
Why: shared `authenticate()`, direct identity-API fetch with role parsing duplicated verbatim, two static-secret mechanisms, per-worker service keys — and atlas-api product routes have **none** (see 04-security, Critical). Every new worker re-decides auth; gaps and drift are structural, not accidental.
Fix: One shared `requireSession` / `requireRole(scope)` / `requireServiceKey` middleware in `workers/shared/`, returning roles/capabilities from a single identity round-trip. This single change eliminates the duplicated `requireAdminSession`/`verifyAdminFromSession` pair and the atlas auth gap.

### [High] identity-api contains two parallel auth paths in one worker
File: `workers/identity-api/src/index.ts:106-150` (ankore delegation) vs `:730-738` (`requireIdentitySession`)
Why: Canonical routes delegate to the external `ankore` package (cookie + bearer transports, device binding); ~850 lines of Tiko-specific logic (PIN, managed children, deletion/reset, profile) re-implement session validation locally (bearer-only, no cookie support, no device binding). Most of the security gaps found in 04-security live on the local path. The cookie transport ankore sets is then ignored by the very endpoints browsers would call (`requireIdentitySession` parses `Authorization` only).
Fix: Route managed-endpoint auth through ankore's session validation (or a shared helper that handles both transports) so there is one session model.

### [Medium] content-api ↔ app-api coupling: card state CRUD is a 3-hop HTTP chain
File: `workers/content-api/src/index.ts:918-950`
Why: User card state lives in app-api's `app_state` blob, but content-api implements full CRUD over it via HTTP read-modify-write using the user's token. Every card edit is content-api → app-api → identity-api, with a race window in the read-modify-write. The mutation API belongs in app-api, or the state belongs in content-api's DB.
Fix: Move card-state mutations to the worker that owns the storage.

### [Medium] Three overlapping TTS implementations with three separate caches
File: `workers/tts-api/` (self-described temporary), `workers/generation-api/src/index.ts:356-506` (local OpenAI/ElevenLabs path + Atlas delegation), `workers/atlas-api/src/domains.ts`
Why: tts-api, generation-api's local provider path, and the Atlas path each maintain their own D1+R2 cache. The Atlas path never writes generation-api's local cache, so the local pre-check is a wasted D1 round-trip and the two layers can disagree. tts-api shares generation-api's D1 but uses a *different* R2 bucket per env — a cache hit can point at an object that only exists in the other environment's bucket (see 03-correctness).
Fix: Retire the local provider path (or persist Atlas results into it), and fold tts-api into generation-api once the Yes-No compat window closes.

### [Medium] Package boundary inversion between @tiko/data and @tiko/media
File: `packages/data/src/media.ts` (REST media client), `packages/media/src/index.ts` (TTS contracts + pseudo-Vue composable + `COLLECTION_CATEGORY_MAP`)
Why: The media REST client lives in the data package; the media package holds TTS generation contracts, a fake composable, and a Cards-app-specific constant. `useTikoMedia` is also the only client that reads `import.meta.env` internally instead of accepting a base URL — it cannot be pointed at a test server.
Fix: Move the REST client to `@tiko/media`, the Cards map into the cards app, and inject the base URL.

### [Medium] Cookie transport and Keychain storage are built but unused — dual transports violate the no-fallbacks doctrine
File: `workers/identity-api/src/index.ts:972-1004` + `packages/identity/src/index.ts` (`getCookieSession`, `credentials`) vs `packages/ui/src/identity-runtime.ts:243-266`; `packages/tikokit-ios/Sources/TikoKit/TikoIdentity.swift:477-536` (Keychain store referenced only by tests)
Why: The platform carries two web session transports (HttpOnly cookie + bearer-in-body) and two iOS storage backends (Keychain + UserDefaults), and in both cases the *less safe* one is the live path. Dead-but-built infrastructure misleads maintainers and doubles the security surface. See 04-security for the credential-storage consequences.
Fix: Finish the migration (cookie for browsers, Keychain for iOS) and delete the other path, or document the exception.

### [Medium] Admin console has two parallel editors for Cards defaults backed by different APIs
File: `apps/admin/web/src/pages/CardsPage.vue` (content API `/cards/collections`) vs `apps/admin/web/src/components/defaults/CardsEditor.vue` (app-defaults API `/defaults/cards/state`); routing `apps/admin/web/src/main.ts:33-35`
Why: Two ~400-line near-identical editors edit *different backends*; an admin can edit one and wonder why the app didn't change. The same split lurks for sequence (special-cased in `AppDefaultsPage.vue:66-68, 148-152`).
Fix: Pick one source of truth for starter content and delete the other editor.

### [Medium] iOS cross-app identity sharing is implied but does not exist
File: `packages/tikokit-ios/Sources/TikoKit/TikoIdentity.swift:442-453`
Why: `sharedNamespace = "org.tiko.identity"` and `sharedKeychainAccessGroup(teamId:)` signal one device identity for all Tiko apps, but the store writes per-app `UserDefaults.standard` and no app sets a keychain access group. Each app bootstraps a separate anonymous subject — child mode in Cards doesn't apply in Yes-No, and the admin cleanup cron sees N anonymous users per device.
Fix: Adopt the Keychain store with the shared access group + Keychain Sharing entitlement in every `Project.yml`.

### [Medium] Android documentation has diverged from reality
File: `apps/android/README.md`
Why: README describes a future Kotlin/Compose stack; the actual implementation is Capacitor WebView wrappers per app (`apps/<app>/android` + `tools/android-wrappers.mjs`). `apps/ios` and `apps/android` are placeholder doc directories, not shared shells.
Fix: Update the READMEs to describe the wrapper architecture.

### [Low] Cross-app duplication in web apps: ~150 lines of identical runtime boilerplate × 7 apps
File: e.g. `apps/yes-no/web/src/App.vue:73-417`, `apps/timer/web/src/App.vue:49-289`, `apps/type/web/src/App.vue:34-265`, `apps/sequence/web/src/App.vue:56-310`, `apps/todo/web/src/App.vue:43-256`, `apps/radio/web/src/App.vue:74-523`, `apps/cards/web/src/App.vue:389-501`
Why: Every app re-implements `resolveApiBaseUrl`/`resolveIdentityBaseUrl`, `readJson`/`writeJson`, `toLanguage`/`toColorMode`, the identity-runtime wiring, the settings/state hydrate-persist trio with version threading, and the three standard watchers. The drift this has already caused is measurable: radio defaults its data API to the **identity host** (`apps/radio/web/src/App.vue:74-77`), sequence/todo never write settings back at all, todo skips `useIdentityRuntime` entirely, and four variants of the i18n-reactivity hack exist. vite.config.ts is also byte-identical across apps.
Fix: A single `useTikoAppRuntime({ appId, storageKey })` composable in `@tiko/ui` or `@tiko/data` absorbing items 1–7, plus a shared `createTikoViteConfig()`. This is the highest-leverage refactor in the web codebase.

### [Low] Dead code inventory
Why: Dead code implies features that don't exist and misleads maintainers. Confirmed dead (no callers, verified by the reviewing agents):
- `packages/data/src/media.ts` — entire `TikoMediaClient` targets routes that don't exist on any worker (see 03-correctness, High).
- `apps/talk/web/src/components/` — 8 legacy components + `useAudioPlayer.ts` + `mockTalkData.ts` (~1,000 lines), kept alive only by a spec for an unreachable component.
- `apps/radio/web/src/components/AddVideoPopup.vue` (473 lines, superseded).
- `apps/clock/web` — empty shell: only `e2e/` and `public/` deploy files; no src, no package.json (see 03-correctness, High).
- `workers/generation-api/src/index.ts:1681-1842` — `splitPngQuadrants` + PNG encoder chain (~130 lines, no caller).
- atlas-api: `atlas_route_overrides` table, `YOUTUBE_API_KEY`/`TOKEN_PEPPER`/identity bindings, `bytesBody` import; registry `allowedApps`/`allowedPurposes` declared but never enforced.
- app-api `requireAnyAuth`; media-api `USER_MEDIA_BUCKET` binding; content-api un-suffixed cache keys.
- `packages/ui/src/parent-mode.ts` — superseded by identity-runtime; both branches of `disableParentMode` return the same value.
- shared/auth.ts D1 API-key branch — queries a table (`api_keys`) that exists in no migration (only as the orphaned root-level `migration.sql`).
- Dead identity wrappers copied into timer, type, and sequence App.vue files.
Fix: Schedule a deletion pass before extracting shared packages, so shared code isn't extracted from stale variants.

### [Low] (opinion) iOS state management spans three generations of patterns
File: `TikoI18n`/`CardsStore` (ObservableObject), `RadioLibraryStore`/`TalkStore` (@Observable), yes-no (@AppStorage JSON blobs)
Why: Workable, but conventions differ app-to-app; `CardsView.localizedCollections` manually mirrors store state — a pattern `@Observable` would eliminate.
Fix: Converge on `@Observable` for new code.

## Coverage note

Architecture observations synthesize all area reviews. Not reviewed: `docs/` content beyond DOCTRINE.md, ankore package internals (external dependency), Android Gradle trees, generated Xcode projects.
