# Shared Startup and Session Flow Contract

## Purpose

Define how every Tiko app starts, restores identity, handles sessions, and keeps the child-facing experience available across web, iOS, and Android.

## Non-negotiable startup rule

The app shell and primary child-facing function must render immediately. Identity bootstrap, recovery, sync, and settings loading must not create a login wall.

## Startup priorities

Startup must happen in this order from the user's perspective:

1. Show usable child-facing app shell.
2. Load local defaults and cached profile/app settings.
3. Restore or create device-first identity in the background.
4. Fetch remote settings/state when online.
5. Apply remote data only when it does not interrupt active child use.
6. Show caregiver-visible sync/recovery state only where useful.

## First launch flow

1. User opens app.
2. App renders default child-facing UI with local defaults.
3. App calls `POST /v1/identity/device` in the background.
4. If successful, app stores session token and device secret using platform-appropriate storage.
5. App requests app settings and state.
6. App merges settings/state into the UI without breaking the current interaction.
7. If recovery is not enabled, app may show a non-blocking caregiver suggestion inside Profile Overview only.

## Returning user flow

1. User opens app.
2. App renders using cached profile, settings, and state.
3. App verifies session with `GET /v1/identity/session` or refreshes through device bootstrap.
4. App syncs settings/state.
5. App updates sync status.

## Session storage

| Platform | Required storage behavior |
| --- | --- |
| Web | Prefer HttpOnly Secure cookies where available. Also support explicit bearer token behavior for parity. |
| iOS | Store bearer session/device restore secret in Keychain. |
| Android | Store bearer session/device restore secret in encrypted platform storage. |

Never store raw tokens in logs, screenshots, crash reports, or analytics.

## Session expired

When a session expires:

1. Keep child-facing app usable with local data.
2. Mark sync as disconnected in caregiver/profile UI.
3. Try silent device bootstrap if device credentials exist.
4. If silent restore succeeds, resume sync.
5. If silent restore fails, offer recovery through Profile Overview.

Do not show a blocking sign-in screen.

## Device bootstrap failure

If `POST /v1/identity/device` fails:

- App continues in local-only mode.
- Child-facing UI stays usable.
- App queues syncable writes where safe.
- Profile Overview shows `Local only` or `Not syncing`.
- App retries using backoff.

## App settings/state loading

Settings/state must be layered:

1. Built-in app defaults.
2. Cached local profile/app settings.
3. Remote synced settings/state.

Remote settings should not override active input mid-interaction. Apply after the current interaction, on next screen render, or after a small non-disruptive state update.

## Startup loading UI

Allowed:

- Skeletons for non-essential caregiver/settings panels.
- Small sync indicators.
- Quiet offline indicator.

Not allowed:

- Full-screen login wall.
- Blocking account setup.
- Blocking recovery prompt.
- Blocking spinner before the main child-facing app appears.

## Multi-device behavior

When a recoverable user opens another device:

1. App opens in local device-first mode.
2. Caregiver chooses recovery/import from Profile Overview.
3. App opens `id.tikotalks.com` recovery.
4. Magic link verifies identity.
5. App receives or refreshes session.
6. App fetches profiles, settings, and state.
7. App asks caregiver which profile to use if multiple exist.
8. App applies profile/app settings.

## Acceptance criteria

- Every app shows usable UI before network completion.
- Every app can run local-only after bootstrap failure.
- Every app uses the same session lifecycle states.
- Every app distinguishes local-only, syncing, synced, offline, and disconnected states.
- Every app can recover through `id.tikotalks.com` without passwords.
