# AGENTS.md

Guide for AI agents working in the Tiko Universe monorepo.

## What This Is

Tiko is a child-first universe of small, focused AAC (Augmentative and Alternative Communication) tools. The platform is API-first: web (Vue 3), iOS (SwiftUI), and future Android clients all consume the same HTTPS JSON APIs hosted on Cloudflare Workers.

**Read the doctrine first**: `docs/doctrine/DOCTRINE.md` and `docs/doctrine/IDEOLOGY.md`. These define non-negotiable product and engineering constraints.

## Engineering Rules

- Do not add compatibility fallbacks, legacy decode paths, or silent data-shape conversions unless the user explicitly asks for them or an approved migration plan requires them. In most cases, fix the source contract and update the callers instead of carrying technical debt forward.

## Commands

### Web / TypeScript (run from repo root)

```bash
npm ci                          # Install all workspace dependencies
npm run check                   # lint + typecheck + test (the full CI gate)
npm run lint                    # Checks required scaffold files exist (NOT a code linter)
npm run typecheck               # vue-tsc --noEmit -p tsconfig.json
npm run test                    # vitest run (all unit tests, jsdom environment)
npm run test:contracts          # API contract tests only
npm run build                   # Build all workspaces (runs generate:app-configs first)
npm run generate:app-configs    # Regenerates appConfig.ts for each app from API + fallbacks
npm run audit:doctrine          # Checks doctrine markdown files exist
```

### Individual app dev/test

Each web app has its own dev server on a unique port. Run from the app directory or use npm workspace:

```bash
npm run dev --workspace=apps/yes-no/web      # Dev server on port 3056
npm run test --workspace=apps/yes-no/web      # App-specific unit tests
npm run build --workspace=apps/talk/web       # Build one app
```

App dev ports:

| App | Port |
| --- | ---: |
| yes-no | 3056 |
| timer | 3057 |
| type | 3058 |
| radio | 3059 |
| website | 3060 |
| media | 3061 |
| admin | 3062 |
| cards | 3063 |
| sequence | 3064 |
| todo | 3065 |
| talk | 3066 |

`apps/clock/web` is not a runnable workspace at the moment and should stay out of active app commands until the app is restored.

### E2E tests

```bash
npx playwright test --config=playwright.config.ts              # All apps
npx playwright test --project=timer --config=playwright.config.ts  # Single app
```

Current status: Playwright specs exist for several child-facing web apps, but `@playwright/test` is not currently declared in the root package manifest and E2E is not part of the default CI gate. Treat these commands as local/manual until the Playwright task in `REVIEW_TASKS.md` is completed. Admin uses Cypress separately: `apps/admin/web` has its own `cypress.config.mjs`.

### iOS

iOS projects use XcodeGen. The `.xcodeproj` is generated from `Project.yml` — do not edit it directly.

```bash
cd apps/yes-no/ios && xcodegen generate    # Regenerate .xcodeproj from Project.yml
```

iOS CI (`ios-ci.yml`) runs on `macos-latest`, uses XcodeGen, and runs `xcodebuild test` on an iPhone simulator.

### Workers

```bash
cd workers/identity-api && npx wrangler dev         # Local dev
cd workers/identity-api && npx wrangler deploy       # Deploy (dev environment)
cd workers/identity-api && npx wrangler deploy --env production  # Production deploy
```

Worker D1 migrations:
```bash
cd workers/app-api && npx wrangler d1 migrations apply tiko-db --remote          # Dev
cd workers/app-api && npx wrangler d1 migrations apply tiko-db --remote --env production  # Prod
```

## Repository Structure

