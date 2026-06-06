# Shared User Flow Contracts

This directory defines the shared user-facing flows that every Tiko app must follow on web, iOS, and Android.

These documents are product contracts, not suggestions. Every current and future app must use the same shared flows unless a platform-specific difference is explicitly documented.

## Visual source of truth

The shared visual flow board is maintained in Figma/FigJam:

- [Tiko Platform Flows v2](https://www.figma.com/board/9svfiBJIfnIIhqwCzHNpjl)

The written docs are the implementation contract. The FigJam board is the visual explanation of the same contract. If they disagree, update both before implementation.

## Why this exists

Tiko apps are small and app-specific, but users must not relearn account, recovery, settings, offline, deletion, or safety behavior for every app. The API contracts define what clients can call. These flow contracts define what users see and what clients must do.

The canonical identity model is account-type based, not profile-switching based.

```text
Temporary Account -> Verified Account -> Profile Manager Account (admin only)
Profile Manager Account -> creates Child Accounts

Verified/Profile Manager Account: Parent Mode <-> Child Mode
Child Account: Child Mode only
```

## Required shared flows

- `user-modes.md` — canonical account types and runtime modes.
- `identity-and-profiles.md` — identity, account entry points, PIN, recovery, deletion, Profile Manager, and Child Account behavior.
- `startup-and-session.md` — first launch, returning user, session restoration, session expiry, and no-login-wall rules.
- `settings-and-app-state.md` — shared settings structure, app settings, app state, sync, and local fallback.
- `offline-and-sync.md` — offline usage, queued writes, conflict policy, and visible states.
- `platform-compliance.md` — Apple/iOS, web, and Android platform rules that affect flows.
- `app-flow-template.md` — required template for every app-specific flow document.

## Non-negotiable rules

1. Apps open and work immediately.
2. No passwords for normal accounts.
3. No login wall on first launch.
4. First launch creates a Temporary Account automatically.
5. Temporary Accounts run in Parent Mode only.
6. A Temporary Account can become a Verified Account by verifying email.
7. Verified Accounts log in by OTP or magic link.
8. Child Mode requires a Verified or Profile Manager Account plus a configured PIN.
9. Parent Mode is the only place where account, settings, recovery, PIN, delete/reset, and profile manager tools are visible.
10. Profile Manager Account status is granted only by admin.
11. Only Profile Manager Accounts can create Child Accounts.
12. Child Accounts are separate accounts with name/identifier plus 4-digit code.
13. Child Accounts are Child Mode only.
14. There is no profile switching or active child profile selection.
15. Account deletion must be available from inside every app that exposes account creation or recovery.
16. Deleting a Verified Account returns the client to first launch and creates a new Temporary Account.
17. Web, iOS, and Android share the same behavior and contracts.
18. Platform-specific behavior may only change presentation, not product meaning.
19. Offline mode must preserve the child-facing core function wherever technically possible.

## Removed concepts

Do not use these concepts in new implementation:

- basic user
- active profile
- profile switching
- managed child profile
- profile-manager mode
- child profile selection

## App documentation requirement

Every app in `docs/flows/apps/` must document:

- purpose
- primary child flow
- parent-mode settings flow
- shared flows used
- app-specific settings/state contracts
- offline behavior
- deletion impact
- platform notes
- smoke checklist

Use `app-flow-template.md` for new apps.
