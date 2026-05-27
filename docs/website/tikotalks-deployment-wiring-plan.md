# TikoTalks.com deployment wiring plan

## Scope

This plan wires the future static Tiko website in `apps/website/web` to Cloudflare Pages through GitHub Actions.

It is implementation-ready, but it does not deploy production directly from the VPS. Production promotion must stay branch/PR based: merge website changes into `development`, validate the dev deployment on `dev.tikotalks.com`, then open a PR from `development` to `main` or `master` for production promotion.

Related source document: `docs/website/tikotalks-com-concept.md`.

## Target runtime

- Hosting: Cloudflare Pages.
- Dev hostname: `dev.tikotalks.com`.
- Production hostnames: `tikotalks.com` and `www.tikotalks.com`.
- Cloudflare account: `Me@sil.mt's Account` / `8cef251b5fdcf6c6f63db98b7aa49f9a`.
- GitHub repository: `tikotalks/tiko-universe`.
- Source branch for dev: `development`.
- Source branch for production: `main` or `master`, whichever is the repository's protected production branch.
- Site source path: `apps/website/web`.
- Build output: `apps/website/web/dist`.

## Cloudflare resources to create or confirm

Create or confirm these resources in the target Cloudflare account before enabling the workflow:

| Resource | Name | Purpose |
| --- | --- | --- |
| Pages project | `tikotalks-website` | Cloudflare Pages project for the public Tiko website. |
| Custom domain | `dev.tikotalks.com` | Development deployment alias sourced from `development`. |
| Custom domain | `tikotalks.com` | Production apex. |
| Custom domain | `www.tikotalks.com` | Production www alias. |
| DNS record | `dev` CNAME/Pages custom-domain record | Routes dev hostname to Pages. |
| DNS record | apex Pages custom-domain record | Routes apex hostname to Pages. |
| DNS record | `www` CNAME/Pages custom-domain record | Routes www hostname to Pages. |

No D1, R2, KV, Queue, or Worker binding is required for the v1 static website. If a later version adds updates, newsletter, or caregiver recovery, it should call documented APIs instead of adding website-owned durable data.

## GitHub secrets and variables

Add these GitHub Actions secrets/variables by name only. Do not commit values.

### Repository secrets

- `CLOUDFLARE_API_TOKEN`

Required token permissions:

- `Cloudflare Pages:Edit` for the target account.
- `Zone:Read` for the `tikotalks.com` zone if the workflow or Pages action needs domain checks.
- `Account:Read` for account/project lookup.

### Repository variables

- `CLOUDFLARE_ACCOUNT_ID` = target account ID.
- `TIKOTALKS_PAGES_PROJECT` = `tikotalks-website`.

Prefer repository or environment variables for non-secret names so workflow logs can show what project is being deployed without exposing credentials.

## Branch and environment model

### Development

- Trigger: push to `development` touching website or workflow files.
- Deployment command: Cloudflare Pages deploy with branch metadata `development`.
- Public URL to verify: `https://dev.tikotalks.com`.
- GitHub Environment: `tikotalks-dev`.
- Approval: no manual approval required after the workflow is proven.

### Production

- Trigger: push to `main` or `master` after a reviewed PR from `development`.
- Deployment command: Cloudflare Pages deploy with branch metadata matching the production branch.
- Public URLs to verify: `https://tikotalks.com` and `https://www.tikotalks.com`.
- GitHub Environment: `tikotalks-production`.
- Approval: require GitHub Environment approval if repository settings support it.

Do not run `wrangler pages deploy` for production from the VPS. Direct local dry-runs are acceptable, but production state changes must come from GitHub Actions.

## Required package scripts

Once `apps/website/web` exists as a full Vite app, its `package.json` should expose these scripts:

```json
{
  "scripts": {
    "dev": "vite --host 0.0.0.0 --port 3050",
    "build": "vite build",
    "test": "vitest run",
    "preview": "vite preview --host 0.0.0.0 --port 3051"
  }
}
```

The root scripts can stay workspace-based:

```json
{
  "scripts": {
    "build": "npm run build --workspaces --if-present",
    "test": "vitest run"
  }
}
```

