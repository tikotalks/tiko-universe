# Tiko Data Model

## Purpose

This document defines the canonical Tiko data categories used by all apps, APIs, sync systems, exports, resets, deletions, Profile Manager tools, analytics, and future AI features.

Every piece of user data must belong to one primary category.

This document is a product and implementation contract. If a feature stores data, it must define which category that data belongs to before implementation.

## Core categories

Tiko data is split into six categories:

1. Identity
2. Preferences
3. App State
4. User Content
5. Progress
6. Insights

These categories exist to make reset, deletion, sync, export, backup, recovery, and future personalization behavior predictable.

## 1. Identity

Identity defines who the account is and how it is accessed.

Examples:

- account ID
- account type
- email address
- verification state
- login method
- recovery configuration
- PIN configuration metadata
- Profile Manager relationship to Child Accounts
- Child Account name or identifier
- Child Account 4-digit code metadata

Identity changes rarely and is required for account access, account recovery, and ownership.

Identity is not deleted by `Reset my data`. Identity is deleted by `Delete account`, except where retention policy requires limited legal/security records.

### Account examples

Temporary Account:

- account ID
- account type
- device/session bootstrap metadata
- last active timestamp
- temporary expiration timestamp

Verified Account:

- account ID
- account type
- email
- verification state
- recovery state
- PIN configuration metadata

Profile Manager Account:

- account ID
- account type
- email
- verification state
- recovery state
- PIN configuration metadata
- manager capability
- managed Child Account relationships

Child Account:

- account ID
- account type
- name or identifier
- avatar reference
- Profile Manager relationship
- 4-digit code metadata

## 2. Preferences

Preferences define how the account wants the system to behave or appear.

Examples:

- language
- theme
- avatar selection
- accessibility settings
- voice settings
- speech speed
- UI preferences
- app display preferences

Preferences can be reset without deleting account identity.

Child Accounts may have preferences, but they are limited to child-safe preferences or preferences managed by the Profile Manager.

## 3. App State

App State is temporary working information used to restore the current experience.

Examples:

- last opened screen
- last selected category
- scroll position
- current draft
- current timer value
- open tabs
- latest selected answer
- last opened board

App State is disposable. Losing App State must not remove important user-created content.

App State can be deleted by `Reset app`, `Reset my data`, or `Delete account`.

## 4. User Content

User Content is intentionally created, entered, uploaded, or configured by a user or manager.

Examples:

- custom cards
- custom boards
- uploaded images
- saved phrases
- custom exercises
- custom communication sets
- custom app content
- user-created media references

User Content is usually the most valuable user-owned data.

Deleting User Content is destructive and must be clearly confirmed.

## 5. Progress

Progress is generated from usage over time.

Examples:

- learning history
- usage history
- completion history
- frequently used items
- streaks
- recommendation signals
- personalized rankings
- AI learning signals

Progress is not User Content. It is metadata generated from use.

Progress can be reset independently from User Content.

Progress is not implemented in every app yet, but apps must classify future usage-derived data as Progress unless there is a stronger reason to classify it differently.

## 6. Insights

Insights are derived reports, summaries, or recommendations generated from Progress and usage data.

Examples:

- communication growth summaries
- most used cards
- most used words
- parent/teacher summaries
- therapist-facing reports
- suggested next steps
- generated recommendations

Insights are derived data, not raw Progress.

Insights may be deleted or regenerated when Progress is reset.

## App examples

### Yes No

App State:

- latest selected answer

Progress:

- selection history
- yes/no usage counts
- frequently selected answer patterns

User Content:

- custom labels, if introduced
- custom yes/no boards, if introduced

### Type

App State:

- current draft text

Progress:

- common words used
- typing patterns
- suggested phrase signals

User Content:

- saved phrases
- custom phrase banks

### Cards

App State:

- last opened board
- last selected category

Progress:

- card usage frequency
- learning history
- recommendation signals

User Content:

- custom cards
- custom boards
- uploaded media

### Sequence

App State:

- current sequence step
- last selected sequence

Progress:

- completion history
- prompt success history
- retry patterns

User Content:

- custom sequences
- custom exercises

### Timer

App State:

- current timer value
- last selected preset

Progress:

- timer usage history, if tracked

User Content:

- custom timer presets, if introduced

## Reset and deletion actions

| Action | Identity | Preferences | App State | User Content | Progress | Insights |
| --- | --- | --- | --- | --- | --- | --- |
| Reset app | Keep | Keep | Delete for selected app | Keep | Keep | Keep or regenerate |
| Reset progress | Keep | Keep | Keep | Keep | Delete | Delete or regenerate |
| Reset my data | Keep | Delete | Delete | Delete | Delete | Delete |
| Delete account | Delete | Delete | Delete | Delete | Delete | Delete |

## Reset app

Reset app removes App State for one app.

It keeps:

- Identity
- Preferences
- User Content
- Progress
- Insights, unless they depend directly on deleted App State

Use this for simple app-level recovery when an app feels stuck or misconfigured.

Example confirmation copy:

> Are you sure?
>
> You are about to reset this app to its default state. This will remove temporary app state such as the current draft, last opened screen, or current timer.
>
> Your account, preferences, custom content, and progress will remain.

## Reset progress

Reset progress removes Progress and derived Insights.

It keeps:

- Identity
- Preferences
- App State
- User Content

Use this when a parent or Profile Manager wants to clear history or learning/adaptation data without deleting actual content.

Example confirmation copy:

> Are you sure?
>
> You are about to reset progress. This will remove usage history, learning history, recommendations, and progress-based insights.
>
> Custom content, settings, and account access will remain.
>
> This action cannot be undone.

## Reset my data

Reset my data removes user-owned data while keeping account access.

It removes:

- Preferences
- App State
- User Content
- Progress
- Insights

It keeps:

- Identity
- account type
- email verification
- login ability
- PIN configuration unless explicitly reset separately
- Profile Manager status where applicable
- Child Account relationships unless a separate manager action deletes them

Use this when a Temporary or Verified/Profile Manager account wants to return to defaults without deleting the account itself.

Example confirmation copy:

> Are you sure?
>
> You are about to reset your data to defaults. This will permanently remove your settings, saved app data, custom content, progress, and history.
>
> Your account and login access will remain.
>
> This action cannot be undone.

## Delete account

Delete account removes or anonymizes all user-owned data and the account identity, subject to legal/security retention policy.

It removes:

- Identity
- Preferences
- App State
- User Content
- Progress
- Insights

Rules:

- Verified and Profile Manager account deletion must start from Parent Mode.
- If a PIN is configured, require PIN before deletion.
- If no PIN is configured, require explicit confirmation.
- After deleting a Verified or Profile Manager account, the app returns to first launch and creates a fresh Temporary Account.
- Child Accounts cannot self-delete. They are deleted by the Profile Manager.
- Profile Manager deletion must handle existing Child Accounts explicitly. Do not silently orphan Child Accounts.

Example confirmation copy:

> Are you sure?
>
> You are about to delete your account. This will permanently remove your account, settings, custom content, progress, and history.
>
> After deletion, the app will restart with a new temporary account.
>
> This action cannot be undone.

## Temporary Account data lifecycle

Temporary Accounts can use `Reset my data`.

Temporary Accounts are the only account type that is automatically deleted after 30 days of inactivity.

Rules:

- Inactivity is based on `lastActiveAt`, not `createdAt`.
- Verification upgrades the same account to a Verified Account.
- Once verified, the account no longer expires because of inactivity.

## Verified Account data lifecycle

Verified Accounts can use:

- Reset app
- Reset progress, where progress exists
- Reset my data
- Delete account

Verified Accounts are not automatically deleted because of inactivity.

## Profile Manager data lifecycle

Profile Manager Accounts can use:

- Reset app
- Reset progress, where progress exists
- Reset my data
- Delete account
- Child Account management actions

Profile Manager Accounts are not automatically deleted because of inactivity.

Profile Manager status is Identity data and is kept by `Reset my data`.

## Child Account data lifecycle

Child Accounts do not manage reset or deletion actions themselves.

Child Accounts primarily contain:

- Identity: name or identifier, manager relationship, code metadata
- Preferences: avatar, language, accessibility, child-safe preferences
- App State: temporary app state
- Progress: app history and learning signals, where supported
- Insights: future manager-facing summaries

Child Accounts may have limited child-safe personalization such as changing avatar, if explicitly allowed by the app.

Child Accounts cannot:

- reset themselves
- delete themselves
- manage account lifecycle
- access Parent Mode
- access recovery

Profile Managers may:

- edit child name
- change child avatar
- reset child 4-digit code
- reset child progress
- delete child account

## Reset child progress

Reset child progress is a Profile Manager action.

It removes:

- Progress for the Child Account
- derived Insights for the Child Account

It keeps:

- Child Account identity
- name
- avatar
- 4-digit code
- preferences
- User Content, if child-specific content exists

Example confirmation copy:

> Are you sure?
>
> You are about to reset this child's progress. This will remove app history, learning history, recommendations, and progress-based insights for this child.
>
> The child account, avatar, code, preferences, and custom content will remain.
>
> This action cannot be undone.

## App access policy

Tiko does not block apps per account.

A Tiko Child Account can access all Tiko apps available on the device, browser, or deployment environment.

Rules:

- Do not implement `allowed apps`, `blocked apps`, or app-level access restrictions in Tiko account settings.
- Deciding which apps are installed, available, or reachable is the responsibility of device owners, schools, IT managers, mobile device management, browser access rules, or deployment configuration.
- Tiko apps should assume that if the app is available, the account may use it according to its account type and runtime mode.

Profile Managers may configure app defaults and child preferences, but not app availability.

## Profile Manager capabilities

Current Profile Manager capabilities:

- create Child Accounts
- edit Child Account name
- change Child Account avatar
- reset Child Account 4-digit code
- reset Child Account progress
- delete Child Accounts

Future Profile Manager capabilities may include:

- manage Child Account preferences
- manage default settings for apps
- view child progress
- view child insights
- export child data, where legally and product-appropriate

Future Profile Manager capabilities must not include blocking access to individual Tiko apps unless the product direction changes explicitly.

## Implementation requirements

Every app must document which data it stores in each category:

- Identity, if any app-specific identity reference exists
- Preferences
- App State
- User Content
- Progress
- Insights

Every API endpoint that writes data must document which category it writes.

Every reset/delete/export flow must define which categories are affected.

## Acceptance criteria

- Every stored field has a primary data category.
- Reset app deletes App State only.
- Reset progress deletes Progress and derived Insights only.
- Reset my data keeps Identity and deletes Preferences, App State, User Content, Progress, and Insights.
- Delete account deletes Identity and all user-owned data, subject to retention policy.
- Only Temporary Accounts auto-delete after 30 days inactivity.
- Child Accounts cannot manage reset or deletion actions themselves.
- Profile Managers can reset Child Account progress.
- Tiko does not implement app blocking or allowed-app lists.
