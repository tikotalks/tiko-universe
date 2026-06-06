# Shared Userflows Implementation Plan

**Date:** 2026-06-06
**Branch/worktree:** `development` at `16c6870`, aligned with `origin/development`
**Goal:** Bring the implemented identity/session, user modes, settings/app-state, offline/sync, reset/deletion, and Profile Manager/Child Account flows up to the contracts in `docs/flows/shared/*`, `docs/api/identity-user-modes-profile-manager-contract.md`, `docs/api/openapi.yaml`, and `docs/architecture/data-model.md`.

**Identity foundation:** Tiko must use Ankore as the shared identity continuity module. If a required generic identity primitive is missing, update Ankore in `/home/hermes/workspace/ankore` and publish/consume a new semver release; do not build long-lived Tiko-specific identity forks in `workers/identity-api`. Tiko may map Ankore-native responses into product-facing Tiko contracts, but the underlying subject/device/session/account/role/managed-credential/profile behavior belongs in Ankore.

---

## Current Status

### Verified green now

- The checkout is on `development` and matches `origin/development`.
- Contract tests pass:
  - `npm run test:contracts`
  - Result: 5 files passed, 56 tests passed.
- `docs/api/openapi.yaml` has most of the new contract surface documented:
  - device bootstrap/session/email/OTP/magic-link/logout
  - PIN endpoints
  - child/parent runtime mode endpoints
  - child account endpoints
  - deletion request endpoints
  - app settings/state/progress/reset endpoints
  - generation TTS endpoints
- App API implementation exists for:
  - `GET/PUT /v1/apps/:app/settings`
  - `GET/PUT /v1/apps/:app/state`
  - app config/defaults support
  - D1-backed per-user settings/state with optimistic versioning.
- Identity API implementation exists for core Ankore-backed device-first identity:
  - device bootstrap
  - session lookup/refresh/logout
  - email challenge + magic link/OTP verification through Ankore challenge storage
  - browser cookie session support for `*.tikoapps.org`
  - self-delete endpoint
  - early managed-child credential creation/login.

### Main gaps against the docs

1. **Identity response shape is not contract-complete.**
   - Current `@tiko/identity` exposes Ankore-style `IdentityBundle` with `subject/account/device/session/roles/managed`.
   - Contract requires a normalized `SessionBundle` with `user`, `device`, `session`, `account`, `runtime`, and `capabilities`.
   - OpenAPI documents the newer shape, but package and worker implementation have not caught up.

2. **Identity endpoint paths are still partly legacy/internal.**
   - Implemented client paths include `/identity/email/challenge`, `/identity/email/verify`, `/identity/managed/children`, `/identity/managed/login`, and `DELETE /identity/me`.
   - Contract paths are `/identity/email`, `/identity/otp/request`, `/identity/otp/verify`, `/identity/magic-links/verify`, `/identity/child-accounts`, `/identity/child-accounts/login`, and `/identity/deletion-requests`.
   - Keep compatibility aliases only if needed, but make canonical docs paths the implemented/public paths.

3. **Account types and runtime modes are not fully modelled.**
   - Current implementation infers roles such as `child`, `profile_manager`, etc.
   - Contract requires explicit `accountType: temporary | verified | profile_manager | child_account` and `runtime.mode: parent | child`.
   - Temporary Accounts must be Parent Mode only.
   - Verified/Profile Manager Child Mode requires PIN configured.
   - Child Accounts are Child Mode only.

4. **PIN flow is documented but not implemented.**
   - Need D1-backed PIN metadata/hash support.
   - Need endpoints for set/change, verify/grant, remove, enabling Child Mode, entering Child Mode, and returning to Parent Mode.
   - Must not store raw PINs.

5. **Profile Manager/Child Account flow is only partial.**
   - There is early managed-child credential support.
   - Missing canonical list/update/delete/code-reset endpoints.
   - Missing Profile Manager-only authorization.
   - Missing strict 4-digit code contract.
   - Missing admin-only promote/demote route in `admin-api` or an explicit admin contract implementation.

6. **Deletion/reset flow is not contract-complete.**
   - Current `DELETE /identity/me` hard-deletes/disables identity rows immediately.
   - Contract requires deletion requests with status/cancel paths and scope handling.
   - App API has settings/state only; progress, app reset, progress reset, reset-my-data category semantics need implementation.

