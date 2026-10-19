# Media API audit and to-do list

Date: 2026-08-25

## Outcome

The Media platform is functional but not contract-complete. It has real D1/R2 persistence, public and owner-private reads, uploads, search, facets, image routes, administrative metadata changes, and a small audio-album surface. Its largest risks are authorization, divergent client/wire models, misleading download conversion UI, and the absence of Media routes from the canonical OpenAPI document.

The public Media website now restores and writes searches through `?search=search-term`, including browser query navigation. The website still needs URL state for its other filters and pagination.

## Verified surface

- `workers/media-api/src/index.ts`: media, legacy assets, image analysis, and audio albums in one 1,500-line worker.
- `tests/media-api.test.ts`: 26 worker tests covering core listing, search, facets, private reads, upload validation, downloads, assets, and album creation.
- `apps/media/web`: public gallery and detail pages, now with two URL-search tests.
- `apps/admin/web/src/composables/useAdminMediaLibrary.ts`: administrative listing, uploads, visibility edits, deletion, facets, and basic album writes.
- `packages/media`: image URL helpers and a narrow web fetch client; it does not own the complete Media contract promised by the architecture map.
- `packages/tikokit-ios`: a separate Swift wire model and client using the worker's snake-case response.
- `docs/api/openapi.yaml`: no Media API path or schema definitions.
- `workers/media-api/README.md`: replaced during this audit; the prior file still described the worker as a scaffold placeholder.

## P0 — make the API safe and truthful

### 1. Define one canonical Media contract

Problem: the worker returns snake-case fields, the public website declares camel-case fields and converts several possible legacy shapes, Admin declares a mixed shape, and Swift declares a smaller snake-case model. This violates the contract-first rule and encourages silent compatibility paths.

- [ ] Add every supported Media, image, download, facet, and audio route to `docs/api/openapi.yaml`.
- [ ] Decide the canonical wire casing and field names once.
- [ ] Define `MediaItem`, `MediaListResponse`, `MediaFacetResponse`, upload inputs, album models, and mutation inputs in `packages/media`.
- [ ] Generate or explicitly mirror the same contract for Swift/Kotlin clients.
- [ ] Update the worker and every caller in one migration; remove fallback field normalization rather than retaining old decode paths.
- [ ] Add contract tests that validate actual worker responses against the canonical schema.

Acceptance: web, Admin, iOS, and worker tests consume the same named fields; searching the repository finds no alternate Media item interfaces or fallback wire-field conversion.

### 2. Enforce authorization by operation and owner

Problem: any authenticated session can currently update or delete any media ID, create a public album, and add tracks. Any authenticated session is also treated as an administrator for inactive/hidden list options. Authentication is not authorization.

- [ ] Define scopes such as `media:read-private`, `media:upload`, `media:write-own`, `media:admin`, and `audio-library:write`.
- [ ] Require ownership for user-media update/delete and an administrative service scope for global/public media mutation.
- [ ] Restrict `includeInactive`, `includeHidden`, and `state` to `media:admin`.
- [ ] Restrict public uploads and image analysis to explicit service/admin scopes.
- [ ] Validate album/track writes with an audio-library scope.
- [ ] Add denial tests for a valid but unprivileged session and a different owner.

Acceptance: no write or administrative read is authorized merely because a bearer token is valid.

### 3. Adopt the shared error envelope everywhere

Problem: the worker mixes `{ success: false, error: string, details? }`, shared authentication envelopes, `{ success: true, ... }`, and `{ data, meta }`. Clients therefore need union parsing and string/object branches.

- [ ] Return the canonical `ApiErrorEnvelope` for every non-2xx response.
- [ ] Add stable error codes, field names for validation errors, retry hints where relevant, and request IDs.
- [ ] Choose one success envelope per operation category and document it.
- [ ] Remove provider/database error details from public 500 responses; retain them only in structured logs.

Acceptance: all endpoint tests assert the same error shape, and raw internal exception text never crosses the public boundary.

### 4. Make stored metadata complete and correct

Problem: media uploads accept `duration`, width, and height but the media table has no duration column, image dimensions are not derived in the Media path, and video thumbnails are not modeled as durable objects. A private video's thumbnail currently points at the video's own download route. Deletion does not know about the separate thumbnail object.

- [ ] Add duration, checksum, byte/object key, derivative keys, source, and generation metadata to the canonical schema and D1 migration.
- [ ] Detect dimensions and duration server-side or in a trusted asynchronous processor.
- [ ] Persist video thumbnail keys and serve private thumbnails through an authorized image route.
- [ ] Delete or retain every derivative according to one explicit lifecycle policy.
- [ ] Validate numeric metadata for finite, non-negative, bounded values.

Acceptance: a round trip from upload to list/detail preserves all type-specific metadata and every stored R2 object is reachable from a D1 record.

### 5. Make download behavior honest and media-friendly

Problem: the public detail page offers PNG/JPG/WebP and MP3/WAV alternatives, but `GET /download?format=` ignores `format` and returns the original bytes. Audio/video streaming also lacks range handling.

- [ ] Either implement supported conversions with correct MIME type, extension, caching, and limits, or remove alternative-format controls and the query parameter from clients/docs.
- [ ] Implement `HEAD`, `Range`, `Accept-Ranges`, `Content-Length`, ETag, and conditional responses for byte-serving routes.
- [ ] Sanitize and RFC-encode download filenames.
- [ ] Define redirect versus proxy behavior as part of the contract.

