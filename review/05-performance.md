# 05 — Performance

Scope: query patterns, request fan-out, render/layout cost, caching correctness, payload size. Workers run on Cloudflare (subrequest and CPU limits apply); the client audience includes low-end tablets, which raises the bar for render cost.

## What is done well

- **Cache-first TTS** (SHA-256 request hash → D1 → R2 with immutable cache headers) is the right shape for cost control on repeated child utterances, implemented in both TTS workers (`workers/generation-api/src/index.ts:538-560`, `workers/tts-api/src/index.ts:141-151`).
- **KV caching with TTLs and invalidation on writes** in sentence-api; content-api caches localized catalogs per language.
- All web apps lazy-load routes; the website ships a FOUC-free inline theme bootstrap; admin clears legacy service workers on boot.
- iOS Cards prefetches card images per collection; TikoMediaPicker debounces search and prefetches.

---

## Findings

### [High] content-api: per-card image resolution is an N+1 with an external-fetch fallback
File: `workers/content-api/src/index.ts:144-155, 598-601, 617-620, 669, 679`
Why: `mapCardsContentItems`/`getYesNoContent` resolve images **sequentially per item**: one D1 SELECT each, and on miss an external HTTP fetch to media-api per item. A catalog of N cards costs up to 2N sequential subrequests — hitting Workers subrequest limits and multi-second latency. Any request with a garbage `Authorization` header also skips KV caching entirely (`:1145-1147`), so unauthenticated callers can force the slow path.
Fix: Batch — collect refs, one `WHERE id IN (...)` query, `Promise.all` the few fallbacks; or denormalize the resolved URL at publish time.

### [High] Website homepage: per-frame forced reflow at 60fps, forever
File: `apps/website/web/src/pages/HomePage.vue:174-176, 195-205, 218-230`
Why: The marquee's rAF loop reads `scrollWidth` and runs `querySelectorAll` over ~100 tiles + `getBoundingClientRect()` per tile, then writes styles — a continuous read-write layout cycle even when the section is off-screen and no pointer is near it. This pins a core on the low-end devices the site targets. The same page also fires **9 unauthenticated API requests** (1 seed + 8 random pages) per visit to randomize a decorative strip that has a hardcoded fallback (`:137-164`).
Fix: Measure width on load/resize only (ResizeObserver); skip influence updates when `mediaPointerX === null`; pause the loop via IntersectionObserver. Replace the fan-out with one cached request.

### [High] generation-api `renderStory`: up to 40 sequential provider calls in one request
File: `workers/generation-api/src/index.ts:733-738`
Why: One slow segment stalls the whole render for minutes; one failure at segment 39 discards 38 paid segments (also a correctness/cost issue — see 03). No per-segment caching, no timeout.
Fix: Per-segment audio cache by hash; `ctx.waitUntil`/queue or Durable Object for the long render; timeouts and one retry.

### [Medium] identity-api: ~8–10 sequential D1 queries per session-mutating request
File: `workers/identity-api/src/index.ts:740-762, 889-933`
Why: `sessionResponse` does ankore `/session` → contract decoration (roles + bootstrap email-hash check + runtime state + email backfill) → then `requireIdentitySession` re-validates the same session and `accountTypeForSubject`/`deriveRuntime` re-query roles and subjects. Several lookups are duplicated, all sequential. `executeAccountDeletion`/`deleteManagedChild` similarly run 3–7 sequential statements that could be one `batch()` (which would also fix their atomicity).
Fix: Thread fetched roles/runtime through; `Promise.all` independent lookups; `db.batch()` for multi-statement writes.

### [Medium] admin-api `listUsers`: sessions × devices × roles cartesian product, no pagination
File: `workers/admin-api/src/index.ts:493-512`
Why: A subject with 40 sessions, 3 devices, 2 roles materializes 240 intermediate rows before GROUP BY; with 180-day session TTLs and no pruning this degrades steadily. `LIMIT 100` silently truncates. The admin UI then renders the whole result with no paging or virtualization (`apps/admin/web/src/pages/UsersPage.vue:110-140`) — and anonymous device-bootstrap subjects accumulate by design.
Fix: Correlated subqueries/CTEs per aggregate; cursor pagination end-to-end.

### [Medium] sentence-api: up to ~120 sequential D1 INSERTs in the request path
File: `workers/sentence-api/src/index.ts:659-680, 581-596`
Why: Every cache-miss `next` call runs the AI prediction *and* one awaited `run()` per candidate word — each its own implicit transaction — while a child waits for word suggestions.
Fix: `db.batch()` or multi-row INSERT chunked to the parameter limit; store only the top ~50.