If website-only CI should be faster, add optional root scripts later:

```json
{
  "scripts": {
    "build:website": "npm --workspace @tiko-universe/website-web run build",
    "test:website": "npm --workspace @tiko-universe/website-web run test"
  }
}
```

Use the actual workspace package name when the implementation card finalizes `apps/website/web/package.json`; current app packages use the `@tiko-universe/*` namespace.

## Workflow file to add

Create `.github/workflows/deploy-tikotalks-website.yml` after the website app has a working Vite build.

```yaml
name: Deploy TikoTalks website

on:
  push:
    branches:
      - development
      - main
      - master
    paths:
      - apps/website/web/**
      - packages/**
      - package.json
      - package-lock.json
      - tsconfig.json
      - .github/workflows/deploy-tikotalks-website.yml
  workflow_dispatch:

concurrency:
  group: tikotalks-website-${{ github.ref }}
  cancel-in-progress: true

jobs:
  build:
    name: Build website
    runs-on: ubuntu-latest
    outputs:
      deploy-environment: ${{ steps.env.outputs.deploy-environment }}
      branch-name: ${{ steps.env.outputs.branch-name }}
    steps:
      - name: Check out repository
        uses: actions/checkout@v4

      - name: Use Node.js 22
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Resolve deployment environment
        id: env
        shell: bash
        run: |
          case "${GITHUB_REF_NAME}" in
            development)
              echo "deploy-environment=tikotalks-dev" >> "$GITHUB_OUTPUT"
              echo "branch-name=development" >> "$GITHUB_OUTPUT"
              ;;
            main|master)
              echo "deploy-environment=tikotalks-production" >> "$GITHUB_OUTPUT"
              echo "branch-name=${GITHUB_REF_NAME}" >> "$GITHUB_OUTPUT"
              ;;
            *)
              echo "Unsupported branch ${GITHUB_REF_NAME}" >&2
              exit 1
              ;;
          esac

      - name: Test website
        run: npm --workspace @tiko-universe/website-web run test --if-present

      - name: Build website
        run: npm --workspace @tiko-universe/website-web run build

      - name: Upload Pages artifact
        uses: actions/upload-artifact@v4
        with:
          name: tikotalks-website-dist
          path: apps/website/web/dist
          if-no-files-found: error

  deploy:
    name: Deploy to Cloudflare Pages
    needs: build
    runs-on: ubuntu-latest
    environment: ${{ needs.build.outputs.deploy-environment }}
    permissions:
      contents: read
      deployments: write
    steps:
      - name: Download Pages artifact
        uses: actions/download-artifact@v4
        with:
          name: tikotalks-website-dist
          path: apps/website/web/dist

      - name: Deploy Pages project
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ vars.CLOUDFLARE_ACCOUNT_ID }}
          command: >-
            pages deploy apps/website/web/dist
            --project-name=${{ vars.TIKOTALKS_PAGES_PROJECT }}
            --branch=${{ needs.build.outputs.branch-name }}
```

Implementation notes:

1. If `@tiko-universe/website-web` is not the final package name, update both `npm --workspace` commands before committing the workflow.
2. Keep `development`, `main`, and `master` in the trigger until the production branch is confirmed; remove the unused production branch immediately after confirmation.
3. If GitHub Environments are unavailable, keep the branch gate and PR gate, and document that production approval is repository-policy based rather than environment-policy based.
4. `cloudflare/wrangler-action@v3` uses Wrangler under Node from the action environment. The build job still pins Node 22 because the repo requires Node 22+ for Vite/Wrangler work.

## Cloudflare Pages configuration

Configure the Pages project as either GitHub-connected or direct-upload. This plan uses direct upload from GitHub Actions so the repository controls build, test, and production gates in one workflow.

Recommended Pages settings:

- Project name: `tikotalks-website`.
- Production branch: `main` or `master` after confirmation.
- Preview/development branch: `development`.
- Build command in Cloudflare dashboard: leave empty or document as unused by direct-upload workflow.
- Build output directory in Cloudflare dashboard: `apps/website/web/dist` for clarity, even though GitHub Actions uploads directly.
- Environment variables in Cloudflare Pages: none for v1.

