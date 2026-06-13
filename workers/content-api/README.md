# content-api

D1-backed Cloudflare Worker for published Tiko content read models.

## Runtime bindings

- `CONTENT_DB` — D1 database `tiko-content-db-dev`, source of truth for content records.
- `CONTENT_CACHE` — KV namespace `tiko-content-cache-dev`, cache only for published read responses.
- `ALLOWED_ORIGINS` — comma-separated CORS allowlist.

## Public endpoints

- `GET /health` / `GET /healthz`
- `GET /v1/projects`
- `GET /v1/projects/:slug`
- `GET /v1/pages?projectSlug=<slug>&languageCode=en`
- `GET /v1/pages/:slug?projectSlug=<slug>&languageCode=en`
- `GET /v1/languages`

## Validation

```bash
npm --workspace @tiko-worker/content-api run typecheck
npm --workspace @tiko-worker/content-api run test
npm --workspace @tiko-worker/content-api run deploy:dry-run
```

Admin writes and CMS moderation belong in `admin-api`, not this public read worker.
