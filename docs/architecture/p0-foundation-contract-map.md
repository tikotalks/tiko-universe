# P0 Foundation Contract Map

## Purpose

This is the authoritative P0 contract map for the clean Tiko rebuild. It exists to stop app work from inventing backend behavior inside clients.

P0 builds the shared service foundation in this order:

1. Identity.
2. App settings and app state.
3. Generation and TTS.
4. Media and content.
5. Admin.

The order matters. Yes No and Type must prove that web, iOS, and Android can consume the same contracts before broader app migration starts.

## Non-negotiable constraints

- API first: every client-visible behavior starts as a documented contract.
- No passwords.
- No login walls.
- Identity is device-first, with optional caregiver email recovery by magic link.
- Web, iOS, and Android are equal clients. Do not rely on browser-only cookies.
- D1 is the durable source of truth for relational data.
- R2 is the durable source of truth for media bytes.
- KV is cache only and can always be rebuilt from D1/R2 or Lezu.
- Lezu owns translation management. Tiko consumes translation bundles and local fallbacks.
- Workers own backend behavior. Packages expose contracts, clients, models, and test helpers; they do not become hidden backends.

## Service boundaries

### `identity-api`

Owns:

- Device bootstrap.
- Users.
- Devices.
- Sessions.
- Magic links.
- Optional caregiver email recovery.
- Session introspection and logout.

Initial endpoint order:

1. `POST /v1/identity/device`
2. `GET /v1/identity/session`
3. `POST /v1/identity/email`
4. `POST /v1/identity/magic-links/verify`
5. `POST /v1/identity/logout`

Storage ownership:

- D1: `users`, `devices`, `sessions`, `magic_links`, `user_profile_events`.
- KV: rate-limit/cache keys only, never primary session state.
- R2: none.

Package ownership:

- `packages/identity` exports the OpenAPI-aligned TypeScript session models, request helpers, token storage adapter interfaces, and client functions.
- Native clients mirror these contracts in Swift/Kotlin from `docs/api/openapi.yaml`; they do not import the TypeScript package.

### `app-api`

Owns:

- User-scoped app settings.
- User-scoped app state.
- App-level schema versioning for small Tiko apps.
- Last-write metadata and future conflict handling.

Initial endpoint order:

1. `GET /v1/apps/{app}/settings`
2. `PUT /v1/apps/{app}/settings`
3. `GET /v1/apps/{app}/state`
4. `PUT /v1/apps/{app}/state`

Storage ownership:

- D1: `app_settings`, `app_state`, and optional `app_state_events` once audit/history is needed.
- KV: read-through cache for hot settings/state after D1 writes are working.
- R2: none for P0 app state.

Package ownership:

- `packages/data` exports `AppName`, app settings/state models, versioned app payload schemas, and thin client functions.
- It may include local fallback/default factories, but not durable persistence beyond client storage adapters.

### `generation-api`

Owns:

- TTS generation and cache lookup.
- Future sentence suggestions.
- Future image or symbol generation.
- Generation job records and async queues.

Initial endpoint order:

1. `POST /v1/generation/tts`
2. `GET /v1/generation/audio/{id}` or signed R2 read URL contract.
3. `GET /v1/generation/jobs/{id}` only when async jobs are introduced.

Storage ownership:

- D1: generation request records, provider metadata, cache keys, generated audio metadata, job status.
- R2: generated audio bytes and future generated media bytes.
- KV: dedupe/read cache only.
- Queues: slow generation work after the synchronous P0 path is proven.

Package ownership:

- `packages/media` owns media and generated-asset client models that are consumed by apps.
- Do not keep TTS request/response types in `packages/ui`; UI can call a generation/media client but must not own service contracts.

### `workers/tts-api` decision

Atlas owns speech generation, provider selection, and speech caching. `workers/tts-api` is a narrow service-authenticated adapter for clients that still call `POST /generate`; it must not own providers, audio bytes, generated-audio metadata, or a separate cache.

Exact path:

1. Keep app speech clients on the shared Atlas speech contract whenever possible.
2. Keep `workers/tts-api` limited to `POST /generate` forwarding through Atlas.
3. Reject provider/model/voice hints at `workers/tts-api`; Atlas decides the provider.
4. Do not reintroduce `GET /audio`, local TTS D1/R2 storage, local provider calls, or a second speech cache.
5. If all clients move to Atlas directly, delete `workers/tts-api` rather than expanding it.

