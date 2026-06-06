# Identity User Modes and Profile Manager API Contract

## Purpose

Define the API-facing identity model for Tiko's user modes, implicit primary profile, profile-manager mode, child profiles, PIN, recovery, and deletion.

This document complements `docs/api/openapi.yaml`. OpenAPI must be extended from this contract before implementation.

## Core model

Basic Tiko usage is single-profile, but the API still needs a stable internal profile scope for settings and state.

```text
User
├── devices
├── sessions
├── optional recovery email
├── optional caregiver PIN
├── implicit primary profile
└── optional profile-manager capability
    └── managed child profiles
```

## User modes

```ts
type UserMode = 'basic' | 'profile-manager'
type RuntimeMode = 'child' | 'caregiver'
type ProfileMode = 'implicit-primary' | 'managed-child'
```

Rules:

- Basic users have exactly one implicit primary profile.
- Basic users do not see profile management UI.
- Profile managers may create and manage child profiles.
- Managed child profiles always run in child mode.
- Caregiver mode is required for profile management, recovery, PIN, deletion, and account actions.

## Session bundle extension

Current `SessionBundle` should be extended with profile and capability summary.

```ts
interface SessionBundle {
  user: User
  device: Device
  session: Session
  activeProfile: ActiveProfileSummary
  capabilities: UserCapabilities
}

interface UserCapabilities {
  userMode: UserMode
  profileManager: boolean
  recovery: boolean
  pin: boolean
}

interface ActiveProfileSummary {
  id: string
  mode: ProfileMode
  displayName?: string
  language?: string
  colorMode?: 'light' | 'dark' | 'system'
}
```

## Profile contract

