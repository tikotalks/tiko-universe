# Tiko Universe Review Tasks

Source: `review/00-executive-summary.md` through `review/08-recommendations.md`.

Talk-engine-specific findings from `review/09-talk-engine.md` are intentionally skipped here and should be handled in a separate session.

Review date: 2026-06-12.

This is the clean action list from the review. Checked items are fixes that already landed in this branch before this rewrite of the task list. Unchecked items still need implementation, verification, and their own focused commits.

## TLDR

The review says the platform has strong architecture but weak enforcement. The biggest issue is not that the system is badly shaped; it is that important controls exist as UI, contracts, or unused infrastructure instead of server-enforced behavior.

The highest-risk areas are:

- Public or weakly protected paid AI endpoints.
- Server-side authorization gaps around sentences, media, generated content, and identity destructive actions.
- Dev and production sharing D1 data.
- Long-lived browser/iOS identity secrets stored in localStorage/UserDefaults instead of cookie/Keychain transport.
- Product-breaking child-facing bugs in Timer, Radio, Cards, PIN entry, and iOS speech.
- A dead or stale E2E layer, plus tests that miss exactly the highest-risk behavior.
- Heavy duplication across web apps, workers, admin API calls, and iOS speech/runtime code.

Approximate review spread: 7 Critical, about 35 High, about 70 Medium, and about 75 Low findings. The fastest path is to finish enforcement and product-breakage fixes first, then consolidate shared runtime/auth/i18n/media/UI code so the same problems stop repeating per app.

## Phase 0 - Already Fixed High-Risk Items

- [x] Authenticate Atlas capability routes and enforce capability allowlists.
- [x] Fix sentence-api saved phrase IDOR.
- [x] Persist and validate identity `pinGrantToken`.
- [x] Gate paid generation/TTS endpoints.
- [x] Enforce private media access.
- [x] Add ownership checks to generation content mutations.
- [x] Fix identity cleanup cron child-account deletion behavior.
- [x] Add PIN and child-code throttling.
- [x] Fix Timer web countdown display.
- [x] Fix Radio web pause/ended handling, volume input, blob track persistence, and double-start behavior.
- [x] Fix PIN popup sparse-array and fail-open behavior.
- [x] Fix Cards web first-run/offline loading hang.
- [x] Fix Cards web bulk move data-loss behavior.
- [x] Add web security headers.
- [x] Configure iOS AAC speech playback and language-aware iOS speech.
- [x] Fix TTS cache insert races.
- [x] Gate deploys on CI and add missing workers to deploy.
- [x] Fix shared API-key auth.
- [x] Move browser identity away from persisted localStorage secrets.
- [x] Stop unit tests from calling production APIs.
- [x] Make iOS tests runnable.
- [x] Add real tests for previously scaffold-only packages/workers.
- [x] Fix homepage marquee/API fan-out.
- [x] Clean dependency declarations.

## Phase 1 - Security, Identity, And Environment Isolation

- [ ] Isolate dev and production data.
  - Create separate D1 databases and KV namespaces for identity, app, atlas, media, communication, generation, sentence, and content caches.
  - Fix provisioning so production never reuses dev DB names.
  - Stop dev deploys from applying schema/seed to shared production-like data.

- [ ] Consolidate D1 ownership.
  - Use one database per worker, or one migration directory per shared database.
  - Delete or move root `migration.sql` into the owning worker.
  - Keep schema creation out of runtime request handlers.

- [ ] Finish one shared worker auth layer.
  - Use shared `requireSession`, `requireRole`, and `requireServiceKey`.
  - Return roles/capabilities from one identity lookup.
  - Delete duplicated admin-role parsing and static-secret variants.
  - Remove app-api direct identity DB fallback completely.

- [x] Move iOS identity storage to Keychain.
  - Make `TikoKeychainIdentityStore` the default.
  - Migrate existing UserDefaults identity bundles once.
  - Add shared Keychain access groups where cross-app identity is expected.
  - Do not add a UserDefaults fallback for failed Keychain writes.

- [x] Fix identity browser CORS and cookie-session support.
  - Reflect the allowlisted origin on managed identity endpoints.
  - Include PUT in preflight responses.
  - Make managed identity endpoints accept the same cookie session model as canonical identity routes.

- [x] Make deletion and reset behavior honest.
  - Null or delete PII on completed account deletion.
  - Make reset endpoints actually clear app data via service bindings, or return a requested/pending status.
  - Redact magic-link and OTP material in communication message storage.

