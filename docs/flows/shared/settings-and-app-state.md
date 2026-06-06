# Shared Settings and App State Flow Contract

## Purpose

Define how every Tiko app handles shared settings, app-specific settings, app state, profile-specific state, and sync.

## Rule

Settings and state are shared platform concepts. Individual apps may define their own payloads, but they must not invent separate persistence, sync, recovery, deletion, or offline behavior.

## Ownership

| Data | Owner | API |
| --- | --- | --- |
| Cross-app profile preferences | identity/profile domain | proposed profile endpoints |
| App settings | `app-api` | `GET/PUT /v1/apps/{app}/settings` |
| App state | `app-api` | `GET/PUT /v1/apps/{app}/state` |
| Media | `media-api` | media contracts |
| Generated audio | `generation-api` | generation contracts |

## Shared profile settings

These settings should be available to every app through the active profile:

```ts
interface SharedProfilePreferences {
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

## App settings

App settings are caregiver-controlled configuration that should survive app restarts and usually sync across devices.

Examples:

- Yes No: labels, sentence, language override, button behavior.
- Type: voice, speak-on-submit, saved phrase behavior.
- Cards: board layout, card size, symbol set, media preferences.
- Sequence: sequence library settings, difficulty, prompt style.
- Timer: duration presets, sound/vibration, visual style.

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
- profile-scoped
- device-scoped
- safe to delete
- user-owned personal data

## Settings screen structure

Every app settings screen should use this order unless the app has a strong reason not to:

1. App-specific primary settings.
2. Language and speech settings.
3. Accessibility/display settings.
4. Profile/account entry.
5. Data/sync/offline status.
6. Privacy, support, delete/reset actions.

Destructive actions must be visually separated from normal settings.

## Settings save behavior

- Changes should save immediately where safe.
- Child-facing controls should update immediately from local state.
- Remote persistence must not block the UI.
- Failed saves should show caregiver-visible sync status.
- Apps should avoid modal confirmation for simple reversible settings.
- Apps must require confirmation for destructive or hard-to-reverse changes.

## Conflict handling

Default rule: last-write-wins for simple app settings with `updatedAt` metadata.

Exceptions:

- Deletion always wins over stale writes.
- Profile deletion must not be undone by an old offline write.
- Media deletion must not be undone by cached app state.
- Child-generated communication history can be merged if the app explicitly supports append-only history.

## Local cache

Each app should cache:

- active profile summary
- shared profile preferences
- app settings
- app state required for offline use
- pending writes
- last successful sync timestamp

The cache must be clearable through local reset/account deletion flows.

## Reset app settings

Flow:

1. Caregiver opens app settings.
2. Selects `Reset app settings`.
3. App explains impact.
4. Caregiver confirms.
5. App restores built-in defaults for this app and active profile.
6. App saves reset to server when online or queues it when offline.

This does not delete the user/account.

## Reset local data

Flow:

1. Caregiver opens data/sync settings.
2. Selects `Reset local data on this device`.
3. App explains that synced server data may still exist.
4. PIN gate required if PIN exists.
5. App clears local cache, session, queued writes, and local-only profiles/state.
6. App returns to first-launch device-first state.

This is not server account deletion.

## Acceptance criteria

- Every app documents settings and state payloads.
- Every app distinguishes settings from state.
- Every app supports local defaults.
- Every app keeps child-facing actions responsive while sync happens.
- Every destructive settings/state action has confirmation and correct deletion semantics.
