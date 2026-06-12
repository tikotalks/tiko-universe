# 04 — Security

Scope: authn/authz, input validation, injection, secrets, token handling, CORS, abuse vectors, PII. This is the most consequential chapter of the review: the platform serves children and handles family PII, and several controls that the product model depends on (PIN gates, private media, paid-API protection) are not actually enforced server-side.

## What is done well (and matters)

- **No SQL injection found anywhere.** Every dynamic value across all 13 workers is bound via `?` placeholders; the only interpolated SQL fragments are allowlisted identifiers (`tableName()` in `workers/app-api/src/index.ts:442-446`, `safeSort` in `workers/media-api/src/index.ts:647-648`).
- **No `v-html` anywhere** in the web apps — no template-injection XSS surface, including the admin support inbox which deliberately renders `message.text` only (`apps/admin/web/src/pages/CommunicationInboxPage.vue:46`).
- **No committed secrets**: API keys arrive exclusively via worker secrets; `npm audit --omit=dev` reports 0 vulnerabilities.
- **Session tokens are high-entropy and stored peppered-hashed** (`workers/identity-api/src/index.ts:877-883`); raw tokens never touch the DB.
- **communication-api hygiene**: timing-safe key compare (`:435-442`), HTML-escaping of every interpolated email value (`:287-394`), URL protocol validation (`:416-426`).
- **Admin authz is server-side**: the admin SPA never makes client-side authority decisions; admin-api explicitly rejects API-key auth for dashboard routes with documented reasoning (`workers/admin-api/src/index.ts:445-449`).
- Contract tests assert security behaviors: token hashing at rest, magic-link replay rejection, PIN-not-plaintext, last-admin protection, PII redaction in usage logs.

---

## Critical

### [Critical] atlas-api capability endpoints have no authentication at all
File: `workers/atlas-api/src/index.ts:18-22` (routes), `wrangler.toml:73` (public route), `src/response.ts:2` (`Access-Control-Allow-Origin: *`)
Why: `/v1/atlas/run`, `/speech`, `/images`, `/text`, `/data/fetch` are publicly routed at `api.tikotalks.com` with zero auth (only `/admin/*` checks a key). Anyone on the internet can burn OpenAI image generation (`costClass: 'high'`), ElevenLabs and Narakeet credits, and fill R2/D1 with generated assets. The intended auth was never wired: `Env` declares `TOKEN_PEPPER`/`IDENTITY_SERVICE` (`types.ts:109-112`) and wrangler binds `IDENTITY_SERVICE`, but nothing uses them. The capability registry's `allowedApps`/`allowedPurposes` policy is also never enforced (`src/index.ts:88-92`).
Fix: Gate all capability routes with `authenticate()` from `workers/shared/auth.ts` (media-api shows the pattern), enforce the registry allowlists, and add per-key rate limiting given the cost class.

### [Critical] sentence-api trusts caller-supplied `userId` — IDOR on children's saved phrases
File: `workers/sentence-api/src/index.ts:950-951` (also 397, 442, 455, 469)
Why: `resolveSubjectId` returns `explicitSubjectId` verbatim before consulting the identity service. `GET /v1/sentence/phrases?userId=<victim>` returns any child's saved sentences, `POST` writes into any subject, `DELETE` deletes them — all with **no token at all**. Saved phrases are sensitive personal speech data of children.
Fix: Resolve the session first; reject `userId` when it doesn't match the session subject (or a managed-child relationship):
```ts
const sessionSubject = await resolveFromIdentity(request, env)
if (explicitSubjectId && explicitSubjectId !== sessionSubject) throw new HttpError(403, 'forbidden')
return sessionSubject
```

### [Critical] `pinGrantToken` is never persisted or validated — the PIN gate on account reset/deletion is decorative
File: `workers/identity-api/src/index.ts:255` (issued, never stored), `:429-436`, `:477-492` (only checks non-empty)
Why: `verifyPin` returns a random grant token that is stored nowhere; `resetAccountData` and `createDeletionRequest` accept **any non-empty string**. A device in child mode holds the parent's session token, so a child (or any XSS payload) can trigger full account deletion with `pinGrantToken: 'x'` — the account is synchronously disabled and all sessions revoked (`:528-533`). The unverified string is even stored in `identity_deletion_requests.pin_grant_token`, creating a false audit trail.
Fix: Persist grants (token hash, subject, purpose, expiry, consumed_at) in `verifyPin`; look up + consume them in the destructive endpoints.

