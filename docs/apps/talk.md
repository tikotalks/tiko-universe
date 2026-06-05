# Talk App Spec

## Job

An API-first sentence-building communication app. Children combine word tiles into full sentences, guided by backend intelligence that learns from usage patterns.

## Priority

6 (after Timer)

## Product note

Talk is the first Tiko app where the backend is the product. The frontend is intentionally thin — a render layer with no grammar logic. All intelligence (suggestions, templates, grammar rules, learning) lives in `workers/sentence-api/`.

This app bridges the gap between single-word labeling (Cards) and letter-by-letter typing (Type). It answers "How do I say what I mean?" by helping children construct grammatically-aware sentences from tile combinations.

## Distinct job

- Cards answers: "What is this called?" (single word)
- Type answers: "How do I spell it?" (letter-by-letter)
- **Talk answers: "How do I say what I mean?" (sentence)**

## Initial API needs

- device identity bootstrap
- new `workers/sentence-api/` (D1 + KV) exposed at `sentence.tikoapi.org` / `dev.sentence.tikoapi.org` once provisioned
- existing `generation-api` TTS for sentence audio
- app settings/state via `@tiko/data`

## Web expectations

- Opens without login.
- Uses `@tiko/identity` for device/session bootstrap.
- Uses `@tiko/data` for app settings/state.
- Uses `@tiko/i18n` for UI text (`talk.*` namespace).
- Uses `@tiko/ui` shell, TikoKit app color, TTS client.
- Frontend contains NO grammar logic, NO language packs (except offline fallback).
- Every sentence-building interaction is an API call to `sentence-api`.
- Has mobile-first responsive layout.
- Has smoke tests for app load and critical interactions.

## iOS expectations

- Native SwiftUI client.
- Uses same API contract. Same endpoints. Same responses.
- No grammar logic in native code.
- Stores session securely via shared TikoKit Keychain access group.
- Matches child-facing interaction model.

## Android expectations

- Native Jetpack Compose client.
- Uses same API contract.
- Uses bearer/session bundle flow.
- Matches child-facing interaction model.

## Documentation

- Doctrine: `apps/talk/docs/DOCTRINE.md`
- Product spec: `apps/talk/docs/SPEC.md`
- Architecture: `apps/talk/docs/ARCHITECTURE.md`
- Domain ADR: `docs/adrs/2026-06-05-talk-app-and-sentence-api-domains.md`

## Current implementation status

Talk is implemented in source on `development`, but live operation depends on Cloudflare deployment and domain provisioning.

- [x] English language pack seed defined (`workers/sentence-api/db/seed-en.sql`)
- [x] D1 schema written (`workers/sentence-api/schema.sql`)
- [x] `workers/sentence-api/` core endpoints implemented
- [x] Transition engine with KV caching covered by tests
- [x] Usage logging and scheduled learning hooks implemented
- [x] Web app implemented against Sentence API
- [x] i18n keys mapped (`talk.*`)
- [x] Offline fallback pack bundled (`apps/talk/web/src/data/fallback-pack-en.json`)
- [x] Local/CI smoke coverage for Talk package, worker, and web build paths
- [ ] D1 schema provisioned on live dev/prod Cloudflare databases
- [ ] App domain provisioned: `talk.tikoapps.org`
- [ ] Dev app domain provisioned: `dev.talk.tikoapps.org`
- [ ] Sentence API custom domain provisioned: `sentence.tikoapi.org`
- [ ] Dev sentence API custom domain provisioned: `dev.sentence.tikoapi.org`
- [ ] Pages project deployment verified: `tiko-talk` / `tiko-talk-dev`
- [ ] Live browser smoke passed against the deployed app and API
- [ ] iOS contract/client planned
- [ ] Android contract/client planned
