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

## Migration checklist

- [ ] English language pack defined (≥200 words, ≥20 templates)
- [ ] D1 schema written and provisioned
- [ ] `workers/sentence-api/` core endpoints implemented
- [ ] Transition engine with KV caching working
- [ ] Usage logging and weight calculation working
- [ ] Web app implemented against Sentence API
- [ ] iOS contract/client planned
- [ ] Android contract/client planned
- [ ] i18n keys mapped (`talk.*`)
- [ ] App domain provisioned: `talk.tikoapps.org`
- [ ] Dev app domain: `dev.talk.tikoapps.org`
- [ ] Sentence API domain provisioned: `sentence.tikoapi.org`
- [ ] Dev sentence API domain: `dev.sentence.tikoapi.org`
- [ ] Pages project: `tiko-talk`
- [ ] Smoke tests passing
- [ ] Offline fallback pack bundled