### [Critical] Unauthenticated endpoints trigger paid AI calls (cost-abuse vectors)
File: `workers/generation-api/src/index.ts:150-152, 175-204, 613-633`; `workers/tts-api/src/index.ts:47`; `workers/sentence-api/src/index.ts:156-169, 327-377`
Why: With `Access-Control-Allow-Origin: *` and no auth or rate limiting:
- `POST /v1/generation/tts` — every unique text/voice/speed combo is a paid provider call.
- `GET /v1/generation/voice-samples/:id` — the R2 cache key includes the raw `model` query param while ElevenLabs calls clamp to a default model (`:594, 618-619`), so `?model=a`, `?model=b`, … each cause a fresh paid TTS call and a new R2 object, unbounded.
- `GET /v1/generation/voices` hits ElevenLabs with your key per request, uncached.
- `POST /v1/sentence/next` — each unique word-ID sequence (combinatorially unbounded) triggers an Atlas LLM call up to 1500 output tokens.
- tts-api `POST /generate` — unauthenticated OpenAI TTS on a public custom domain.
Fix: Require auth (shared `requireAuth` already exists and gates the image routes) or at minimum per-IP rate limiting and a daily budget; derive the voice-sample cache key from the **normalized** model actually sent to the provider.

---

## High

### [High] media-api privacy flags are not access controls
File: `workers/media-api/src/index.ts:863-915` (list), `:918-925` (get), `:709-762` (media get/download), `schema.sql:2-21`
Why: `GET /v1/assets` is public and only filters `is_public = 1` when the caller *opts in* with `?public=true`; a plain request returns every private row, and `?userId=<anyone>` enumerates any user's uploads. `GET /v1/media/:id` and `/download` ignore `is_private` entirely. The `media` table has no owner column, so "private" media has no enforceable owner — and files are also publicly served from `data.tikocdn.org`.
Fix: Default to public-only for unauthenticated requests; add an owner column; require a matching session for private rows; decide whether a public CDN bucket is acceptable for private media at all.

