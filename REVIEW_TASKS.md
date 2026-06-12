# Tiko Universe Review Task List

Source: `review/00-executive-summary.md` through `review/08-recommendations.md`, cross-checked against the Claude subagent logs from session `b239a74a-3625-4277-bf87-e3ebe8c614e3`.

Review date: 2026-06-12.

## TLDR

The architecture is solid, but several controls are designed rather than enforced. The biggest risks are server-side authorization gaps, paid AI endpoints without protection, dev/prod data sharing, credentials stored in client-accessible storage, and critical app bugs in Timer, Radio, Cards, PIN entry, and iOS speech.

Approximate review spread: 7 Critical, 35 High, 70 Medium, and 75 Low findings. The Criticals cluster around worker authorization/cost abuse and product-breaking client behavior.

The most urgent work is to lock down Atlas/generation/sentence/media/identity, isolate environments, make deploys wait for CI, and fix the child-facing breakages. After that, extract shared runtime/auth/i18n/speech code so the same bugs stop reappearing per app.

## Phase 0 — Stop-The-Bleed Security And Product Fixes

- [ ] Authenticate all atlas-api capability routes: `/run`, `/speech`, `/images`, `/text`, `/data/fetch`.
  - Enforce capability registry allowlists.
  - Add per-session/per-key rate limits for high-cost capabilities.
  - Block/limit `data.fetch` SSRF behavior.

- [ ] Fix sentence-api saved-phrase IDOR.
  - Resolve the authenticated session first.
  - Reject caller-supplied `userId` unless it matches the session subject or an authorized managed child.
  - Cover read, write, delete, and autosave phrase endpoints.

- [ ] Persist and validate `pinGrantToken`.
  - Store token hash, subject, purpose, expiry, and consumed timestamp.
  - Consume grants on account reset and deletion request.
  - Reject any non-issued, expired, wrong-purpose, or already-consumed grant.

- [ ] Gate paid AI/TTS endpoints.
  - Require auth or explicit service keys on generation-api TTS, voice samples, voices, tts-api `/generate`, sentence `/next`, and sentence `/complete`.
  - Normalize the voice-sample cache key to the actual provider model.
  - Add rate limits and budget controls.

- [ ] Fix media-api privacy enforcement.
  - Default unauthenticated asset/media reads to public-only.
  - Add owner fields where missing.
  - Require matching session or admin role for private reads and downloads.
  - Decide whether private media can be served from the public CDN at all.

- [ ] Add ownership and role checks to generation-api content mutations.
  - Record `created_by`.
  - Restrict delete/promote/edit/upscale/link operations to owner or admin.
  - Require auth for draft/private listings and binaries.

- [ ] Fix identity cleanup cron.
  - Exclude managed child accounts and child-role subjects from anonymous cleanup.
  - Delete FK-dependent rows before subject deletion.
  - Wrap each subject cleanup in try/catch so one bad row does not wedge the whole cron.

- [ ] Add PIN and child-code throttling.
  - Rate-limit `/pin/verify`, `/mode/parent`, and `/child-accounts/login`.
  - Add lockout/backoff per subject/device.
  - Replace fast single SHA-256 for 4-digit secrets with a stronger KDF where practical.
  - Remove synced app-level PIN hashes such as `RadioSettings.pinHash`.

- [x] Fix web Timer countdown.
  - Add a reactive `now` ref updated by the interval.
  - Make display and progress computed from that ref.
  - Add an assertion-based regression test.

- [ ] Fix web Radio playback.
  - Advance only on explicit ended events, never on `isPlaying === false`.
  - Fix the volume slider native input handler.
  - Stop persisting blob URLs as tracks.
  - Guard async YouTube player creation against double-start races.

- [ ] Fix the PIN popup.
  - Initialize digits with `Array(CODE_LENGTH).fill('')`.
  - Treat completeness as exactly four non-empty digits.
  - Fail closed when verify mode has no verifier/hash.
  - Add tests for sparse input, paste, auto-submit, and setup confirmation.

