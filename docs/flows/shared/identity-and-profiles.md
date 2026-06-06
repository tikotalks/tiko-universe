# Shared Identity and Profile Flow Contract

## Purpose

Define exactly how identity, profiles, PIN, recovery, account actions, and user/profile entry points behave in every Tiko app.

This document applies to web, iOS, and Android. Platform differences are allowed only where noted.

## Product principles

- The child-facing app must never be blocked by sign-in, recovery, setup, or profile management.
- Identity is device-first and silent.
- Recovery is optional and caregiver-facing.
- Profiles are for app personalization and continuity, not for social identity.
- A profile is not a public account.
- A PIN protects caregiver areas from casual child access. It is not a secure authentication factor.
- Forgotten PIN recovery must happen through recovery identity at `id.tikotalks.com`, not through guessing, security questions, or password reset.
- Deletion must be understandable, reversible only where explicitly stated, and compliant with app-store rules.

## Terms

| Term | Meaning |
| --- | --- |
| Device user | The default identity created or restored silently for one device. |
| Recoverable user | A device user upgraded with caregiver email recovery. |
| Profile | A child/person usage profile under a user. Used for settings, language, preferences, and app state. |
| Active profile | The currently selected profile used by an app. |
| Caregiver area | Any screen that changes recovery, profiles, deletion, security, or cross-app settings. |
| PIN | Local caregiver gate used to reduce accidental child access. |
| Recovery email | Caregiver email used for magic-link recovery. |
| Magic link | One-time link used to verify recovery or restore access. |

## Required contracts

Current contracts already available:

- `POST /v1/identity/device` creates or restores a device-first session.
- `GET /v1/identity/session` returns the current session.
- `POST /v1/identity/email` requests or attaches recovery email through a generic response.
- `POST /v1/identity/magic-links/verify` verifies a recovery link and returns a session.
- `POST /v1/identity/logout` revokes the current session.
- `GET/PUT /v1/apps/{app}/settings` stores app settings.
- `GET/PUT /v1/apps/{app}/state` stores app state.

Needed contract additions before full profile implementation:

```text
GET    /v1/identity/profiles
POST   /v1/identity/profiles
GET    /v1/identity/profiles/{profileId}
PUT    /v1/identity/profiles/{profileId}
DELETE /v1/identity/profiles/{profileId}
PUT    /v1/identity/active-profile
POST   /v1/identity/pin
POST   /v1/identity/pin/verify
DELETE /v1/identity/pin
POST   /v1/identity/deletion-requests
GET    /v1/identity/deletion-requests/{requestId}
POST   /v1/identity/recovery/start
POST   /v1/identity/recovery/complete
```

These endpoint names are proposed product contracts. The OpenAPI file must be updated before implementation.

## User/profile entry point

Every app must expose the same caregiver/profile entry point.

### Placement

- Web: top-right profile button or app menu item, depending on available space.
- iOS: toolbar/profile button or settings entry using native navigation patterns.
- Android: top app bar/profile button or settings entry using native navigation patterns.
- Child-first apps may hide the entry behind a long press or caregiver area button if accidental taps are likely, but the entry must remain discoverable for caregivers.

### Visual states

| State | Entry label/icon | Badge | Tap behavior |
| --- | --- | --- | --- |
| No active profile, device user only | Generic user icon | none | Opens Profile Overview. |
| Active profile exists | Profile avatar/initial/name | none | Opens Profile Overview for active profile. |
| Recovery not enabled | Profile avatar/user icon | subtle warning dot allowed | Opens Profile Overview with recovery suggestion. Must not block child flow. |
| Unsynced local changes | Profile avatar/user icon | sync dot | Opens Profile Overview with sync status. |
| Offline | Profile avatar/user icon | offline dot | Opens Profile Overview with offline status and limited actions. |
| PIN locked caregiver area | Profile avatar/user icon | none | Opens PIN gate before caregiver actions. |
| Deletion pending | Profile avatar/user icon | warning dot | Opens deletion status and cancel option if cancellation window exists. |
| Session expired but app usable locally | Profile avatar/user icon | sync warning | Opens Profile Overview with reconnect/recover actions. |

Do not show scary account warnings on the child-facing main screen unless data loss is imminent and actionable.

## Profile Overview screen

Tapping the user/profile entry opens Profile Overview.

### Always visible

- Active profile name or fallback label: `Profile`.
- App name and current app settings shortcut.
- Sync/offline status.
- Recovery status.
- Manage profiles.
- Settings.
- Help/support link.
- Privacy policy link.

### Visible when no recovery email exists

- `Add recovery email`.
- Explanation: recovery lets caregivers restore access on another device or after reinstalling.
- No blocking modal.

### Visible when recovery email exists

- Recovery email status, masked where appropriate.
- `Change recovery email`.
- `Recover on another device` or `Open recovery page`.

### Visible when PIN is not set

- `Set caregiver PIN`.
- Explanation: PIN helps keep children away from caregiver settings, but it is not a password.

### Visible when PIN is set

- `Change PIN`.
- `Remove PIN`.
- `Forgot PIN?`.

### Visible when offline

