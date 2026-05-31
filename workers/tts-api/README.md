# TTS API

Temporary compatibility Worker for the original Yes No proof-app speech routes.

TTS ownership has moved to `workers/generation-api` for P0. New web, iOS, and Android clients must use the versioned generation contract documented in `docs/api/openapi.yaml`:

- `POST /v1/generation/tts`
- `GET /v1/generation/audio/{id}`

## Compatibility contract

This Worker keeps the old routes during one transition window only:

- `POST /generate`
  - body: `{ "text": string, "language": string, "provider"?: "openai" | "azure" | "auto", "voice"?: string, "model"?: string, "speed"?: number, "pitch"?: number }`
  - returns legacy metadata: `{ "success": true, "audioUrl": string, "cached": boolean }`
  - cache misses generate OpenAI MP3 audio when `OPENAI_API_KEY` is configured.
  - if generation is not configured, returns a clear non-2xx error so clients can fall back to browser speech.
- `GET /audio?key=audio/<hash>.mp3`
  - returns cached audio bytes from R2 with immutable cache headers.

## Doctrine

- Do not add new product behavior here.
- D1 stores legacy metadata and is the durable source of truth for this compatibility worker while it exists.
- R2 stores MP3 bytes.
- The text/language/provider/voice/model/speed/pitch hash is the legacy cache key.
- Remove this worker after Yes No web/iOS and Type use the generation API contract.

## Bindings expected

- `TTS_DB` — D1 database with `tts_audio` table.
- `AUDIO_BUCKET` — R2 bucket for generated audio.
- `OPENAI_API_KEY` — configured as a worker secret, never committed.

## Validation

```bash
npm run typecheck -w @tiko-worker/tts-api
```