7. **App data model is incomplete.**
   - D1 has `app_settings`, `app_state`, and defaults.
   - Contract also requires app progress and reset semantics aligned with Identity, Preferences, App State, User Content, Progress, and Insights.
   - Every write endpoint must document category and enforce category-specific reset behavior.

8. **Client shell consumption is uneven.**
   - Some apps still use localStorage for child-facing state/content in tests and runtime.
   - Apps should bootstrap device-first sessions without a login wall, then use the same API contracts for settings/state/progress where online.
   - Offline local storage can remain as local cache/fallback, not source of truth once a session/API is available.

9. **Offline/sync queue is not implemented to the shared flow standard.**
   - Need consistent pending-write queue, conflict handling, retry/backoff, and visible offline/sync state.
   - D1 remains source of truth; KV/local storage are cache/fallback only.

10. **Live-readiness is not yet gated.**
    - Source tests pass, but remote dev/prod D1 migrations, routes, CORS, cookie domains, and smoke tests need to be verified after implementation.

---

## Implementation Strategy

Implement in contract-first vertical slices, not app-by-app guesswork. The clean abstraction is: keep Ankore as the identity authority, extend Ankore where it lacks generic continuity primitives, then have Tiko consume Ankore through a thin product contract adapter and make app data depend on that session/runtime/capability model.

### Phase -1: Ankore capability audit and upstream changes

**Objective:** Decide what belongs in Ankore before adding anything to Tiko's identity worker.

**Files/repos likely touched:**

- `/home/hermes/workspace/ankore`
- `packages/identity/src/index.ts`
- `workers/identity-api/src/index.ts`
- `tests/identity-api.test.ts`
- Ankore package release/update files when a new feature is needed

**Tasks:**

1. Compare Tiko flow docs against current Ankore exports and worker primitives.
2. Classify each identity feature:
   - **Ankore generic primitive:** subject/device/session, email challenge, OTP/magic link, roles, profile metadata, managed credentials, grants, PIN-like protected-action secret, session runtime metadata, deletion request lifecycle where product-neutral.
   - **Tiko product policy/adapter:** account-type labels, child-facing mode copy, capabilities derived for Tiko apps, Profile Manager business rules, app data resets.
3. For missing generic primitives, implement them in Ankore first with Ankore tests and package exports.
4. Publish or otherwise consume the updated Ankore semver package in `tiko-universe`.
5. Keep `workers/identity-api` as configuration/adapter glue around Ankore, not a forked identity implementation.

**Validation:**

```bash
cd /home/hermes/workspace/ankore
npm run check
npm pack --dry-run

cd /home/hermes/workspace/tiko-universe-talk-v1b
npm run test:contracts
```

---

### Phase 0: Baseline safety and contract harness

**Objective:** Lock the docs into executable tests before changing behavior.

**Files likely touched:**

- `tests/identity-api.test.ts`
- `tests/app-api.test.ts`
- `packages/identity/src/index.ts`
- `packages/data/src/index.ts`
- `docs/api/openapi.yaml` only if mismatches are found

**Tasks:**

1. Add/adjust tests that assert canonical paths exist and legacy-only paths are not the only implementation:
   - `POST /v1/identity/email`
   - `POST /v1/identity/otp/request`
   - `POST /v1/identity/otp/verify`
   - `POST /v1/identity/magic-links/verify`
   - `POST /v1/identity/child-accounts/login`
   - `POST /v1/identity/deletion-requests`
2. Add tests for normalized `SessionBundle` fields:
   - `user.accountType`
   - `account.accountType`
   - `runtime.mode`
   - `runtime.childModeEnabled`
   - `runtime.pinConfigured`
   - `capabilities.*`
3. Add app-data tests for progress/reset endpoints before implementation.
4. Keep existing Ankore contract tests green.

**Validation:**

```bash
npm run test:contracts
npm run typecheck
```

---

### Phase 1: Normalize identity types and session bundle

**Objective:** Make the public Tiko identity contract match docs while preserving Ankore as the implementation authority. If the mapping needs data Ankore does not expose, add that data/export to Ankore first rather than querying or inventing product-local identity tables.

**Files likely touched:**

- `packages/identity/src/index.ts`
- `workers/identity-api/src/index.ts`
- `tests/identity-api.test.ts`
- `docs/api/openapi.yaml` if field names need correction

**Tasks:**