Acceptance: every advertised format is real, and native/browser audio can seek without downloading the whole object.

### 6. Close visibility and private-cache gaps

Problem: inactive public media metadata remains readable through `GET /media/:id`, although byte routes block it. Private image responses currently use `Cache-Control: public`.

- [ ] Apply the same serveability decision to detail, image, and download endpoints.
- [ ] Return `Cache-Control: private, no-store` for private media responses unless a safer explicit policy is designed.
- [ ] Decide whether unauthorized private IDs return 404 or 401/403 to control existence disclosure, then apply consistently.
- [ ] Test inactive, hidden, private-owner, other-user, service, and unauthenticated behavior for every read route.

Acceptance: one documented visibility matrix predicts every endpoint response and cache header.

### 7. Make deletion recoverable and auditable

Problem: deletion removes R2 first, ignores R2 errors, then deletes D1. A D1 failure can leave metadata pointing to missing bytes, and there is no tombstone or audit trail.

- [ ] Prefer deactivate/soft-delete for administrative workflows.
- [ ] Record actor, reason, timestamp, prior visibility, and affected object keys.
- [ ] Use a retryable cleanup job/queue for byte deletion after the durable lifecycle transition.
- [ ] Add orphan reconciliation in both directions: D1-without-R2 and R2-without-D1.

Acceptance: a partial failure cannot silently destroy the only usable copy or leave an untracked object indefinitely.

### 8. Resolve `media` versus `assets`

Problem: two D1 schemas, two R2 buckets, two response envelopes, and overlapping image upload/read concepts live in one worker. The domain boundary is unclear to clients and maintainers.

- [ ] Inventory all `/v1/assets` consumers and data.
- [ ] Decide whether assets are a Media kind or a separately owned bounded domain.
- [ ] Write and approve a migration plan before removing either store.
- [ ] Consolidate routes/models or split ownership; do not add another compatibility layer.

Acceptance: one documented owner exists for each byte and metadata record, with no overlapping public upload contract.

## P1 — make discovery and operations robust

### Search and browse

- [ ] Replace leading-wildcard `LIKE` scans with an indexed D1 FTS/search strategy and normalized category/tag relations.
- [ ] Define tokenization, case/diacritic handling, ranking, phrase behavior, and stable tie-breaking.
- [ ] Keep facet counts consistent with the active search/filter set, and support private-owner facets where authorized.
- [ ] Add `type`, `category`, `tags`, `sort`, and `page` to shareable Media website URL state.
- [ ] Consider cursor pagination once the library size makes offset scans or concurrent inserts unstable.
- [ ] Add empty, loading, error/retry, and no-result integration tests to the public gallery.

### Upload and processing pipeline

- [ ] Validate magic bytes/content signatures rather than trusting browser MIME declarations.
- [ ] Add checksums and idempotency keys to prevent duplicate uploads and retry duplication.
- [ ] Move expensive analysis/derivative work to a queue with explicit processing states.
- [ ] Add configurable per-kind size, duration, pixel, and codec limits.
- [ ] Add moderation/malware policy appropriate to accepted formats and public publishing.
- [ ] Move AI analysis behind the generation/Atlas capability boundary or document why Media owns it; avoid a hardcoded provider/model in the domain worker.

### Audio library completeness

- [ ] Add get/update/delete album routes.
- [ ] Add update/remove/reorder track routes.
- [ ] Verify the referenced Media item exists, is active/readable, and has an allowed audio MIME type before insertion.
- [ ] Enforce private-album read ownership and define publication rules.
- [ ] Implement `sort_mode` behavior rather than always ordering manually.
- [ ] Add foreign-key enforcement tests and cleanup behavior tests.

### Reliability and abuse controls

- [ ] Add request IDs, structured logs, latency/error metrics, and alarms for D1/R2/provider failures.
- [ ] Add rate limits and quotas for upload, analysis, conversion, and broad search.
- [ ] Add timeout, cancellation, bounded retry, and circuit-breaker policy for provider calls.
- [ ] Add deployment smoke tests against development bindings and migration checks in CI.
- [ ] Add a dry-run/repair command for catalog-to-object integrity.

## P2 — finish the platform experience

- [ ] Localize Media website copy through `@tiko/i18n`; keep search terms and metadata language strategy explicit.
- [ ] Add video previews, accessible transcripts/captions, audio labels, and keyboard-tested media controls.
- [ ] Define licensing, attribution, source provenance, consent, retention, export, and caregiver deletion metadata.
- [ ] Add safe content/audience classification suitable for child-first clients.
- [ ] Publish small, typed web/Swift/Kotlin clients from the canonical contract, including cancellation and pagination.
- [ ] Define CDN caching, derivative invalidation, immutable URLs, and replacement/version semantics.
- [ ] Document backup/restore targets and test D1/R2 disaster recovery.
- [ ] Add usage/reference tracking so destructive changes can show which apps, cards, stories, albums, or releases depend on an item.

## Suggested delivery sequence

1. Canonical OpenAPI and shared models.
2. Authorization matrix and consistent errors.
3. Visibility/cache fixes and truthful download UI.
4. Metadata/derivative migration and lifecycle-safe deletion.
5. Search/indexing and complete URL state.
6. Audio CRUD and validation.
7. Async processing, observability, quotas, and governance.

Each step should update worker tests, web tests, native contract tests, the OpenAPI document, and `workers/media-api/README.md` together.
