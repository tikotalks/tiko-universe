# 06 — Testing

Scope: unit/contract/e2e coverage, test quality and brittleness, CI wiring, untested critical paths.

## What is done well

- **The worker contract tests are the crown jewel of this codebase's test posture.** All 9 suites in `tests/` import the real worker `fetch` handler and run it against in-memory D1/R2/KV fakes — fast, hermetic, no network. They cover what actually breaks products: CORS allow/deny, authn/authz gates, last-admin protection (`tests/admin-api.test.ts:204-231`), ownership checks, optimistic-concurrency conflicts (`tests/app-api.test.ts:268-274`), token hashing at rest, magic-link replay rejection (`tests/identity-api.test.ts:630-634`), PIN-not-plaintext, and PII redaction (`tests/atlas-api.test.ts:382`).
- **Legacy-schema tripwire**: the identity fake throws on any query touching pre-Ankore tables (`tests/identity-api.test.ts:68-70`) — the migration can't silently regress.
- **Fakes fail closed**: unknown SQL throws `Unhandled SQL ...` rather than returning empty results.
- **yes-no's unit suite is the app-level template**: full fetch-mock of identity/data/content/TTS, offline fallback, TTS state machine with controllable promises, and regression tests for the parent-mode security model (`apps/yes-no/web/src/App.spec.ts:308-414`).
- **talk's composable tests** assert full request contracts including auth headers and offline activation (`useSentenceApi.spec.ts`); the website has brand-voice regression tests; @tiko/identity has a real client-against-worker contract spec including a Window-receiver fetch-bind regression test.

---

## Findings

### [High] The Playwright E2E layer is entirely non-functional
File: `playwright.config.ts:14-21, 40-46`
Why: Four independent breaks: (1) `@playwright/test` is not a dependency anywhere — the documented command would ad-hoc download an unpinned version; (2) ports are wrong vs the actual dev scripts (config: cards 3061/sequence 3062/radio 3067; reality: 3063/3064/3059 — 3062 is admin); (3) the `clock` project points at an app with no source or package.json; (4) `webServer` is placed per-project, which Playwright does not support — it's ignored. No CI job runs Playwright. The only browser-level coverage that actually runs is a single Cypress auth spec for admin (`ci.yml:71`).
Fix: Add `@playwright/test` as a root devDependency, move `webServer` to a top-level array, fix ports (or derive them from package.json), delete/restore clock, add at least a one-project smoke job to CI.

### [High] Six apps' e2e suites test apps that no longer exist
File: `apps/timer/web/e2e/app.spec.ts:55-143`, `apps/type/web/e2e/app.spec.ts:51-106`, `apps/cards/web/e2e/app.spec.ts:50-127`, `apps/clock/web/e2e/app.spec.ts:48-112`, `apps/radio/web/e2e/app.spec.ts:50-128`, `apps/sequence/web/e2e/app.spec.ts:96-180`, `apps/yes-no/web/e2e/app.spec.ts:53-84` (partially)
Why: Selectors, storage keys, and flows target a previous generation of each app (timer's `.timer-app__field-input`, cards' `tiko:cards` key, radio's "stations" UI, clock's full feature set with no app behind it). All suites also mock TTS at `**/generation/tts**` while the live client calls `/v1/atlas/speech` — even "passing" runs would leak real TTS requests. These suites currently document history, not behavior — and the gap is precisely where the worst client bugs were found (timer's frozen countdown, radio's broken pause).
Fix: Rewrite against current selectors/storage; lift the (currently triplicated and **shape-wrong**) `mockApi` helper into a shared e2e util — the identity mock returns `{ user, ... }` where apps read `bundle.subject`, so e2e silently exercises only the offline path (`apps/todo/web/e2e/app.spec.ts:11-21` et al.).