1. Add/export contract types in Tiko packages where they are product-facing, and upstream reusable identity/runtime types into Ankore where they are generic:
   - `AccountType`
   - `RuntimeMode`
   - `LoginMethod`
   - `User`
   - `AccountSummary`
   - `RuntimeSummary`
   - `UserCapabilities`
   - `SessionBundle`
2. Add a Tiko adapter from Ankore-native bundles/roles/metadata to Tiko public `SessionBundle`.
3. Preserve Ankore-native fields as the source contract for lower-level identity clients; don't create duplicate product-local identity state to satisfy the Tiko adapter.
4. Define account type mapping:
   - no verified email and no child role: `temporary`
   - verified email + no profile-manager role: `verified`
   - verified email + profile-manager role: `profile_manager`
   - child role/managed credential login: `child_account`
5. Define runtime mapping:
   - Temporary: Parent Mode only.
   - Verified/Profile Manager: Parent Mode by default, Child Mode only when entered/enabled.
   - Child Account: Child Mode only.
6. Populate capabilities deterministically from account type/runtime/PIN/profile-manager role.

**Acceptance criteria:**

- First launch returns a Temporary Account `SessionBundle`.
- No app startup requires email/login.
- Child Account login returns `accountType: child_account` and `runtime.mode: child`.
- Public clients can depend on one stable `SessionBundle` type.

---

### Phase 2: Canonical identity endpoints and compatibility aliases

**Objective:** Implement the documented paths as first-class Tiko-facing endpoints by configuring/delegating to Ankore wherever possible. Only write adapter code in Tiko for product-specific path/response naming.

**Files likely touched:**

- `workers/identity-api/src/index.ts`
- `packages/identity/src/index.ts`
- `tests/identity-api.test.ts`

**Tasks:**

1. Ensure Ankore exposes generic email challenge/OTP/magic-link routes or handlers that can serve these flows.
2. Implement `POST /v1/identity/email` as Tiko's canonical wrapper around Ankore email challenge creation with generic response.
3. Implement `POST /v1/identity/otp/request` as a normalized wrapper around Ankore challenge creation for supported purposes.
4. Implement `POST /v1/identity/otp/verify` with `{ email, code, purpose }` and normalized response:
   - session for login/verify_email
   - grant for reset_pin/confirm_deletion
5. Implement `POST /v1/identity/magic-links/verify` with normalized response.
6. Keep old `/email/challenge` and `/email/verify` aliases temporarily only if existing clients need them; mark them internal/deprecated in package docs.
7. Update `IdentityClient` methods to canonical names:
   - `requestOtp`
   - `verifyOtp`
   - `verifyMagicLink`
   - `requestEmailVerification`
   - `getSession`
   - `bootstrapDevice`

**Acceptance criteria:**

- OpenAPI paths and package methods line up.
- Generic responses never reveal whether an email exists.
- Existing tests for magic-link delivery and OTP still pass.

---

### Phase 3: PIN and runtime mode implementation

**Objective:** Implement child/parent runtime modes exactly as documented, with generic protected-action/PIN and runtime-state primitives upstreamed to Ankore if Ankore does not already support them.

**Files likely touched:**

- `workers/identity-api/migrations/*.sql`
- `workers/identity-api/src/index.ts`
- `packages/identity/src/index.ts`
- `tests/identity-api.test.ts`

**Tasks:**

1. Add D1 schema/handlers in Ankore for generic protected-action secret metadata/hash and runtime/session state if missing; consume that release from Tiko.
2. Implement:
   - `POST /v1/identity/pin`
   - `POST /v1/identity/pin/verify`
   - `DELETE /v1/identity/pin`
   - `POST /v1/identity/mode/child/enable`
   - `POST /v1/identity/mode/child`
   - `POST /v1/identity/mode/parent`
3. Enforce rules:
   - Temporary Accounts cannot configure PIN.
   - Verified/Profile Manager account must configure PIN before Child Mode.
   - Leaving Child Mode requires PIN or grant.
   - Child Accounts cannot enter Parent Mode.
4. Generate short-lived grants for sensitive actions.
5. Add rate limiting / failed-attempt tracking if feasible in the same slice; otherwise document as a follow-up security hardening task.

**Acceptance criteria:**

- PIN is never stored raw.
- Runtime mode is returned in every `SessionBundle`.
- Temporary Account remains Parent Mode only.
- Child Account remains Child Mode only.