```ts
interface TikoProfile {
  id: string
  mode: ProfileMode
  displayName?: string
  avatarMediaId?: string
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

## Profile endpoints

### `GET /v1/identity/profiles`

Returns profiles visible to the current caregiver context.

Behavior:

- Basic user: returns only the implicit primary profile.
- Profile manager: returns managed child profiles and the implicit primary profile if still present.
- Child runtime mode must not call or expose this endpoint directly from child-facing UI.

Response:

```ts
interface ProfilesResponse {
  profiles: TikoProfile[]
  activeProfileId: string
  capabilities: UserCapabilities
}
```

### `POST /v1/identity/profiles`

Creates a managed child profile.

Rules:

- Requires profile-manager capability.
- Requires caregiver mode.
- Requires PIN verification if PIN is configured.
- If the user is basic, the client must first enable profile-manager mode.

Request:

```ts
interface CreateProfileRequest {
  displayName?: string
  language?: string
  colorMode?: 'light' | 'dark' | 'system'
}
```

### `PUT /v1/identity/profiles/{profileId}`

Updates profile display/preferences.

Rules:

- Basic user may update the implicit primary profile from caregiver mode.
- Profile manager may update managed child profiles from caregiver mode.
- Child mode must not expose this action.

### `DELETE /v1/identity/profiles/{profileId}`

Deletes a managed child profile.

Rules:

- Requires caregiver mode.
- Requires PIN verification if PIN is configured.
- Cannot delete the last usable profile unless the operation is account deletion or full local reset.
- Basic users should use local reset/account deletion, not profile deletion UI.

### `PUT /v1/identity/active-profile`

Sets the active child profile for this device/session.

Request:

```ts
interface SetActiveProfileRequest {
  profileId: string
}
```

Rules:

- Basic users should not see profile switching.
- Profile managers can switch profiles only from caregiver mode.
- After switching, the selected child profile opens in child mode.

## Profile manager endpoints

### `POST /v1/identity/profile-manager/enable`

Enables profile-manager mode.

Request:

```ts
interface EnableProfileManagerRequest {
  keepImplicitPrimaryAsChildProfile?: boolean
}
```

Rules:

- Requires caregiver mode.
- Requires PIN verification if PIN is configured.
- Recommended P0 behavior: keep the implicit primary profile as the first managed child profile.

### `POST /v1/identity/profile-manager/disable`

Disables profile-manager mode.

Rules:

- Allowed only when one usable profile remains, or after extra child profiles are deleted.
- Must not silently merge profiles.
- Requires caregiver mode and PIN if configured.

## PIN endpoints

### `POST /v1/identity/pin`

Sets or changes caregiver PIN metadata.

Rules:

- PIN is a caregiver gate, not a password.
- Do not store raw PIN server-side.
- Server may store only salted verifier metadata if server verification is needed.
- Local secure verification is preferred for offline gating.

Request:

```ts
interface SetPinRequest {
  verifier: string
  algorithm: 'local-secure-hash' | 'server-verifier'
}
```

### `POST /v1/identity/pin/verify`

Verifies caregiver PIN when server verification is required.

Request:

```ts
interface VerifyPinRequest {
  proof: string
}
```

Response:

```ts
interface VerifyPinResponse {
  verified: true
  caregiverGrantToken?: string
  expiresAt?: string
}
```

### `DELETE /v1/identity/pin`

Removes caregiver PIN.

Rules:

- Requires existing PIN verification or recovery verification.
- Must not block child-facing app use if it fails.

## Recovery endpoints

Existing recovery endpoints:

- `POST /v1/identity/email`
- `POST /v1/identity/magic-links/verify`

Additional recovery flow aliases for `id.tikotalks.com`:

### `POST /v1/identity/recovery/start`

Starts recovery or PIN reset from `id.tikotalks.com`.

Request:

```ts
interface RecoveryStartRequest {
  email: string
  purpose: 'restore-session' | 'reset-pin' | 'confirm-deletion' | 'change-email'
}
```

Response must be generic and must not reveal whether the email exists.

### `POST /v1/identity/recovery/complete`

Completes recovery using a magic-link token.

Request:

```ts
interface RecoveryCompleteRequest {
  token: string
  purpose: 'restore-session' | 'reset-pin' | 'confirm-deletion' | 'change-email'
}
```

Response:

```ts
interface RecoveryCompleteResponse {
  session?: SessionBundle
  recoveryGrantToken?: string
  expiresAt: string
}
```

## Deletion endpoints

### `POST /v1/identity/deletion-requests`

Creates an account/user deletion request.

Request:

```ts
interface CreateDeletionRequest {
  scope: 'local-device' | 'user-account'
  reason?: string
  caregiverGrantToken?: string
}
```

Rules:

- `local-device` can clear local app/device data but must not claim server deletion.
- `user-account` deletes or anonymizes synced user data.
- Requires caregiver mode.
- Requires PIN if configured.
- Requires recovery confirmation if recoverable identity exists.

Response:

```ts
interface DeletionRequest {
  id: string
  scope: 'local-device' | 'user-account'
  status: 'requested' | 'awaiting-verification' | 'processing' | 'completed' | 'failed' | 'cancelled'
  createdAt: string
  updatedAt: string
  completedAt?: string
  canCancel?: boolean
}
```

### `GET /v1/identity/deletion-requests/{requestId}`

Returns deletion status.

### `POST /v1/identity/deletion-requests/{requestId}/cancel`

Cancels deletion where allowed.

Rules:

- Not all deletion jobs are cancellable.
- Cancellation must be explicit and caregiver-confirmed.

## Runtime mode rules

Runtime mode is primarily client-side UX state, but backend-sensitive operations require caregiver authorization.

Child mode can:

- use app core features
- read local/cached settings
- write safe app state
- use active profile context

Child mode cannot:

- list profiles
- switch profiles
- edit recovery email
- change PIN
- delete account/profile
- export data

Caregiver mode can:

- manage recovery
- manage PIN
- manage app settings
- enable profile-manager mode
- manage child profiles if enabled
- delete/reset data

## OpenAPI update checklist

Before implementation, add these to `docs/api/openapi.yaml`:

- `UserMode`, `RuntimeMode`, `ProfileMode` enums.
- `UserCapabilities` schema.
- `ActiveProfileSummary` schema.
- `TikoProfile` schema.
- Profile endpoints.
- Profile-manager enable/disable endpoints.
- PIN endpoints.
- Recovery start/complete endpoints.
- Deletion request endpoints.
- Extend `SessionBundle` with `activeProfile` and `capabilities`.

## Acceptance criteria

- Basic users remain single-profile in UI.
- API still provides an internal profile scope for app settings/state.
- Profile manager mode is explicit.
- Child profiles never expose management UI.
- PIN, recovery, deletion, and profile-manager actions require caregiver context.
- Server deletion and local reset remain separate operations.
