# 07 — Dependencies, Build & CI

Scope: dependency health, workspace hygiene, build determinism, CI/CD pipeline correctness, DX. Test-infrastructure findings live in `06-testing.md`; the CI-secrets finding is also referenced in `04-security.md`.

## What is done well

- **`npm audit --omit=dev`: 0 known vulnerabilities** at review time.
- Version ranges are consistent across workspaces (vue 3.5.x, vite 7.x everywhere except translations-api).
- CI runs typecheck + all unit/contract tests + full build + an admin Cypress smoke on every PR, with npm caching and concurrency cancellation.
- Deploy has sensible change detection with shared-package fan-out, `max-parallel: 1` for workers, and well-commented workarounds (the Pages production-branch PATCH).
- `generate-tiko-colors.mjs` validates names and hex values; `writeIfChanged` avoids spurious diffs; the vite deploy-info plugin is dependency-free.

---

## Findings

### [High] Production deploys are not gated on CI passing
File: `.github/workflows/deploy.yml:3-6`
Why: `Deploy` triggers directly on push to `development`/`main` and runs **concurrently** with the `CI` workflow. No `workflow_run` dependency, no `needs`, no required-status gate in the repo. A push with failing typecheck/tests still deploys every changed app and worker to production.
Fix: Add a `verify` job (checkout, `npm ci`, typecheck, test) that all deploy jobs `needs:`, or convert deploy to `workflow_run` on CI completion.

### [High] communication-api and translations-api are missing from the deploy matrix
File: `.github/workflows/deploy.yml:66` and the `deploy-all` matrix
Why: The `WORKERS` list names 9 of 13 workers (shared has nothing to deploy; admin/atlas are included). Changes to communication-api — which identity-api's magic-link delivery depends on — silently never deploy. Same for translations-api.
Fix: Add both to the variable and the matrix; if intentionally manual, add an explicit "skipped" entry so the omission is documented.

### [High] The build is nondeterministic, and CI builds ≠ deployed builds
File: `package.json:17` (`prebuild`), `tools/generate-app-configs.mjs:43-56, 78, 96-100`
Why: Root `prebuild` fetches `https://app.tikoapi.org/v1/apps/config` at build time and rewrites committed source (`apps/*/web/src/appConfig.ts` **and** `TikoAppColor.swift`). CI's "Build All" builds against whatever the live API returns that moment; the deploy job builds per-workspace **without** the root prebuild, i.e. from committed files. The thing CI validates is not the thing that ships. Additionally, fetched values are interpolated **unescaped into Swift source** (`appColor: .${swiftCase(config.appColor)}`) — a corrupt/malicious API response becomes arbitrary Swift on dev machines and CI; the Swift-file regex replacement also silently no-ops if the file shape drifts.
Fix: Pick one source of truth: commit the generated files and run the generator manually/scheduled, or run the same generate step in deploy. Validate fetched values with the `/^[a-z][a-z0-9-]*$/` regex the colors generator already uses.

### [High] "Production" provisioning reuses the dev D1 database
File: `scripts/cloudflare/provision-talk-dev.mjs:120, 128-133`
Why: Both the dev branch and the `TIKO_PROVISION_PRODUCTION === 'true'` branch call `ensureD1('tiko-db')` — the identical database. Combined with the wrangler.toml findings (dev/prod sharing `database_id` across identity, app, atlas, media, communication, generation, sentence — see 04-security/01-architecture), and with deploy.yml re-executing `schema.sql` + `seed-en.sql` against that shared DB on **every sentence-api dev deploy** (`deploy.yml:261-264`, `INSERT OR REPLACE` clobbering curated rows), environment isolation effectively does not exist for most of the platform.
Fix: Fail loudly in the production branch until an isolated production D1 exists; migrate sentence-api's schema to numbered migrations; create separate dev databases for every worker.

### [Medium] Dependency placement is inverted at the root
File: `package.json:32-51`
Why: `vite`, `typescript`, `vitest`, `jsdom`, `sass`, `vue-tsc`, `@vue/test-utils`, `@vitejs/plugin-vue` sit in `dependencies`; `@capacitor/core`/`@capacitor/android` (actual runtime deps of the Android wrappers) sit in `devDependencies`. `npm audit --omit=dev` therefore audits the tooling as prod and skips the runtime.
Fix: Swap them.

### [Medium] Undeclared dependencies resolved only by hoisting
File: `apps/admin/web/package.json:13-23`, `apps/website/web/package.json:11-19`, `apps/media/web/package.json:12-21`, `packages/ui/package.json`
Why: Admin imports `bemm`, `@sil/ui`, `@tiko/i18n`, `@tiko/data` and declares none; website imports `@tiko/ui` and runs the vitest stack with empty devDependencies; media imports `@sil/ui` undeclared; `@tiko/ui` imports `@tiko/identity` undeclared. All resolve via workspace hoisting — fragile against dedupe or workspace moves.
Fix: Declare what you import; move `vite`/`@vitejs/plugin-vue` out of app `dependencies`.