### [High] Unit tests in three workspaces make real network calls
File: `apps/website/web/src/App.spec.ts:36-114`; `apps/timer/web/src/App.spec.ts:57-67`; `apps/type/web/src/App.spec.ts:48-58`
Why: No fetch stub is installed, and Node ≥18 has global fetch — mounting the components hits production `media.tikoapi.org` / `id.tikoapps.org` during every CI run. Flaky, slow, and generates load; they pass only because the apps swallow fetch errors. timer/type also never call `vi.useRealTimers()` after faking, and timer's `expired state shows correctly` test contains zero assertions (`App.spec.ts:164-186`) — which is how the Critical frozen-countdown bug survived.
Fix: Shared fetch-mock setup (yes-no's `createFetchMock` is the template — extract it to `@tiko/testing`); `afterEach(() => vi.useRealTimers())`; finish or delete the empty test.

### [High] TikoKit's iOS test suite cannot be green, and nothing runs it
File: `packages/tikokit-ios/Tests/TikoKitTests/TikoKitTests.swift:15` vs `Sources/TikoKit/TikoAppColor.swift:51`
Why: The test asserts `talk.themeColorHex == 0x2f80ed`; the source says `0x17131c`. A guaranteed-failing test means `swift test` is not run anywhere — and indeed iOS CI is `workflow_dispatch`-only with dead change-detection logic (`.github/workflows/ios-ci.yml:3-8, 56-78`), so PRs touching iOS code get zero automated coverage.
Fix: Fix the assertion; add a `swift test` job for `packages/tikokit-ios`; add `pull_request` path triggers to ios-ci.

### [Medium] Test strategy is inverted relative to risk
Why: The most logic-dense code has the least coverage:
- `apps/radio/web/src/composables/useAudioPlayer.ts` (where the Critical pause bug lives): zero tests; radio's kid-mode unit tests use `wrapper.setData(...)` against a `<script setup>` component, which throws/no-ops — the child-safety gating is effectively untested (`App.spec.ts:154-311`).
- `useCardsStore` (optimistic updates, move/delete data loss): zero unit tests; cards' App.spec is mostly source-string grepping (`expect(appSource).toContain('useIdentityRuntime')`) which pins text, not behavior (`apps/cards/web/src/App.spec.ts:27-73`).
- sequence and todo: zero unit tests.
- `packages/ui`: scaffold-only scripts; TikoPinPopup (High-severity sparse-array bug), TikoChildAccountsPanel, identity-runtime, paged-grid math — all untested.
- admin: one Cypress happy path, zero unit tests, despite being the most complex SPA (`"test": "echo scaffold-only"`).
- `packages/atlas`: no tests and no test script.
Fix: Prioritize unit tests exactly there: PIN-popup digit logic, useTimer display path, radio ended/pause signaling, useCardsStore mutations, useAdminAuth.verify failure modes, setSingleRole.

### [Medium] Contract-test fakes can't catch SQL-semantics or schema drift
File: `tests/*.test.ts` (pattern), e.g. `tests/app-api.test.ts:65`
Why: Fakes dispatch on SQL string prefixes and re-implement semantics in JS; real D1 behavior (constraints, `CHECK(json_valid(...))`, JOIN shapes, NULL handling) is never exercised, and migrations are never loaded — schema/code drift surfaces only on remote deploy. Two concrete fake bugs found: the identity fake's managed-credentials fallback returns **all** credentials when a manager-scoped query matches zero rows, masking exactly the authorization regressions the suite exists to catch (`tests/identity-api.test.ts:246-250`); the atlas fake's GROUP BY reimplementation takes the last duration instead of the average (`tests/atlas-api.test.ts:27-39`).
Fix: Delete the permissive fallback; adopt `@cloudflare/vitest-pool-workers`/Miniflare-backed D1 for at least one suite per worker so migrations + real SQLite run somewhere.

### [Medium] No coverage measurement anywhere
Why: No `coverage` config in vitest, no CI artifact, no thresholds — erosion is invisible. Given the inversion noted above, even a coarse per-workspace statement metric would have flagged radio/cards/sequence/todo.
Fix: Enable `vitest --coverage` for the workspaces with real suites; report in CI; add thresholds only where suites are healthy.

### [Low] Test hygiene details
- `packages/identity` test script runs without the root config (`vitest run ../../tests/...` vs `--root ../..` as @tiko/data does), and its own `index.spec.ts` is not matched by the package script (`packages/identity/package.json:10`).
- `packages/identity/src/index.spec.ts:53-65` asserts URLs/methods but never the Authorization header or bodies — the contract that matters for an auth client.
- talk-types/i18n specs assert compile-time facts at runtime (harmless, but they inflate apparent coverage) *(opinion)*.
- `@tiko/testing`'s `createJsonRequest` with `json` but no method throws a confusing platform error (GET with body, `packages/testing/src/index.ts:169-183`); mockD1 records history only for handled statements (`:287-317`) — push history before the handler lookup.
- talk's `SpeakButton.spec.ts` tests a component no user can reach (dead UI generation).

## Untested critical paths (summary list)

1. PIN entry/verification UI (`TikoPinPopup`) — child-safety gate, High bug found.
2. Timer countdown rendering — Critical bug found, test exists but assertion-free.
3. Radio playback state machine — Critical bug found, zero tests.
4. Cards data mutations (move/delete/reorder) — High data-loss bug found.
5. Admin role management (`setSingleRole`) — High lockout bug found.
6. Admin auth restore failure modes (network vs 401) — Medium bug found.
7. iOS: everything (CI never runs; the one suite that exists can't pass).
8. Deploy pipeline bash logic (change detection, project-name derivation) — only fails in production.
9. communication-api has one suite; translations-api has none.
