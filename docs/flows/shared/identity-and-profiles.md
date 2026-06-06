# Shared Identity and Account Flow Contract

## Purpose

Define exactly how Tiko identity, account types, Parent Mode, Child Mode, PIN, recovery, account deletion, Profile Manager accounts, and Child Accounts behave in every app.

This document replaces the older profile-based model. Normal Tiko accounts do not have child profiles and do not switch between child profiles. A normal verified account is one account that can switch between Parent Mode and Child Mode. Only admin-promoted Profile Manager accounts can create separate Child Accounts.

## Product principles

- Apps open immediately by creating or restoring a Temporary Account.
- Parent Mode is the default for Temporary Accounts.
- Child Mode is only available after account verification and PIN setup.
- Only Parent Mode exposes account, settings, recovery, deletion, and manager tools.
- Child Mode must not expose account, settings, recovery, deletion, or manager tools.
- Verified accounts use OTP or magic-link login. No passwords.
- Child Accounts use a name/identifier plus a 4-digit code set by a Profile Manager.
- Profile Manager Account status can only be assigned by an admin.
- Account deletion must never leave the app in a logged-out dead end; after deletion, the app creates a fresh Temporary Account.

## Terms

| Term | Meaning |
| --- | --- |
| Temporary Account | Auto-created account for first launch. Parent Mode only. Deleted after 30 days inactivity if not verified. |
| Verified Account | Normal account with verified email. Can use Parent Mode and Child Mode after PIN setup. |
| Profile Manager Account | Admin-promoted verified account that can create/manage separate Child Accounts. |
| Child Account | Separate child-only account created by a Profile Manager. Logs in with name/identifier plus 4-digit code. |
| Parent Mode | Management mode for account, app settings, recovery, PIN, deletion, and manager tools. |
| Child Mode | Locked child-facing mode for using apps. |
| PIN | Parent Mode/Child Mode gate for verified/profile-manager accounts. |
| 4-digit code | Child Account login code set/reset by Profile Manager. |
| OTP | One-time code sent to email for verified/profile-manager login. |
| Magic link | Email link used to verify or log in. |

## Account types

| Account type | Parent Mode | Child Mode | Login | Can create Child Accounts |
| --- | --- | --- | --- | --- |
| Temporary | Yes | No | Automatic device/session bootstrap | No |
| Verified | Yes | Yes, after PIN setup | OTP or magic link | No |
| Profile Manager | Yes | Yes, after PIN setup | OTP or magic link | Yes |
| Child Account | No | Yes | Name/identifier + 4-digit code | No |

## Required current contracts

Current contracts already available:

- `POST /v1/identity/device` creates or restores a Temporary Account or current device session.
- `GET /v1/identity/session` returns the current session.
- `POST /v1/identity/email` requests or attaches recovery/verification email with generic response.
- `POST /v1/identity/magic-links/verify` verifies a magic link and returns a session.
- `POST /v1/identity/logout` revokes the current session.
- `GET/PUT /v1/apps/{app}/settings` stores app settings.
- `GET/PUT /v1/apps/{app}/state` stores app state.

Needed contract additions before full implementation:

```text
POST   /v1/identity/otp/request
POST   /v1/identity/otp/verify
POST   /v1/identity/pin
POST   /v1/identity/pin/verify
DELETE /v1/identity/pin
POST   /v1/identity/mode/child/enable
POST   /v1/identity/mode/parent
POST   /v1/identity/deletion-requests
GET    /v1/identity/deletion-requests/{requestId}
POST   /v1/identity/child-accounts/login
GET    /v1/identity/child-accounts
POST   /v1/identity/child-accounts
PUT    /v1/identity/child-accounts/{childAccountId}
POST   /v1/identity/child-accounts/{childAccountId}/code/reset
DELETE /v1/identity/child-accounts/{childAccountId}
```

Admin-only promotion/demotion belongs in `admin-api`, not child-facing apps:

```text
POST /v1/admin/users/{userId}/promote-profile-manager
POST /v1/admin/users/{userId}/demote-profile-manager
```

## First launch flow

1. User opens an app.
2. App calls `POST /v1/identity/device` or restores device credentials.
3. If no durable account exists, backend/client creates a Temporary Account.
4. App opens in Parent Mode.
5. User can use the app immediately.
6. User may add a display name.
7. User may verify email to become a Verified Account.

Rules:

- No login wall.
- No required email before use.
- Child Mode is disabled for Temporary Accounts.
- Temporary Accounts auto-delete after 30 days inactivity.

## Temporary to Verified flow

1. User is in Parent Mode on a Temporary Account.
2. User adds email.
3. System sends OTP or magic link using a generic response.
4. User verifies the email.
5. Account becomes Verified.
6. Verified Account can now set PIN and enable Child Mode.

Rules:

- Never reveal whether an email exists.
- Verification upgrades the same account; it does not create a second account.

## Login flow for Verified and Profile Manager accounts

1. User enters email.
2. User chooses or receives OTP/magic link.
3. User verifies OTP or opens magic link.
4. App receives a session.
5. App opens in Parent Mode by default unless the previous safe runtime state says otherwise.

Rules:

- No passwords.
- OTP and magic link responses must be generic.
- Profile Manager status is returned as account type/capability in the session.

