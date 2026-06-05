# Atlas API Worker

Atlas is Tiko's unified gateway for data, knowledge, generation, and provider-backed intelligence.

## P0 Routes

```txt
GET  /v1/atlas/health
GET  /v1/atlas/capabilities
POST /v1/atlas/run
```

`/run` is currently a guarded scaffold. Registered capabilities return `capability_not_implemented` until their domain modules and provider adapters are implemented.

## Bindings

```txt
ATLAS_DB
ATLAS_CACHE
ATLAS_ASSETS_BUCKET
AI
IDENTITY_SERVICE
```

Secrets are provider-specific and should never be exposed to app clients.

## Validation

```bash
npm run typecheck --workspace @tiko-worker/atlas-api
```
