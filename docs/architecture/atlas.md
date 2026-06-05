# Atlas Data Gateway

> **Status:** P0 scaffold spec
> **Owner:** Tiko platform
> **Runtime:** Cloudflare Workers

## Purpose

Atlas is Tiko's unified gateway for data, knowledge, generation, and provider-backed intelligence.

Short rule:

> If a Tiko service needs data, knowledge, generation, model output, provider-backed metadata, or derived intelligence — and should not care where it comes from — it asks Atlas.

Atlas receives intent, not vendor instructions. Callers describe the capability and context they need. Atlas chooses the source, provider, model, cache strategy, fallback, safety policy, and normalized response shape.

## Scope

Atlas handles:

- AI/model routing through Cloudflare Workers AI, OpenAI, and future providers.
- Text generation, summarization, classification, moderation, and embeddings.
- Speech synthesis/TTS routing and cached audio assets.
- Image generation routing and generated image assets.
- Provider-backed metadata and external data lookups, such as YouTube metadata, URL metadata, RSS, maps, or weather.
- Request audit logs, provider status, cache records, and estimated cost tracking.
- Service-level policy: auth, allowed apps, allowed purposes, cost class, cacheability, and fallback rules.

Atlas does **not** replace canonical domain APIs:

- `identity-api` owns identity and sessions.
- `app-api` owns app settings/state.
- `content-api` owns canonical content records.
- `media-api` owns media library metadata and upload policy.
- `translations-api` owns Lezu/i18n delivery.

Atlas may call or coordinate with those services when resolving a data request, but it should not become the source of truth for their domain data.

## Architecture

```txt
Tiko apps and workers
  ↓
packages/atlas client
  ↓
workers/atlas-api
  ↓
Capability registry + route resolver
  ↓
Provider/source adapters
  - Tiko internal services
  - Cloudflare Workers AI
  - OpenAI
  - ElevenLabs
  - YouTube / URL metadata / future data providers
  ↓
D1 audit/config + KV cache + R2 derived assets
```

## Repository Layout

```txt
workers/atlas-api/
  src/
    index.ts
    types.ts
    response.ts
    capabilities/
      registry.ts
  migrations/
    0001_atlas_gateway.sql
  package.json
  wrangler.toml

packages/atlas/
  src/
    index.ts
    client.ts
    types.ts
  package.json
  tsconfig.json
```

Future implementation slices should add domain modules rather than expanding `index.ts`:

```txt
workers/atlas-api/src/domains/speech.ts
workers/atlas-api/src/domains/images.ts
workers/atlas-api/src/domains/text.ts
workers/atlas-api/src/domains/data.ts
workers/atlas-api/src/adapters/cloudflare-ai.ts
workers/atlas-api/src/adapters/openai.ts
workers/atlas-api/src/adapters/elevenlabs.ts
workers/atlas-api/src/cache/r2-assets.ts
workers/atlas-api/src/audit/usage-log.ts
```

## Capability Model

P0 capabilities:

```ts
export type AtlasCapability =
  | 'speech.synthesize'
  | 'image.generate'
  | 'text.generate'
  | 'text.classify'
  | 'data.fetch'
  | 'metadata.lookup'
```

Future capabilities:

```ts
export type FutureAtlasCapability =
  | 'text.summarize'
  | 'text.translate-assist'
  | 'embedding.create'
  | 'moderation.check'
  | 'knowledge.retrieve'
  | 'search.web'
  | 'story.generate'
  | 'story.renderAudio'
```

## API Surface

Preferred long-term public surface:

```txt
https://api.tikotalks.com/v1/atlas/*
```

Optional service domain if needed:

```txt
https://atlas.tikoapi.org/v1/*
```

P0 routes:

```txt
GET  /v1/atlas/health
GET  /v1/atlas/capabilities
POST /v1/atlas/run
```

Planned typed routes:

```txt
POST /v1/atlas/speech
POST /v1/atlas/images
POST /v1/atlas/text
POST /v1/atlas/data/fetch
```

Typed routes are preferred for product/client code. `/run` exists for internal service orchestration and future advanced capability calls.

## Auth Policy

- `GET /health`: public.
- `GET /capabilities`: public safe subset now; admin/service details later.
- `POST /run`: service or session auth depending on capability policy.
- Expensive or dangerous capabilities, especially image generation and open-ended text generation, require admin or service auth.
- Child-facing apps must never receive provider keys or raw provider error payloads.

## Cache Policy

- Speech: cache aggressively by normalized text, locale, voice/model/provider, speed, and output format. Store bytes in R2 and metadata in D1.
- Images: store generated outputs in R2/media flow; avoid returning cached creative generations unless explicitly requested.
- Text: default no cache; allow deterministic classification/summarization cache only with explicit policy.
- External data: source-specific TTLs. YouTube metadata and geocoding may cache longer; weather/RSS cache shorter.

## Provider Policy

Cloudflare Workers AI is the default primary route for low-cost text/classification/embedding-style tasks when capability quality allows it. OpenAI remains available for higher-quality text, GPT image generation, and TTS where selected by policy. ElevenLabs remains available for high-quality narration/story speech when configured.

Callers may provide routing hints only when policy allows them. Atlas may ignore unsupported hints.

## Observability

Every non-health request should eventually write an `atlas_requests` row with:

- request id
- app
- subject id when known
- capability
- purpose
- source/provider
- model
- status
- cache status
- duration
- estimated cost
- redacted input/output metadata
- normalized error code

## Migration Plan

1. Scaffold Atlas docs, worker, D1 schema, and `@tiko/atlas` client.
2. Implement health/capability routes.
3. Implement `POST /v1/atlas/run` with validation and policy rejection only.
4. Move speech/TTS into Atlas first because it proves routing, caching, assets, and provider policy.
5. Move admin image generation next.
6. Move text generation/classification tasks to Cloudflare Workers AI/OpenAI routing.
7. Add provider-backed metadata/data fetches such as Radio YouTube metadata.
8. Deprecate direct app calls to `tts-api` and generation-specific provider routes once callers use Atlas.

## Naming Doctrine

Use Atlas names consistently:

```txt
workers/atlas-api
packages/atlas
/v1/atlas/*
ATLAS_DB
ATLAS_CACHE
ATLAS_ASSETS_BUCKET
atlas_requests
atlas_cached_assets
atlas_provider_status
```

Avoid `external-*` names in new code. Atlas is not only external. It is Tiko's data request resolver.
