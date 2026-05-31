# Tiko Universe — Architectural Audit
**Date:** 2026-05-31
**Repo:** `/home/hermes/workspace/tiko-universe`
**Branch:** development
**Commit:** a4cd33e

---

## 1. Repo Structure

**Workspace:** npm workspaces (`package.json` workspaces: `apps/*/web`, `packages/*`, `workers/*`)
**Package manager:** npm 10.0.0
**No Nx, no pnpm** — clean npm workspaces. ✅

| Area | Count | Entries |
|------|-------|---------|
| **Apps** | 11 | `cards`, `clock`, `docs`, `media`, `radio`, `sequence`, `timer`, `todo`, `type`, `website`, `yes-no` |
| **Packages** | 7 | `@tiko/data`, `@tiko/i18n`, `@tiko/identity`, `@tiko/media`, `@tiko/testing`, `@tiko/ui`, `tikokit-ios` |
| **Workers** | 7 | `admin-api`, `app-api`, `content-api`, `generation-api`, `identity-api`, `media-api`, `tts-api` |
| **Shared** | 1 | `workers/shared/auth.ts` |

---

## 2. Package Health

| Package | Name | Deps | Scripts | Tests | Status |
|---------|------|------|---------|-------|--------|
| packages/data | `@tiko/data` | none | typecheck, test | — | ⚠️ Empty — no deps, likely scaffold only |
| packages/i18n | `@tiko/i18n` | none | typecheck, test | `index.spec.ts` | ✅ Has tests |
| packages/identity | `@tiko/identity` | none | typecheck, test | — | ⚠️ Empty deps — needs identity client types |
| packages/media | `@tiko/media` | none | typecheck, test | — | ⚠️ Empty |
| packages/testing | `@tiko/testing` | none | typecheck, test | — | ⚠️ Empty |
| packages/ui | `@tiko/ui` | `@sil/ui`, `@tiko/media`, `open-icon`, `vue` | typecheck, test | `tikokit.spec.ts` | ✅ Has deps and tests |
| packages/tikokit-ios | (Swift Package) | — | — | `TikoKitTests` | ✅ Native iOS kit |

**Verdict:** Most packages are scaffolds without real implementation. Only `@tiko/ui` and `@tiko/i18n` have actual code.

---

## 3. Worker Health

| Worker | Has src? | D1 | R2 | KV | Routes | Tests | Status |
|--------|----------|----|----|----|----|-------|--------|
| **identity-api** | ✅ Full | `IDENTITY_DB` (placeholder ID) | — | — | `workers_dev` | `identity-api.test.ts` | ⚠️ Placeholder D1 ID |
| **app-api** | ✅ | `APP_DB` + `IDENTITY_DB` (both placeholder) | — | — | `workers_dev` | `app-api.test.ts` | ⚠️ Placeholder D1 IDs |
| **generation-api** | ✅ | `GENERATION_DB` (placeholder) | `GENERATED_MEDIA_BUCKET` | — | `workers_dev` | `generation-api.test.ts` | ⚠️ Placeholder D1 ID |
| **tts-api** | ✅ | `TTS_DB` (real ID) | `AUDIO_BUCKET` | — | `workers_dev` | — | ⚠️ No tests. Inconsistent naming (`@tiko-universe/tts-api`) |
| **media-api** | ✅ | `MEDIA_DB`, `ASSETS_DB`, `AUTH_DB` (real IDs) | 3 buckets | — | `workers_dev` | — | ⚠️ No tests. Real D1 IDs. |
| **admin-api** | ❌ No src | — | — | — | — | — | 🔴 Scaffold only — no code |
| **content-api** | ❌ No src | — | — | — | — | — | 🔴 Scaffold only — no code |

### D1 Placeholder IDs
Four workers use `database_id = "00000000-0000-0000-0000-000000000000"`:
- `workers/identity-api/wrangler.toml` (IDENTITY_DB)
- `workers/app-api/wrangler.toml` (APP_DB + IDENTITY_DB)
- `workers/generation-api/wrangler.toml` (GENERATION_DB)

### Account ID Inconsistency
- `generation-api` + `tts-api`: `8cef251b5fdcf6c6f63db98b7aa49f9a`
- `media-api`: `dc2b7d14a69351375cab6de9a13ddee9`
- `identity-api`, `app-api`: no account_id (uses default)

### Worker Naming Inconsistency
- Most workers use `@tiko-worker/<name>`
- `tts-api` uses `@tiko-universe/tts-api` — different namespace

---

## 4. App Health

| App | Web src files | iOS? | Uses packages | Tests | Status |
|-----|--------------|------|---------------|-------|--------|
| **yes-no** | 3 | ✅ Yes | data, identity, i18n, ui | App.spec.ts + e2e | ✅ Most complete |
| **type** | 3 | ✅ Yes | data, identity, i18n, ui | App.spec.ts + e2e | ✅ Wired up |
| **timer** | 4 | ✅ Yes | data, identity, i18n, ui | App.spec.ts + e2e | ✅ Wired up |
| **radio** | 11 | ✅ Yes | data, identity, i18n, ui | App.spec.ts + e2e | ✅ Active dev |
| **media** | 13 | ❌ | data, identity, i18n, media, ui | — | ⚠️ New, no tests |
| **todo** | 2 | ❌ | data, identity, i18n, ui | e2e | ⚠️ Minimal |
| **cards** | 2 | ❌ | none (empty deps) | e2e | 🔴 Not wired to packages |
| **sequence** | 2 | ❌ | none (empty deps) | e2e | 🔴 Not wired to packages |
| **clock** | 2 | ❌ | none | e2e | 🔴 Minimal scaffold |
| **website** | 9 | ❌ | @sil/ui, bemm | App.spec.ts + content spec | ✅ Marketing site |
| **docs** | ? | ❌ | — | — | 🟡 Internal docs app |

