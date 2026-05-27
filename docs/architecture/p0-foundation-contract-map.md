# P0 Foundation Contract Map

## Purpose

This is the build order and ownership map for the Tiko clean rebuild foundation. It exists to prevent app teams from inventing backend behavior independently.

Tiko remains API-first: web, iOS, and Android clients consume the same documented contracts. Workers own durable behavior. Packages own typed clients, local helpers, and test fixtures. Apps stay thin.

## Non-negotiable boundaries

- No passwords.
- No login wall before child-facing app use.
- Device-first identity is the first session state.
- D1 is the source of truth for relational app data and generated-media metadata.
- R2 is the source of truth for media bytes.
- KV is cache only; it must be rebuildable from D1/R2 or external systems.
- Lezu owns translation management; Tiko packages may load Lezu output and checked-in fallbacks, not rebuild translation admin.
- Browser cookies may exist for web convenience, but native clients must work with bearer session bundles.
- `tiko-mono` is reference only and must not be modified for this rebuild.

## P0 service boundaries

### `identity-api`

Owns users, devices, sessions, caregiver email recovery, magic-link verification, and logout.

Initial endpoints, matching `docs/api/openapi.yaml`:

1. `POST /v1/identity/device`
2. `GET /v1/identity/session`
3. `POST /v1/identity/email`
4. `POST /v1/identity/magic-links/verify`
5. `POST /v1/identity/logout` (documented in architecture; should be added to OpenAPI before implementation if it remains in P0)

D1 ownership:

- `users`
- `devices`
- `sessions`
- `magic_links`
- `user_profile_events`

KV/R2 ownership: none in P0.

Package owner: `packages/identity` provides the browser TypeScript client, session bundle types, token storage adapter interfaces, and contract-test helpers. Native platforms mirror the same OpenAPI contract in Swift/Kotlin; they do not import the web package.

### `app-api`

Owns user-scoped app settings and small app state. It is the first worker after identity because Yes-No and Type must stop treating localStorage as the durable cross-device contract.

Initial endpoints, matching `docs/api/openapi.yaml`:

1. `GET /v1/apps/{app}/settings`
2. `PUT /v1/apps/{app}/settings`
3. `GET /v1/apps/{app}/state`
4. `PUT /v1/apps/{app}/state`

D1 ownership:

- `app_settings`: one active settings document per `(user_id, app)` with version metadata.
- `app_state`: one small state document per `(user_id, app)` for resumable app state.
- `app_events` only if needed for audit/debug; not required before Yes-No proof.

KV ownership:

- Optional short-lived cache for settings/state reads after the D1 shape is stable.
- KV entries must be invalidated by writes and must never be the only copy.

R2 ownership: none in P0.

Package owner: `packages/data` owns `getAppSettings`, `putAppSettings`, `getAppState`, `putAppState`, app-specific settings/state TypeScript models, and contract fixtures.

### `generation-api`

Owns generated outputs: TTS, sentence generation, image generation, and asynchronous generation jobs. TTS belongs here conceptually, even if the existing `workers/tts-api` remains temporarily.

P0 endpoint order:

1. `POST /v1/generation/tts`
2. `GET /v1/generation/tts/{id}` or `GET /v1/media/audio/{id}` after the media boundary is finalized
3. Later: sentence/image generation job creation and status endpoints

D1 ownership:

- `generation_jobs` for asynchronous requests once needed.
- `tts_audio` metadata may begin in the temporary TTS worker schema, but the target owner is generation/media foundation, not a permanent standalone service.

R2 ownership:

- Generated MP3/audio bytes are stored in R2 under stable generated-audio keys.

KV ownership:

- Optional dedupe/cache hints only. TTS cache keys are derived from normalized text, language, provider, voice, model, speed, and pitch; the durable metadata stays in D1.

Package owner: generation request/response types should not live in `packages/ui`. Move TTS client contracts from `packages/ui` into `packages/media` or a future `packages/generation` before broader Type work. `packages/ui` may call a provided speech adapter, but it should not own API URLs or generation semantics long-term.

### `media-api`

Owns user-uploaded media, generated media access, upload authorization, media metadata, and R2 object retrieval policies.

P0 endpoint order:

1. Read access for generated TTS audio once generation uses stable IDs.
2. Later: upload authorization for Cards media.
3. Later: metadata CRUD for user media libraries.

D1 ownership:

- `media_objects`
- `media_derivatives` when thumbnails/transcodes appear

R2 ownership:

- User uploads.
- Generated media bytes if a shared media namespace is preferred over generation-specific buckets.

