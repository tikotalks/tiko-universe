# Shared User Modes Contract

## Purpose

Define the difference between a normal Tiko user and a profile manager.

This document corrects an important product rule: basic users should not experience profile management. They have one implicit profile and stay in child mode by default.

## Core model

```text
User
├── implicit primary profile
├── optional recovery email
├── optional caregiver PIN
└── optional profile-manager capability
    └── child profiles
```

## User modes

| Mode | Who it is for | What the user sees |
| --- | --- | --- |
| Basic user | Normal single-child or single-user use | One app experience. No profile picker. No profile-management concept. |
| Child mode | The child-facing app state | App opens directly into the child-facing tool. Account/profile controls are hidden or caregiver-gated. |
| Caregiver mode | Parent/caregiver managing settings/recovery | Settings, recovery, PIN, delete/reset, and profile-manager upgrade if available. |
| Profile manager | Caregiver/teacher/therapist managing multiple child profiles | Child profile list, switching, creating/editing/deleting child profiles. |
| Managed child profile | A child profile under a profile manager | Never sees profile management. Always lands in child mode. |

## Basic user behavior

A basic user has exactly one implicit primary profile.

Rules:

- Do not show a profile picker.
- Do not show `Manage profiles`.
- Do not ask the user to create a profile before using an app.
- Do not expose profile concepts in child-facing UI.
- App settings/state still store under the implicit primary profile internally.
- The child-facing app opens immediately.
- Caregiver can still open settings, recovery, PIN, privacy, delete/reset, and support.

## Profile manager behavior

Profile manager mode is an explicit caregiver capability.

Profile managers can:

- create child profiles
- switch active child profile
- edit child profile display preferences
- delete child profiles
- sync child profiles across devices where supported
- manage shared recovery/account settings

Profile managers must not:

- turn every basic user into a multi-profile user
- expose profile selection to children by default
- require child profiles before the app works
- make profile management part of the primary child-facing flow

## Child profile behavior

A child profile is always used in child mode.

Rules:

- A child profile does not see account/recovery/profile-management controls.
- A child profile does not choose other profiles.
- A child profile does not manage deletion, recovery, or PIN.
- The app should behave as if the selected child profile is the only available profile.
- Exiting child mode requires caregiver entry, PIN where configured, or another caregiver gate.

## Entry point behavior

The profile/user entry point changes by mode.

| State | Entry shown | Tap behavior |
| --- | --- | --- |
| Basic user, child mode | Minimal caregiver/settings entry | Opens caregiver gate or settings, not profile picker. |
| Basic user, caregiver mode | Account/settings entry | Shows account, recovery, PIN, delete/reset, and optional upgrade to profile manager. |
| Profile manager, caregiver mode | Profile manager entry | Shows child profile list and management actions. |
| Managed child profile, child mode | Hidden or minimal caregiver entry | Opens caregiver gate, then profile manager controls. |
| Offline | Same as current mode | Shows offline/sync status only after caregiver entry. |
| Deletion pending | Caregiver/account entry may show warning | Shows deletion status after caregiver entry. |

## Upgrade to profile manager

Basic users can become profile managers only through caregiver mode.

Flow:

1. Caregiver opens settings/account.
2. Caregiver selects `Manage child profiles` or `Add another child`.
3. App explains that this enables multiple child profiles.
4. PIN gate is required if PIN is configured.
5. App creates profile-manager state.
6. Existing implicit primary profile becomes the first managed child profile or remains the default primary profile, depending on migration policy.
7. Caregiver can add child profiles.

Recommended P0 rule:

- Keep the implicit primary profile as the first managed profile.
- Do not force the caregiver to name it immediately.
- Allow renaming later.

## Downgrade from profile manager

Downgrading is destructive if multiple child profiles exist.

Allowed only when:

- there is one child profile, or
- caregiver explicitly deletes extra child profiles first.

Do not silently merge multiple child profiles.

## API implications

The API should expose profile capability without forcing profile UI.

Suggested session/profile summary:

```ts
interface SessionBundle {
  user: User
  device: Device
  session: Session
  profile?: ActiveProfileSummary
  capabilities?: UserCapabilities
}

interface UserCapabilities {
  profileManager: boolean
  recovery: boolean
  pin: boolean
}

interface ActiveProfileSummary {
  id: string
  mode: 'implicit-primary' | 'managed-child'
  displayName?: string
}
```

Profile endpoints should be available only when the user is a profile manager or when the endpoint is reading/updating the implicit primary profile through caregiver mode.

## Documentation impact

When other flow documents say `profile`, read it as:

- implicit internal profile for basic users
- managed child profile only for profile managers

App UI must not expose multi-profile behavior unless profile manager mode is enabled.

## Acceptance criteria

- Basic users never see profile management by default.
- Child profiles always open in child mode.
- Profile management is caregiver-only.
- Every app can store settings/state against an internal profile without showing profile UI.
- Profile manager mode is explicit and reversible only under safe conditions.
