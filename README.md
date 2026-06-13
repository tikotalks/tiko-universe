# Tiko Universe

API-first clean rebuild of Tiko: child-facing web, iOS, and Android apps backed by a small Cloudflare platform.

## Mission

Tiko helps children communicate, learn, and practice through calm, immediate, accessible tools. Apps must open and work immediately. Identity is device-first and invisible until a caregiver chooses recovery.

## Current priority order

1. Yes No
2. Type
3. Cards
4. Sequence
5. Timer

## Repository status

This repo is the future active home for Tiko platform work. `tiko-mono` remains the frozen reference implementation until each app/domain is intentionally migrated and verified.

## First principles

- API first, not frontend first.
- Apps are clients, not backend owners.
- No passwords.
- No login walls.
- No old-user or old-data migration constraint unless Sil explicitly reverses that.
- Cloudflare owns runtime: Workers, D1, R2, KV-as-cache, Queues.
- Lezu owns translation management.
- Tiko UI remains product-specific.
- Web, iOS, and Android consume the same documented contracts.

## Structure

```text
apps/<product>/<platform>/   Product-first apps: web, iOS, Android wrappers where present
packages/                    Shared TS packages plus Swift TikoKit
workers/                     Cloudflare Workers by bounded backend domain
docs/                        Doctrine, architecture, API contracts, app specs, plans
tools/                       Codegen, scaffold checks, Android wrapper helpers
tests/                       Root contract and worker tests
```

Current web workspaces are `admin`, `cards`, `media`, `radio`, `sequence`, `talk`, `timer`, `todo`, `type`, `website`, and `yes-no`. Native iOS projects and Android wrappers are present per app where implemented; Android wrappers are Capacitor shells for now, not Jetpack Compose clients.

## Generation and TTS

TTS now belongs to `workers/generation-api` under the versioned platform contract:

- `POST /v1/generation/tts` accepts `{ text, language, provider?, voice?, model?, speed?, pitch? }`.
- Responses use `{ data, meta }`, where `data.audioUrl` points to `GET /v1/generation/audio/{id}` and `meta.cached` reports D1 cache hits.
- D1 binding `GENERATION_DB` owns generated-audio metadata and request hashes.
- R2 binding `GENERATED_MEDIA_BUCKET` owns generated audio bytes.
- `workers/tts-api` is temporary compatibility for old `/generate` and `/audio?key=...` proof-app calls only.

New clients should consume the OpenAPI contract in `docs/api/openapi.yaml`; web fallback behavior remains in `@tiko/ui` while shared TTS request/response models live in `@tiko/media`.

## Contract and smoke testing

`@tiko/testing` contains shared helpers for API contract tests: JSON request builders, bearer/session fixtures, Cloudflare-style D1/R2 mocks, JSON/error envelope assertions, and Yes-No proof-app smoke checklist helpers.

Useful commands:

- `npm run test:contracts` — identity-api, app-api, generation/TTS, and shared harness contracts.
- `npm run test:services` — alias for the service contract suite.
- `npm run test -w @tiko/testing` — shared testing package contract tests only.
- `npm run typecheck -w @tiko/testing` — shared testing package typecheck.

Manual/proof-app smoke evidence for Yes-No belongs in `docs/apps/yes-no-smoke-checklist.md`.

## Development doctrine

Start every feature with:

1. Contract
2. Test
3. Minimal implementation
4. Client integration
5. Browser/API smoke
6. Native parity check when relevant

See `docs/doctrine/DOCTRINE.md` and `docs/architecture/api-first-platform.md`.