- [x] Fix Cards web first-run/offline hang.
  - Catch identity bootstrap errors.
  - Always load collections.
  - Handle media hydration failures with retryable state.

- [x] Fix Cards web bulk move data loss.
  - Move via update, or create-first-then-delete.
  - Do not delete/move default cards as user-owned content.
  - Add store tests for move failure and default-card behavior.

- [x] Add security headers to every web app.
  - CSP, `frame-ancestors`, `X-Frame-Options`, `nosniff`, `Referrer-Policy`, and `Permissions-Policy`.
  - Include admin, website, media, and all child apps.

- [ ] Fix iOS speech basics.
  - Set `AVAudioSession` to `.playback` / `.spokenAudio` before AAC speech.
  - Pass the selected language to Cards and Talk TTS.
  - Make Talk release builds use production API and debug builds use development API.

- [ ] Fix TTS cache races.
  - Use `INSERT OR IGNORE` / conflict-safe writes in atlas-api, generation-api, and tts-api.
  - Re-select the winning cache row after conflict.

## Phase 1 — Deployment, Data Isolation, And Auth Foundations

- [ ] Gate deploys on CI.
  - Add a verify job or convert deploy to `workflow_run`.
  - Make all deploy jobs depend on typecheck/tests/build.
  - Remove decorative `|| true` dry-run gates.

- [ ] Add missing workers to deploy.
  - Add `communication-api` and `translations-api` to deploy detection and matrices.
  - If any worker is intentionally manual, document that explicitly in CI.

- [ ] Isolate dev and production data.
  - Create separate D1 databases and KV namespaces for identity, app, atlas, media, communication, generation, sentence, and content caches.
  - Fix `provision-talk-dev.mjs` so production never reuses dev DB names.
  - Stop dev deploys from re-running schema/seed against shared remote data.

- [ ] Consolidate D1 ownership.
  - One database per worker, or one migration directory per shared database.
  - Move root `migration.sql` into the owning worker or delete it.
  - Add a real migration for `identity_deletion_requests`.

- [ ] Build one shared worker auth layer.
  - `requireSession`, `requireRole`, and `requireServiceKey`.
  - Use identity once per request and return roles/capabilities.
  - Delete duplicated admin-role parsing and static-secret variants.
  - Remove app-api direct identity DB fallback.

- [ ] Fix shared API-key auth.
  - Point at the real key table.
  - Hash presented tokens before comparison.
  - Use timing-safe comparison.
  - Add negative caching for missing key table/config.
  - Enforce scopes.

- [ ] Move browser identity to HttpOnly cookie transport.
  - Stop persisting session tokens and device secrets in localStorage.
  - Keep bearer-token JSON only for native/non-browser clients if needed.
  - Update identity runtime and app clients consistently.

- [ ] Move iOS identity storage to Keychain.
  - Make `TikoKeychainIdentityStore` the default.
  - Add one-time migration from UserDefaults.
  - Add shared Keychain access groups where cross-app identity is expected.

- [ ] Fix identity browser CORS.
  - Apply allowlist-origin reflection to managed endpoints.
  - Include PUT in preflight responses.
  - Make cookie sessions work in `requireIdentitySession`.

- [ ] Make account deletion/reset honest and privacy-safe.
  - Null or delete PII on completed account deletion.
  - Make reset endpoints actually clear app data through service bindings, or return `requested`.
  - Redact magic-link/OTP material in communication message storage.

## Phase 2 — Correctness And Data Integrity

- [ ] Make optimistic concurrency atomic.
  - Use SQL compare-and-swap updates in app-api and admin-api.
  - Require version for writes that claim concurrency safety.
  - Return the actual new version with `RETURNING`.
  - Debounce and serialize client writes.

- [ ] Make content-api bulk writes atomic.
  - Replace wipe-and-reinsert with batch/reconcile.
  - Preserve translations unless intentionally removed.
  - Prevent readers from seeing partial catalogs.

