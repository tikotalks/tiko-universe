# 08 — Recommendations: Now / Next / Later

A prioritized action plan synthesizing all findings. Items reference the chapter with full detail. Effort labels are rough: **S** (< half day), **M** (1–3 days), **L** (1+ week).

## Now — security-critical or product-breaking; do before/alongside any feature work

| # | Action | Effort | Detail |
|---|---|---|---|
| 1 | **Authenticate atlas-api capability routes** and enforce the registry allowlists; rate-limit high-cost capabilities | M | 04 — Critical. Open paid-API + SSRF surface on a public domain. |
| 2 | **Fix the sentence-api `userId` IDOR** — resolve the session first, reject mismatched subjects | S | 04 — Critical. Children's saved phrases readable/writable/deletable by anyone. |
| 3 | **Persist and validate `pinGrantToken`** in identity-api | M | 04 — Critical. Account deletion currently bypassable from child mode. |
| 4 | **Fix the cleanup cron**: exclude managed children, delete FK-dependent rows, per-subject try/catch | S–M | 03 — Critical. Currently deletes child accounts and wedges on first FK hit. |
| 5 | **Gate paid generation/TTS endpoints** (auth or rate limit + budget); normalize the voice-sample cache key | M | 04 — Critical cost-abuse vectors across generation-api, tts-api, sentence-api. |
| 6 | **Gate deploys on CI** (`needs: verify`) and add communication-api/translations-api to the deploy matrix | S | 07 — High. Failing tests currently deploy to production. |
| 7 | **Fix the Timer frozen-countdown bug** (reactive clock) | S | 03 — Critical. The app's core feature doesn't work. |
| 8 | **Fix Radio pause-auto-advances** (explicit `ended` signal) + the dead volume slider | S | 03 — Critical/High. |
| 9 | **Fix the PIN popup sparse-array bug** and the verify-mode fail-open default | S | 03/04 — High. Parents can lock themselves out; gate can pass any code. |
| 10 | **Add ownership/role checks to generation-api mutations**; require auth on draft listings | M | 04 — High. |
| 11 | **Make media-api privacy flags real**: default public-only, add owner column, auth private reads | M | 04 — High. |
| 12 | **Add security headers (`_headers`) to all apps** — CSP, frame-ancestors, nosniff | S | 04 — High. Pure config, no code. |
| 13 | **Add PIN/child-code attempt throttling** in identity-api | M | 04 — High. 10,000-guess online brute force today. |
| 14 | **`INSERT OR IGNORE` on all three TTS cache inserts** | S | 03 — High. Paid-then-500 race. |
| 15 | **Fix iOS Talk dev-API default** (`#if DEBUG`) and add `AVAudioSession` config to speech services | S | 03 — High. Release builds hit dev; mute switch silences AAC speech. |

## Next — structural fixes that stop the bleeding the Now items cauterized