Reasoning:

- Speech is a platform capability, not an isolated product domain.
- Keeping provider/cache policy in Atlas avoids per-worker divergence.
- The current `tts-api` contract uses `{ success, audioUrl, cached }`, while the platform needs one shared response/error envelope.

### `media-api`

Owns:

- Upload authorization.
- Media metadata.
- User media ownership.
- R2 object access and signed URL policy.

P0 endpoint order, after generation/TTS:

1. `POST /v1/media/uploads`
2. `GET /v1/media/{id}`
3. `DELETE /v1/media/{id}` when deletion UX exists.

Storage ownership:

- D1: media records, owner user/device, content type, object key, size, lifecycle metadata.
- R2: bytes.
- KV: public/read cache only.

Package ownership:

- `packages/media` exports upload/download contracts, media asset models, and test fixtures.

### `content-api`

Owns:

- Published app content.
- Curriculum/content documents.
- CMS-like read models.
- Cacheable content payloads.

P0 position:

- Not needed for Yes No or Type foundation unless Type ships saved shared phrase packs.
- Cards should be the first app that forces content-api hardening.

Storage ownership:

- D1: content records, versions, app visibility, publish state.
- KV: published read-model cache only.
- R2: content-owned media bytes only through media-api records, not direct anonymous object ownership.

Package ownership:

- `packages/data` may expose content client types if payloads are app-state-adjacent.
- `packages/media` remains responsible for media asset types.

### `admin-api`

Owns:

- Dangerous operations.
- Support tooling.
- Reports.
- Moderation/removal.
- Back-office inspection.

P0 position:

- Build last.
- No child-facing app depends on admin-api.
- Never place admin bypasses in app workers.

Storage ownership:

- D1: admin audit logs and support actions.
- R2: none unless exporting reports.
- KV: cache only.

## Shared response and error envelope

The current OpenAPI file already defines the first identity and app state endpoints. P0 should extend it with the following shared shapes before builders implement Workers.

Successful responses return the resource directly unless metadata is needed. If metadata is needed, use this envelope:

```ts
interface ApiEnvelope<T> {
  data: T
  meta?: {
    requestId?: string
    schemaVersion?: number
    cached?: boolean
  }
}
```

Errors always use this envelope:

```ts
interface ApiErrorEnvelope {
  error: {
    code: string
    message: string
    field?: string
    retryAfterSeconds?: number
  }
  meta?: {
    requestId?: string
  }
}
```

Rules:

- Do not use `{ success: false }` for platform APIs.
- Use stable machine-readable `error.code` values.
- Keep human `message` simple and safe; never reveal whether a recovery email exists.
- Attach `requestId` once observability exists.
- Avoid wrapping simple successful resources twice. `SessionBundle`, `AppSettings`, and `AppState` may remain direct responses as shown in `docs/api/openapi.yaml`.
- Generation/TTS should not leak provider error bodies into client-visible errors.

## Shared session envelope

`docs/api/openapi.yaml` currently defines `SessionBundle` as the source contract. P0 should keep that shape and make these semantics explicit:

```ts
interface SessionBundle {
  user: {
    id: string
    displayName?: string
    kind: 'device' | 'recoverable'
    recoverable: boolean
  }
  device: {
    id: string
    name?: string
  }
  session: {
    token: string
    expiresAt: string
  }
}
```

Rules:

- `POST /v1/identity/device` is idempotent from a client perspective. Existing device credentials should restore a session when possible; otherwise it creates a device user.
- Native clients store `session.token` as a bearer token in platform-appropriate secure storage.
- Web clients may use HttpOnly Secure cookies, but must also support explicit bearer token flows for parity.
- Server stores only token hashes.
- A recoverable user is still the same child/caregiver identity; email recovery upgrades the user, not the app startup flow.

## D1/R2/KV ownership summary

| Domain | D1 source of truth | R2 source of truth | KV usage |
| --- | --- | --- | --- |
| Identity | users, devices, sessions, magic_links, events | none | rate limits/cache only |
| App state/settings | app_settings, app_state, app_state_events later | none | hot read cache only |
| Generation/TTS | generation requests, audio metadata, job records | generated audio/media bytes | dedupe/read cache only |
| Media | media metadata and ownership | uploaded/user media bytes | signed/read cache only |
| Content | content records, versions, publish state | content media via media records | published read models only |
| Admin | audit/support action records | report exports if needed | cache only |

