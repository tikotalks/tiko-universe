# TikoTalks.com deployment wiring plan

## Scope and guardrails

This plan prepares Cloudflare-first deployment wiring for the static TikoTalks website in `apps/website/web`.

It does not deploy production from the VPS. Production promotion must stay Git-based: merge or PR `development` into `main`/`master`, then let GitHub Actions deploy the production Pages project from the protected production branch.

Runtime principles:

- Hosting target: Cloudflare Pages.
- Dev domain: `https://dev.tikotalks.com`.
- Production domains: `https://tikotalks.com` and `https://www.tikotalks.com`.
- Source path: `apps/website/web`.
- Build output: `apps/website/web/dist`.
- Build command: `npm --workspace @tiko-universe/website-web run build`.
- CI Node runtime: Node 22+.
- Static site only for v1: no Worker, D1, KV, R2, Queue, auth, or backend dependency is required by the website deploy itself.

## Read-only Cloudflare inventory observed

Read-only Cloudflare checks found:

- Target account for Tiko work: `Me@sil.mt's Account` / `8cef251b5fdcf6c6f63db98b7aa49f9a`.
- Zone `tikotalks.com` exists and is active in Cloudflare. Zone id prefix observed: `88091410`.
- Existing DNS in the zone currently includes:
  - `tikotalks.com` CNAME -> `tiko-marketing.pages.dev`, proxied.
  - `www.tikotalks.com` CNAME -> `tiko-marketing.pages.dev`, proxied.
  - `media.tikotalks.com` CNAME -> `tiko-media.pages.dev`, proxied.
  - SES-related `send.tikotalks.com` MX/TXT records.
- No Cloudflare Pages project with `tiko` or `talk` in the name was visible in the target account Pages project list at the time of this check.

Implication: the zone exists, but the expected Pages projects for this repo should be created or reconnected before custom domains are switched. Do not remove SES records. Do not repoint `media.tikotalks.com` unless a separate media task explicitly covers it.

## Recommended Pages topology

Use two Cloudflare Pages projects instead of relying on preview URLs for the stable dev domain.

### Dev project

- Project name: `tikotalks-dev`.
- Source branch: `development`.
- Custom domain: `dev.tikotalks.com`.
- Purpose: stable review URL for work merged to `development`.
- Deployment trigger: GitHub Actions on push to `development`, limited to website-relevant paths.

Reason: Cloudflare Pages preview deployments are great for per-PR hashes, but a predictable `dev.tikotalks.com` should point at a project whose production branch is `development`.

### Production project

- Project name: `tikotalks`.
- Source branch: `main` or `master` after Sil confirms the production branch for this repo.
- Custom domains: `tikotalks.com`, `www.tikotalks.com`.
- Purpose: public site.
- Deployment trigger: GitHub Actions on push to the production branch only.

Reason: production should only move after the shared integration branch is promoted by PR. Do not make `development` the production branch of the production Pages project.

## Required Cloudflare resources

Names only; no secret values belong in repo docs or workflow logs.

- Cloudflare zone: `tikotalks.com`.
- Cloudflare Pages project: `tikotalks-dev`.
- Cloudflare Pages project: `tikotalks`.
- Pages custom domain: `dev.tikotalks.com` attached to `tikotalks-dev`.
- Pages custom domain: `tikotalks.com` attached to `tikotalks`.
- Pages custom domain: `www.tikotalks.com` attached to `tikotalks`.
- GitHub Actions secret: `CLOUDFLARE_API_TOKEN`.
- GitHub Actions variable or secret: `CLOUDFLARE_ACCOUNT_ID`.
- Optional GitHub Actions variables:
  - `CLOUDFLARE_PAGES_PROJECT_DEV=tikotalks-dev`.
  - `CLOUDFLARE_PAGES_PROJECT_PROD=tikotalks`.

The Cloudflare API token should be scoped to the account and zone with the minimum permissions needed for Pages deployments and, if the workflow owns custom-domain setup later, zone DNS edits.

## DNS and domain cutover plan

