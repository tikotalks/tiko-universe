# Tiko Media API

The Media API owns Tiko media metadata, media-byte access, user media ownership, image derivatives, and the radio-facing audio library. D1 is the metadata source of truth and R2 is the byte source of truth.

This worker currently also serves the older `assets` domain. That overlap is intentional only until the consolidation decision in [the Media audit](../../docs/plans/2026-08-25-media-api-audit.md) is completed.

## Hosts

| Environment | Host |
| --- | --- |
| Development worker | `tiko-media-api-dev.<account>.workers.dev` |
| Production | `https://media.tikoapi.org` |

All routes are under `/v1`. The configured client base URL is therefore `https://media.tikoapi.org/v1`.

## Authentication and visibility

- Public, active, non-hidden media can be listed, read, resized, and downloaded without authentication.
- A bearer session may read private media owned by that session user.
- A service API key may read private media.
- Upload, analysis, mutation, deletion, album creation, and track creation require a bearer credential.
- The current write authorization is authentication-only. Fine-grained scopes and ownership checks are a P0 item; callers must not treat the present behavior as the final security contract.

`is_active=false` prevents public byte serving. `is_hidden=true` removes an item from public browse/search but deliberately leaves a direct link usable while the item remains active.

## Current routes

### Media catalog

| Method | Route | Purpose |
| --- | --- | --- |
| `GET` | `/v1/media` | List and filter media |
| `GET` | `/v1/media/facets` | List category, tag, and MIME-family facets |
| `GET` | `/v1/media/:id` | Read media metadata |
| `GET` | `/v1/media/:id/image/:size` | Redirect a public image to a CDN derivative or stream an authorized private image |
| `GET` | `/v1/media/:id/download` | Stream an R2 object or redirect to its original public URL |
| `POST` | `/v1/media/upload` | Upload bytes and create the D1 record |
| `POST` | `/v1/media/analyze` | Analyze a readable Tiko image with the configured vision provider |
| `PUT` | `/v1/media/:id` | Update metadata and visibility flags |
| `DELETE` | `/v1/media/:id` | Delete the object and record |

`GET /v1/media` accepts:

| Parameter | Values | Default |
| --- | --- | --- |
| `search` | Free text over title, description, name, filename, tag prefixes, and category prefixes | none |
| `type` | `image`, `audio`, or `video` | all |
| `category` | One or more comma-separated exact categories | all |
| `tags` | Comma-separated tags; all supplied tags must match | all |
| `page` | Positive integer | `1` |
| `limit` | `1`–`100` | `20` |
| `sort` | `created_at`, `file_size`, or `title` | `created_at` |
| `order` | `asc` or `desc` | `desc` |
| `private` | `true` includes caller-readable private rows | `false` |
| `includeInactive` | Authenticated administrative view only | `false` |
| `includeHidden` | Authenticated administrative view only | `false` |
| `state` | `active`, `inactive`, or `hidden` | all permitted states |

The implemented list response is:

```json
{
  "data": [
    {
      "id": "media-id",
      "file_name": "uploads/example.png",
      "file_size": 12345,
      "mime_type": "image/png",
      "title": "Example",
      "description": "A short description",
      "folder": "animals",
      "categories": ["animals", "pets"],
      "tags": ["cat"],
      "is_private": false,
      "is_active": true,
      "is_hidden": false,
      "original_url": "https://data.tikocdn.org/uploads/example.png",
      "thumbnail_url": "https://media.tikoapi.org/v1/media/media-id/image/small",
      "medium_url": "https://media.tikoapi.org/v1/media/media-id/image/medium",
      "created_at": "2026-08-25T10:00:00.000Z",
      "updated_at": "2026-08-25T10:00:00.000Z"
    }
  ],
  "meta": { "total": 1, "page": 1, "limit": 20, "totalPages": 1 }
}
```

This snake-case shape is the current wire format, not yet a finished canonical contract. The web gallery currently normalizes it to its own camel-case view model.

Image sizes are `small` (200 px), `medium` (800 px), `large` (1200 px), and `original`. The `format` query accepted by some clients is not currently implemented by the download handler.

### Audio library

| Method | Route | Purpose |
| --- | --- | --- |
| `GET` | `/v1/audio/albums?radioEnabled=true` | List public albums and their tracks |
| `POST` | `/v1/audio/albums` | Create an album |
| `POST` | `/v1/audio/albums/:albumId/tracks` | Add a media item as a track |

### Legacy assets

| Method | Route | Purpose |
| --- | --- | --- |
| `GET` | `/v1/assets` | List public or caller-readable assets |
| `GET` | `/v1/assets/:id` | Read an asset record |
| `POST` | `/v1/assets/upload` | Upload an asset and create its record |

## Storage bindings

| Binding | Role |
| --- | --- |
| `MEDIA_DB` | Media records, visibility, audio albums, and tracks |
| `MEDIA_BUCKET` | Public media bytes |
| `USER_MEDIA_BUCKET` | Private user media bytes |
| `ASSETS_DB` | Legacy asset records |
| `ASSETS_BUCKET` | Legacy asset bytes |
| `AUTH_DB` | Session and API-key authentication lookup |
| `PEPPER_SECRET` | Identity token hashing pepper |
| `OPENAI_SECRET` | Optional image-analysis credential |

## Development

From the repository root:

```bash
npm run test --workspace=workers/media-api
npm run typecheck --workspace=workers/media-api
npm run deploy:dry-run --workspace=workers/media-api
```

Apply D1 migrations from `workers/media-api`:

```bash
npx wrangler d1 migrations apply tiko-media --remote
npx wrangler d1 migrations apply tiko-media --remote --env production
```

The authoritative contract still needs to be added to `docs/api/openapi.yaml`. Until that P0 work lands, keep worker tests, clients, and this README aligned in the same change.

## Next work

The verified, prioritized backlog and its acceptance criteria live in [Media API audit and to-do list](../../docs/plans/2026-08-25-media-api-audit.md).