### [High] generation-api: any authenticated user can mutate/delete anyone's content; drafts listable without auth
File: `workers/generation-api/src/index.ts:153-168, 217-225` (no ownership/role checks), `:161, 165, 169` (unauthenticated draft listing)
Why: `requireAuth` accepts any session; `authed.userId` is discarded. Any user (including a child's account) can DELETE images/stories, promote drafts to public, and run expensive edit/upscale on others' assets. `status=draft` listings and binaries are fully public — `is_public=0` is not an access control here either.
Fix: Record `created_by` on insert; gate mutations on ownership or admin role (sentence-api's `requireAdmin` at `sentence-api/src/index.ts:915-930` shows the intended pattern); wrap draft listings in `requireAuth`.

### [High] PIN and child access codes: 4-digit space, single fast hash, no attempt throttling
File: `workers/identity-api/src/index.ts:862-866` (hash), `:246-256, 293-305, 659-692` (no limits), `migrations/0005:21` (global `handle_norm` uniqueness)
Why: One SHA-256 of `pepper + 4 digits` = 10,000 candidates. `/pin/verify`, `/mode/parent`, and `/child-accounts/login` accept unlimited attempts — online brute force escapes child mode or logs in as any child with a guessable handle (handles are a **global** namespace, so they're also enumerable via the 201-vs-500 difference in `createManagedChild`). The client even ships a `too_many_attempts` error string that nothing emits (`packages/identity/src/index.ts:207`). The same weak scheme is duplicated client-side: `RadioSettings.pinHash` (`packages/data/src/index.ts:171`) syncs a brute-forceable hash into app settings readable by the child-mode session, and `packages/ui` hashes the parent PIN with unsalted SHA-256 in two places (`parent-mode.ts:76-83`, `TikoPinPopup.vue:179-186`).
Fix: Per-subject attempt counter/lockout with backoff; PBKDF2/scrypt via WebCrypto for 4-digit secrets; drop `RadioSettings.pinHash` in favor of the identity PIN; scope handle uniqueness per manager.

### [High] 180-day bearer token + device secret persisted to localStorage (web) and plaintext UserDefaults (iOS)
File: `packages/ui/src/identity-runtime.ts:243-266`; `apps/admin/web/src/composables/useAdminAuth.ts:5-8, 40-45, 88`; `packages/tikokit-ios/Sources/TikoKit/TikoIdentity.swift:441-474`
Why: The canonical web runtime writes `session.token` (valid 180 days), the account email (PII), and the device secret to localStorage — any XSS in any of the 12 apps exfiltrates them, and there is no CSP anywhere (below). The admin console does the same with an **admin** credential. On iOS, the whole bundle including token and device secret goes to unencrypted, backed-up UserDefaults — while a complete `TikoKeychainIdentityStore` with `kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly` exists in the same file and is referenced only by tests.
Fix: Web: switch browser apps to the already-built HttpOnly cookie transport and stop persisting `session.token`/`device.secret`. iOS: make the Keychain store the default with a one-time UserDefaults migration.

### [High] No security headers on any deployed app (no CSP, no frame-ancestors, no nosniff)
File: `apps/admin/web/public/_headers:1-11`, `apps/website/web/public/_headers:1-7`; `apps/media/web` has no `_headers` at all
Why: `_headers` files only set `Cache-Control`. Given tokens in localStorage, the absence of `Content-Security-Policy`, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, and `Permissions-Policy` removes all defense-in-depth, and the admin console is clickjackable.
Fix: Add a standard header block per app (tune `connect-src`/`img-src` per app):
```
/*
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()
  Content-Security-Policy: default-src 'self'; img-src 'self' https://data.tikocdn.org; connect-src 'self' https://*.tikoapi.org https://api.tikotalks.com; frame-ancestors 'none'
```

### [High] atlas-api `data.fetch` is an unauthenticated SSRF / open fetch proxy
File: `workers/atlas-api/src/domains.ts:359-368`
Why: Fetches any caller-supplied `http(s)` URL from the worker, returns title/description, caches in KV, and buffers the full body with no size cap. Combined with missing auth, this can probe internal/same-zone services and amplify traffic.
Fix: Require auth; block private-use hostnames and own API zones; cap response size; add `AbortSignal.timeout`.

### [High] Account "deletion" retains plaintext email and all PII indefinitely
File: `workers/identity-api/src/index.ts:602-618`
Why: `executeAccountDeletion` only sets `disabled_at`/`revoked_at`. `email_plain`, `email_hash`, display name/avatar metadata, and child handles persist forever after a deletion the API reports as `completed`, and no cleanup job ever purges verified-but-disabled accounts. (The intentional `email_plain` storage design is taken as a given; *post-deletion retention* is a separate GDPR-erasure problem.) Related: `resetAccountData` returns `status: 'completed'` with five `categoriesAffected` while deleting nothing (`:425-456`) — identity-api has no APP_DB binding and nothing consumes the audit event.
Fix: Null PII on account-scope deletion (keep a tombstone row); make reset endpoints either do the deletion via a service binding or report `requested` honestly.

### [High] shared/auth API-key path: nonexistent table, plaintext comparison, re-queried per request
File: `workers/shared/auth.ts:87, 118-124, 131-135`
Why: The `api_keys` table exists in no migration (only the orphaned root `migration.sql`), so `refreshKeysFromD1` throws, is swallowed, and the failing SELECT re-runs on **every authenticated request** (no negative caching). Were the table created as-is, `key.hash === token` implies plaintext key storage in a column named `key_hash`, compared non-constant-time; the env-var fallback is a plain `includes`.
Fix: Point at `identity_api_keys`, hash the presented token before comparing, set a short negative-cache TTL on failure.

### [High] Identity managed endpoints are CORS-broken for browsers; PUT preflight always rejected
File: `workers/identity-api/src/index.ts:198-225, 972-999`; ankore `dist/worker.js:356`
Why: Responses from `/pin`, `/mode/*`, `/child-accounts*`, `/reset`, `/deletion-requests`, `/profile` never get `Access-Control-Allow-Origin` (only `Allow-Credentials`, which is useless alone), and ankore's preflight advertises only `GET,POST,DELETE,OPTIONS`, so the PUT routes fail preflight outright. These endpoints can only work from native clients today — a functional break that also indicates the browser path was never exercised.
Fix: Apply the origin-allowlist reflection to managed responses and answer OPTIONS with PUT included.

---

## Medium

### [Medium] Magic-link tokens and OTPs persisted in plaintext message bodies
File: `workers/communication-api/src/index.ts:107-128`
Why: The full sign-in URL and OTP are stored in `communication_messages.text_body`/`html_body` in the shared `tiko-db`, indefinitely; `listInbox` already returns full bodies. Within the 15-minute window this is hijackable secret material; afterwards it's still secrets at rest.
Fix: Store a redacted body or template name + non-secret params.

### [Medium] admin-api uses wildcard CORS while identity-api maintains a strict allowlist
File: `workers/admin-api/src/index.ts:110-114`
Why: `Access-Control-Allow-Origin: *` on the admin API removes the browser-side defense identity-api deliberately built; a leaked token is usable from any origin with zero friction.
Fix: Reflect an admin-origins allowlist.

### [Medium] translations-api: fail-open webhook and upstream key reuse
File: `workers/translations-api/src/index.ts:211-238, 77-80`
Why: If `WEBHOOK_SECRET` is unset, anonymous `POST /v1/sync` purges all locale caches (documented as "optional" — an easy prod misconfiguration). Separately, `/v1/import` auth compares against the literal upstream `LEZU_API_KEY` — distributing a provider secret to internal callers — and `?? ''` folds an unset secret into the comparison, non-constant-time.
Fix: Fail closed when unset; introduce a dedicated service key; timing-safe compare.

### [Medium] Upload endpoints lack size/MIME validation; stored-content XSS path in content-api
File: `workers/media-api/src/index.ts:460-481, 765-789, 328-343`; `workers/content-api/src/index.ts:1076-1102, 1123-1125`
Why: Unlimited bytes of any content type into public CDN buckets; `file.type` trusted and replayed as `Content-Type` on serve — an uploaded `text/html` blob becomes stored content served with `ACAO: *` (admin-gated in content-api, any-session in media-api). media-api's `generateSafeFilename` regex misses `/` in extensions (R2 key namespace break) and the filename lands unescaped in `Content-Disposition` (`:749`). Asset upload also trusts a client-supplied `userId` field for attribution while ignoring `authed.userId` (`:774, 819`).
Fix: MIME allowlist + size caps; extension regex `/\.[a-z0-9]{1,8}$/i`; percent-encode `Content-Disposition`; attribute uploads from the verified session.

### [Medium] CLOUDFLARE_API_TOKEN exposed to every workflow step including `npm ci`
File: `.github/workflows/deploy.yml:11-18`
Why: Workflow-level `env:` puts the account-scoped token in the environment of `npm ci`, which executes arbitrary postinstall scripts of all transitive dependencies. A compromised dependency can exfiltrate it.
Fix: Scope the token to the wrangler/curl steps via per-step `env:`.

### [Medium] enrichImage: prompt injection via user-controlled title; vision output written unvalidated
File: `workers/generation-api/src/index.ts:1488-1554`
Why: The stored user title/prompt is interpolated into the vision instruction; a crafted title can steer the model, and the parsed title/description/tags are written with no length caps or filtering — child-facing metadata.
Fix: Truncate/escape the hint; cap parsed field lengths; fail fast when `GENERATION_PUBLIC_ROUTE` is unset.

### [Medium] sentence-api: unauthenticated click tracking can poison prediction ranking for all children
File: `workers/sentence-api/src/index.ts:379-390, 682-692`
Why: `POST /v1/sentence/select` increments global ranking weights with no auth, rate limit, or dedupe; at 200 clicks learned weight hits 1.0 (`:712`), letting anyone control which words AAC users are suggested first.
Fix: Require a session; cap per-subject contribution; clamp learned weight below 1.0.

### [Medium] Admin bearer token sent to arbitrary image hosts
File: `apps/admin/web/src/composables/useImageGeneration.ts:94-101`
Why: `pushToMedia` attaches `authHeaders()` to a fetch of `item.imageUrl` verbatim; if the URL points at the CDN or any third-party host, the admin token goes with it.
Fix: Attach Authorization only when the URL origin matches the API base.

### [Medium] Weak 32-bit cache-key hash can serve one user's cached phrases to another
File: `workers/sentence-api/src/index.ts:443, 932-938`
Why: Subject IDs are folded to ~31 bits for the phrases cache key; a collision serves user B's saved sentences to user A. The real SHA-256 helper exists one function below.
Fix: `(await hashText(subjectId)).slice(0, 32)`.

## Low (selected)

- Non-constant-time static-secret compares: atlas admin (`workers/atlas-api/src/index.ts:213`), content-api `ADMIN_SECRET` (`workers/content-api/src/index.ts:1060-1070` — also a second, parallel admin mechanism worth retiring).
- Production CORS allowlist includes localhost and `capacitor://`/`ionic://` origins with credentials (`workers/identity-api/wrangler.toml:35`).
- `Vary: Origin` only set for allowed origins in app-api/communication-api (`workers/app-api/src/index.ts:511-516`) — cache-poisoning hygiene; content-api does it right.
- media-api `analyze` lets any session spend OpenAI quota on arbitrary URLs (`workers/media-api/src/index.ts:600-631`) — restrict to own CDN hosts.
- Radio web sends pasted YouTube URLs to third-party `noembed.com` (`apps/radio/web/src/composables/useYouTubeMeta.ts:23`) — proxy through the backend for a children's product.
- `window.open(url, '_blank')` without `noopener` in the media app (`apps/media/web/src/pages/GalleryPage.vue:56`).
- tts-api echoes raw provider error bodies to unauthenticated clients and forwards arbitrary `model` strings to OpenAI (`workers/tts-api/src/index.ts:125, 172-174`).
- Hardcoded personal dev worker URL as default TTS/Atlas endpoint in shipped code (`packages/ui/src/index.ts:270`, `workers/generation-api/src/index.ts:459`) — children's speech text goes to a personal dev endpoint when env is unset.
- GitHub Actions pinned by major tag, not SHA, in workflows that hold the Cloudflare token.

## Coverage note

ankore's internals (the canonical magic-link/OTP/device auth flows, their attempt limiting and enumeration behavior) were **not** audited — they live in the external dependency. Everything above concerns code in this repo. Seed-data migrations were structurally verified, not row-audited.
