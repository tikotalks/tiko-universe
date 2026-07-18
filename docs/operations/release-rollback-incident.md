# Release, Rollback & Incident Runbook

Operational runbook for the Tiko Universe platform (Cloudflare Pages apps + Workers).
This is the authoritative process for shipping, reverting, and responding to
incidents. It is deliberately concrete: follow the exact commands.

> Audit provenance: created for `TIKO-005` from the deep Sills audit
> (`Tiko/audit/2026-07-17` in `project-assets`), finding `REL-005` — the platform
> had no documented rollback, release, or incident process and no versioned
> release identity.

## Owners

- **Release owner / on-call:** Sil van Diepen (`me@sil.mt`). Update this line when
  ownership changes.
- Any agent or contributor may prepare a release or a revert PR; **production
  actions (deploy to `main`, `wrangler rollback`, D1 migrations) require the
  release owner's approval.**

## Environments

| Environment | Git branch | Trigger | Notes |
|---|---|---|---|
| Development | `development` | push to `development` | Default working environment. Dev Pages projects (`tiko-<app>-dev`) and dev Workers. |
| Production | `main` | push to `main` | Public domains. Guarded by the full CI gate (see below). |

Deploys are driven by `.github/workflows/deploy.yml` with per-app/per-worker
change detection. As of `TIKO-004`, `deploy-apps` and `deploy-workers` require
`verify` (`npm run check` + build) **and** the `admin-e2e` / `app-e2e` jobs to
pass before anything ships.

## 1. Release process

### 1.1 Standard release (development → production)

1. Merge work into `development`; confirm the `CI` and `Deploy` workflows are green
   and the change is verified in the dev environment.
2. Open a promotion PR from `development` into `main` (or fast-forward `main` if the
   team uses a linear flow). Confirm CI is green on the PR.
3. **Tag the release before merging to `main`** (see §1.2). The release owner
   approves and merges. The push to `main` triggers `deploy.yml`, which:
   - runs `detect-changes` (selective vs deploy-all when shared packages change);
   - runs the full gate (`verify` + `admin-e2e` + `app-e2e`);
   - applies per-worker D1 migrations for changed workers (`app-api`,
     `generation-api`, `media-api`) — **forward-only**, see §3;
   - deploys changed Pages projects and Workers.
4. Record the release in the tag/release notes (§1.2) and verify production.

### 1.2 Versioned release identity

Deploys currently carry only the commit SHA (`deploy <app> from <sha>`), which
makes "what is in production" hard to state. Adopt lightweight semver tags:

```bash
# On the exact commit being promoted to main:
git tag -a v2026.07.0 -m "Release v2026.07.0: <summary>"
git push origin v2026.07.0
```

- Use `vYYYY.MM.N` (calendar) or `vMAJOR.MINOR.PATCH` (semver) — pick one and keep
  it. Record the tag, the SHA, the changed apps/workers, and any migrations in the
  GitHub Release notes for that tag.
- The tag is the unit you roll back **to** (§2). Never reuse or move a tag.
- Follow-up (tracked, not required for this card): have `deploy.yml` stamp the
  nearest tag into the Pages/Workers deploy message and the app build info
  (`tools/vite-plugin-deploy-info.mjs`) so the running version is self-reporting.

### 1.3 Pre-release checklist

- [ ] CI green on the release commit (lint, scaffold-check, typecheck, unit, e2e, build).
- [ ] Dev environment exercised for the changed surface.
- [ ] Migrations reviewed and known to be forward-only and backward-compatible (§3).
- [ ] Release tag created and pushed.
- [ ] Release owner approval recorded.

## 2. Rollback procedures

Decide scope first: a single app, a single worker, or the whole release. Roll back
the smallest thing that restores service.

### 2.1 Cloudflare Workers (fastest — instant version rollback)

Workers keep immutable versions; roll back without rebuilding:

```bash
cd workers/<worker>
npx wrangler deployments list --env production      # find the last-good version id
npx wrangler rollback --env production              # roll back to the previous version
# or target a specific version:
npx wrangler rollback <version-id> --env production
```

