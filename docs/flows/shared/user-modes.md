# Shared Account Types and Modes Contract

## Purpose

Define the canonical Tiko identity model used by every app and platform.

This replaces the older profile-switching model. Normal accounts do not have child profiles. A normal verified account is one account that can switch between Parent Mode and Child Mode. Only admin-promoted Profile Manager accounts can create separate Child Accounts.

## Core model

Account type and runtime mode are different concepts.

```text
Account type:
- temporary
- verified
- profile_manager
- child_account

Runtime mode:
- parent
- child
```

## Account lifecycle

```text
Temporary Account
  -> Verified Account
      -> Profile Manager Account (admin promotion only)

Profile Manager Account
  -> creates Child Accounts

Child Account
  -> Child Mode only
```

Only Temporary Accounts are automatically deleted after 30 days of inactivity. Verified Accounts, Profile Manager Accounts, and Child Accounts are not inactivity-deleted.

## Account types

| Account type | Created by | Login | Can use Parent Mode | Can use Child Mode | Notes |
| --- | --- | --- | --- | --- | --- |
| Temporary | Automatically on first launch | Device/session bootstrap | Yes | No | Only this account type auto-deletes after 30 days of inactivity. |
| Verified | Temporary account after email verification, or login by email | OTP or magic link | Yes | Yes, after PIN setup | Normal user account. No child accounts. Not auto-deleted for inactivity. |
| Profile Manager | Admin promotes a verified account | OTP or magic link | Yes | Yes, after PIN setup | Can create and manage separate Child Accounts. Not auto-deleted for inactivity. |
| Child Account | Profile Manager creates it | Name/identifier + 4-digit code | No | Yes | Separate child-only account. No email, recovery, settings, or account management. Not auto-deleted for inactivity. |

## Temporary account rules

A Temporary Account is created automatically so the app can be used immediately.

Rules:

- Parent Mode is enabled.
- Child Mode is disabled.
- The account may add a display name.
- The account may become verified by adding/verifying email.
- The account cannot enable Child Mode.
- The account cannot set the Child Mode PIN.
- The account cannot create Child Accounts.
- The account is automatically deleted after 30 days of inactivity.
- This inactivity deletion applies only to Temporary Accounts.
- Inactivity must be based on `lastActiveAt`, not `createdAt`.

## Verified account rules

A Verified Account is a normal user account.

Rules:

- Login uses OTP or magic link.
- The account has one account scope, not child profiles.
- Parent Mode can access account, settings, recovery, PIN, delete/reset, and app configuration.
- Child Mode can be enabled only after verification and PIN setup.
- The same account can switch between Parent Mode and Child Mode.
- The account can be deleted from Parent Mode.
- The account is not automatically deleted because of inactivity.
- After deletion, the client returns to first launch and automatically creates a fresh Temporary Account.

## Profile Manager account rules

A Profile Manager Account is a verified account promoted by an admin in the admin system.

Rules:

- There is no in-app `Become Profile Manager` button.
- Only an admin can promote or demote this account type.
- Profile Managers can create separate Child Accounts.
- Profile Managers can edit Child Account names and reset their 4-digit codes.
- Profile Managers can delete Child Accounts.
- Profile Managers do not switch into child accounts from inside one session.
- To use another Child Account, the user logs out and logs in as that Child Account.
- The account is not automatically deleted because of inactivity.

## Child Account rules

A Child Account is a separate child-only account created by a Profile Manager.

Rules:

- It has a name and a 4-digit code set by the Profile Manager.
- It logs in with name/identifier plus the 4-digit code.
- It always opens in Child Mode.
- It has no email login.
- It has no recovery flow.
- It has no Parent Mode.
- It cannot see profile/account/settings management.
- It cannot delete itself.
- It can only be edited, reset, or deleted by its Profile Manager.
- The account is not automatically deleted because of inactivity.

## Runtime modes

### Parent Mode

Parent Mode is the management mode for Temporary, Verified, and Profile Manager accounts.

Parent Mode can show:

- account state
- verification state
- app settings
- recovery email
- PIN setup/change
- delete/reset actions
- Profile Manager child-account management, only if account type is `profile_manager`

### Child Mode

Child Mode is the locked child-facing mode.

Child Mode can show:

- the active app's child-facing interface
- communication/learning actions
- child-safe app content

Child Mode must not show:

- profile/account management
- settings intended for parents
- recovery email
- delete/reset actions
- profile manager tools
- account switching tools

## Enabling Child Mode for normal accounts

Flow:

1. User is in Parent Mode.
2. User chooses to enable Child Mode.
3. If account is Temporary, require email verification first.
4. Once verified, require PIN setup.
5. Enable Child Mode.
6. Enter Child Mode.

Rules:

- Child Mode cannot be enabled on an unverified Temporary Account.
- Child Mode cannot be enabled without a PIN.
- The PIN is used to exit Child Mode back to Parent Mode.

## Exiting Child Mode

Flow:

1. User attempts to exit Child Mode.
2. App shows PIN gate.
3. Correct PIN returns to Parent Mode.
4. Wrong PIN keeps the account in Child Mode.

Rules:

- Child Mode exit must not expose account/settings UI before PIN verification.
- Failed PIN attempts must not block the child-facing app.

## Deletion behavior

### Temporary Account

Temporary accounts are deleted automatically after 30 days of inactivity.

### Verified Account

Flow:

1. User opens Parent Mode.
2. User chooses Delete Account.
3. If PIN is configured, require PIN.
4. If no PIN is configured, require explicit confirmation.
5. Delete account.
6. Redirect/restart into first launch.
7. Create a fresh Temporary Account automatically.

Verified Accounts are not automatically deleted because of inactivity.

### Profile Manager Account

Profile Manager deletion must account for existing Child Accounts.

Rules:

- If Child Accounts exist, deletion must either delete or transfer them according to an explicit admin/product policy.
- Do not silently orphan Child Accounts.
- Profile Manager Accounts are not automatically deleted because of inactivity.

### Child Account

Child Accounts cannot self-delete. They are deleted by their Profile Manager.

Child Accounts are not automatically deleted because of inactivity.

## Removed concepts

Do not use these concepts in new implementation:

- profile switching
- active profile selection
- managed child profile
- profile-manager mode
- implicit primary profile UI

## Acceptance criteria

- Temporary accounts open in Parent Mode only.
- Only Temporary Accounts are automatically deleted after 30 days of inactivity.
- Verified accounts can switch between Parent Mode and Child Mode after PIN setup.
- Only admin-promoted Profile Managers can create Child Accounts.
- Child Accounts are separate accounts and Child Mode only.
- No app exposes profile switching.
- Account deletion returns the client to a fresh Temporary Account.