## Enabling Child Mode for normal accounts

1. User opens Parent Mode.
2. User chooses `Enable Child Mode`.
3. If account is Temporary, app requires email verification first.
4. If PIN is not configured, app requires PIN setup.
5. App enables Child Mode.
6. App enters Child Mode.

Rules:

- Child Mode cannot be enabled on a Temporary Account.
- Child Mode requires a configured PIN.
- PIN setup happens only after the account is verified.

## Switching from Parent Mode to Child Mode

1. Verified/Profile Manager user is in Parent Mode.
2. User selects `Enter Child Mode`.
3. App enters Child Mode.
4. Parent/account controls disappear.

## Exiting Child Mode to Parent Mode

1. User attempts to exit Child Mode.
2. App shows PIN gate.
3. Correct PIN returns to Parent Mode.
4. Wrong PIN keeps the app in Child Mode.

Rules:

- Child-facing app use must continue after wrong PIN.
- Parent Mode UI must not be shown before PIN verification.

## Parent Mode visibility

Only Parent Mode can show:

- account state
- verification state
- recovery email
- OTP/magic-link login/recovery actions
- app settings
- data/sync/offline status
- PIN setup/change/remove
- account deletion
- local reset
- Profile Manager child-account management, if account type is `profile_manager`

## Child Mode visibility

Child Mode can show:

- the active app's child-facing interface
- communication, learning, typing, choosing, speaking, timer, card, and sequence actions
- child-safe app content

Child Mode must not show:

- account/profile/settings management
- recovery email
- delete/reset actions
- profile manager tools
- account switching tools
- links to admin or account management

## Profile Manager Account behavior

A Profile Manager Account is a Verified Account promoted by an admin.

Rules:

- Apps cannot self-promote an account to Profile Manager.
- Profile Manager Account status is assigned in the admin system.
- Profile Managers can create separate Child Accounts.
- Profile Managers can edit Child Account names.
- Profile Managers can reset Child Account 4-digit codes.
- Profile Managers can delete Child Accounts.
- Profile Managers do not switch into Child Accounts from inside one session.
- To use a Child Account, the current user logs out and logs in as that Child Account.

## Child Account behavior

A Child Account is separate from the Profile Manager account.

Rules:

- It has a name or identifier.
- It has a 4-digit code set by the Profile Manager.
- It always opens in Child Mode.
- It has no Parent Mode.
- It has no email.
- It has no OTP or magic-link login.
- It has no recovery flow.
- It cannot see settings, recovery, delete, or profile manager UI.
- It cannot delete itself.

## Child Account login flow

1. User chooses Child Account login.
2. User enters/selects child name or identifier.
3. User enters 4-digit code.
4. If valid, app opens in Child Mode.
5. If invalid, app stays on child login and shows a simple error.

Rules:

- Do not expose manager account information during child login.
- Failed attempts must not reveal whether a child account exists beyond normal UX constraints.

## Forgotten PIN

Forgotten PIN applies to Verified and Profile Manager accounts, not Child Accounts.

### If recovery email exists

1. User chooses `Forgot PIN?` from Parent Mode gate or recovery flow.
2. App opens `id.tikotalks.com/recovery` using the platform-appropriate browser/auth surface.
3. User verifies by OTP or magic link.
4. App receives a recovery grant.
5. User sets a new PIN.

### If recovery email does not exist

This should only happen for edge cases, because PIN requires verification first.

Allowed options:

- Keep using Child Mode.
- Complete account recovery if possible.
- Local reset only where product policy allows.

## Deleting accounts

### Temporary Account

Temporary Accounts are deleted automatically after 30 days inactivity.

### Verified Account

1. User opens Parent Mode.
2. User chooses `Delete Account`.
3. If PIN is configured, require PIN.
4. If no PIN is configured, require explicit confirmation.
5. Delete or anonymize account data according to policy.
6. Revoke session.
7. Redirect/restart to first launch.
8. Automatically create a fresh Temporary Account.

### Profile Manager Account

Same as Verified Account, but existing Child Accounts must be handled explicitly.

Rules:

- Do not orphan Child Accounts silently.
- Product/admin policy must decide whether children are deleted, transferred, or deletion is blocked until handled.

### Child Account

Child Accounts cannot self-delete. The Profile Manager deletes them.

## Logout

Logout means ending the current session, not deleting data.

Rules:

- Logging out of a Verified/Profile Manager account returns to login/first launch behavior.
- Logging out of a Child Account returns to login/first launch behavior.
- To use a different Child Account, logout and login with that child account.
- Do not implement child account switching inside an active session.

## Removed concepts

Do not use these concepts in new implementation:

- active profile
- profile switching
- managed child profile
- profile-manager mode
- implicit primary profile UI

## Acceptance criteria

- First launch creates a Temporary Account and opens Parent Mode.
- Temporary Accounts cannot enter Child Mode.
- Email verification upgrades Temporary to Verified.
- Verified accounts can enable Child Mode only after PIN setup.
- Child Mode hides all account/settings/recovery/deletion UI.
- Profile Manager status is admin-assigned only.
- Only Profile Managers can create Child Accounts.
- Child Accounts are separate accounts and Child Mode only.
- Account deletion returns to a fresh Temporary Account.
