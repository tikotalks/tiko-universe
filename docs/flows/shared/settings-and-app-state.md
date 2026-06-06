# Shared Settings and App State Flow Contract

## Purpose

Define how every Tiko app handles account-scoped settings, app-specific settings, app state, Child Mode state, Child Account state, and sync.

This document replaces the older profile-scoped model. Normal accounts do not use active profiles or profile switching.

## Rule

Settings and state are shared platform concepts. Individual apps may define their own payloads, but they must not invent separate persistence, sync, recovery, deletion, or offline behavior.

## Ownership

| Data | Owner | API |
| --- | --- | --- |
| Account preferences | `identity-api` / account contract | identity/account endpoints |
| App settings | `app-api` | `GET/PUT /v1/apps/{app}/settings` |
| App state | `app-api` | `GET/PUT /v1/apps/{app}/state` |
| Child Account settings/state | `app-api` scoped to Child Account session | `GET/PUT /v1/apps/{app}/settings`, `GET/PUT /v1/apps/{app}/state` |
| Media | `media-api` | media contracts |
| Generated audio | `generation-api` | generation contracts |

## Shared account preferences

These preferences may be available to every app for Verified, Profile Manager, and Child Accounts:

```ts
interface SharedAccountPreferences {
  displayName?: string
  language?: string
  colorMode?: 'light' | 'dark' | 'system'
  accessibility?: {
    textSize?: 'normal' | 'large' | 'extra-large'
    reduceMotion?: boolean
    highContrast?: boolean
    audioFeedback?: boolean
  }
}
```

Temporary Accounts may store these locally or sync them if the backend supports temporary account storage. If the Temporary Account is deleted after inactivity, these preferences are deleted too.

## App settings

App settings are Parent Mode controlled configuration that should survive app restarts and usually sync for Verified/Profile Manager accounts.

Examples:

- Yes No: labels, sentence, language override, button behavior.
- Type: voice, speak-on-submit, saved phrase behavior.
- Cards: board layout, card size, symbol set, media preferences.
- Sequence: sequence library settings, difficulty, prompt style.
- Timer: duration presets, sound/vibration, visual style.

Rules:

- Temporary Account settings may be local or temporary server data.
- Verified/Profile Manager settings are account-scoped.
- Child Account settings are scoped to that separate Child Account.
- Normal accounts do not have profile-scoped settings.
- There is no active profile setting.

## App state

App state is runtime or progress data that may be useful later.

Examples:

- latest answer
- recent history
- active board
- draft typed phrase
- progress through sequence
- timer preset usage

Apps must explicitly document whether a state field is:

- local-only
- synced
- account-scoped
- Child Account scoped
- device-scoped
- safe to delete
- user-owned personal data

Do not document new fields as profile-scoped unless a future architecture explicitly reintroduces profiles.

## Parent Mode settings screen structure

Every app Parent Mode settings screen should use this order unless the app has a strong reason not to:

1. App-specific primary settings.
2. Language and speech settings.
3. Accessibility/display settings.
4. Account state and verification.
5. PIN and Child Mode controls.
6. Data/sync/offline status.
7. Privacy, support, delete/reset actions.
8. Profile Manager child-account tools, only for Profile Manager accounts.

Destructive actions must be visually separated from normal settings.

## Child Mode settings visibility

Child Mode must not expose Parent Mode settings.

Child Mode may expose only child-safe in-app controls, such as:

- repeat speech
- select answer
- type text
- choose card
- start/stop timer

Any action that changes account/app configuration must require Parent Mode.

## Settings save behavior

- Changes should save immediately where safe.
- Child-facing controls should update immediately from local state.
- Remote persistence must not block the UI.
- Failed saves should show Parent Mode visible sync status.
- Apps should avoid modal confirmation for simple reversible settings.
- Apps must require confirmation for destructive or hard-to-reverse changes.

## Conflict handling

Default rule: last-write-wins for simple app settings with `updatedAt` metadata.

Exceptions:

- Account deletion always wins over stale writes.
- Child Account deletion always wins over stale writes.
- Media deletion must not be undone by cached app state.
- Child-generated communication history can be merged if the app explicitly supports append-only history.

## Local cache

Each app should cache:

- account summary
- account type
- runtime mode
- app settings
- app state required for offline use
- pending writes
- last successful sync timestamp

The cache must be clearable through local reset/account deletion flows.

## Reset app settings

Flow:

1. User opens Parent Mode app settings.
2. User selects `Reset app settings`.
3. App explains impact.
4. User confirms.
5. App restores built-in defaults for this app and current account.
6. App saves reset to server when online or queues it when offline.

This does not delete the account.

## Reset local data

Flow:

1. User opens Parent Mode data/sync settings.
2. User selects `Reset local data on this device`.
3. App explains that synced server data may still exist.
4. PIN gate required if PIN exists.
5. App clears local cache, session, queued writes, and local-only temporary state.
6. App returns to first-launch behavior and creates/restores a Temporary Account.

This is not server account deletion.

## Delete account impact

When a Verified or Profile Manager account is deleted:

- local cache is cleared
- queued writes are cleared
- session is revoked
- synced account settings/state are deleted or anonymized according to policy
- app restarts into first launch
- a new Temporary Account is created automatically

When a Child Account is deleted by its Profile Manager:

- that Child Account's app settings/state are deleted or anonymized according to policy
- the Child Account can no longer log in
- this must not delete the Profile Manager account

## Acceptance criteria

- Every app documents settings and state payloads.
- Every app distinguishes settings from state.
- Every app supports local defaults.
- Every app keeps child-facing actions responsive while sync happens.
- Every destructive settings/state action has confirmation and correct deletion semantics.
- No app uses active profile or profile switching for normal accounts.