KV ownership:

- CDN/cache metadata only.

Package owner: `packages/media` owns upload/download helpers, generated audio URL resolution, and media-object types.

### `content-api`

Owns published app content, curriculum/content documents, cacheable public read models, and future CMS-like entries.

P0 status: not on the critical path for Yes-No or Type unless Type needs seeded phrases from server content. Do not build content admin until identity, app state, and generation/TTS are stable.

D1 ownership:

- `content_entries`
- `content_versions`
- `content_publications`

KV ownership:

- Cacheable public read models derived from D1.

R2 ownership:

- Only large content assets if they are not user media.

Package owner: `packages/data` or a later `packages/content` once content complexity justifies a split.

### `admin-api`

Owns dangerous or caregiver/admin-only operations: support, reports, removal, moderation, content publishing, and operational inspection.

P0 status: last. Admin must not become an app dependency and must not create a login wall for child-facing use.

D1 ownership:

- Admin audit records only after admin actions exist.

KV/R2 ownership: none as source of truth.

## `workers/tts-api` decision

Decision: fold TTS into `generation-api` as the durable product boundary. Keep `workers/tts-api` only as temporary compatibility/proof code until the P0 generation route exists.

Exact path:

1. Treat the current `workers/tts-api` contract (`POST /generate`, `GET /audio?key=...`) as temporary and non-canonical.
2. Add canonical OpenAPI paths for `POST /v1/generation/tts` and generated audio retrieval before new clients depend on TTS.
3. Move reusable normalization, hashing, provider selection, and D1/R2 metadata behavior into `generation-api` implementation or a shared internal worker module.
4. Move the public TypeScript TTS request/response client out of `packages/ui`; target `packages/media` unless a separate `packages/generation` is created.
5. Keep the old worker deployable only as an adapter from `/generate` to the canonical generation contract if the current Yes-No proof needs a bridge.
6. Delete `workers/tts-api` after Yes-No and Type both use the canonical generation/media contract and contract tests cover cache hit, cache miss, provider unavailable, and browser fallback behavior.

Reason: a permanent standalone TTS worker would split generated-media ownership too early. TTS is the first generation use case, not a separate platform domain.

## Shared API envelope

All new P0 worker routes should return a consistent envelope. Existing OpenAPI payload schemas (`SessionBundle`, `AppSettings`, `AppState`) describe the `data` body and should be wrapped when the OpenAPI contract is tightened.

Success shape:

```json
{
  "ok": true,
  "data": {},
  "meta": {
    "requestId": "req_...",
    "serverTime": "2026-01-01T00:00:00.000Z"
  }
}
```

Error shape:

```json
{
  "ok": false,
  "error": {
    "code": "invalid_request",
    "message": "Request could not be processed.",
    "field": "language",
    "retryable": false
  },
  "meta": {
    "requestId": "req_...",
    "serverTime": "2026-01-01T00:00:00.000Z"
  }
}
```

Rules:

- Error `message` is safe for logs and simple client display, but child-facing apps should map known codes to their own calm UI text.
- Do not leak whether a caregiver email exists.
- Use stable lowercase snake_case error codes.
- Include `requestId` on every response.
- Use bearer auth for native and optional HttpOnly Secure cookies for web.
- Avoid platform-specific response branches; platform differences belong in clients.

## Session envelope

Canonical session `data` for identity routes:

```json
{
  "user": {
    "id": "usr_...",
    "kind": "device",
    "recoverable": false,
    "displayName": "Tiko"
  },
  "device": {
    "id": "dev_...",
    "name": "This device"
  },
  "session": {
    "token": "session_token_returned_once_or_rotated",
    "expiresAt": "2026-01-01T00:00:00.000Z"
  }
}
```

Storage rules:

- Server stores session tokens and magic-link tokens as hashes.
- Native clients store the session bundle in platform-secure storage where available.
- Web clients may use HttpOnly Secure cookies and/or explicit session bundle storage, but the API must not require cookies only.
- `GET /v1/identity/session` returns the current session payload without rotating unless the contract later documents rotation.

## P0 build order

1. Identity contract and tests.
2. Identity worker minimal implementation.
3. `packages/identity` client and fixtures.
4. App settings/state contract and tests.
5. `app-api` minimal implementation.
6. `packages/data` client and app models.
7. Canonical generation/TTS contract.
8. Generation/media implementation for TTS cache and audio retrieval.
9. Move TTS client out of UI package.
10. Media/content contracts needed by Cards and later apps.
11. Admin only after production support needs exist.

