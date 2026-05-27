# Sequence App Spec

## Job

An ordered-step communication/learning app for routines, stories, and sequencing tasks.

## Priority

4

## Product note

Fourth priority. It validates ordered data models and step-by-step child interaction flows.

## Initial API needs

- device identity bootstrap
- sequence collections
- ordered item state
- progress/settings

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
