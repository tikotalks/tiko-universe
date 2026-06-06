# Shared Platform Compliance Flow Contract

## Purpose

Define platform constraints that affect Tiko user flows on iOS, web, and Android.

This document is not legal advice. It is a product and implementation checklist for reducing avoidable app review, privacy, and usability risk.

## Apple/iOS rules that affect Tiko flows

### No login wall unless account features are significant

Tiko's product rule already matches this: every app must work without login. Account and recovery must remain optional and caregiver-facing.

Implementation requirement:

- Do not block first launch with sign-in.
- Do not require email to use core app features.
- Do not require personal information unless directly relevant.

### Account deletion must be available in-app

If an app supports account creation or recovery, it must provide account deletion from inside the app.

Implementation requirement:

- Every Tiko app that exposes recovery/account features must include a reachable delete account/data flow.
- The delete action must not be hidden only on the website.
- The app may use `id.tikotalks.com` for verification, but the flow must start in the app.
- Local reset and server deletion must be clearly distinguished.

### Privacy policy must be accessible

Implementation requirement:

- Every app must include a Privacy Policy link in the app.
- The privacy policy must describe collected data, use, sharing, retention/deletion, and how to request deletion.
- Parent Mode account/settings UI must include the link.

### Data minimization

Implementation requirement:

- Do not collect name, birth date, location, contacts, microphone, photos, or tracking identifiers unless needed for an explicit feature.
- Recovery email must be optional.
- Display name should be free-form and may use nicknames.
- Avoid analytics in child-facing flows.

### Kids Category risk

If Tiko apps are submitted in Apple's Kids Category:

- Links out of the app, purchases, and distracting adult flows need a parental/caregiver gate.
- Third-party advertising should not be used.
- Third-party analytics are heavily restricted.
- Personally identifiable information and device information must not be sent to third parties in ways prohibited for kids apps.

Tiko product direction:

- No ads.
- No third-party tracking.
- Keep recovery, deletion, external links, and account actions behind caregiver context/PIN where appropriate.

### External web surfaces

When using `id.tikotalks.com`:

- iOS informational web pages should use visible Safari surfaces.
- Auth/recovery handoff should use the platform's authentication session where appropriate.
- Do not hide or obscure browser views.
- Use universal links/app links where possible.

### App completeness

Implementation requirement:

- Backend services used by submitted builds must be live during review.
- If a review account or demo mode is needed, provide it in App Review notes.
- Non-obvious account/recovery/deletion behavior must be explained in review notes.

## Web rules

- Web app must follow the same flows as native apps.
- Use secure cookies where appropriate, but keep bearer session behavior available for parity.
- Recovery through `id.tikotalks.com` may be same-origin or cross-subdomain redirect.
- Offline-capable web apps should use service worker/cache only for non-sensitive app assets and safe local data.
- Never cache raw secrets in service worker caches.

## Android rules

- Android must follow the same contracts and user states.
- Use encrypted storage for session/device secrets.
- Use Android App Links/Custom Tabs for `id.tikotalks.com` recovery.
- Offline and deletion language must match web/iOS.

## Shared app-store review notes

Each app submission should explain:

- The app works immediately without login.
- Identity is device-first.
- Recovery email is optional and caregiver-facing.
- Account deletion is available inside the app.
- The app does not use ads or third-party tracking.
- Offline core functionality remains available.
- Any external web recovery flow uses `id.tikotalks.com`.

## Compliance acceptance criteria

- Account deletion flow starts in-app.
- Privacy policy link exists in-app.
- Recovery email is optional.
- No core child-facing feature requires login.
- PIN/caregiver gate protects account/deletion/external-link flows where appropriate.
- Platform-specific browser/auth surfaces are used correctly.
- Review notes document non-obvious recovery/deletion behavior.