App priority for API build:

1. Identity.
2. App settings/state.
3. Generation/TTS.
4. Media/content.
5. Admin.

Product app priority remains: Yes-No, Type, Cards, Sequence, Timer.

## Yes-No contract needs

Yes-No is the first proof app. It needs these contracts before being considered migrated:

- `POST /v1/identity/device`: app opens and gets/restores a device session without login.
- `GET /v1/identity/session`: app can verify a stored session bundle.
- `GET /v1/apps/yes-no/settings`: returns button labels, language, color mode, and speech preferences.
- `PUT /v1/apps/yes-no/settings`: saves caregiver settings.
- `GET /v1/apps/yes-no/state`: returns optional latest answer/history if cross-device resume is desired.
- `PUT /v1/apps/yes-no/state`: saves latest answer/history only if product decides history is durable; otherwise keep answer history local and do not invent server audit.
- `POST /v1/generation/tts`: returns generated/cached speech audio for yes/no labels and custom prompt sentence.
- Generated audio retrieval path: stable URL or media ID usable by web, iOS, and Android.

Initial `yes-no` settings shape:

```json
{
  "language": "en",
  "colorMode": "system",
  "sentence": "Do you want to go eat?",
  "choices": [
    { "id": "yes", "label": "Yes", "speechText": "Yes", "tone": "primary" },
    { "id": "no", "label": "No", "speechText": "No", "tone": "secondary" }
  ],
  "speech": {
    "provider": "auto",
    "voice": "nova",
    "speed": 1
  }
}
```

Do not store emoji/icon choices in the API contract as product doctrine. If icons are needed, use open-icon names in UI/client specs.

## Type contract needs

Type validates text entry, language behavior, saved phrases, and TTS under heavier use.

Required after Yes-No foundation:

- Same identity endpoints as Yes-No.
- `GET /v1/apps/type/settings`: typing preferences, language, voice/speech preferences, keyboard/display options.
- `PUT /v1/apps/type/settings`: save typing and speech preferences.
- `GET /v1/apps/type/state`: optional current draft and recent local state if cross-device resume is wanted.
- `PUT /v1/apps/type/state`: save current draft only if product accepts cloud persistence of typed text; otherwise keep drafts local for privacy.
- `POST /v1/generation/tts`: speak typed text.
- Later, if saved phrases become structured content: either keep them in `app-api` as app state/settings for P0 or promote them to `content-api` after the Type proof.

Initial `type` settings shape:

```json
{
  "language": "en",
  "colorMode": "system",
  "speech": {
    "provider": "auto",
    "voice": "nova",
    "speed": 1
  },
  "typing": {
    "fontScale": 1,
    "autoSpeak": false,
    "showSuggestions": false
  },
  "savedPhrases": []
}
```

Privacy rule: typed free text is more sensitive than Yes-No button state. Do not persist drafts/server history by default unless the app spec explicitly accepts it.

## Packages vs workers

Belongs in packages:

- Public TypeScript types derived from or aligned with OpenAPI.
- Thin clients for identity, app data, i18n, media/generation retrieval.
- Storage adapter interfaces for web clients.
- Test fixtures and contract test helpers.
- UI components that are purely presentational or call injected clients/adapters.

Belongs in workers:

- Auth/session verification.
- D1 reads/writes and migrations.
- R2 object writes/reads and signed access.
- KV cache population/invalidation.
- Provider secrets and external API calls.
- Rate limiting and abuse protection.
- Request IDs, logging, and server-side error mapping.

Does not belong in apps:

- Hardcoded API semantics beyond calling package clients.
- Provider-specific TTS logic.
- Durable data ownership decisions.
- Browser-only identity assumptions.

## OpenAPI alignment notes

Current `docs/api/openapi.yaml` already covers the identity device/session/email/magic-link routes and the app settings/state routes for `yes-no`, `type`, `cards`, `sequence`, and `timer`.

Before workers are implemented, OpenAPI should be tightened in this order:

1. Add the shared success/error envelope components.
2. Add request bodies for device bootstrap, email recovery, settings/state writes, and magic-link verification.
3. Add error responses for all existing routes.
4. Decide whether `POST /v1/identity/logout` remains P0 and add it if yes.
5. Add canonical generation/TTS routes.
6. Replace `additionalProperties: true` app settings/state with per-app schemas for Yes-No and Type first.

Until then, builder agents should treat `SessionBundle`, `AppSettings`, and `AppState` as payload schemas, not permission to invent incompatible route shapes.
