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

Owns TTS, sentence generation, image generation, and asynchronous generation queues.

### `admin-api`

Owns dangerous/admin-only operations: reports, removal, moderation, support tooling.

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
