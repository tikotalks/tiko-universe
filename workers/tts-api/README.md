# TTS API

Temporary compatibility Worker for the original Yes No proof-app speech routes.

TTS ownership has moved to Atlas. New web, iOS, and Android clients must use the Atlas speech contract:

- `POST /v1/atlas/speech`
- `GET /v1/atlas/assets/{id}`

## Compatibility contract

This Worker keeps the old routes during one transition window only:

- `POST /generate`
  - body: `{ "text": string, "language": string, "provider"?: "openai" | "azure" | "auto", "voice"?: string, "model"?: string, "speed"?: number, "pitch"?: number }`
  - returns legacy metadata: `{ "success": true, "audioUrl": string, "cached": boolean }`
  - existing legacy cache hits are returned from D1/R2.
  - cache misses are routed to Atlas without provider, model, or voice hints.
  - if Atlas is not configured, returns a clear non-2xx error so clients can fall back to platform speech.
- `GET /audio?key=audio/<hash>.mp3`
  - returns cached audio bytes from R2 with immutable cache headers.

## Doctrine

- Do not add new product behavior here.
- D1 stores legacy metadata only for audio already generated through this compatibility worker.
- R2 stores legacy MP3 bytes only for existing `/audio` URLs.
- Atlas is the source of truth for new speech generation, caching, and provider selection.
- Remove this worker after all clients stop using `/generate` and `/audio`.

## Bindings expected

- `TTS_DB` — D1 database with `tts_audio` table.
- `AUDIO_BUCKET` — R2 bucket for legacy generated audio.
- `ATLAS_SERVICE` — service binding for the Atlas worker.
- `ATLAS_API_KEY` — service key with `atlas.run`, configured as a worker secret, never committed.

## Validation

```bash
npm run typecheck -w @tiko-worker/tts-api
```
