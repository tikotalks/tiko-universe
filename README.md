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
apps/
  web/          Vue clients per app
  ios/          SwiftUI native clients
  android/      Jetpack Compose native clients
packages/
  identity/     shared API contracts and web client
  data/         app data clients and typed contracts
  i18n/         Lezu/local fallback wrapper
  media/        media contracts and clients
  ui/           Tiko product UI for web
  testing/      shared smoke/contract helpers
workers/
  identity-api/
  app-api/
  content-api/
  media-api/
  generation-api/
  admin-api/
docs/
  doctrine/
  architecture/
  api/
  apps/
  migration/
```

## Generation and TTS

TTS now belongs to `workers/generation-api` under the versioned platform contract:

- `POST /v1/generation/tts` accepts `{ text, language, provider?, voice?, model?, speed?, pitch? }`.
- Responses use `{ data, meta }`, where `data.audioUrl` points to `GET /v1/generation/audio/{id}` and `meta.cached` reports D1 cache hits.
- D1 binding `GENERATION_DB` owns generated-audio metadata and request hashes.
- R2 binding `GENERATED_MEDIA_BUCKET` owns generated audio bytes.
- `workers/tts-api` is temporary compatibility for old `/generate` and `/audio?key=...` proof-app calls only.

New clients should consume the OpenAPI contract in `docs/api/openapi.yaml`; web fallback behavior remains in `@tiko/ui` while shared TTS request/response models live in `@tiko/media`.

## Development doctrine

Start every feature with:

1. Contract
2. Test
3. Minimal implementation
4. Client integration
5. Browser/API smoke
6. Native parity check when relevant

See `docs/doctrine/DOCTRINE.md` and `docs/architecture/api-first-platform.md`.
