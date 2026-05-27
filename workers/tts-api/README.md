# TTS API

Cache-first Cloudflare Worker contract for Tiko speech audio.

This is the API-first replacement for the old `workers/tts-generation` service in `tiko-mono`.

## Contract

- `POST /generate`
  - body: `{ "text": string, "language": string, "provider"?: "openai" | "azure" | "auto", "voice"?: string, "model"?: string, "speed"?: number, "pitch"?: number }`
  - returns: `{ "success": true, "audioUrl": string, "cached": boolean }`
- `GET /audio?key=audio/<hash>.mp3`
  - returns cached audio bytes from R2 with immutable cache headers.

## Doctrine

- D1 stores metadata and is the durable source of truth for generated audio records.
- R2 stores MP3 bytes.
- The text/language/provider/voice/model/speed/pitch hash is the cache key.
- Yes/No labels, custom prompt sentences, and future custom cards all go through the same endpoint.
- If generation is unavailable, clients may fall back to browser speech, but generated/cached audio remains the preferred path.

## Bindings expected

- `TTS_DB` — D1 database with `tts_audio` table.
- `AUDIO_BUCKET` — R2 bucket for generated audio.
- `OPENAI_API_KEY` / Azure secrets — configured as worker secrets, never committed.
