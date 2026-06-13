# TTS API

Compatibility worker for old speech routes.

TTS ownership has moved to Atlas. New web, iOS, and Android clients must use the Atlas speech contract:

- `POST /v1/atlas/speech`
- `GET /v1/atlas/assets/{id}`

## Contract

This Worker keeps one old route during migration:

- `POST /generate`
  - body: `{ "text": string, "language": string, "provider"?: "openai" | "azure" | "auto", "voice"?: string, "model"?: string, "speed"?: number, "pitch"?: number }`
  - returns `{ "success": true, "audioUrl": string, "cached": boolean }`
  - all valid requests are routed to Atlas without provider, model, or voice hints.
  - if Atlas is not configured, returns a clear non-2xx error so clients can fall back to platform speech.
- `GET /audio` is not served by this worker.

## Doctrine

- Do not add new product behavior here.
- Atlas is the source of truth for new speech generation, caching, and provider selection.
- Remove this worker after all clients stop using `/generate`.

## Bindings expected

- `AUTH_DB` — D1 database for API key authentication.
- `ATLAS_SERVICE` — service binding for the Atlas worker.
- `ATLAS_API_KEY` — service key with `atlas.run`, configured as a worker secret, never committed.

## Validation

```bash
npm run typecheck -w @tiko-worker/tts-api
```
