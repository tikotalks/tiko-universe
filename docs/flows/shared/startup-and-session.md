# Shared Startup and Session Flow Contract

## Purpose

Define how every Tiko app starts, creates/restores identity, handles sessions, and keeps the app usable across web, iOS, and Android.

## Non-negotiable startup rule

The app must never open into a dead logged-out state. First launch creates or restores a Temporary Account and opens in Parent Mode.

## Startup priorities

Startup must happen in this order from the user's perspective:

1. Open the app.
2. Restore an existing session/device identity if available.
3. If no usable session exists, create a Temporary Account.
4. Open Parent Mode for Temporary, Verified, and Profile Manager accounts.
5. Open Child Mode only for Child Accounts or accounts already locked into Child Mode.
6. Load local defaults and cached settings/state.
7. Sync remote settings/state when online.

## First launch flow

1. User opens app.
2. App calls `POST /v1/identity/device` or equivalent bootstrap.
3. Backend/client creates a Temporary Account if no existing account is available.
4. App opens in Parent Mode.
5. User can use the app immediately.
6. User may add a display name.
7. User may verify email to become a Verified Account.

Rules:

- No login wall.
- No required email before use.
- Temporary Account cannot enter Child Mode.
- Temporary Account is deleted automatically after 30 days inactivity.

## Returning session flow

1. User opens app.
2. App restores session/device credentials.
3. App fetches `GET /v1/identity/session` or performs bootstrap.
4. App receives account type and runtime mode.
5. App loads settings/state.
6. App syncs quietly.

Mode behavior:

| Account type | Startup mode |
| --- | --- |
| Temporary | Parent Mode |
| Verified | Last safe mode, or Parent Mode by default |
| Profile Manager | Last safe mode, or Parent Mode by default |
| Child Account | Child Mode only |

## Session storage

| Platform | Required storage behavior |
| --- | --- |
| Web | Prefer HttpOnly Secure cookies where available. Also support explicit bearer token behavior for native parity. |
| iOS | Store bearer session/device restore secret in Keychain. |
| Android | Store bearer session/device restore secret in encrypted platform storage. |

Never store raw tokens, OTPs, magic-link tokens, PINs, or child 4-digit codes in logs, screenshots, crash reports, or analytics.

## Session expired

When a session expires:

1. Keep local app use available where safe.
2. Show reconnect/login state only in Parent Mode or login surfaces.
3. Try silent bootstrap if device credentials exist.
4. If silent restore succeeds, resume.
5. If silent restore fails, return to first launch behavior and create a Temporary Account where appropriate.

Do not show a blocking sign-in wall for first launch or local use.

## Temporary to Verified flow

1. Temporary Account user opens Parent Mode.
2. User adds email.
3. User verifies through OTP or magic link.
4. Same account becomes Verified.
5. User can set PIN.
6. User can enable Child Mode.

## Verified/Profile Manager login flow

1. User enters email.
2. User receives OTP or magic link.
3. User verifies OTP or link.
4. App receives a session.
5. App opens Parent Mode unless a safe stored Child Mode state should resume.

## Child Account login flow

1. User chooses Child Account login.
2. User enters/selects child name or identifier.
3. User enters the 4-digit code.
4. App opens Child Mode.

Rules:

- Child Account login never opens Parent Mode.
- Child Account login must not expose manager account tools.

## Child Mode startup

Child Mode can start only when:

- account type is Child Account, or
- account type is Verified/Profile Manager and Child Mode was enabled after PIN setup.

Child Mode must hide all parent/account/settings/recovery/delete/manager UI.

## Device bootstrap failure

If bootstrap fails:

- App may continue with local-only temporary behavior if safe.
- App must not claim server sync is active.
- Parent Mode should show local-only/offline state.
- Child-facing use should continue where local data allows.
- App retries with backoff.

## App settings/state loading

Settings/state must be layered:

1. Built-in app defaults.
2. Cached local account/app settings.
3. Remote synced settings/state.

Remote settings should not interrupt an active child-facing action.

## Startup loading UI

Allowed:

- Small sync indicators.
- Skeletons for non-essential Parent Mode panels.
- Quiet offline/local-only state in Parent Mode.

Not allowed:

- Full-screen login wall on first launch.
- Blocking account setup before initial use.
- Blocking email verification before Parent Mode use.
- Blocking spinner before usable app shell appears.

## Acceptance criteria

- First launch creates a Temporary Account.
- Temporary Account opens in Parent Mode.
- Verified/Profile Manager accounts log in with OTP or magic link.
- Child Accounts log in with name/identifier plus 4-digit code.
- Child Accounts always open in Child Mode.
- No stale profile-switching startup behavior remains.
