# admin-api

Admin-only Cloudflare Worker for Tiko Media dashboard bootstrap and dangerous/admin operations.

## Auth

The dashboard is intentionally restricted to the configured admin email only:

- Default/configured email: `me@sil.mt`
- Requires a real identity session bearer token
- API keys are rejected for browser dashboard access
- The Worker hashes the configured email using `TOKEN_PEPPER` and compares against `AUTH_DB.users.email_hash`

## Routes

- `GET /v1/admin/health` — public health check
- `GET /v1/admin/me` — returns authenticated admin identity
- `GET /v1/admin/config` — returns safe public service URLs for the admin UI

## Required bindings/secrets

- `AUTH_DB` — identity D1 database
- `TOKEN_PEPPER` — same secret as identity-api
- `ADMIN_EMAIL` — optional override, defaults to `me@sil.mt`
