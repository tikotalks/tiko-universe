# identity-api

Cloudflare Worker for Tiko's device-first identity foundation.

## Runtime

- Durable data lives in D1 through the `IDENTITY_DB` binding.
- `TOKEN_PEPPER` is required and must be set as a Wrangler secret; it is used to hash session, device, email, and magic-link tokens before storage.
- `ALLOWED_ORIGINS` is an optional comma-separated CORS allowlist. `*` is allowed for local/dev defaults.
- `MAGIC_LINK_BASE_URL` controls the app URL used when a future email provider sends recovery links.

## Endpoints

The Worker implements the identity paths from `docs/api/openapi.yaml`:

- `POST /v1/identity/device` creates a device-first user or restores an existing device credential.
- `GET /v1/identity/session` returns the current bearer session.
- `POST /v1/identity/email` returns a generic recovery response without disclosing whether an email exists.
- `POST /v1/identity/magic-links/verify` consumes a magic-link token and returns a new session bundle.
- `POST /v1/identity/logout` revokes the current bearer session.

## Local checks

```sh
npm test -- tests/identity-api.test.ts
npm run typecheck -w @tiko-worker/identity-api
PATH=$HOME/.local/node22/bin:$PATH npm run deploy:dry-run -w @tiko-worker/identity-api
```

The D1 schema is in `migrations/0001_identity.sql`.