| # | Action | Effort | Detail |
|---|---|---|---|
| 16 | **Isolate dev from prod**: separate D1 databases/KV per environment for identity, app, atlas, media, communication, generation, sentence; fix `provision-talk-dev.mjs`; stop re-seeding on deploy | L | 04/07 — High. Today "dev" mutates production auth and user data. |
| 17 | **One shared auth middleware in `workers/shared/`** (`requireSession`/`requireRole`/`requireServiceKey`, roles returned from one round-trip); delete the five divergent implementations and app-api's identity-DB fallback | L | 01/04. Eliminates the class of gap, not instances. |
| 18 | **Make `@tiko/i18n` reactive** (`@vue/reactivity` shallowRef + revision), fix the iOS `@Published bundles` twin, then delete the four per-app workarounds | M | 03 — High. Unblocks deleting a whole hack family. |
| 19 | **Extract `useTikoAppRuntime`** (base URLs, storage, identity wiring, hydrate/persist with debounced+serialized writes, system-theme listener) and migrate the 7 small apps; fixes radio's wrong API default and sequence/todo's missing `putSettings` as a side effect | L | 01/03. Highest-leverage web refactor. |
| 20 | **Move web sessions to the cookie transport; stop persisting tokens/device secrets in localStorage**; on iOS switch to the existing Keychain store with migration + shared access group | L | 04 — High. The safer infrastructure already exists on both platforms. |
| 21 | **Fix server-side version checks to compare-and-swap in SQL** (app-api, admin-api) and return real versions (`RETURNING`) | M | 03 — High. |
| 22 | **Make content-api bulk PUTs atomic (`batch`) and reconciling**; batch the per-card image N+1; fix cache invalidation (version-stamped keys) | M | 03/05 — High. |
| 23 | **Resurrect E2E**: install Playwright, fix config shape/ports, rewrite the six stale suites against current apps with a shared (shape-correct) identity mock; add a smoke job to CI | L | 06 — High. |
| 24 | **Stop unit tests hitting production APIs** (shared fetch-mock in `@tiko/testing`); fix the TikoKit failing test and run `swift test` + ios-ci on PRs | M | 06 — High. |
| 25 | **Honest deletion/reset**: null PII on account deletion; make reset endpoints actually delete app data (service binding) or report `requested` | M | 04 — High (GDPR-relevant). |
| 26 | **Fix identity managed-endpoint CORS** (allowlist reflection + PUT in preflight) and cookie-session acceptance in `requireIdentitySession` | M | 04 — High. Browser flows are currently broken, which is why the gaps went unnoticed. |
| 27 | **Admin console hardening**: shared `adminApi` module (fixes 401-vs-network logout), router-ready token read, atomic role replacement, defaults-page race guard | M | 03. |
| 28 | **Add timeouts/retries to all provider calls**; top-level error handlers in generation-api/tts-api/translations-api; queue or per-segment cache for story rendering | M | 03/05. |
| 29 | **Wire sentence-api's cron trigger** — after adding auth/caps to click tracking (see 04) | S | 03 — the learning loop has never run. |

## Later — consolidation, hygiene, and polish

| # | Action | Effort | Detail |
|---|---|---|---|
| 30 | **Dead-code deletion pass** (~1,500+ lines: talk legacy components, AddVideoPopup, TikoMediaClient, parent-mode.ts, PNG chain, unused bindings/tables, clock stub decision) — do before further extraction | M | 01/02. |
| 31 | **Adopt a real linter** (oxlint/ESLint+vue) into `npm run check` and CI | M | 02. |
| 32 | **Unify TTS**: retire tts-api and generation-api's local provider path in favor of Atlas (or persist Atlas results locally); one cache | L | 01/05. |
| 33 | **D1 ownership**: one database per worker or one migration dir per database; move `identity_deletion_requests` and root `migration.sql` into real migrations | L | 01. |
| 34 | **iOS TikoKit consolidation**: shared `TikoSpeechService` (audio session, language, Atlas fallback), shared CDN-resize helper, replace per-icon WKWebViews, `@Observable` convergence, shell i18n | L | 01/02/03. |
| 35 | **Accessibility pass**: radio's div track cards → buttons, localized a11y labels, real dialog semantics (focus trap/aria-modal), 44px touch targets, listbox semantics in the icon picker, RTL groundwork before shipping Arabic | L | 02/03 chapter notes; this is an AAC product — a11y is product quality, not polish. |
| 36 | **Test depth where risk lives**: PIN popup, useCardsStore, radio player, useAdminAuth; Miniflare-backed D1 for one suite per worker; coverage reporting | L | 06. |
| 37 | **Dependency hygiene**: swap root dep placement, declare undeclared deps, translations-api toolchain, pin actions to SHAs, scope the Cloudflare token per-step | S–M | 07. |
| 38 | **Docs refresh**: AGENTS.md ports, README structure, Android README reality; deterministic builds (commit generated configs or generate in deploy) | S–M | 07. |
| 39 | **Unify error envelopes** (or rename the two `ApiErrorEnvelope`s) and split god files (generation-api routes, admin god-pages, @tiko/ui index) | L | 02. |
| 40 | **Privacy follow-ups**: redact magic-link bodies in communication_messages, proxy YouTube metadata instead of noembed.com, drop `RadioSettings.pinHash` | M | 04. |

## Sequencing notes

- Items 1–15 are independent of each other and parallelizable; none requires design work.
- Do 30 (dead code) before 19/34 (extraction) so shared code isn't extracted from stale variants.
- 17 (shared auth) is the prerequisite that makes 1, 10, 11 cheap for *future* workers rather than per-worker patches.
- 23 (E2E) pays off most after 7/8/9 land — the rewritten suites should encode those regressions.
- 16 (env isolation) is operationally the riskiest; plan it as a migration, not a config flip, since prod data currently lives in the "dev" databases.