Custom-domain mapping:

- Attach `dev.tikotalks.com` to the Pages deployment for the `development` branch.
- Attach `tikotalks.com` and `www.tikotalks.com` to the production branch deployment.
- Keep preview URLs enabled for PR review if useful, but treat `dev.tikotalks.com` as the canonical dev review URL.

## Validation before enabling deploy

Run locally from `/home/hermes/workspace/tiko-universe` with Node 22+:

```bash
node -v
npm ci
npm --workspace @tiko-universe/website-web run test --if-present
npm --workspace @tiko-universe/website-web run build
test -f apps/website/web/dist/index.html
```

Expected results:

- `node -v` prints `v22.x` or newer.
- `npm ci` completes without lockfile changes.
- Website tests pass or are skipped only if no test script exists yet.
- Vite build writes `apps/website/web/dist/index.html`.

Then run workflow syntax validation if available:

```bash
npx -y actionlint .github/workflows/deploy-tikotalks-website.yml
```

Expected result: no actionlint errors.

## Validation after dev deploy

After a push to `development` triggers the workflow:

```bash
curl -I https://dev.tikotalks.com
curl -fsS https://dev.tikotalks.com | head
```

Expected results:

- HTTP status is `200`.
- HTML includes the site shell.
- The page title and meta description match the calm TikoTalks positioning.
- Primary links to public Tiko apps resolve to existing dev or production app URLs selected by the website implementation card.
- No auth/login/dashboard CTAs are visible in the child-first website entry.

## Validation after production promotion

Only after the PR from `development` to `main` or `master` is merged and the production workflow completes:

```bash
curl -I https://tikotalks.com
curl -I https://www.tikotalks.com
curl -fsS https://tikotalks.com | head
```

Expected results:

- Both production hostnames return `200` or an intentional `www` redirect to the apex.
- TLS is valid through Cloudflare.
- HTML matches the already-verified dev build for the promoted commit.
- No production deployment was run from the VPS.

## Cutover checklist

1. Confirm `tikotalks.com` zone exists in the target Cloudflare account.
2. Confirm whether production branch is `main` or `master`.
3. Create or confirm Pages project `tikotalks-website`.
4. Add GitHub secret `CLOUDFLARE_API_TOKEN`.
5. Add GitHub variables `CLOUDFLARE_ACCOUNT_ID` and `TIKOTALKS_PAGES_PROJECT`.
6. Add GitHub Environments `tikotalks-dev` and `tikotalks-production`; require approval on production if available.
7. Add the workflow file after the website app builds.
8. Merge workflow and website implementation to `development`.
9. Verify `https://dev.tikotalks.com`.
10. Open PR from `development` to production branch.
11. Merge only after dev verification and review.
12. Verify `https://tikotalks.com` and `https://www.tikotalks.com`.

## Plan author validation

Validation performed while preparing this plan:

```bash
node -v
npm run audit:doctrine
```

Observed results:

- `node -v` printed `v24.15.0`, satisfying the Node 22+ requirement.
- `npm run audit:doctrine` passed.
- No production deployment command was run.
- `npm run audit:doctrine` briefly refreshed `package-lock.json` because untracked early `apps/website/web` workspace files already exist in the checkout; that lockfile change was reverted and is not part of this plan.

## Risks and open decisions

1. Production branch is not confirmed in this plan. Confirm `main` vs `master` before enabling production deploy.
2. The current checkout has early untracked `apps/website/web` files, but the website app is not yet a complete Vite app with a committed build. Do not enable the workflow until the implementation card finishes that app.
3. Domain ownership and Cloudflare zone presence for `tikotalks.com` must be confirmed before custom-domain validation can pass.
4. If Cloudflare Pages direct-upload custom domains do not automatically bind branch aliases as expected, finish the first deploy with Pages dashboard domain mapping and document the exact mapping in this file.
5. Website copy must remain aligned with `docs/website/tikotalks-com-concept.md`: no pricing, dashboard, therapy claims, password framing, or login-first CTAs.
