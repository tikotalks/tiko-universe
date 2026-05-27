# Yes No App Spec

## Job

A child-facing choice/communication app for clear binary answers and caregiver-configurable prompts/buttons.

## Priority

1

## Product note

First proof app. It validates the identity model, no-login startup, child-safe UI, and web/iOS/Android parity.

## Initial API needs

- device identity bootstrap
- button labels/settings
- answer state/history if needed
- profile/setup state

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
