# API-First Platform Architecture

## Goal

Make Tiko a small Cloudflare platform with web, iOS, and Android clients consuming the same API contracts.

For the authoritative P0 build order, service ownership map, shared envelope rules, and Yes No/Type foundation contracts, see `docs/architecture/p0-foundation-contract-map.md`.

## High-level architecture

```text
Web Vue apps        SwiftUI iOS apps        Jetpack Compose Android apps
     |                    |                         |
     +--------------------+-------------------------+
                          |
                    HTTPS JSON APIs
                          |
  identity-api   app-api   content-api   media-api   generation-api   admin-api
       |           |           |            |              |             |
      D1          D1          D1/KV        R2/D1         Queues/R2       D1
```

## Worker ownership

### `identity-api`

Owns users, devices, sessions, magic links, and recovery.

Initial endpoints:

- `POST /v1/identity/device`
- `GET /v1/identity/session`
- `POST /v1/identity/email`
- `POST /v1/identity/magic-links/verify`
- `POST /v1/identity/logout`

### `app-api`

Owns user-scoped app state and settings for small Tiko apps.

Initial endpoints:

- `GET /v1/apps/:app/settings`
- `PUT /v1/apps/:app/settings`
- `GET /v1/apps/:app/state`
- `PUT /v1/apps/:app/state`

### `content-api`

Owns published content, curriculum/content documents, CMS-like entries, and cacheable read models.

### `media-api`

Owns upload authorization, media metadata, user media, and R2 object access.

### `generation-api`

Owns TTS, image generation, story generation, and asynchronous generation queues. (Sentence building is owned by `sentence-api`, not here.)

### `admin-api`

Owns dangerous/admin-only operations: reports, removal, moderation, support tooling.

### `atlas-api`

Data/AI gateway: gated capability access, usage/observability, and audit logging in front of downstream providers (see `docs/architecture/atlas.md`).

### `communication-api`

Owns inbound/outbound communication (e.g. inbound email) and related messaging surfaces.

### `sentence-api`

Owns Talk sentence building: user phrases, learned words/affinity, and sentence assembly (see `docs/adrs/2026-06-05-talk-app-and-sentence-api-domains.md`).

### `translations-api`

Lezu-backed translation delivery: cached per-app/per-language bundles consumed by `@tiko/i18n`.

### `tts-api`

Temporary compatibility shim for legacy `/generate` and `/audio` proof-app calls; new clients use `generation-api`. Slated for removal once callers migrate.

> This ownership list must track the `workers/` directory. Current workers:
> `admin-api`, `app-api`, `atlas-api`, `communication-api`, `content-api`,
> `generation-api`, `identity-api`, `media-api`, `sentence-api`,
> `translations-api`, `tts-api` (plus the shared `workers/shared` library).

## Client packages

- `@tiko/identity`: browser identity client and shared TypeScript contracts.
- `@tiko/data`: app data/settings clients and app-specific typed models.
- `@tiko/i18n`: Lezu-backed translation loader with checked-in fallback support.
- `@tiko/media`: media upload/download contract helpers.
- `@tiko/testing`: contract tests, smoke helpers, and fixtures.

Native clients must use the same OpenAPI contract. Swift and Kotlin models may be generated later from `docs/api/openapi.yaml` or maintained manually while the API is small.

## API rules

- Version API paths with `/v1`.
- Return JSON only from API routes.
- Use explicit error shapes.
- Never leak whether a recovery email/handle exists.
- Store tokens as hashes server-side.
- Do not assume browser-only cookies for native clients.
- Support bearer session tokens for native clients.
- Use HttpOnly Secure cookies where web needs them, but keep explicit token exchange available for native apps.
