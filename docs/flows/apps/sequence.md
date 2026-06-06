# Sequence User Flow Contract

## Purpose

Sequence helps a child follow ordered steps for routines, activities, or learning tasks. It proves step-by-step interaction, current-step state, completion progress, custom sequences, offline use, and child-safe navigation.

## Primary child-facing flow

1. User opens Sequence.
2. App immediately shows the default, selected, or last-used sequence using local defaults or cached content.
3. User views the current step.
4. User moves forward or marks the step complete.
5. App gives immediate visual/audio feedback.
6. App saves current step and optional completion progress according to settings.
7. App syncs settings, state, content, and progress in the background.

## Shared flows used

- Startup/session: `docs/flows/shared/startup-and-session.md`
- Identity/account: `docs/flows/shared/identity-and-profiles.md`
- Settings/state: `docs/flows/shared/settings-and-app-state.md`
- Offline/sync: `docs/flows/shared/offline-and-sync.md`
- Platform compliance: `docs/flows/shared/platform-compliance.md`
- Data model: `docs/architecture/data-model.md`

## Entry points

| Entry | Location | Behavior |
| --- | --- | --- |
| Sequence view | Main screen | Shows the active step and child-safe navigation. |
| Next/previous step | Main screen | Moves through the sequence. |
| Complete step/sequence | Main screen | Records completion feedback where enabled. |
| Sequence chooser | Child Mode / app surface | Lets the user choose available child-safe sequences. |
| Parent Mode settings | Parent Mode only | Opens Sequence settings, account state, reset actions, and sequence management. |
| Child Mode exit | Child Mode only | Opens PIN gate before returning to Parent Mode. |

Child Mode must not expose account, recovery, deletion, profile manager, or parent settings controls.

## App settings contract

```ts
interface SequenceSettings {
  language: string
  colorMode: 'light' | 'dark' | 'system'
  defaultSequenceId?: string
  speakSteps?: boolean
  showProgress?: boolean
  requireStepConfirmation?: boolean
  visualPromptStyle?: 'simple' | 'detailed' | 'image-first'
}
```

## App state contract

```ts
interface SequenceState {
  activeSequenceId?: string
  currentStepIndex?: number
  startedAt?: string
  pausedAt?: string
}
```

## Progress contract

```ts
interface SequenceProgress {
  completions?: Array<{
    sequenceId: string
    completedAt: string
    durationSeconds?: number
  }>
  stepHistory?: Array<{
    sequenceId: string
    stepId: string
    completedAt: string
  }>
}
```

Progress is optional. Completion history and step history are Progress, not App State.

## User content contract

```ts
interface SequenceContent {
  sequences?: Array<{
    id: string
    title: string
    stepIds: string[]
    order?: number
  }>
  steps?: Array<{
    id: string
    title: string
    description?: string
    mediaId?: string
    speech?: string
    order?: number
  }>
}
```

Custom sequences and steps are User Content because a user or manager intentionally creates them.

## Data categories used

| Data | Category | Notes |
| --- | --- | --- |
| Default sequence, prompt style | Preferences | Parent Mode controlled behavior. |
| Speech/show-progress settings | Preferences | User-configurable app behavior. |
| Active sequence/current step | App State | Current working state. |
| Started/paused timestamps | App State | Used to restore current experience. |
| Custom sequences | User Content | Intentionally created routine/learning content. |
| Custom steps/media | User Content | Intentionally created or selected content. |
| Completion history | Progress | Usage-generated history. |
| Step history | Progress | Usage-generated history. |
| Suggested next sequence | Insights | Derived recommendation if implemented. |

## Account behavior

- Temporary Accounts can use Sequence in Parent Mode with defaults or local custom content.
- Temporary Accounts can add a display name and verify email to become Verified.
- Temporary Accounts cannot enter Child Mode.
- Verified and Profile Manager accounts can enter Child Mode after PIN setup.
- Child Accounts always open Sequence in Child Mode.
- Profile Manager accounts may manage Child Account sequences only through explicitly documented manager tools.
- Sequence does not implement profile switching, active profiles, managed child profiles, or app blocking.

## Offline behavior

| Feature | Offline behavior |
| --- | --- |
| Step navigation | Fully available from built-in defaults and cached sequences. |
| Speech | Use cached generated audio, native/browser speech, or silent fallback. Navigation must still work. |
| Media | Use cached images/media; missing media falls back to text. |
| Current step | Save locally and queue sync where safe. |
| Custom sequence edits | Save locally and queue sync where safe if durable local storage is available. |
| Progress | Save locally if enabled and queue sync where safe. |
| Account/recovery/deletion | Requires online except local reset. |

## Reset and deletion impact

### Reset app

Deletes Sequence App State for the current account/session, such as active sequence, current step, started/paused state, and last selected sequence.

Keeps Identity, Preferences, User Content, Progress, and Insights.

### Reset progress

Deletes Sequence Progress, such as completion history, step history, and usage-derived recommendations.

Keeps Identity, Preferences, App State, and User Content.

### Reset my data

Deletes Sequence Preferences, App State, User Content, Progress, and Insights for the current account according to the shared data model.

Keeps account Identity.

### Delete account

Deletes or anonymizes account Identity and all Sequence data according to the shared deletion flow and retention policy.

After deleting a Verified or Profile Manager account, the app returns to first launch and creates a fresh Temporary Account.

### Child Account deletion

Child Accounts cannot self-delete. A Profile Manager deletes the Child Account. That deletion removes or anonymizes Sequence data linked to that Child Account according to policy.

## Platform notes

| Platform | Notes |
| --- | --- |
| Web | Keep step navigation usable while media or TTS loads. |
| iOS | Use native speech/haptics where appropriate and cache sequence media. |
| Android | Use native speech/haptics where appropriate and cache sequence media. |

## Acceptance criteria

- Sequence renders a usable step view before network completion.
- Step navigation feedback is immediate.
- Speech/media failures do not block navigation.
- Settings/state/content/progress use shared contracts.
- App data is classified using `docs/architecture/data-model.md`.
- Child Mode hides all account, settings, recovery, deletion, and manager tools.
- Offline sequence use works with defaults/cached data.
- Reset app, reset progress, reset my data, and account deletion follow the shared data model.
- No profile switching or allowed-app logic exists in this app flow.