- [x] Harden remaining upload and provider abuse surfaces.
  - Add upload size/MIME validation.
  - Attribute uploads from the authenticated session, not client-supplied user IDs.
  - Restrict media analysis to owned or trusted CDN assets.
  - Block admin bearer tokens from being sent to arbitrary image hosts.

- [x] Fix remaining secret/CORS hygiene.
  - Scope Cloudflare tokens to deploy steps only.
  - Pin GitHub Actions to SHAs.
  - Use allowlisted admin CORS instead of wildcard where credentials/tokens are involved.
  - Fail closed when webhook/service secrets are unset.

## Phase 2 - Product Correctness And Data Integrity

- [x] Make optimistic concurrency atomic.
  - Use SQL compare-and-swap updates in app-api and admin-api.
  - Require versions where writes claim concurrency safety.
  - Return actual new versions with `RETURNING`.
  - Debounce and serialize client writes.

- [x] Make content-api bulk writes atomic.
  - Replace wipe-and-reinsert with batch/reconcile.
  - Preserve translations unless explicitly removed.
  - Prevent readers from seeing empty or partial catalogs during writes.

- [x] Fix content translation and cache invalidation.
  - Stop hardcoding language invalidation lists.
  - Use configured supported languages.
  - Version-stamp cache keys or purge every affected locale reliably.

- [x] Fix Cards content source of truth in admin.
  - Decide whether starter/default Cards live in content-api or app defaults.
  - Delete the duplicate editor.
  - Make admin Cards thumbnails resolve through image refs/CDN correctly.

- [x] Finish the image/color model cleanup.
  - Store `imageRef`, never persistent image URLs, for Cards/default content.
  - Use Tiko Media refs for media-library images and custom uploads.
  - Use named Tiko color enum values, never per-item `colorHex`.
  - Resolve display URLs and hex values from shared Tiko-wide sources.

- [ ] Fix app language behavior.
  - Make UI i18n reactive on web and iOS.
  - Reload server-owned translated content when language changes.
  - Ensure Maltese and every configured supported language has coverage for shell/profile/settings/app UI.
  - Keep default content translations as content, not hand-managed UI-key clutter.

- [x] Fix app-specific persistence bugs.
  - Sequence and Todo must write settings back remotely.
  - Radio must preserve category IDs/order and selected upload category.
  - Timer restore must preserve total duration/progress.
  - Cards reorder must persist on iOS.
  - Type web/iOS speak actions must use the selected language and actually speak.

- [x] Fix admin reliability flows.
  - Await router readiness or read magic-link token from `window.location`.
  - Replace revoke-all-then-assign role changes with an atomic server operation.
  - Distinguish offline/5xx from 401/403 so valid admin sessions are not wiped.
  - Guard stale responses in app defaults pages.
  - Fix Answer Tiles modal save/add-set/autofocus/scroll behavior.
  - Expand the icon selector and enforce icon-or-image, not both.

- [x] Add provider/network robustness.
  - Add top-level error handlers in generation-api, tts-api, and translations-api.
  - Add timeouts and one retry for external provider calls.
  - Make story rendering resumable or per-segment cached.
  - Stop caching transient TTS failures for the whole session.

## Phase 3 - Shared Runtime, UI, Media, And Architecture

- [ ] Extract shared web app runtime.
  - Base URL resolution.
  - Identity bootstrap.
  - Local storage helpers.
  - Settings/state hydrate and persist.
  - Debounced/serialized remote writes.
  - Reactive system color mode.
  - Language handling.

- [ ] Make `@tiko/i18n` and TikoKit i18n truly reactive.
  - Use Vue reactivity in the web i18n package.
  - Publish bundle/language revision changes.
  - Make Swift `TikoI18n` publish bundle changes.
  - Delete per-app language workaround code.

- [ ] Extract shared Tiko speech services.
  - Web: one TTS path, language-aware, concurrency-safe, no permanent failure cache.
  - iOS: shared audio session, language mapping, and Atlas/native fallback behavior.

- [ ] Move reusable UI/layout into TikoUI/TikoKit.
  - Cards/choice tile layouts.
  - Shared media image-ref rendering.
  - Shared user-flow components that are not app-specific.
  - Avoid giant one-file app implementations.

- [ ] Fix popup and class conventions.
  - Style `@sil/ui` popup surfaces through popup custom properties.
  - Add missing popup custom properties upstream if needed.
  - Do not style around popup borders from inside content.
  - Use BEM/Bemm-style classes consistently.