```
apps/<product>/<platform>/     # Product-first, then platform
  web/                         # Vue 3 + Vite SPA
    src/
      App.vue                  # Main component (script setup + template)
      appConfig.ts             # Auto-generated app identity config
      main.ts                  # createApp + mount
      styles.scss              # App-specific styles
      App.spec.ts              # Vitest unit tests
    e2e/app.spec.ts            # Playwright E2E tests
    package.json               # Workspace package with dev/build/test scripts
    vite.config.ts             # Vite config with @sil/ui plugin
    public/                    # _headers, llms.txt, robots.txt, sitemap.xml
  ios/
    Sources/                   # SwiftUI app code
    Tests/                     # XCTest unit tests
    Project.yml                # XcodeGen project definition (EDIT THIS, not .xcodeproj)
    TikoCards.xcodeproj/       # GENERATED — do not edit directly

packages/                      # Shared TypeScript/Swift packages
  identity/                    # @tiko/identity — browser identity client + contracts
  data/                        # @tiko/data — app data/settings clients + typed models
  i18n/                        # @tiko/i18n — Lezu-backed translations with local fallbacks
  media/                       # @tiko/media — media upload/download contract helpers
  ui/                          # @tiko/ui — TikoKit for web (TikoAppShell, TikoChoiceGrid, etc.)
  testing/                     # @tiko/testing — contract tests, smoke helpers, fixtures
  talk-types/                  # @tiko/talk-types — Talk-specific shared types
  tikokit-ios/                 # TikoKit Swift Package (shared SwiftUI components)

workers/                       # Cloudflare Workers — one per bounded domain
  identity-api/                # Users, devices, sessions, magic links, child accounts
  app-api/                     # User-scoped app state and settings
  content-api/                 # Published content, curriculum
  media-api/                   # Upload auth, media metadata, R2 access
  generation-api/              # TTS, sentence generation, image generation
  atlas-api/                   # API gateway/orchestration layer
  sentence-api/                # Sentence packs for Talk app
  tts-api/                     # Text-to-speech worker
  admin-api/                   # Admin-only operations
  communication-api/           # Email delivery (magic links)
  translations-api/            # Translation serving
  shared/auth.ts               # Shared auth helpers across workers

docs/                          # Doctrine, architecture, API contracts, app specs
  doctrine/                    # DOCTRINE.md, IDEOLOGY.md — read these first
  architecture/                # repo-structure, api-first-platform, identity, native-platforms
  apps/                        # Per-app specs and smoke checklists
  api/                         # openapi.yaml, contract docs
  plans/                       # Feature plans and migration specs

tools/                         # Build/codegen tools
  generate-app-configs.mjs     # Generates appConfig.ts for web + Swift for iOS
  check-placeholders.mjs       # CI lint: verifies required scaffold files exist
  check-doctrine.mjs           # Verifies doctrine markdown exists

tests/                         # Root-level integration/contract tests
  vitest.setup.ts              # Global test setup
  *-api.test.ts                # API contract tests
```

## Workspace Configuration

The monorepo uses npm workspaces. From the root `package.json`:

```json
"workspaces": [
  "apps/*/web",
  "packages/*",
  "workers/*"
]
```

Path aliases are configured in two places (must stay in sync):
- `tsconfig.json` — `paths` for TypeScript resolution
- `vitest.config.ts` — `resolve.alias` for Vitest

Package namespaces:
- `@tiko/*` — shared packages (identity, data, i18n, media, ui, testing, talk-types)
- `@tiko-universe/*` — app workspace names (e.g., `@tiko-universe/yes-no-web`)
- `@tiko-worker/*` — worker workspace names (e.g., `@tiko-worker/identity-api`)

App packages reference shared packages via `file:` links (e.g., `"@tiko/identity": "file:../../../packages/identity"`).

## Web App Architecture

Each web app follows the same pattern (study `apps/yes-no/web/` as the reference):

1. **`appConfig.ts`** — Auto-generated by `tools/generate-app-configs.mjs`. Defines app id, title, color, icon, theme color. Uses `satisfies TikoAppConfig`.

2. **`App.vue`** — Single-file component with `<script setup lang="ts">`. Contains all app logic:
   - Imports from `@tiko/identity`, `@tiko/data`, `@tiko/i18n`, `@tiko/ui`
   - Creates `IdentityClient`, `TikoDataClient`, i18n, TTS client
   - Uses `useIdentityRuntime()` for identity bootstrap
   - Local-first: writes to localStorage immediately, syncs to API in background
   - Uses `TikoAppShell` component for consistent chrome (header, settings, profile)

3. **`main.ts`** — Minimal: `createApp(App)`, provide `popupService`, mount to `#app`.

4. **`vite.config.ts`** — Uses `@sil/ui/vite` plugin and aliases `@tiko/ui` to the local package source.

5. **`App.spec.ts`** — Vitest tests that mock `fetch` globally and mount the full App component. Tests verify: immediate rendering without login, identity bootstrap, settings hydration, answer persistence, TTS fallback.

### Key shared components (from `@tiko/ui`)

- `TikoAppShell` — Full-page chrome with header, settings panel, profile menu, splash overlay
- `TikoAppHeader` — App bar with icon, title, action buttons, avatar
- `TikoChoiceGrid` / `TikoAnswerButton` — Choice tiles for AAC responses
- `TikoSettingsPanel` — Language + color mode settings
- `TikoProfileMenu` — Account management popup
- `useIdentityRuntime()` — Composable for identity bootstrap, session management
- `createTikoTtsClient()` — TTS with Atlas API + browser SpeechSynthesis fallback

## iOS App Architecture

Each iOS app follows the same pattern (study `apps/yes-no/ios/` as reference):