### iOS Apps
4 apps have native SwiftUI:
- `apps/yes-no/ios/` — ✅ Most complete
- `apps/type/ios/`
- `apps/timer/ios/`
- `apps/radio/ios/`

All have TODOs for TTS API integration.

---

## 5. Identity System

✅ **Clean device-first identity in `workers/identity-api/src/index.ts`**

Endpoints:
- `POST /v1/identity/device` — bootstrap device (create or reconnect)
- `GET /v1/identity/session` — validate session
- `POST /v1/identity/email` — request magic link (generic response)
- `POST /v1/identity/magic-links/verify` — verify magic link
- `POST /v1/identity/logout` — revoke session

Features:
- Device fingerprinting with secret hash
- Timing-safe comparison
- Generic recovery messages (doesn't leak email existence)
- Session tokens hashed with pepper
- Event logging
- CORS support

**Shared auth middleware** (`workers/shared/auth.ts`):
- Validates Bearer tokens against identity-api
- Also supports API keys (D1-backed with cache)
- Used by media-api, generation-api

---

## 6. API Contracts

- `docs/api/openapi.yaml` exists
- `docs/architecture/api-first-platform.md` — API-first architecture doc
- `docs/architecture/p0-foundation-contract-map.md` — foundation contract map
- Contract tests in `tests/` (identity-api, app-api, generation-api, testing-contract)

---

## 7. i18n System

- `@tiko/i18n` package with `index.spec.ts`
- No hardcoded Supabase references ✅
- Appears to be Lezu-aware but minimal implementation so far

---

## 8. Build Pipeline

### CI (`ci.yml`)
- Triggers on push to `development` and `main`
- Lint (placeholder check) → Typecheck → Unit tests
- E2E tests with Playwright

### Deploy (`deploy.yml`)
- Smart change detection per app/worker
- Selective or full deploy based on shared package changes
- Skips scaffold-only workers
- Deploy to Cloudflare Pages (apps) and Workers
- Environment: `development` or `production` based on branch

### Doctrine Check Tool
- `tools/check-doctrine.mjs` — verifies DOCTRINE.md has required phrases
- `tools/check-placeholders.mjs` — verifies required scaffold files exist

---

## 9. DNS/Domain Config

⚠️ **No custom routes configured in any wrangler.toml.** All workers use `workers_dev = true` (auto-generated `*.workers.dev` domains).

No production routes, no custom domains, no zone mappings.

---

## 10. Test Coverage

### Unit Tests (20 files)
- **Root:** 4 contract tests (identity-api, app-api, generation-api, testing-contract)
- **Packages:** 2 (tikokit.spec.ts, i18n/index.spec.ts)
- **Apps:** 6 App.spec.ts + 1 content spec + 7 e2e specs

### Missing Tests
- `workers/tts-api` — no tests
- `workers/media-api` — no tests
- `workers/admin-api` — scaffold only
- `workers/content-api` — scaffold only
- `apps/media` — no tests
- `packages/data`, `packages/identity`, `packages/media`, `packages/testing` — no tests

---

## 11. What's Missing

### 🔴 Critical
1. **3 workers with placeholder D1 IDs** — identity-api, app-api, generation-api cannot deploy
2. **2 workers are empty scaffolds** — admin-api, content-api have no code
3. **2 apps not wired to packages** — cards and sequence have empty dependency lists
4. **Account ID inconsistency** — workers use 2 different account IDs

### 🟡 Should Fix
5. **tts-api naming inconsistency** — uses `@tiko-universe/tts-api` vs `@tiko-worker/*` pattern
6. **No production routes** — no custom domains, no Cloudflare zone mappings
7. **iOS apps have TODO stubs** — TTS API not integrated
8. **Missing tests for tts-api and media-api**
9. **No KV bindings anywhere** — doctrine says "KV as cache" but no worker uses it
10. **No i18n Lezu integration** — package exists but appears unconnected

### ✅ Working Well
- Clean npm workspaces, no Nx/pnpm complexity
- Device-first identity is solid and well-tested
- Shared auth middleware is reusable
- CI/CD with smart change detection
- Doctrine and scaffold enforcement tools
- Zero Supabase/Better Auth references
- Product-first app layout with iOS support

---

## 12. Security Issues

- ✅ No secrets committed
- ✅ `.env` files gitignored
- ✅ No Supabase URLs
- ⚠️ `ALLOWED_ORIGINS = "*"` on identity-api and app-api — too permissive for production
- ⚠️ `TOKEN_PEPPER` not set (needs `wrangler secret put`)
- ✅ Session tokens stored as hashes, never raw
- ✅ Timing-safe token comparison
