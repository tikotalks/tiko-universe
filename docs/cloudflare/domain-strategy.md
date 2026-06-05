# Tiko Universe — Domain & Route Strategy

## Account

Cloudflare account: `8cef251b5fdcf6c6f63db98b7aa49f9a` (`Me@sil.mt's Account`).

## Zone inventory

| Zone | Purpose | Zone ID | Status |
| --- | --- | --- | --- |
| `tikoapi.org` | API services | (TBD) | Must be added to account |
| `tiko.mt` | Identity service | (TBD) | Must be added to account |
| `tikoapps.org` | Web app frontends (Pages) | (TBD) | Must be added to account |

## Production domain mapping

### API gateway workers (behind `api.tikoapi.org`)

These workers share a single consolidated API domain with path-based routing. A single Worker route on `tikoapi.org` maps `api.tikoapi.org/*` to each worker by path prefix.

| Worker | Worker Name | Route Pattern | Custom Domain |
| --- | --- | --- | --- |
| identity-api | `tiko-identity-api` | `api.tikotalks.com/v1/identity/*` | `id.tiko.mt` |
| app-api | `tiko-app-api` | `api.tikotalks.com/v1/apps/*` | — (path route) |
| generation-api | `tiko-generation-api` | `api.tikotalks.com/v1/generation/*` | — (path route) |
| content-api | `tiko-content-api` | `api.tikotalks.com/v1/content/*` | — (path route) |

### Dedicated subdomain workers

| Worker | Worker Name | Route Pattern | Custom Domain |
| --- | --- | --- | --- |
| media-api | `tiko-media-api` | `media-api.tikotalks.com/*` | `media-api.tikotalks.com` |
| admin-api | `tiko-admin-api` | `admin-api.tikotalks.com/*` | `admin-api.tikotalks.com` |
| tts-api (temp) | `tiko-tts-api` | `tts.tikotalks.com/*` | `tts.tikotalks.com` |

### Web apps (Cloudflare Pages)

| App | Domain |
| --- | --- |
| Website | `tiko.mt`, `www.tiko.mt` |
| Yes No | `yesno.tikoapps.org` |
| Type | `type.tikoapps.org` |
| Cards | `cards.tikoapps.org` |
| Sequence | `sequence.tikoapps.org` |
| Timer | `timer.tikoapps.org` |
| Media Gallery | `media.tikoapps.org` |
| Admin Dashboard | `admin.tikoapps.org` |

### Dev/staging domains

| Worker | Dev Route |
| --- | --- |
| identity-api | `dev.api.tikotalks.com/v1/identity/*` |
| app-api | `dev.api.tikotalks.com/v1/apps/*` |
| generation-api | `dev-api.tikotalks.com/v1/generation/*` |
| media-api | `media-api.tikotalks.com/*` (uses `-dev` suffix worker name) |
| content-api | `dev.api.tikotalks.com/v1/content/*` |
| admin-api | `dev.admin-api.tikotalks.com/*` |
| tts-api (temp) | `dev.tts.tikotalks.com/*` |

## Wrangler.toml configuration

### Production workers (no `workers_dev`)

Production workers remove `workers_dev = true` and add route/custom_domain entries:

```toml
# Route-based (path on shared domain)
routes = [
  { pattern = "api.tikotalks.com/v1/apps*", zone_name = "tikotalks.com" }
]

# Custom domain (dedicated subdomain)
custom_domains = ["media-api.tikotalks.com"]
```

### Dev workers (keep `workers_dev = true`)

Dev workers keep `workers_dev = true` for `*.workers.dev` access during development. Dev-specific routes are optional and can be added later for stable preview URLs.

### Environment separation

Each worker should use `[env.production]` overrides or separate wrangler.toml files for production vs dev. Current approach: workers with `-dev` suffix names serve as dev deployments; production workers drop the suffix.

## Worker name convention

| Scope | Pattern | Example |
| --- | --- | --- |
| Dev | `tiko-{service}-api-dev` | `tiko-identity-api-dev` |
| Production | `tiko-{service}-api` | `tiko-identity-api` |

## Prerequisites for production deployment

1. Add zones `tikoapi.org`, `tiko.mt`, `tikoapps.org` to the Cloudflare account
2. Configure DNS records (or use Cloudflare Registrar if applicable)
3. Remove `workers_dev = true` from production worker configs
4. Add routes/custom_domains to production wrangler.toml
5. Deploy via GitHub Actions (never direct wrangler deploy to production)

## Cross-worker URL references

Workers reference each other via environment variables set in `wrangler.toml` `[vars]`:

| Variable | Default | Used by |
| --- | --- | --- |
| `IDENTITY_BASE_URL` | `https://api.tikotalks.com/v1` | app-api, admin-api, media-api, shared auth |
| `APP_API_URL` | `https://api.tikotalks.com/v1/apps` | admin-api |
| `GENERATION_API_URL` | `https://api.tikotalks.com/v1/generation` | admin-api |
| `MEDIA_API_URL` | `https://media-api.tikotalks.com/v1` | admin-api |
| `MAGIC_LINK_BASE_URL` | `https://api.tikotalks.com/v1/identity/magic` | identity-api |