Verify the worker's health endpoint after rollback.

### 2.2 Cloudflare Pages apps

```bash
npx wrangler pages deployment list --project-name tiko-<app>
# Promote the previous good deployment in the Cloudflare dashboard
# (Pages → project → Deployments → "…" → Rollback), or redeploy the previous build:
git checkout <previous-good-sha> -- apps/<app>/web   # or check out the tag
npm run build --workspace=apps/<app>/web
npx wrangler pages deploy apps/<app>/web/dist --project-name tiko-<app> --branch main
```

### 2.3 Whole-release rollback (git revert — preferred, auditable)

For anything non-trivial, revert through git so history and re-deploy stay in sync:

```bash
git checkout main && git pull --ff-only
git revert --no-edit <bad-merge-or-sha>     # use -m 1 for a merge commit
git push origin main                        # re-triggers deploy.yml with the reverted state
```

`git revert` re-runs the full gate and redeploys only changed surfaces. Prefer it
over force-pushing; **never force-push `main`**.

### 2.4 What is NOT auto-reversible

- **D1 schema/data migrations** (§3) — require a compensating forward migration.
- **R2 object writes / deletions** — not reverted by a code rollback.
- **Secrets rotations** — track and re-apply separately.

Rolling back code does not undo these; assess data impact explicitly during an
incident.

## 3. Database (D1) migrations

Migrations are **forward-only** and applied automatically during deploy for
`app-api`, `generation-api`, and `media-api`.

- Write migrations to be **backward-compatible** with the currently running code
  (add columns/tables; avoid destructive `DROP`/`ALTER` in the same release as the
  code that depends on them — use an expand → migrate → contract sequence across
  releases).
- To "undo" a migration, author a new compensating migration; do not hand-edit
  production D1.
- Test migrations against a dev database first. Note the open audit finding that
  dev and production D1 are not yet isolated (`TIKO-001`) — until that is fixed,
  treat every `--remote` migration as touching production data and get explicit
  release-owner sign-off.

## 4. Incident response

### 4.1 Severity

| Sev | Definition | Response |
|---|---|---|
| SEV-1 | Child-facing outage or data exposure/corruption | Immediate rollback; page the release owner now. |
| SEV-2 | Major feature broken, no data risk | Roll back the affected app/worker; notify owner. |
| SEV-3 | Minor/degraded, workaround exists | Fix forward in the next release. |

Children's data (identity, communication content) is the highest-sensitivity
surface — treat any suspected exposure as SEV-1.

### 4.2 Steps

1. **Detect & declare.** State severity and the affected surface. (Detection today
   is manual — observability is not yet configured; see `TIKO-006`, a dependency
   for reliable detection and alerting.)
2. **Stabilise.** Roll back the smallest failing unit (§2). Restoring service beats
   diagnosing.
3. **Assess data impact.** For anything touching D1/R2 or identity, determine
   whether data was written/exposed (§2.4, §3).
4. **Communicate.** Notify the release owner and affected users if there is user
   impact.
5. **Verify recovery.** Confirm health endpoints and the affected user journey.
6. **Post-incident.** Within 48h, write a short post-mortem (timeline, root cause,
   the compensating migration if any, and the follow-up task) and file a linked
   task on the board. Do not silently reopen; create a new tracked task.

## 5. Quick reference

```bash
# Roll back a worker instantly
cd workers/<worker> && npx wrangler rollback --env production

# Roll back a release via git (auditable, redeploys changed surfaces)
git revert --no-edit <sha> && git push origin main

# List worker versions / pages deployments
npx wrangler deployments list --env production
npx wrangler pages deployment list --project-name tiko-<app>
```

## Related

- Deploy pipeline: `.github/workflows/deploy.yml`, `.github/workflows/ci.yml`
- Cloudflare wiring: `docs/cloudflare/dev-infra-wiring-plan.md`, `docs/cloudflare/domain-strategy.md`
- Data isolation: `docs/cloudflare/data-isolation.md` (`TIKO-001`)
- Observability (dependency for detection): `TIKO-006`