- [ ] Fix content default translation/cache invalidation.
  - Remove hardcoded language invalidation lists.
  - Use configured supported languages.
  - Version-stamp cache keys or purge all affected locales reliably.

- [ ] Fix Cards content source-of-truth split in admin.
  - Decide whether Cards defaults live in content-api or app defaults.
  - Delete the duplicate editor.
  - Ensure admin -> apps -> cards image thumbnails use image refs/CDN correctly.

- [ ] Fix image/media model contracts.
  - Cards/default content should use `imageRef`, never persistent image URLs.
  - Color values should be named enum values, never per-item `colorHex`.
  - Resolve display URLs at API/client boundary from Tiko Media.

- [ ] Fix app language behavior.
  - Make UI i18n reactive on web and iOS.
  - Make app language changes reload translated content from the API where content is server-owned.
  - Ensure Maltese and other configured languages get real UI coverage.

- [ ] Fix app-specific state persistence.
  - Sequence and Todo must write settings back remotely.
  - Radio must preserve category IDs/order and selected upload category.
  - Timer restore must preserve total duration/progress.
  - Cards reorder must persist on iOS.

- [ ] Fix admin reliability issues.
  - Await router readiness or read magic-link token from `window.location`.
  - Replace revoke-all-then-assign role changes with an atomic server operation.
  - Distinguish offline/5xx from 401/403 so valid admin sessions are not wiped.
  - Guard stale responses in app defaults page.
  - Stop sending admin bearer tokens to arbitrary image hosts.

- [ ] Fix provider/network robustness.
  - Add top-level error handlers in generation-api, tts-api, translations-api.
  - Add timeouts and one retry for external provider calls.
  - Make story rendering resumable or per-segment cached.

- [ ] Fix sentence learning loop.
  - Add cron triggers.
  - Authenticate and limit click tracking first.
  - Batch prediction inserts and cache purges.

## Phase 3 — Shared Runtime, UI, And Architecture Cleanup

- [ ] Extract `useTikoAppRuntime`.
  - Shared base URL resolution.
  - Identity bootstrap.
  - localStorage helpers.
  - settings/state hydrate and persist.
  - debounced/serialized remote writes.
  - reactive system color mode.
  - language handling.

- [ ] Make `@tiko/i18n` truly reactive.
  - Use Vue reactivity in web package.
  - Publish bundle/language revision changes.
  - Make Swift `TikoI18n` publish bundle changes.
  - Delete per-app language workaround code.

- [ ] Extract shared Tiko speech service.
  - Web: one TTS path, language-aware, concurrency-safe, failure-cache-safe.
  - iOS: shared audio session, language mapping, Atlas/browser/native fallback behavior.

- [ ] Clean up Tiko UI shared components.
  - Test PIN popup, child accounts panel, app shell, paged grid, icon picker.
  - Fix invalid a11y semantics and hardcoded English labels.
  - Ensure popup styling uses `@sil/ui` popup custom properties rather than styling inside popup content.
  - Use BEM/Bemm class naming consistently.

- [ ] Move shared layouts/components into TikoUI.
  - Cards/choice tile layouts.
  - User flow components that are not Cards-specific.
  - Shared media/image-ref rendering.
  - Avoid large single-file app implementations.

- [ ] Delete confirmed dead code before extraction.
  - `TikoMediaClient` unless matching worker routes are built.
  - Talk legacy components and dead `useAudioPlayer`.
  - Radio `AddVideoPopup`.
  - generation-api dead PNG code.
  - `parent-mode.ts`.
  - clock stub or restore the actual app.
  - unused worker bindings/tables/helpers.

- [ ] Split god files.
  - generation-api routes into modules.
  - content/media/identity workers where useful.
  - admin StoryNarrator/ImageGenerator pages by tab/feature.
  - `@tiko/ui` index into focused modules.

## Phase 4 — Testing And CI Quality

- [ ] Restore Playwright E2E.
  - Add `@playwright/test` as a root dev dependency.
  - Fix config shape and ports.
  - Remove or restore the clock project.
  - Rewrite stale suites for current flows/selectors.
  - Mock current Atlas/TTS endpoints, not legacy generation endpoints.
  - Add CI smoke coverage.

