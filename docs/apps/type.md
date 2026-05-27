# Type App Spec

## Job

A simple communication typing app for text entry, speech/output, and accessible composition.

## Priority

2

## Product note

Second priority. It validates text entry, language/i18n, TTS integration, and native keyboard behavior.

## Initial API needs

- device identity bootstrap
- typing preferences
- saved phrases/settings
- TTS/generation API later

## Web expectations

- Opens without login.
- Uses `@tiko/identity` for device/session bootstrap.
- Uses `@tiko/data` for app settings/state.
- Uses `@tiko/i18n` for text.
- Has mobile-first responsive layout.
- Has smoke tests for app load and critical interactions.

## iOS expectations

- Native SwiftUI client.
- Uses same API contract.
- No web-only login/cookie assumptions.
- Stores session bundle securely/appropriately for native.
- Matches child-facing interaction model, not necessarily every pixel.

## Android expectations

- Native Jetpack Compose client.
- Uses same API contract.
- Uses bearer/session bundle flow.
- Matches child-facing interaction model.

## Migration checklist

- [ ] Current `tiko-mono` behavior inventoried.
- [ ] Visual/UX reference captured.
- [ ] API contract written.
- [ ] Web app implemented against API.
- [ ] iOS contract/client implemented or planned.
- [ ] Android contract/client implemented or planned.
- [ ] i18n keys mapped.
- [ ] Smoke tests passing.
- [ ] Known behavior differences documented.