1. Create or confirm the `tikotalks-dev` Pages project.
2. Attach `dev.tikotalks.com` as a Pages custom domain.
3. Verify Cloudflare creates or expects the CNAME target for `dev.tikotalks.com`.
4. Deploy the current `development` site to `tikotalks-dev` from GitHub Actions.
5. Smoke test `https://dev.tikotalks.com`.
6. Create or confirm the `tikotalks` Pages project.
7. Attach `tikotalks.com` and `www.tikotalks.com` to `tikotalks`.
8. Promote `development` to `main`/`master` by PR only.
9. Let the production GitHub Action deploy `main`/`master` to `tikotalks`.
10. Smoke test `https://tikotalks.com` and `https://www.tikotalks.com`.

Current zone records already point apex and `www` at `tiko-marketing.pages.dev`. Treat production cutover as a deliberate replacement of those existing targets, not as a blind DNS overwrite.

## GitHub Actions wiring

Create `.github/workflows/deploy-tikotalks.yml` when the Pages project names and production branch are confirmed.

Recommended workflow shape:

```yaml
name: Deploy TikoTalks website

on:
  push:
    branches:
      - development
      - main
    paths:
      - apps/website/web/**
      - packages/**
      - package.json
      - package-lock.json
      - tsconfig*.json
      - .github/workflows/deploy-tikotalks.yml
  workflow_dispatch:
    inputs:
      target:
        description: Deploy target
        type: choice
        required: true
        default: dev
        options:
          - dev
          - production

concurrency:
  group: tikotalks-pages-${{ github.ref }}
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    permissions:
      contents: read
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm

      - run: npm ci

      - run: npm --workspace @tiko-universe/website-web run test

      - run: npm --workspace @tiko-universe/website-web run build

      - uses: actions/upload-artifact@v4
        with:
          name: tikotalks-dist
          path: apps/website/web/dist
          if-no-files-found: error

  deploy-dev:
    needs: build
    if: github.ref == 'refs/heads/development' || github.event.inputs.target == 'dev'
    runs-on: ubuntu-latest
    permissions:
      contents: read
      deployments: write
    environment:
      name: tikotalks-dev
      url: https://dev.tikotalks.com
    steps:
      - uses: actions/download-artifact@v4
        with:
          name: tikotalks-dist
          path: apps/website/web/dist

      - run: npx wrangler pages deploy apps/website/web/dist --project-name "$CLOUDFLARE_PAGES_PROJECT_DEV" --branch development
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          CLOUDFLARE_ACCOUNT_ID: ${{ vars.CLOUDFLARE_ACCOUNT_ID }}
          CLOUDFLARE_PAGES_PROJECT_DEV: ${{ vars.CLOUDFLARE_PAGES_PROJECT_DEV }}

  deploy-production:
    needs: build
    if: github.ref == 'refs/heads/main' || github.event.inputs.target == 'production'
    runs-on: ubuntu-latest
    permissions:
      contents: read
      deployments: write
    environment:
      name: tikotalks-production
      url: https://tikotalks.com
    steps:
      - uses: actions/download-artifact@v4
        with:
          name: tikotalks-dist
          path: apps/website/web/dist

      - run: npx wrangler pages deploy apps/website/web/dist --project-name "$CLOUDFLARE_PAGES_PROJECT_PROD" --branch main
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          CLOUDFLARE_ACCOUNT_ID: ${{ vars.CLOUDFLARE_ACCOUNT_ID }}
          CLOUDFLARE_PAGES_PROJECT_PROD: ${{ vars.CLOUDFLARE_PAGES_PROJECT_PROD }}
```

If the repo uses `master` instead of `main`, replace both `main` branch checks with `master` before committing the workflow.

Production hardening before enabling this workflow:

- Configure GitHub environment protection on `tikotalks-production` if available.
- Protect the production branch.
- Keep direct Cloudflare production deploys out of local scripts.
- Make production deploy depend on tests and build passing.

## Local scripts to add when implementation starts

The current website package should expose these scripts before the workflow is enabled:

