# app-api

Cloudflare Worker for user-scoped Tiko app settings and state.

Implemented routes:

- `GET /v1/apps/:app/settings`
- `PUT /v1/apps/:app/settings`
- `GET /v1/apps/:app/state`
- `PUT /v1/apps/:app/state`

Supported app ids: `yes-no`, `type`, `cards`, `sequence`, `timer`.

The worker requires a bearer session token issued by `identity-api`. It verifies the token against the shared identity D1 tables using the same `TOKEN_PEPPER`, then stores app data in the `APP_DB` D1 binding. D1 remains the source of truth; KV is not used.

Writes accept `{ settings, version? }` or `{ state, version? }`. When `version` is supplied it must match the stored version; mismatches return `409 version_conflict`.