---

### Phase 4: Profile Manager and Child Account management

**Objective:** Replace partial managed-child endpoints with canonical Profile Manager/Child Account contract, backed by Ankore managed-subject credentials and roles rather than Tiko-local credential logic.

**Files likely touched:**

- `workers/identity-api/src/index.ts`
- `workers/identity-api/migrations/*.sql`
- `packages/identity/src/index.ts`
- `tests/identity-api.test.ts`
- `workers/admin-api/src/*` if admin promotion routes are implemented there

**Tasks:**

1. Ensure Ankore exposes generic managed-subject credential primitives for create/list/update/revoke/reset-code/login and role assignment/audit.
2. Implement Profile Manager-only authorization in Tiko from Ankore roles plus Tiko product policy.
3. Implement canonical child-account endpoints:
   - `GET /v1/identity/child-accounts`
   - `POST /v1/identity/child-accounts`
   - `PUT /v1/identity/child-accounts/{childAccountId}`
   - `POST /v1/identity/child-accounts/{childAccountId}/code/reset`
   - `DELETE /v1/identity/child-accounts/{childAccountId}`
   - `POST /v1/identity/child-accounts/login`
4. Enforce 4-digit child codes.
5. Ensure Child Accounts are separate Ankore subjects/accounts, not profile switches.
6. Implement or plan admin-only Profile Manager promotion/demotion in `admin-api` using Ankore role assignment APIs; do not allow self-promotion.
7. Add tests proving no active profile switching API exists.

**Acceptance criteria:**

- Profile Manager can create/edit/reset-code/delete children.
- Non-Profile Manager cannot manage children.
- Child login returns Child Mode-only session.
- No allowed-apps/blocked-apps model is introduced.

---

### Phase 5: App data progress and reset semantics

**Objective:** Bring app data storage up to the data model contract.

**Files likely touched:**

- `workers/app-api/migrations/*.sql`
- `workers/app-api/src/index.ts`
- `packages/data/src/index.ts`
- `tests/app-api.test.ts`
- `docs/architecture/data-model.md` only if endpoint category notes need refinement

**Tasks:**

1. Add D1 tables and client methods for `app_progress`.
2. Implement:
   - `GET /v1/apps/{app}/progress`
   - `PUT /v1/apps/{app}/progress`
   - `POST /v1/apps/{app}/resets/app`
   - `POST /v1/apps/{app}/resets/progress`
   - `POST /v1/identity/reset` for Reset my data semantics.
3. Enforce category-specific deletion:
   - Reset app deletes App State only.
   - Reset progress deletes Progress/Insights only.
   - Reset my data keeps Identity and deletes Preferences/App State/User Content/Progress/Insights.
4. Version conflict behavior should match existing settings/state behavior.
5. Add explicit tests per data category.

**Acceptance criteria:**

- App writes are category-classified.
- Reset operations delete exactly the documented categories.
- D1 remains source of truth.

---

### Phase 6: Deletion request flow

**Objective:** Replace immediate app-facing deletion with documented deletion requests. Upstream product-neutral request/grant/status primitives to Ankore if they are identity lifecycle concerns; keep Tiko-specific category cleanup in app/data workers.

**Files likely touched:**

- `workers/identity-api/migrations/*.sql`
- `workers/identity-api/src/index.ts`
- `packages/identity/src/index.ts`
- `tests/identity-api.test.ts`

**Tasks:**

1. Add deletion request table/status lifecycle.
2. Implement:
   - `POST /v1/identity/deletion-requests`
   - `GET /v1/identity/deletion-requests/{requestId}`
   - `POST /v1/identity/deletion-requests/{requestId}/cancel`
3. Scope behavior:
   - `local-device`
   - `account`
   - `child_account`
4. Enforce PIN/recovery grant for Verified/Profile Manager deletion when required.
5. After account deletion, the client should bootstrap a fresh Temporary Account.
6. Keep `DELETE /identity/me` only as an internal compatibility endpoint if needed; public clients should use deletion requests.

**Acceptance criteria:**

- Child Accounts cannot self-delete.
- Profile Manager deletion handles children explicitly.
- Verified/Profile Manager deletion does not silently orphan children.

---

### Phase 7: Shared web app shell and offline/sync behavior

**Objective:** Make web apps consume the shared userflow consistently.

**Files likely touched:**

