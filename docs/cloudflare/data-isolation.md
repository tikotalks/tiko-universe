# Cloudflare Data Isolation

Tiko deploys `development` and `production` from the same repository, but their
runtime data must not share mutable stores. Worker names, routes, D1 databases,
KV namespaces, and R2 buckets should all be environment-specific unless a store
is explicitly read-only global reference data.

## Current State

As of 2026-06-12, Cloudflare has these D1 databases available in the main Tiko
account:

| Database | Intended use | Notes |
| --- | --- | --- |
| `tiko-db` | production app data, legacy shared tables | Still reused by several dev workers. |
| `tiko-identity` | production identity | Still reused by dev identity/auth bindings. |
| `tiko-image-generation` | production generation/TTS | Still reused by dev generation/TTS bindings. |
| `tiko-media` | production media metadata | Still reused by dev media metadata. |
| `tiko-content` | production content | Isolated from dev. |
| `tiko-content-staging` | development content | Isolated from production. |
| `tiko-assets` | production assets | Isolated from dev. |
| `tiko-assets-dev` | development assets | Isolated from production. |
| `tiko-auth` | legacy auth | Not used by current wrangler bindings. |
| `dislist-db` | unrelated/legacy | Not used by current wrangler bindings. |

KV has separate production/development namespaces for Atlas, Translations, and
Sentence cache. Content cache still needs a separate production namespace or a
separate development namespace; currently both content environments bind the
same namespace.

## Required D1 Resources

Create or assign real D1 databases before checking off the review task. Do not
put placeholder UUIDs in `wrangler.toml`.

| Binding area | Development database | Production database |
| --- | --- | --- |
| App state/settings | `tiko-app-dev` | `tiko-app` or current `tiko-db` |
| Identity/auth | `tiko-identity-dev` | `tiko-identity` |
| Atlas/cache index | `tiko-atlas-dev` | `tiko-atlas` or a clearly owned production DB |
| Generation/TTS | `tiko-generation-dev` | `tiko-generation` |
| Sentence/Talk | `tiko-sentence-dev` | `tiko-sentence` |
| Communication | `tiko-communication-dev` | `tiko-communication` |
| Media metadata | `tiko-media-dev` | `tiko-media` |

The current account appears to be at its D1 database limit. Either increase the
limit or explicitly retire unused databases before provisioning the missing dev
databases. Do not repoint a worker to a legacy database unless its schema has
been verified and migrated.

## Deployment Rules

- Dev deploys must never run schema or seed files against a production/shared
  remote database.
- Production deploys must never be provisioned by dev scripts.
- `scripts/cloudflare/provision-talk-dev.mjs` is dev-only. It must not edit any
  `[env.production]` binding.
- `wrangler.toml` files should use real IDs from `wrangler d1 list` and
  `wrangler kv namespace list`.
- If a worker is blocked on missing Cloudflare resources, skip deployment with a
  clear message rather than deploying against shared production data.

## Verification

Run these before checking the review task off:

```bash
npx wrangler d1 list
npx wrangler kv namespace list
rg -n 'database_id = "|id = "' workers -g wrangler.toml
```

For every mutable binding, confirm the top-level dev environment and
`[env.production]` point at different resource IDs.