No Worker may treat KV as durable state.

## Package versus Worker rule

Put code in packages when it is:

- A typed client for an already documented API.
- A shared request/response model.
- A schema/default factory used by clients/tests.
- A test fixture or contract helper.
- A UI primitive that has no backend authority.

Put code in Workers when it is:

- Authorization/session validation.
- D1/R2/KV/Queue access.
- Provider calls.
- Rate limiting.
- Durable mutations.
- Dangerous/admin behavior.

If a package needs a secret, a binding, or a provider API key, it is in the wrong place.

## Yes No P0 contracts

Yes No is the first proof app. Before broader work, it needs only these accepted contracts:

1. `POST /v1/identity/device`
   - Returns `SessionBundle`.
   - App opens even if this call fails; local-only fallback is allowed for play, but must show no login wall.
2. `GET /v1/apps/yes-no/settings`
   - Returns settings with at least `language`, `colorMode`, `sentence`, and optional button labels.
3. `PUT /v1/apps/yes-no/settings`
   - Persists caregiver-visible settings.
4. `GET /v1/apps/yes-no/state`
   - Returns lightweight state/history if the product keeps history across devices.
5. `PUT /v1/apps/yes-no/state`
   - Saves latest answer/history only if persistence is intentional.
6. `POST /v1/generation/tts`
   - Speaks Yes/No labels and custom sentence prompts.
   - Returns a generated audio asset or a safe fallback error that clients can route to browser/native speech.

Suggested Yes No payloads:

```ts
interface YesNoSettings {
  language: string
  colorMode: 'light' | 'dark' | 'system'
  sentence: string
  labels?: {
    yes?: string
    no?: string
  }
}

interface YesNoState {
  latestAnswer?: 'yes' | 'no'
  answerHistory?: Array<{
    answer: 'yes' | 'no'
    label: string
    answeredAt: string
  }>
}
```

Keep button interaction immediate. API persistence must not delay speech or selection feedback.

## Type P0 contracts

Type is second because it validates text entry, language behavior, saved phrases, and TTS/native keyboard parity.

It needs:

1. `POST /v1/identity/device`
2. `GET/PUT /v1/apps/type/settings`
3. `GET/PUT /v1/apps/type/state`
4. `POST /v1/generation/tts`
5. Media/content endpoints only after saved/shared phrase packs include user media or published content.

Suggested Type payloads:

```ts
interface TypeSettings {
  language: string
  colorMode: 'light' | 'dark' | 'system'
  voice?: string
  speakOnSubmit?: boolean
  textSize?: 'normal' | 'large' | 'extra-large'
}

interface TypeState {
  draft?: string
  savedPhrases?: Array<{
    id: string
    text: string
    language: string
    createdAt: string
    updatedAt?: string
  }>
  recentPhrases?: string[]
}
```

Do not build Type-specific TTS routes. Type must use the same generation/TTS contract as Yes No.

## Builder sequence

1. Update `docs/api/openapi.yaml` with error schemas, `POST /identity/logout`, and generation/TTS paths.
2. Add contract tests in `packages/testing` for identity, app settings/state, and generation/TTS response/error behavior.
3. Implement `identity-api` minimal D1 schema and handlers.
4. Implement `packages/identity` client against that contract.
5. Implement `app-api` minimal D1 schema and handlers.
6. Implement `packages/data` client plus Yes No/Type payload schemas.
7. Keep speech generation on Atlas and keep `workers/tts-api` limited to the current service-authenticated `/generate` adapter.
8. Move TTS client contracts out of `packages/ui` into `packages/media` or a generation client package if one is created.
9. Wire Yes No web and iOS to identity/app/generation contracts without changing the child-facing first screen.
10. Start Type only after Yes No proves identity, settings/state, and TTS across at least web plus one native path.

## Validation checklist for P0 docs

- `docs/api/openapi.yaml` remains the source for current accepted paths.
- This plan does not introduce passwords, Better Auth, Supabase, login walls, or migration assumptions from old systems.
- `workers/tts-api` does not own speech generation, storage, provider selection, or cache policy.
- D1/R2/KV ownership is unambiguous.
- Yes No and Type can proceed without inventing private client-only contracts.
