# Tiko Universe — Full Codebase Review

Review date: **2026-06-12** · Branch: `development` · Review-only: no source files were modified.

Scope: all 13 Cloudflare Workers, all 10 shared packages, all 12 web apps, the iOS apps + TikoKit, Android wrappers, tooling, tests, and CI/CD. ~190 findings (7 Critical, ~35 High). Every finding carries a severity, `file:line` reference, impact rationale, and a concrete fix; opinions are marked as such, and strengths are documented alongside problems.

**Start with [`00-executive-summary.md`](00-executive-summary.md)**, then [`08-recommendations.md`](08-recommendations.md) for the action plan.

## Index

| Document | One-line summary |
|---|---|
| [00-executive-summary.md](00-executive-summary.md) | Overall health ("good bones, unenforced controls"), top 10 issues by impact, quick wins, method & coverage disclosure. |
| [01-architecture.md](01-architecture.md) | Strong product-first monorepo undermined by shared D1 databases, five parallel auth implementations, built-but-unused transports, and ~1,500 lines of dead code. |
| [02-code-quality.md](02-code-quality.md) | No linter exists; duplication is the dominant issue (per-app runtime boilerplate ×7, worker helpers ×4–6, admin HTTP plumbing ×8); god files and doctrine-violating silent fallbacks. |
| [03-correctness-and-bugs.md](03-correctness-and-bugs.md) | Product-breaking bugs: Timer's display never ticks, Radio's pause skips tracks, the cleanup cron deletes child accounts, TTS cache races bill twice, iOS speech dies on the mute switch. |
| [04-security.md](04-security.md) | The critical chapter: unauthenticated paid-AI endpoints, an IDOR on children's phrases, a decorative PIN gate, brute-forceable PINs, tokens in localStorage/UserDefaults, no CSP — against a backdrop of zero SQL injection and zero XSS sinks. |
| [05-performance.md](05-performance.md) | content-api's 2N-subrequest card resolution, a 60fps forced-reflow marquee, 40-call sequential story renders, cache-correctness flaws that double provider spend. |
| [06-testing.md](06-testing.md) | Excellent worker contract tests vs a dead Playwright layer, six stale e2e suites, unit tests hitting production APIs, and coverage inverted relative to risk. |
| [07-dependencies.md](07-dependencies.md) | 0 known vulns, but deploys aren't CI-gated, two workers never deploy, builds are nondeterministic (network fetch in prebuild), dep placement inverted, docs drifted. |
| [08-recommendations.md](08-recommendations.md) | 40-item prioritized plan — Now (15 security/product-critical fixes), Next (structural: env isolation, shared auth, i18n reactivity, shared app runtime), Later (consolidation, a11y, test depth). |
| [09-talk-engine.md](09-talk-engine.md) | Deep dive: the suggestion pipeline works, but the learning engine is inert — no cron, learned transitions written but never read, signal keyed too finely to converge; 7-step evolution path. |
