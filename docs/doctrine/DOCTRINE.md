# Tiko Doctrine

## Core belief

Tiko is a child-first universe of tiny, focused communication and learning tools. The apps should feel immediate, safe, calm, and obvious. A child or caregiver should never be blocked by account ceremony before using an app.

## Non-negotiables

- API first.
- No passwords.
- No login walls.
- No legacy-user migration requirement.
- No old-data preservation requirement unless Sil explicitly changes this.
- No Better Auth assumption.
- Apps open and work immediately.
- Identity is device-first identity: anonymous local/device sessions first, optional email recovery later.
- Caregiver recovery uses magic links, not passwords.
- Cloudflare is the platform runtime: Workers, D1, R2, KV as cache, Queues where useful.
- D1 is source of truth for relational app data.
- R2 is source of truth for media bytes.
- KV is cache, never source of truth.
- Lezu is the translation platform; Tiko consumes Lezu and local fallbacks, it does not rebuild translation management.
- Tiko UI is product-specific. Do not replace it with generic Sil UI or another design system.
- Web, iOS, and Android are equal clients of the same API contracts.

## Product ideology

Tiko apps should be:

- **Immediate:** usable within seconds of opening.
- **Small:** each app does one job well.
- **Calm:** no noisy dashboards, aggressive onboarding, or adult SaaS patterns.
- **Accessible:** large tap targets, clear contrast, simple language, predictable flows.
- **Recoverable:** device-first by default, optional caregiver email/magic link for recovery and transfer.
- **Portable:** web, iOS, and Android clients share behavior through API contracts, not copy-pasted backend logic.
- **Composable:** every app can reuse identity, data, i18n, media, and UI primitives.

## Engineering ideology

- Build contracts before clients.
- Build one proof app before broad migration.
- Prefer boring, typed APIs over clever client logic.
- Keep Workers small and domain-owned.
- Add tests before removing old code.
- Port intentionally from `tiko-mono`; never bulk-copy legacy assumptions.
- Deletion requires proof: inventory, replacement, tests, smoke evidence.

## App priority

1. Yes No — first proof app for identity, child UX, settings/state, and native parity.
2. Type — communication text entry and symbol/language behavior.
3. Cards — cards/media/content complexity after the foundation works.
4. Sequence — ordered learning/communication flows.
5. Timer — focused utility app and good mobile-native polish target.

## Definition of done for a migrated app

An app is migrated only when:

- web client works against Tiko APIs
- native API contract is documented
- iOS path is viable or implemented for the app phase
- Android path is viable or implemented for the app phase
- app opens without login
- device identity bootstrap works
- app state/settings persist where relevant
- i18n works or has local fallback
- smoke tests pass
- console/network errors are triaged
- parity checklist is updated
- any intentional behavior changes are documented