```json
{
  "scripts": {
    "dev": "vite --host 0.0.0.0 --port 3060",
    "test": "vitest run src/content/appUniverse.spec.ts",
    "build": "vite build",
    "preview": "vite preview --host 0.0.0.0 --port 3061"
  }
}
```

The root package can optionally add convenience scripts after the website app stabilizes:

```json
{
  "scripts": {
    "build:website": "npm --workspace @tiko-universe/website-web run build",
    "test:website": "npm --workspace @tiko-universe/website-web run test"
  }
}
```

## Validation checklist

Before enabling dev deploy:

1. `node -v` returns Node 22+.
2. `npm ci` succeeds.
3. `npm --workspace @tiko-universe/website-web run test` passes.
4. `npm --workspace @tiko-universe/website-web run build` creates `apps/website/web/dist`.
5. GitHub Actions dry run or first dev run uploads a non-empty `tikotalks-dist` artifact.
6. `npx wrangler pages deploy apps/website/web/dist --project-name tikotalks-dev --branch development` is run by GitHub Actions, not manually from the VPS, for the canonical deploy.
7. `curl -I https://dev.tikotalks.com` returns 200 or expected static redirect.
8. Browser smoke covers `/`, `/apps`, `/caregivers` or the final implemented route set.
9. Public copy smoke confirms no adult SaaS dashboard, pricing, therapy-outcome, login-first, or password framing has slipped into the v1 site.

Before enabling production deploy:

1. `development` has been reviewed and promoted through PR to `main`/`master`.
2. The production Pages project custom domains show active in Cloudflare.
3. GitHub Actions production environment protections are in place if available.
4. Production workflow run on `main`/`master` passes tests/build and deploys to `tikotalks`.
5. `curl -I https://tikotalks.com` and `curl -I https://www.tikotalks.com` return 200 or the expected canonical redirect.
6. A browser smoke confirms production content matches the reviewed dev build.

## Validation commands run for this plan

Commands run from `/home/hermes/workspace/tiko-universe`:

```bash
node -v
npm -v
```

Result:

- `node -v`: `v22.22.3`.
- `npm -v`: `10.9.8`.

```bash
npm run audit:doctrine
```

Result: passed. The doctrine checker reported `doctrine checks passed`.

```bash
npm --workspace @tiko-universe/website-web run test
```

Result: passed. Vitest ran 2 test files / 8 tests successfully. The run emitted known missing-source sourcemap warnings from `@sil/color`, but no test failures.

```bash
npm --workspace @tiko-universe/website-web run build
```

Result: passed. Vite built `apps/website/web/dist` successfully. The build emitted the expected large-chunk warning because the current static site pulls in broad `@sil/ui` / Open Icon assets; this is a performance follow-up, not a deployment blocker for the wiring plan.

Cloudflare read-only checks:

- `tikotalks.com` zone lookup succeeded and returned an active zone.
- Pages project listing in the target account succeeded; no visible project with `tiko` or `talk` in the name was returned.
- DNS record listing for `tikotalks.com` succeeded and showed apex/`www` currently pointed at `tiko-marketing.pages.dev`.

## Open blockers before actual deployment

1. Confirm whether production branch is `main` or `master` for this repo before committing workflow branch filters.
2. Create or confirm Cloudflare Pages projects `tikotalks-dev` and `tikotalks` in account `8cef251b5fdcf6c6f63db98b7aa49f9a`.
3. Attach `dev.tikotalks.com`, `tikotalks.com`, and `www.tikotalks.com` to the correct Pages projects.
4. Decide whether the existing apex/`www` records pointing to `tiko-marketing.pages.dev` should be replaced during TikoTalks production cutover.
5. Add GitHub Actions secret/variables by name only: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_PAGES_PROJECT_DEV`, `CLOUDFLARE_PAGES_PROJECT_PROD`.
6. Commit `.github/workflows/deploy-tikotalks.yml` only after the production branch and Pages project names are confirmed; keep canonical deploys in GitHub Actions, not from the VPS.