- `apps/*/web/src/*`
- `packages/identity/src/index.ts`
- `packages/data/src/index.ts`
- `packages/ui` or shared app-shell package if the shell is centralized
- app e2e tests

**Tasks:**

1. Create or update a shared app bootstrap composable:
   - restores/creates device session
   - exposes `SessionBundle`
   - never blocks startup behind login
   - handles cookie and bearer cases cleanly.
2. Create shared app data composables:
   - settings
   - app state
   - progress
   - reset flows
   - optimistic writes with version conflict handling.
3. Implement offline queue/fallback:
   - local cache for initial render
   - pending writes while offline
   - retry/backoff
   - conflict status surfaced to UI
   - local cache never treated as server truth after online sync.
4. Replace app-local PIN hashes and ad-hoc parent/child mode storage with identity runtime mode endpoints.
5. Update e2e tests to assert:
   - app opens without account wall
   - temporary account/session bootstrap happens in background
   - settings/state persist through API when online
   - offline fallback is visibly local and syncs later.

**Acceptance criteria:**

- All child-facing apps can open immediately.
- App UI is driven by shared runtime mode and capabilities.
- LocalStorage/IndexedDB are fallback/cache only, not the canonical data layer.

---

### Phase 8: Native clients alignment

**Objective:** Ensure iOS/Android consume the same contracts as web.

**Files likely touched:**

- `packages/tikokit-ios/Sources/TikoKit/*`
- `apps/*/ios/Sources/*`
- Android project paths when present
- native tests

**Tasks:**

1. Update TikoKit identity models to match `SessionBundle`.
2. Update native app data clients for settings/state/progress/reset contracts.
3. Preserve no-login-wall startup.
4. Ensure Talk native continues to consume Sentence API for grammar/suggestions and not app-local logic.
5. Add platform smoke tests or mocked contract tests for the shared flows.

**Acceptance criteria:**

- Web/iOS/Android can use one documented API contract.
- Native Talk still has no frontend grammar intelligence and no child-facing LLM calls.

---

### Phase 9: Live readiness and deployment gates

**Objective:** Verify dev before any production promotion.

**Tasks:**

1. Run full local gates:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
npm run audit:doctrine
```

2. Apply D1 migrations to dev databases through the existing workflow/deploy process.
3. Deploy dev workers/pages via GitHub Actions, not direct production Wrangler.
4. Smoke test dev endpoints:
   - `https://dev-api.tikotalks.com/v1/identity/device`
   - `https://dev-api.tikotalks.com/v1/identity/session`
   - canonical OTP/magic-link test path
   - PIN/mode endpoints
   - child-account endpoints
   - app settings/state/progress/reset endpoints
   - generation TTS endpoints
5. Smoke test dev apps:
   - no login wall
   - device bootstrap
   - Parent/Child Mode transitions where supported
   - settings/state persistence
   - offline queue/fallback
   - reset/delete UX.
6. Only after dev is green: PR `development` to `main`, wait for CI/deploy, and run production smoke checks.

**Acceptance criteria:**

- CI green.
- Dev deploy green.
- Production promotion only through PR/deploy workflow.
- No direct production deploys.

---

## Proposed Work Order

1. **Phase -1:** Ankore capability audit; update/publish Ankore first for missing generic identity primitives.
2. **Phase 0 + Phase 1:** contract tests and normalized Tiko `SessionBundle` adapter over Ankore.
3. **Phase 2:** canonical identity endpoint paths delegated to Ankore handlers where possible.
4. **Phase 3:** PIN/protected-action and runtime mode, upstreaming generic parts to Ankore.
5. **Phase 4:** Profile Manager/Child Account management using Ankore roles/managed credentials.
6. **Phase 5 + Phase 6:** app progress/reset and deletion requests.
7. **Phase 7:** web app shell/offline sync.
8. **Phase 8:** native alignment.
9. **Phase 9:** deploy/smoke gates.

This order keeps every downstream app from building on the wrong session shape. The tempting alternative is to patch individual app UI first, but that would spread legacy identity assumptions everywhere.

---

## Validation Commands Used for This Status Check

```bash
git branch --show-current
git rev-parse --short HEAD
git rev-parse --short origin/development
git status --short --branch
npm run test:contracts
```

Observed result: clean `development` checkout at `16c6870`, matching `origin/development`; contract test suite passed with 56 tests.