1. **`Project.yml`** — XcodeGen spec. References `TikoKit` from `../../../packages/tikokit-ios`. Defines app target + test target.

2. **`*AppConfig.swift`** — Thin enum wrapping `TikoAppConfig.<app>` from TikoKit.

3. **`*View.swift`** — Main SwiftUI view using `TikoAppShell`, `TikoChoiceGrid`, etc. from TikoKit. Uses `@AppStorage` for persistence, `@StateObject` for `TikoI18n`.

4. **`*App.swift`** — App entry point.

TikoKit (`packages/tikokit-ios/`) provides:
- `TikoAppShell` — Shell with header, settings popup, profile menu, splash overlay, identity integration
- `TikoAppHeader` — Header bar matching web behavior
- `TikoAppColor` — Per-app color palettes
- `TikoI18n` — Localization manager
- `TikoIdentity` — Identity client, device session store
- `TikoMediaPicker` — Media selection
- `TikoPopupSheets` — Popup card, settings, parent code entry
- `TikoTile`, `TikoChoiceGrid`, `TikoCard` — UI primitives

## Worker Architecture

Each worker is a Cloudflare Worker with `wrangler.toml` configuration. Key patterns:

- **Single-file workers**: Most workers have all logic in `src/index.ts`.
- **D1 for relational data**: Migrations live in `workers/<name>/migrations/`.
- **R2 for media**: media-api uses R2 for file storage.
- **KV for caching**: Used as cache only, never source of truth.
- **Service bindings**: Workers call each other via `SERVICE` bindings (e.g., identity-api calls communication-api).
- **Environment split**: `development` branch → dev workers/apps; `main` → production.
- **CORS**: Each worker handles CORS with explicit allowed origins.
- **Auth**: Bearer tokens for native, HttpOnly cookies for web. `workers/shared/auth.ts` for shared helpers.

### identity-api specifics

The identity worker is the most complex. It uses the `ankore` package as a foundation and adds Tiko-specific routes:
- Canonical identity (email, OTP, magic links) delegates to ankore
- Managed identity (PIN, parent/child mode, child accounts, deletion) is custom Tiko logic
- Session tokens hashed with pepper (`TOKEN_PEPPER` secret)
- Runtime state stored in `metadata_json` on the subject row
- Admin role bootstrapped by email match against `ADMIN_EMAIL`

## API Conventions

- All API paths versioned with `/v1`
- JSON request/response bodies
- Error shape: `{ error: string, message?: string }`
- Bearer token auth for native: `Authorization: Bearer <token>`
- Cookie auth for web: `tiko_session` HttpOnly Secure cookie on `.tikoapps.org`
- Settings/state use optimistic concurrency with `version` fields

### Key API endpoints

| Service | Base URL (dev) | Key paths |
|---------|---------------|-----------|
| Identity | `id.tikoapps.org/v1/identity` | `/device`, `/session`, `/email`, `/magic-links/verify`, `/pin`, `/mode/child`, `/mode/parent`, `/child-accounts` |
| App API | `app.tikoapi.org/v1/apps` | `/:app/settings`, `/:app/state` |
| Atlas | `tiko-atlas-api-dev.*.workers.dev/v1/atlas` | `/speech` (TTS) |
| Media | `media.tikoapi.org/v1/media` | Media library queries |
| Translations | `translations.tikoapi.org/v1` | `/:app/:language` |

## Testing Patterns

### Unit tests (Vitest)
- Environment: jsdom
- Global setup: `tests/vitest.setup.ts`
- Globals enabled (`globals: true` in vitest.config.ts)
- E2E directories excluded from vitest
- Tests mock `fetch` globally with URL-matching helpers
- Tests mock `Audio` constructor for TTS
- Tests use `@vue/test-utils` `mount()` with `global.provide` for `popupService`
- Test IDs: `data-test` attribute (configured in Playwright and used in vitest selectors like `[data-test="tiko-header-action-settings"]`)

### Contract tests
Located in `tests/` at repo root. These test worker API contracts without running the workers.

### E2E tests (Playwright)
- One `app.spec.ts` per app in `apps/<name>/web/e2e/`
- Runs against real dev server on dedicated port
- `testIdAttribute: 'data-test'` configured globally
- Single worker, no parallelism (`workers: 1`)
- Not currently part of the default CI gate; see `REVIEW_TASKS.md` before treating Playwright as restored.

### iOS tests
- XCTest framework, one test file per app in `apps/<name>/ios/Tests/`

## Deployment

Deployment is fully automated via GitHub Actions:

