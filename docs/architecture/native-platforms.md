# Native Platform Strategy: iOS and Android

## Short answer

Android is very realistic if the platform is API-first. It is not hard because of the backend; it is mostly additional UI implementation, store/release work, and mobile QA.

The key is to avoid web-only assumptions. If identity, data, i18n, and media are clean HTTPS APIs, Android becomes another client.

## Recommended native approach

### iOS

- SwiftUI
- Swift Concurrency
- URLSession
- XcodeGen
- iOS 17+

### Android

- Kotlin
- Jetpack Compose
- Kotlin Coroutines
- OkHttp/Ktor client
- Android 9+ or 10+ target baseline to be decided

## Why not start with cross-platform native immediately?

Options like React Native, Flutter, or Kotlin Multiplatform can work, but Tiko already has a strong web direction and Sil's native iOS preference is SwiftUI. Starting with API-first contracts keeps the door open without forcing one shared UI framework too early.

## Android difficulty

Backend/API port: low difficulty if API-first is done correctly.

Native UI port: medium difficulty. Each app needs Compose screens, state handling, persistence, and Android-specific polish.

Release/store setup: medium difficulty. Google Play signing, privacy declarations, testing tracks, screenshots, and device QA need setup.

## How to make Android easy from day one

- Keep APIs documented in `docs/api/openapi.yaml`.
- Avoid cookie-only authentication.
- Use bearer token session bundles for native clients.
- Keep responses typed and stable.
- Keep media upload routes standard multipart or signed-upload flows.
- Keep i18n keys and app state contracts platform-agnostic.
- Add contract tests that native teams can trust.

## Suggested order

1. Build web Yes No against API.
2. Build iOS Yes No against API.
3. Build Android Yes No against the same API.
4. Only then repeat for Type, Cards, Sequence, Timer.

## Native parity rule

If a feature requires special browser behavior, define the native equivalent in the app spec before calling the feature complete.
