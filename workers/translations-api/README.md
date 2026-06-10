# translations-api

Cloudflare Worker — caching proxy between Tiko clients (iOS + web) and the Lezu translation platform.

**Production URL:** `https://translations.tikoapi.org`  
**Lezu parent project:** `project_a2a9847c-edbd-499e-874f-5a58c0cca80c`  
**Cards Content child project:** `project_65c64370-13ed-4503-82bc-9a6df8b9a5c8`

## Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/v1/:app/:language` | — | Fetch translations. Cached 4h in KV. |
| `POST` | `/v1/sync` | `ApiKey` | Purge all KV entries (Lezu webhook). |
| `POST` | `/v1/sync/:language` | `ApiKey` | Purge one locale's cache. |
| `POST` | `/v1/import` | `ApiKey` | Push source strings to Lezu. |

### GET /v1/:app/:language

```
GET https://translations.tikoapi.org/v1/radio/nl
→ 200 { "translations": { "radio.appName": "Radio", "common.cancel": "Annuleren", ... } }
```

Apps: `yes-no`, `type`, `timer`, `radio`, `cards`, `sequence`, `todo`, `website`, `admin`  
Languages: `en`, `nl`, `fr`, `de`, `es`, `pt`, `it`, `mt`, `ja`, `zh`, `ko`, `ar`, `hy`

### POST /v1/import

Seeds or updates Lezu with English source strings. Lezu auto-translates missing locales.

```
POST /v1/import
Authorization: ApiKey <LEZU_API_KEY>
Content-Type: application/json

{
  "locale": "en",
  "content": {
    "radio.appName": "Radio",
    "radio.collections.title": "Collections"
  },
  "translateMissing": true
}
```

### POST /v1/sync

Called by Lezu webhook when translations are published. Clears the KV cache so the
next GET fetches fresh data from Lezu.

```
POST /v1/sync
X-Lezu-Webhook-Secret: <WEBHOOK_SECRET>
```

## Setup

### 1. Create KV namespaces

```bash
cd workers/translations-api
npm run kv:create:dev    # copy the id into wrangler.toml [[kv_namespaces]].id
npm run kv:create:prod   # copy into [env.production.kv_namespaces].id
```

### 2. Set secrets

```bash
npm run secret:lezu-key       # paste your Lezu user API key
npm run secret:lezu-project   # paste: project_a2a9847c-edbd-499e-874f-5a58c0cca80c
npm run secret:webhook        # generate a random string for webhook security

# For production:
wrangler secret put LEZU_API_KEY --env production
wrangler secret put LEZU_PROJECT_ID --env production
wrangler secret put WEBHOOK_SECRET --env production
```

### 3. Seed Lezu with source strings

Run the Cards content seed script (from the repo root) to push built-in Cards content into Lezu, which then auto-translates it:

```bash
LEZU_API_KEY=lez_user_... \
LEZU_PROJECT_ID=project_65c64370-13ed-4503-82bc-9a6df8b9a5c8 \
node workers/translations-api/scripts/import-cards-en.mjs
```

### 4. Deploy

```bash
npm run dev                  # local dev
npm run deploy               # staging
npm run deploy:production    # production → translations.tikoapi.org
```

## Architecture

```
iOS app         → GET /v1/radio/nl
Web app (JS)    → GET /v1/yes-no/fr
                       ↓
               translations-api (Worker)
                       ↓
               KV cache hit? → return immediately
               KV cache miss? → POST /export to Lezu → cache → return
                       ↓
                  Lezu API
            (api.lezu.app, project_a2a9847c...)
```

The worker stores the full locale bundle (all apps) per language in KV. Each GET filters
to the requesting app's key prefix. This means one Lezu call fetches translations for
all apps at once.
