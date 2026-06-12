# 00 — Executive Summary

**Repository**: tiko-universe — API-first AAC (Augmentative and Alternative Communication) platform for children. 12 Vue 3 web apps, 6 SwiftUI iOS apps + shared TikoKit, Capacitor Android wrappers, 13 Cloudflare Workers, 10 shared packages. ~68k LOC TS/Vue plus a substantial Swift codebase.

**Review date**: 2026-06-12. Review-only; no source files were modified. Method and coverage disclosure at the bottom.

---

## Overall health assessment

**The architecture is good; the enforcement is not.** This codebase has unusually strong bones for its size: a clean product-first monorepo, genuinely API-first design with real contract tests, disciplined SQL (zero injection findings across 13 workers), zero `v-html`, offline-first clients that degrade gracefully, and a doctrine document that correctly identifies the engineering failure modes to avoid. The people building this know what good looks like.

The problem is the gap between designed and enforced. Security controls the product model depends on — the PIN gate, "private" media, paid-API protection, per-user data isolation — exist as UI affordances, type contracts, or half-wired infrastructure, but are not enforced server-side. Safer infrastructure that was *already built* (HttpOnly cookie transport, an iOS Keychain store, capability allowlists, optimistic-version machinery) sits unused next to the unsafe path that actually ships. The same pattern repeats operationally: CI exists but doesn't gate deploys; e2e suites exist but test apps that no longer exist; dev and prod "environments" exist but share the same databases.

Severity distribution across ~190 findings: **7 Critical, ~35 High, ~70 Medium, ~75 Low.** The Criticals cluster in two places: worker authorization (4) and client product-breakage (3).

## Top 10 issues by impact

1. **atlas-api capability endpoints are completely unauthenticated** on a public domain — anyone can burn OpenAI/ElevenLabs credits and use an SSRF-able fetch proxy. The auth bindings exist; they were never wired. (`workers/atlas-api/src/index.ts:18-22` — 04)
2. **sentence-api IDOR**: caller-supplied `userId` is trusted with no token, exposing read/write/delete of children's saved phrases. (`workers/sentence-api/src/index.ts:950` — 04)
3. **The PIN gate on account reset/deletion is decorative** — `pinGrantToken` is never persisted or validated; any non-empty string passes, including from a child-mode session. (`workers/identity-api/src/index.ts:255,434,490` — 04)
4. **The admin cleanup cron hard-deletes managed child accounts** (they have no verified email) and wedges permanently on FK violations mid-run. (`workers/admin-api/src/index.ts:581-633` — 03)
5. **Unauthenticated paid-AI cost abuse** across generation-api, tts-api, and sentence-api, including a cache-key flaw making every request a fresh paid call. (04)
6. **Dev and production share the same D1 databases** for identity, app, atlas, media, communication, generation, and sentence workers — `wrangler dev` and dev deploys mutate production auth and user data; deploys also re-seed it. (wrangler.tomls; `scripts/cloudflare/provision-talk-dev.mjs:120-133` — 04/07)
7. **Deploys are not gated on CI**, and two workers are missing from the deploy matrix entirely. (`deploy.yml:3-6,66` — 07)
8. **Long-lived credentials in XSS-reachable storage on both platforms** — 180-day tokens + device secrets in localStorage (web, incl. the admin console, with no CSP anywhere) and plaintext UserDefaults (iOS), while the cookie transport and Keychain store both already exist unused. (04)
9. **Product-breaking client bugs in core features**: the Timer's countdown display never updates; Radio's pause button auto-advances to the next track (and its volume slider does nothing); iOS speech is silenced by the mute switch; iOS Type's Speak button is a TODO. (03)
10. **PIN/child-code brute force**: 4-digit space, single fast hash, zero attempt throttling on three endpoints — plus a UI bug allowing accidental 1-digit PINs that lock parents out. (04/03)

## Quick wins (high impact, < a day each)

- Gate deploy jobs on a `verify` job; add communication-api to the matrix.
- Fix the sentence-api IDOR (one function), the TTS cache races (`INSERT OR IGNORE` ×3), and the cleanup-cron child exclusion (one WHERE clause + try/catch).
- Fix the Timer reactive clock, Radio's `ended` signal and volume `onInput`, and the PIN popup's `Array(4).fill('')`.
- Add `_headers` security headers to all apps (pure config).
- iOS: `#if DEBUG` on Talk's API default; `AVAudioSession.setCategory(.playback)` in speech services.
- Fix the TikoKit color test and add `swift test` to CI.
- Move root toolchain deps to `devDependencies`; scope `CLOUDFLARE_API_TOKEN` per-step.

## Strengths worth protecting

- **Contract tests** (`tests/`) running real worker handlers against fail-closed fakes — including security assertions (token hashing, replay rejection, PII redaction). Extend this pattern; don't let it erode.
- **Parameterized SQL universally**; allowlist-validated identifiers in the only dynamic fragments.
- **Offline-first, child-first client design**: every app renders from local storage immediately, treats APIs as enhancement, and TTS degrades Atlas → cache → audio → browser synthesis without ever throwing at a child.
- **atlas-api's observability layer** (structured events, cost estimation, secret redaction, audit isolation) and **communication-api's hygiene** (timing-safe compares, escaped email templates).
- **TikoKit** keeps per-iOS-app boilerplate to ~5 lines; modern Swift concurrency is mostly textbook.
- **yes-no's web unit suite** and **talk's composable tests** are the in-repo templates for how to test these apps.

## Report contents

| File | Focus |
|---|---|
| `01-architecture.md` | Boundaries, coupling, duplication strategy, dead code |
| `02-code-quality.md` | Readability, duplication detail, type safety, lint absence |
| `03-correctness-and-bugs.md` | Functional bugs, races, error handling (7 Critical/High clusters) |
| `04-security.md` | Authn/authz, abuse vectors, credential storage, PII |
| `05-performance.md` | N+1s, request fan-out, render cost, cache correctness |
| `06-testing.md` | What's tested vs where the risk is; dead E2E layer |
| `07-dependencies.md` | Deps, build determinism, CI/CD, DX, docs drift |
| `08-recommendations.md` | Prioritized Now / Next / Later plan (40 items) |

## Method & coverage disclosure

The review was performed in parallel passes by scope (workers ×3, packages ×2, web apps ×3, iOS/Android, tooling/CI), reading actual source files — not skimming directory listings. Every `.ts` file in all 13 workers was read in full, as were all shared packages, all 12 web apps' source, TikoKit, and the iOS sources for yes-no/cards/radio/timer/type/talk. Lighter coverage (skimmed or spot-checked): seed-data SQL migrations (structure verified, not row data), large `<style>` blocks, static website content pages, talk's iOS view bodies, three of six `Project.yml` files, Android Gradle trees, and generated artifacts. **Not audited**: the `ankore` dependency's internals (the canonical magic-link/OTP/device flows — their rate limiting and enumeration behavior are outside this repo), `@sil/ui`, and `docs/` content beyond the doctrine. Findings cite exact `file:line` references current as of the review date; line numbers will drift with edits.