- Offline status.
- Last successful sync time if known.
- Disabled state for actions that require the server: recovery email, deletion request, restore on another device.
- Local-only actions remain available: app use, local settings, local profile switching where cached.

### Visible when deletion is pending

- Deletion status.
- What will be deleted.
- Expected timing if known.
- Cancel deletion if supported.
- Export/download data if supported and applicable.

## Caregiver gate and PIN

### When PIN is required

A PIN gate is required before:

- changing recovery email
- deleting user/account
- deleting profile
- changing PIN
- removing PIN
- viewing sensitive recovery state
- exporting data
- advanced sync/recovery actions

A PIN gate is optional before:

- opening basic settings
- changing app display settings
- switching profile

A PIN gate must not be required before:

- using the child-facing app
- speaking, selecting, typing, or otherwise communicating
- local offline child use

### PIN setup

Flow:

1. Caregiver opens Profile Overview.
2. Selects `Set caregiver PIN`.
3. App explains what the PIN does and does not do.
4. Caregiver enters 4 or 6 digits.
5. Caregiver confirms PIN.
6. PIN is stored securely on device where possible.
7. If recoverable identity exists, PIN reset can be authorized via recovery.

Rules:

- Do not call it a password.
- Do not imply strong account security.
- Do not store raw PIN server-side.
- Prefer local secure storage for PIN verification.
- Server-side PIN recovery state may exist only as reset authorization metadata, not raw PIN recovery.

### PIN verification

States:

| State | Behavior |
| --- | --- |
| Correct PIN | Continue to caregiver action. |
| Wrong PIN | Show simple error. Do not reveal extra information. |
| Multiple wrong attempts | Add short local delay. Do not lock child-facing app. |
| Offline | Verify locally if PIN hash exists locally. |
| No local PIN material | Require recovery flow when online. |

## Forgotten PIN

Forgotten PIN must not turn into support burden or insecure guessing.

### If recovery email exists

Flow:

1. Caregiver taps `Forgot PIN?`.
2. App explains that PIN reset uses caregiver recovery.
3. App opens `id.tikotalks.com/recovery` using the platform-appropriate browser surface.
4. Caregiver enters recovery email.
5. `id.tikotalks.com` sends a generic magic-link response.
6. Caregiver opens magic link.
7. Recovery verifies identity.
8. Caregiver returns to app or continues in web recovery.
9. App receives/refreshes session.
10. Caregiver sets a new PIN.

Rules:

- The app must not reveal whether an email exists.
- The recovery page must use generic success text.
- Magic links must expire.
- Recovery must not require a password.
- The child-facing app must remain usable locally while PIN recovery is unresolved.

### If recovery email does not exist

Flow:

1. Caregiver taps `Forgot PIN?`.
2. App explains that the PIN cannot be reset without recovery.
3. App offers local destructive reset only where appropriate.

Allowed options:

- Keep using the app without caregiver changes.
- Delete local app data and start fresh on this device.
- Contact support only for guidance, not manual identity takeover.

Not allowed:

- Security questions.
- Guessing hints.
- Email existence checks.
- Manual support reset without strong proof and an explicit support policy.

## Recovery through `id.tikotalks.com`

`id.tikotalks.com` is the canonical cross-platform recovery surface.

Use it for:

- forgotten PIN recovery
- recovering on a new device
- verifying magic links
- changing recovery email when deep native handling is not ready
- account deletion confirmation if extra verification is needed

Platform handling:

| Platform | Required behavior |
| --- | --- |
| Web | Same-origin or safe redirect to `id.tikotalks.com`. |
| iOS | Use `ASWebAuthenticationSession` for auth-style recovery or `SFSafariViewController` for visible informational pages. Do not hide SafariViewController. |
| Android | Use Custom Tabs where available. |

The recovery surface must return to the app through universal links/app links where supported. If not supported, the user must get clear manual instructions.

## Profiles

Profiles allow one user/device/recoverable account to support one or more children or usage contexts.

### Profile fields

Minimum profile contract:

```ts
interface TikoProfile {
  id: string
  name: string
  avatar?: string
  language?: string
  colorMode?: 'light' | 'dark' | 'system'
  accessibility?: {
    textSize?: 'normal' | 'large' | 'extra-large'
    reduceMotion?: boolean
    highContrast?: boolean
    audioFeedback?: boolean
  }
  createdAt: string
  updatedAt: string
  deletedAt?: string
}
```

### What profiles do

Profiles should:

- store preferences used across apps
- provide per-child state separation
- hold language/accessibility preferences
- allow multiple children on one caregiver device
- allow apps to keep app-specific settings/state under a profile

### What profiles can do later

Profiles can later support:

- image/avatar media
- therapist/teacher sharing
- profile-specific content packs
- cross-device sync
- export
- managed school/classroom contexts

### What profiles must not do in P0

Profiles must not:

- become social profiles
- expose public identity
- require personal data beyond a display name
- require date of birth unless legally/product-required
- block app usage if profile sync fails

## Profile states