- [ ] Clean up Tiko UI components.
  - Test PIN popup, child accounts panel, app shell, paged grid, icon picker.
  - Localize hardcoded labels.
  - Fix dialog/focus/listbox/touch-target accessibility.
  - Replace per-icon WKWebViews on iOS with lighter native assets/paths.

- [x] Delete confirmed dead code before extraction.
  - `TikoMediaClient` unless matching worker routes are built.
  - Radio `AddVideoPopup`.
  - generation-api dead PNG code.
  - `parent-mode.ts`.
  - clock stub, unless the app is restored.
  - unused worker bindings/tables/helpers.

- [ ] Split god files.
  - generation-api routes into modules.
  - content/media/identity workers where useful.
  - admin StoryNarrator/ImageGenerator pages by tab or feature.
  - `@tiko/ui` index into focused modules.

- [ ] Unify TTS architecture.
  - Retire tts-api and generation-api local provider path, or make Atlas persist into the one shared cache.
  - Ensure one source of truth for speech generation, caching, and provider selection.

## Phase 4 - Testing And CI Quality

- [x] Restore Playwright E2E.
  - Add pinned `@playwright/test`.
  - Fix config shape and ports.
  - Remove or restore the clock project.
  - Rewrite stale suites for current flows/selectors.
  - Mock current Atlas/TTS endpoints, not legacy generation endpoints.
  - Add CI smoke coverage.

- [x] Add focused tests for high-risk behavior.
  - Timer countdown rendering.
  - Radio player pause/end/volume behavior.
  - Cards store move/delete/reorder behavior.
  - Admin auth restore and role replacement.
  - PIN popup and child-mode flows.
  - App runtime language/theme persistence.

- [ ] Add real D1-backed worker test coverage.
  - Keep fast fakes where useful.
  - Add Miniflare or Cloudflare Vitest pool suites that run migrations and real SQLite constraints.
  - Fix fake behavior that masks authorization/schema regressions.

- [x] Add coverage reporting.
  - Start with workspaces that already have real suites.
  - Add thresholds only after suites are trustworthy.

- [x] Add a real linter.
  - Adopt oxlint or ESLint with Vue support.
  - Rename current scaffold check.
  - Wire lint into `npm run check` and CI.

- [x] Make builds deterministic.
  - Decide whether generated app configs are committed or generated in deploy.
  - Ensure CI validates the same artifacts deploy ships.
  - Validate fetched config values before writing Swift/TS source.

- [x] Fix docs drift.
  - Update AGENTS.md port table from actual package scripts.
  - Update README repository structure.
  - Fix Android wrapper docs.
  - Remove or clearly mark commands that currently describe non-functional E2E.

## Phase 5 - Performance And Scale

- [x] Batch content image resolution.
  - Resolve image refs with one `WHERE IN` query.
  - Avoid sequential media-api fallbacks per card.
  - Denormalize resolved URLs at publish time if needed.

- [x] Optimize admin/media large lists and thumbnails.
  - Add pagination/virtualization for admin users and media.
  - Cancel stale media list requests.
  - Render CDN-resized thumbnails instead of full originals.

- [ ] Fix cache correctness.
  - TTS cache environment isolation.
  - Atlas/generation cache consistency.
  - Content cache language invalidation.
  - KV key hashing for content query cache.

- [ ] Reduce worker latency and subrequest count.
  - Batch sentence prediction inserts.
  - Batch media album track queries.
  - Batch identity/session/runtime queries where independent.
  - Add pagination to admin users and media listings.

## Cross-Cutting Rules For Follow-Up Work

- Do not add compatibility fallbacks or silent shape conversions. Fix the source contract and update callers.
- Do not store persistent content image URLs for cards/default content; store image refs and resolve URLs.
- Do not store custom per-item hex colors; use named Tiko color enums from the shared palette.
- Prefer server-side enforcement over UI-only gates, especially for child mode, PIN, privacy, media ownership, and paid APIs.
- Shared behavior belongs in `@tiko/ui`, `@tiko/data`, `@tiko/media`, TikoKit, or worker shared modules, not duplicated per app.
- Use BEM/Bemm-style classes consistently in app and shared UI.
- Add tests with every fix for a reviewed regression, especially where the review found existing tests were stale or assertion-free.
- Keep Lezu as the UI translation platform. Treat default app/card/tile content as content, served translated by the content API using the user/app language.