- [ ] Stop unit tests from calling production APIs.
  - Extract yes-no fetch mock patterns into `@tiko/testing`.
  - Use them in timer, type, website, and other app tests.
  - Clean up fake timers after each test.

- [ ] Add focused tests for high-risk bugs.
  - Timer countdown rendering.
  - Radio player pause/end/volume behavior.
  - Cards store move/delete/reorder behavior.
  - Admin auth restore and role replacement.
  - PIN popup and child-mode flows.
  - App runtime language/theme persistence.

- [ ] Make iOS tests run.
  - Fix stale TikoKit color assertion.
  - Add `swift test` for `packages/tikokit-ios`.
  - Run iOS CI on pull requests with path filters.

- [ ] Add real tests for `@tiko/ui`, `@tiko/atlas`, translations-api, and communication-api.
  - Replace scaffold-only scripts where the package has real code.
  - Add at least one contract test per worker.

- [ ] Add real D1-backed worker test coverage.
  - Keep fast fakes where useful.
  - Add Miniflare / Cloudflare Vitest pool suites that run migrations and real SQLite constraints.

- [ ] Add coverage reporting.
  - Start with workspaces that already have real tests.
  - Add thresholds only after suites are trustworthy.

## Phase 5 — Performance, Dependencies, And Docs

- [ ] Batch content image resolution.
  - Resolve image refs with one `WHERE IN` query.
  - Avoid sequential media-api fallbacks per card.
  - Denormalize resolved URLs at publish time if needed.

- [ ] Fix homepage marquee and decorative API fan-out.
  - Avoid per-frame layout reads.
  - Pause offscreen.
  - Replace 9 startup API calls with one cached request or static fallback.

- [ ] Optimize admin/media large lists and thumbnails.
  - Add pagination/virtualization for admin users and media.
  - Cancel stale media list requests.
  - Render CDN-resized thumbnails instead of full originals.

- [ ] Fix cache correctness.
  - TTS cache env isolation.
  - Atlas/generation cache consistency.
  - Content cache language invalidation.
  - KV key hashing for query cache.

- [ ] Clean dependency declarations.
  - Move build/test tooling to devDependencies.
  - Move actual runtime dependencies where they belong.
  - Declare all imported workspace/external packages in each package.
  - Update translations-api wrangler/toolchain and remove vendored modules.
  - Reinstall or pin `ankore` so local and CI match.

- [ ] Add a real linter.
  - Adopt oxlint or ESLint with Vue support.
  - Rename current scaffold check.
  - Wire lint into `npm run check` and CI.

- [ ] Make builds deterministic.
  - Decide whether generated app configs are committed or generated in deploy.
  - Ensure CI validates the same artifacts deploy ships.
  - Validate fetched config values before writing Swift/TS source.

- [ ] Reduce CI secret exposure.
  - Scope Cloudflare tokens to only wrangler/curl steps.
  - Pin GitHub Actions to SHAs.

- [ ] Fix docs drift.
  - Update AGENTS.md port table from actual package scripts.
  - Update README repository structure.
  - Fix Android wrapper docs.
  - Remove commands that describe non-functional E2E until fixed.

## Cross-Cutting Rules For Follow-Up Work

- Do not add compatibility fallbacks or silent shape conversions. Fix the contract/source and update callers.
- Do not store persistent content image URLs for cards/default content; store image refs and resolve URLs.
- Do not store custom per-item hex colors; use named Tiko color enums from the shared palette.
- Prefer server-side enforcement over UI-only gates, especially for child mode, PIN, privacy, and paid APIs.
- Shared behavior belongs in `@tiko/ui`, `@tiko/data`, `@tiko/media`, TikoKit, or worker shared modules, not duplicated per app.
- Use BEM/Bemm-style classes consistently in app and shared UI.
- Add tests with every fix for a reviewed regression, especially where the review found existing tests were stale or assertion-free.
