# Shared User Flow Contracts

This directory defines the shared user-facing flows that every Tiko app must follow on web, iOS, and Android.

These documents are product contracts, not suggestions. Every current and future app must use the same shared flows unless a platform-specific difference is explicitly documented.

## Why this exists

Tiko apps are small and app-specific, but users must not relearn account, recovery, profile, settings, offline, deletion, or safety behavior for every app. The API contracts define what clients can call. These flow contracts define what users see and what clients must do.

## Required shared flows

- `identity-and-profiles.md` — user/profile states, what tapping the user/profile entry shows, PIN, recovery, deletion, and account contracts.
- `startup-and-session.md` — first launch, returning user, session restoration, session expiry, and no-login-wall rules.
- `settings-and-app-state.md` — shared settings structure, app settings, app state, sync, and local fallback.
- `offline-and-sync.md` — offline usage, queued writes, conflict policy, and visible states.
- `platform-compliance.md` — Apple/iOS, web, and Android platform rules that affect flows.
- `app-flow-template.md` — required template for every app-specific flow document.

## Non-negotiable rules

1. Apps open and work immediately.
2. No passwords.
3. No login wall.
4. Device-first identity is created or restored silently.
5. Caregiver recovery uses email magic links.
6. Profile and recovery UI is caregiver-facing, not child-blocking.
7. Account deletion must be available from inside every app that exposes account creation or recovery.
8. Web, iOS, and Android share the same behavior and contracts.
9. Platform-specific behavior may only change presentation, not product meaning.
10. Offline mode must preserve the child-facing core function wherever technically possible.

## App documentation requirement

Every app in `docs/flows/apps/` must document:

- purpose
- primary child flow
- caregiver settings flow
- shared flows used
- app-specific settings/state contracts
- offline behavior
- deletion impact
- platform notes
- smoke checklist

Use `app-flow-template.md` for new apps.