### [Medium] media-api: audio album listing is N+1 and unbounded
File: `workers/media-api/src/index.ts:949-961`
Why: One `audio_tracks` query per album in a loop, no pagination; radio clients hit this on startup.
Fix: Single `WHERE album_id IN (...)` join, group in JS, add a LIMIT.

### [Medium] content-api: `POST /v1/query` writes unbounded attacker-controlled KV cache keys
File: `workers/content-api/src/index.ts:1226-1228`
Why: `'query:' + JSON.stringify(query)` — every unique unauthenticated body becomes a KV write (300s TTL); keys can exceed KV's 512-byte limit and throw. Write amplification + namespace pollution.
Fix: SHA-256 the canonicalized query; cache only known-cheap methods.

### [Medium] Cache-correctness defects that double provider spend
File: `workers/generation-api/src/index.ts:356-362, 613-633`; `workers/tts-api/src/index.ts:67-68`; `workers/content-api/src/index.ts:114-132`
Why: (a) The Atlas TTS path checks generation-api's local cache but never writes it — a wasted D1 round-trip per request and two cache layers that disagree. (b) Voice-sample R2 keys include the raw `model` param while the provider call clamps it — every unique value is a paid cache miss (also an abuse vector, see 04). (c) tts-api shares D1 across envs but not R2, so a cache hit can return a URL whose object exists only in the other env's bucket → permanent 404 for that text. (d) content-api invalidation misses all languages outside a hardcoded list of 10, and the un-suffixed base keys it deletes are never written.
Fix: Persist Atlas results locally (or drop the pre-check); normalize cache keys; include env in the cache row or verify the R2 object on hit; version-stamp content cache keys.

### [Medium] iOS: a WKWebView per icon
File: `packages/tikokit-ios/Sources/TikoKit/TikoOpenIcon.swift:42-80`
Why: Each `TikoOpenIconView` spins up its own WKWebView (own GPU surface) and reloads HTML on every SwiftUI update; the yes-no tile editor shows one per row and the picker shows 7 at once. Heavy on memory/GPU on older iPads — the same class of WKWebView trouble already fought in Radio.
Fix: The 7 SVGs are simple strokes — render as SwiftUI `Path`s or template PDF assets.

### [Medium] Admin: full-size multi-MB originals rendered into 96px thumbnails
File: `apps/admin/web/src/pages/CardsPage.vue:52-70`, `components/defaults/CardsEditor.vue:88-104`
Why: The CDN-resize branch checks `parsed.host === 'data.tikocdn.org'` on a URL just constructed for `media.tikoapi.org` — never true, so the `cdn-cgi/image/width=` path is dead and every card thumbnail downloads the full generator PNG.
Fix: Resolve the CDN URL first (as `useAdminMediaLibrary.itemPreviewUrl` does) or support `?width=` on the download endpoint.

### [Low] Assorted
- Admin users page renders thousands of DOM nodes (see Medium above); media list fetches have no cancellation so stale responses clobber newer filters (`apps/media/web/src/composables/useMediaLibrary.ts:116-150`).
- Talk's `prefetchCache` grows unbounded for the session (`apps/talk/web/src/composables/useSentenceApi.ts:99, 208-223`) — cap with a small LRU.
- iOS `TikoRemoteImageCache` writes to Application Support with no eviction and no backup exclusion (`TikoCachedRemoteImage.swift:18-23`).
- `recalculatePredictionScores` clears the entire `sentence:next:` KV prefix once per sequence inside its loop (`workers/sentence-api/src/index.ts:725`) — moot until the cron exists, then a KV-ops bill.
- Every app's vite config force-prebundles `highlight.js/lib/core` (`apps/*/web/vite.config.ts:14-16`) — none render code; the dependency leaks from `@sil/ui`. Worth checking what it adds to install/prebundle time.
- shared/auth re-runs a guaranteed-failing SELECT on every authenticated request (no negative cache) — see 04-security.
- Radio web rewrites remote state on every boot due to fresh `addedAt` stamps (`apps/radio/web/src/App.vue:405-427`) — pointless PUT churn.
- iOS shell fetches 100 media items on fresh install just to pick a random avatar (`TikoAppShell.swift:448-457`).

## Bundle-size note

No bundle analysis was run (review-only; no builds executed). Risk indicators worth a follow-up `vite build --report`: `@sil/ui` pulling `highlight.js` into every child app, and the admin god-pages (1,400–1,500 lines each) being eagerly compiled per route chunk.
