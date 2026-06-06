# Identity Account Types and Modes API Contract

## Purpose

Define the API-facing identity model for Tiko account types, runtime modes, OTP/magic-link login, PIN, Child Mode, Profile Manager accounts, Child Accounts, and deletion.

This document complements `docs/api/openapi.yaml`. OpenAPI must stay aligned with this contract.

## Core model

```text
Temporary Account
  -> Verified Account
      -> Profile Manager Account (admin promotion only)

Profile Manager Account
  -> creates Child Accounts

Verified/Profile Manager Account
  <-> Parent Mode / Child Mode

Child Account
  -> Child Mode only
```

## Types

```ts
type AccountType = 'temporary' | 'verified' | 'profile_manager' | 'child_account'
type RuntimeMode = 'parent' | 'child'
type LoginMethod = 'device' | 'otp' | 'magic_link' | 'child_code'
```

## Rules

- First launch creates/restores a Temporary Account.
- Temporary Accounts run in Parent Mode only.
- Temporary Accounts become Verified Accounts by email verification.
- Verified/Profile Manager login uses OTP or magic link.
- Verified/Profile Manager accounts can enable Child Mode only after PIN setup.
- Profile Manager status is assigned only by admin.
- Profile Manager accounts can create separate Child Accounts.
- Child Accounts log in with name/identifier plus a 4-digit code.
- Child Accounts are Child Mode only.
- There is no profile switching or active profile selection.

## Session bundle extension

```ts
interface SessionBundle {
  user: User
  device: Device
  session: Session
  account: AccountSummary
  runtime: RuntimeSummary
  capabilities: UserCapabilities
}

interface AccountSummary {
  id: string
  accountType: AccountType
  displayName?: string
  emailVerified: boolean
  temporaryExpiresAt?: string
  lastActiveAt: string
}

interface RuntimeSummary {
  mode: RuntimeMode
  childModeEnabled: boolean
  pinConfigured: boolean
}

interface UserCapabilities {
  canVerifyEmail: boolean
  canUseParentMode: boolean
  canUseChildMode: boolean
  canManageChildAccounts: boolean
  canDeleteAccount: boolean
}
```

## User schema

```ts
interface User {
  id: string
  accountType: AccountType
  displayName?: string
  email?: string
  emailVerified: boolean
  recoverable: boolean
  createdAt: string
  updatedAt: string
  lastActiveAt: string
}
```

## Identity endpoints

### `POST /v1/identity/device`

Creates or restores a device-first session. If no existing account exists, creates a Temporary Account.

Response: `SessionBundle`.

### `GET /v1/identity/session`

Returns current account type, runtime mode, session, and capabilities.

### `POST /v1/identity/email`

Starts email verification or recovery with a generic response.

Rules:

- Must not reveal whether an email exists.
- For Temporary Accounts, successful verification upgrades the same account to Verified.

### `POST /v1/identity/otp/request`

Requests an OTP for login or verification.

Request:

```ts
interface OtpRequest {
  email: string
  purpose: 'login' | 'verify_email' | 'reset_pin' | 'confirm_deletion'
}
```

Response must be generic.

### `POST /v1/identity/otp/verify`

Verifies OTP and returns `SessionBundle` or a grant token depending on purpose.

### `POST /v1/identity/magic-links/verify`

Verifies magic link and returns `SessionBundle` or a grant token depending on purpose.

### `POST /v1/identity/logout`

Revokes the current session. Logout is not deletion.

## PIN endpoints

### `POST /v1/identity/pin`

Sets or changes the PIN used to exit Child Mode and authorize sensitive Parent Mode actions.

Rules:

- Only Verified/Profile Manager accounts can configure PIN.
- Temporary Accounts cannot configure PIN.
- Do not store raw PIN server-side.
- PIN is not a normal account password.

### `POST /v1/identity/pin/verify`

Verifies PIN and optionally returns a short-lived grant for sensitive actions.

### `DELETE /v1/identity/pin`

Removes PIN. Requires PIN verification or recovery grant.

## Runtime mode endpoints

### `POST /v1/identity/mode/child/enable`

Enables Child Mode for a Verified/Profile Manager account.

Rules:

- Account must be verified.
- PIN must be configured.
- Temporary Accounts cannot enable Child Mode.

### `POST /v1/identity/mode/child`

Enters Child Mode.

### `POST /v1/identity/mode/parent`

Returns to Parent Mode. Requires PIN verification when leaving Child Mode.

## Child Account endpoints

Child Account management is available only to Profile Manager accounts.

### `GET /v1/identity/child-accounts`

Lists Child Accounts owned/managed by the Profile Manager account.

### `POST /v1/identity/child-accounts`

Creates a Child Account.

Request:

```ts
interface CreateChildAccountRequest {
  name: string
  code: string
  language?: string
}
```

Rules:

- `code` must be 4 digits.
- Requires Profile Manager account.
- Requires Parent Mode.
- Requires PIN verification if configured.

### `PUT /v1/identity/child-accounts/{childAccountId}`

Updates Child Account name or preferences.

### `POST /v1/identity/child-accounts/{childAccountId}/code/reset`

Resets a Child Account 4-digit code.

### `DELETE /v1/identity/child-accounts/{childAccountId}`

Deletes a Child Account.

### `POST /v1/identity/child-accounts/login`

Logs in as a Child Account using name/identifier plus 4-digit code.

Response: `SessionBundle` with `accountType: child_account` and `runtime.mode: child`.

## Admin-only Profile Manager endpoints

These belong in `admin-api`, not normal app UI.

### `POST /v1/admin/users/{userId}/promote-profile-manager`

Promotes a Verified Account to Profile Manager.

### `POST /v1/admin/users/{userId}/demote-profile-manager`

Demotes a Profile Manager account if policy allows.

Rules:

- No public app endpoint can self-promote to Profile Manager.
- Existing Child Accounts must be handled explicitly before demotion.

## Deletion endpoints

### `POST /v1/identity/deletion-requests`

Creates an account deletion request.

Request:

```ts
interface CreateDeletionRequest {
  scope: 'local-device' | 'account' | 'child_account'
  childAccountId?: string
  pinGrantToken?: string
  recoveryGrantToken?: string
}
```

Rules:

- Temporary Accounts can be locally reset or auto-deleted after inactivity.
- Verified/Profile Manager account deletion starts in Parent Mode.
- If PIN is configured, deletion requires PIN.
- If PIN is not configured, explicit confirmation is enough.
- After Verified/Profile Manager deletion, client creates a fresh Temporary Account.
- Child Accounts cannot self-delete. Profile Manager deletes them.
- Profile Manager deletion must not silently orphan Child Accounts.

### `GET /v1/identity/deletion-requests/{requestId}`

Returns deletion status.

### `POST /v1/identity/deletion-requests/{requestId}/cancel`

Cancels deletion where policy allows.

## OpenAPI update checklist

`docs/api/openapi.yaml` must include:

- `AccountType`, `RuntimeMode`, `LoginMethod` enums.
- `AccountSummary`, `RuntimeSummary`, `UserCapabilities` schemas.
- Extended `SessionBundle`.
- OTP request/verify endpoints.
- PIN endpoints.
- Runtime mode endpoints.
- Child Account management/login endpoints.
- Deletion request endpoints.
- Admin promotion endpoints or references to admin-api.

## Acceptance criteria

- API does not expose active profile selection.
- API does not expose profile switching.
- Temporary to Verified is an upgrade of the same account.
- Profile Manager can only be assigned by admin.
- Child Accounts are separate accounts and Child Mode only.
- Verified/Profile Manager account deletion returns the client to a fresh Temporary Account.