| State | Meaning | User-facing behavior |
| --- | --- | --- |
| None | No profile created yet. | App uses default local profile silently. Profile Overview offers `Create profile`. |
| Local only | Profile exists only on device. | App works. Show sync/recovery suggestion only in caregiver area. |
| Synced | Profile exists in platform storage. | Normal state. |
| Unsynced changes | Local changes not yet saved. | Show non-blocking sync status. Retry later. |
| Conflict | Server and local profile diverged. | Prefer newest safe setting. For destructive changes, ask caregiver. |
| Deleted locally | Profile removed from this device, pending server sync. | Hide from active profile list. Queue deletion. |
| Deleted remotely | Server says profile deleted. | Remove locally after confirmation or safe sync. |

## Profile switching

Flow:

1. Caregiver opens Profile Overview.
2. Selects `Manage profiles`.
3. Selects another profile.
4. App switches active profile.
5. App reloads profile-specific app settings/state.
6. App returns to child-facing screen.

Rules:

- Switching profiles must be fast.
- Do not force server roundtrip before allowing switch if profile is cached.
- Show if profile is local-only or unsynced.
- Each app must document whether app state follows profile, device, or both.

## Delete profile

Deleting a profile removes profile-specific settings/state, not necessarily the whole user/account.

Flow:

1. Caregiver opens Manage Profiles.
2. Selects profile.
3. Chooses `Delete profile`.
4. App shows confirmation with exact impact.
5. PIN gate required if PIN is set.
6. If online, app sends delete request.
7. If offline, app queues deletion locally and marks profile hidden.
8. Active profile changes to another profile or default local profile.

Required confirmation copy must communicate:

- which profile will be deleted
- which app data/settings are affected
- whether deletion affects this device only or synced data
- whether this can be undone

## Delete user/account

Deleting a user/account is destructive and must be available from inside every app that exposes account creation/recovery.

### What deletion means

Deletion should remove or anonymize:

- user record
- recovery email
- devices
- sessions
- profiles
- app settings
- app state
- user-owned media metadata and media bytes where legally/product-required
- generated/user-linked assets where not needed for abuse prevention, billing, legal, or security logs

Deletion may retain minimal records only where legally required or necessary for abuse/security/audit, and this must be described in the privacy policy.

### Delete account flow

1. Caregiver opens Profile Overview.
2. Opens Settings or Account.
3. Selects `Delete Tiko data` / `Delete account`.
4. App shows clear explanation of impact.
5. If PIN is set, require PIN.
6. If recovery email exists, require magic-link confirmation for synced/recoverable deletion.
7. If online, create deletion request.
8. App revokes current sessions after deletion is accepted or completed, depending on backend policy.
9. App clears local tokens, local profile data, cached settings/state, and queued writes.
10. App returns to fresh device-first state.

### Offline delete behavior

If offline:

- The app may allow `Delete local data from this device now`.
- The app must not claim synced server deletion completed.
- The app may queue a deletion request only if it has a valid session and can safely submit later.
- The app must clearly distinguish local reset from server deletion.

### Deletion states

| State | UI copy meaning | Allowed actions |
| --- | --- | --- |
| Not requested | Normal account state. | Delete available. |
| Local reset only | This device data was cleared. Server data may still exist. | Recover, start fresh, or complete deletion online. |
| Deletion requested | Server received request. | Show status, cancel if supported. |
| Awaiting verification | Magic-link/PIN confirmation needed. | Verify, resend generic link, cancel. |
| Processing | Server deletion is underway. | Disable conflicting writes. |
| Completed | Data deleted/anonymized. | Start fresh. |
| Failed/retryable | Server could not complete deletion. | Retry or contact support. |

## Logout

Logout is not the same as deletion.

Flow:

1. Caregiver opens Profile Overview.
2. Chooses `Log out from this device`.
3. App explains local effect.
4. App calls `POST /v1/identity/logout` if online.
5. App clears active session token.
6. App keeps local child-facing data only if policy allows local continuation.
7. App silently creates/restores a new device-first session when needed.

Rules:

- Logout must not delete profile/app data unless explicitly requested.
- Logout must not make the child-facing app unusable.
- For device-first identity, logout may mostly mean disconnect/revoke current synced session.

## Error handling

Identity/profile errors must use plain language.

Examples:

| Situation | Message direction |
| --- | --- |
| Recovery email request accepted | `If this email can be used, we will send a recovery link.` |
| Wrong PIN | `That PIN did not work.` |
| Offline recovery action | `You need internet for this action. The app still works offline.` |
| Delete failed | `We could not complete deletion right now. Your request has not been completed.` |
| Session expired | `We need to reconnect before syncing. You can keep using the app on this device.` |

Do not expose raw provider errors, stack traces, token state, or email existence.

## Acceptance criteria

Every app must pass these checks:

- Opens without sign-in.
- User/profile entry is visible or caregiver-discoverable.
- Tapping user/profile opens the same Profile Overview structure.
- Recovery email state is shown only in caregiver context.
- PIN protects destructive/sensitive caregiver actions.
- Forgotten PIN uses `id.tikotalks.com` recovery.
- Account deletion is reachable in-app.
- Offline mode keeps child-facing core function available.
- Server deletion and local reset are clearly distinguished.
- App-specific profile/state behavior is documented in its app flow file.