### [Medium] translations-api is on its own drifting toolchain
File: `workers/translations-api/package.json:16`
Why: `wrangler ^3.0.0` (3.114 installed in a **vendored** `node_modules`) while the repo is on 4.98; no test/typecheck/dry-run scripts; not in the deploy matrix; no contract test.
Fix: Bump to ^4, delete the vendored modules, add scripts + a minimal contract test, add to deploy.

### [Medium] ankore: installed version does not satisfy the declared range
File: `workers/identity-api/package.json:12`
Why: `npm ls` reports ankore 0.4.0 installed vs `^0.4.1` declared — the local tree hasn't been reinstalled since the bump, so locally-run tests exercise a different identity core than CI. For the security-critical foundation package, that divergence matters.
Fix: `npm install`; consider exact-pinning ankore.

### [Medium] `|| true` makes two deploy gates decorative
File: `.github/workflows/deploy.yml:269, 167`
Why: `wrangler deploy --dry-run ... || true` swallows the verification the comment claims; `wrangler pages project create ... || true` masks auth/quota failures identically to the benign "already exists".
Fix: Drop `|| true` on the dry-run; grep for "already exists" specifically on project create.

### [Low] Workflow hygiene
- Actions pinned by mutable major tags (`checkout@v6`, `setup-node@v6`, `cypress-io/github-action@v7`…) in workflows holding the Cloudflare token — pin to SHAs with Renovate/Dependabot bumps.
- Hardcoded Cloudflare account ID committed as a fallback in two places (`deploy.yml:12`, `provision-talk-dev.mjs:5`).
- Deploy change detection misses `tools/` and `scripts/` as shared inputs (the deploy-info plugin is imported by every vite config); the PR-diff branch in detection is dead code (`deploy.yml:53-55, 84-86`).
- android-wrappers workflow triggers only on `apps/*/android/**` but builds (and embeds) the web app + shared packages it doesn't watch; when triggered, it builds all 8 wrappers regardless of which changed (`android-wrappers.yml:4-10, 40-43`).
- `seed-cards-defaults.mjs` writes to production with no `--yes` confirmation and shells with unquoted interpolated paths (`scripts/seed-cards-defaults.mjs:395-407`).
- `vite-plugin-deploy-info` reads `.git/refs/heads/<branch>` directly — returns `unknown` for packed refs and worktrees (`tools/vite-plugin-deploy-info.mjs:16-30`).
- `migration.sql` at repo root is an orphan (`api_keys` table no worker owns; the shared-auth code that would query it is dead — see 04). Move into an owning worker's migrations or delete.

### [Low] Docs drift (DX)
File: `AGENTS.md:41`, `README.md:36-58`
Why: The port table is wrong (cards 3061→actual 3063, sequence 3062→3064, radio 3067→3059; 3062 is admin; clock doesn't exist); README's structure omits 5 workers and several packages; AGENTS.md documents the non-functional Playwright command; `apps/android/README.md` describes a Kotlin/Compose stack that was never built. Anyone — human or agent — following the docs hits wrong servers and dead commands.
Fix: Regenerate the port table from package.json dev scripts (or eliminate the duplication); refresh both READMEs.

## Dependency table

| Package | Current | Issue | Recommendation |
|---|---|---|---|
| wrangler (translations-api) | 3.114 (`^3.0.0`) | Major behind root (4.98), vendored node_modules | Bump to ^4, dedupe |
| @playwright/test | **not installed** | Config + 8 e2e suites depend on it | Add as root devDependency, pin |
| ankore (identity-api) | 0.4.0 installed vs `^0.4.1` | Local/CI divergence on the auth core | Reinstall; exact-pin |
| vite | 7.3.3 | v8 is out | Coordinated major bump later; not urgent |
| jsdom | 27.4 | v29 out (2 majors) | Bump with vitest env testing |
| typescript | 5.9.3 | TS 6.0 out | Hold until vue-tsc supports it |
| cypress (admin) | 14.5 | v15 out | Opportunistic |
| vue-router | 4.6.4 | v5 out | Evaluate later |
| vite/ts/vitest/jsdom/sass/vue-tsc/etc. (root) | — | In `dependencies` | Move to devDependencies |
| @capacitor/* (root) | 8.4.0 | Runtime deps in devDependencies | Move to dependencies (or wrapper packages) |
| `@sil/ui` | 2.6.0 | External; pulls highlight.js into every child app's prebundle | Investigate the leak |