- **`ci.yml`**: On push to development/main — lint, typecheck, unit tests, admin Cypress E2E, build all
- **`deploy.yml`**: On push to development/main — detects changed paths, selectively deploys:
  - Web apps → Cloudflare Pages (project names: `tiko-<app>` for prod, `tiko-<app>-dev` for dev)
  - Workers → Cloudflare Workers (with D1 migrations for app-api)
  - Shared package changes trigger full redeploy
- **`ios-ci.yml`**: Manual trigger (`workflow_dispatch`) — builds and tests iOS apps on macOS runner

Production domains: `tiko.mt`, `tikotalks.com`, `tikoapps.org` subdomains.

## Gotchas and Non-Obvious Patterns

- **`npm run lint` is NOT a code linter.** It runs `tools/check-placeholders.mjs` which only verifies required scaffold files exist. There is no ESLint/Prettier in this repo.

- **`appConfig.ts` files are auto-generated.** Do not edit them directly. Run `npm run generate:app-configs` to regenerate. The generator fetches from the app-api and falls back to hardcoded configs.

- **iOS `.xcodeproj` is generated.** Edit `Project.yml` instead. Run `xcodegen generate` after changes. The CI does this automatically.

- **Identity is device-first.** Users start as anonymous device users. There are no passwords anywhere. Magic links and OTP for email recovery. This is a core doctrine constraint.

- **Local-first web apps.** Web apps write to localStorage immediately and sync to API in the background. If the API is down, the app still works for the child. Tests verify this offline-fallback behavior.

- **`@sil/ui` is an external dependency** (published package), not a local package. It provides low-level UI primitives (Button, Icon, Popup). Tiko builds product-specific UI (`@tiko/ui`) on top of it.

- **Worker `wrangler.toml` has `account_id`** — Workers are split across Cloudflare accounts. The deploy workflow unsets `CLOUDFLARE_ACCOUNT_ID` before worker deploys so each worker uses its own account.

- **Some workers are scaffold-only.** The deploy workflow checks for `scaffold-only` in the `deploy:dry-run` script and skips workers that haven't been fully implemented yet.

- **`ankore` is used in identity-api** as a foundation library for identity worker patterns. It's imported but not a local package — it's an external dependency.

- **`open-icon` icon names use categories.** Icons are referenced as `category/name` (e.g., `ui/check-fat`, `media/volume-iii`, `wayfinding/cross`). The web `Icon` component from `@sil/ui` handles rendering these.

- **Bundle ID prefix** for iOS apps is `mt.tiko` (e.g., `mt.tiko.yesno`).

- **Swift uses `Color(hex: 0xRRGGBB)`** — custom initializer from TikoKit for hex colors.

- **CSS class naming** uses BEM-like conventions (e.g., `yes-no-app__sentence-input`, `tiko-app-header__action--active`).

- **The `tikoI18nKeys` object** in `@tiko/i18n` provides type-safe translation key constants. Always use these instead of raw strings.

- **TTS client normalizes URLs.** The `createTikoTtsClient()` in `@tiko/ui` has complex URL normalization logic that routes through the Atlas gateway. Changing API domain structure requires updating the normalization.

- **`data-tikoapps.org` CDN** uses Cloudflare Image Resizing for media thumbnails. URLs follow the pattern `https://data.tikocdn.org/cdn-cgi/image/width=N,height=N,fit=cover,.../uploads/...`.

## Adding a New App

1. Create `apps/<name>/web/` following the yes-no pattern: `package.json`, `vite.config.ts`, `index.html`, `src/` (App.vue, appConfig.ts, main.ts, styles.scss, App.spec.ts), `public/`, `e2e/`
2. Add `<name>` to the `webApps` array in `tools/generate-app-configs.mjs`
3. Add a port entry in `playwright.config.ts`
4. Add config entry in `tikoAppConfigs` and `tikoAppColors` in `packages/ui/src/index.ts`
5. Add `TikoAppColor` case in `packages/tikokit-ios/Sources/TikoKit/TikoAppColor.swift`
6. Add local translations in `packages/i18n/src/index.ts`
7. Add `data-test` attributes to key interactive elements for E2E tests
8. Update deploy workflow app lists in `.github/workflows/deploy.yml`

## Adding a New Worker

1. Create `workers/<name>/` with `package.json`, `wrangler.toml`, `src/index.ts`
2. Add `<name>` to the `WORKERS` list in `.github/workflows/deploy.yml`
3. Create D1 database: `npx wrangler d1 create tiko-<name>` and add binding to `wrangler.toml`
4. Add migrations in `workers/<name>/migrations/` (sequential numbered SQL files)
5. Add `deploy:dry-run` script to `package.json` (or it will be skipped as scaffold-only)
