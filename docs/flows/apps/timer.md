# Timer User Flow Contract

## Purpose

Timer helps a child understand and manage time using simple visual timers, presets, and completion feedback. It proves local-first timing, app state restoration, optional progress, custom presets, offline use, and platform-specific notification/audio behavior.

## Primary child-facing flow

1. User opens Timer.
2. App immediately shows the default or last-used timer using local defaults or cached settings.
3. User starts, pauses, resumes, or resets the timer.
4. App gives immediate visual feedback.
5. App signals completion with configured sound, speech, vibration, or visual feedback where supported.
6. App may save last timer state or completion progress according to settings.
7. App syncs settings, state, and progress in the background.

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
| Timer display | Main screen | Shows remaining time clearly. |
| Start/pause/resume | Main screen | Controls active timer immediately. |
| Reset | Main screen | Resets the current timer with safe child-facing affordance. |
| Presets | Child Mode / app surface | Lets the user choose available timer presets. |
| Parent Mode settings | Parent Mode only | Opens Timer settings, account state, reset actions, and preset management. |
| Child Mode exit | Child Mode only | Opens PIN gate before returning to Parent Mode. |

Child Mode must not expose account, recovery, deletion, profile manager, or parent settings controls.

## App settings contract

```ts
interface TimerSettings {
  language: string
  colorMode: 'light' | 'dark' | 'system'
  defaultDurationSeconds?: number
  defaultPresetId?: string
  completionSound?: string
  speakCompletion?: boolean
  vibrateOnComplete?: boolean
  visualStyle?: 'circle' | 'bar' | 'minimal'
  showNumericTime?: boolean
}
```

## App state contract

```ts
interface TimerState {
  activeDurationSeconds?: number
  remainingSeconds?: number
  status?: 'idle' | 'running' | 'paused' | 'completed'
  startedAt?: string
  pausedAt?: string
  lastPresetId?: string
}
```

The active countdown must remain correct locally. Remote sync must not drive the running timer frame-by-frame.

## Progress contract

```ts
interface TimerProgress {
  completions?: Array<{
    durationSeconds: number
    presetId?: string
    completedAt: string
  }>
  presetUsage?: Array<{
    presetId: string
    count: number
    lastUsedAt: string
  }>
}
```

Progress is optional. Timer completion history and preset usage are Progress, not App State.

## User content contract

```ts
interface TimerContent {
  presets?: Array<{
    id: string
    label: string
    durationSeconds: number
    color?: string
    sound?: string
    order?: number
  }>
}
```

Custom presets are User Content because a user or manager intentionally creates them.

## Data categories used

| Data | Category | Notes |
| --- | --- | --- |
| Default duration/preset | Preferences | Parent Mode controlled behavior. |
| Completion sound/speech/vibration | Preferences | User-configurable app behavior. |
| Visual style/numeric time | Preferences | Display preference. |
| Active remaining time | App State | Current working state. |
| Running/paused/completed status | App State | Used to restore current experience. |
| Custom presets | User Content | Intentionally created timer content. |
| Completion history | Progress | Usage-generated history if enabled. |
| Preset usage | Progress | Usage-derived signals if enabled. |

## Account behavior

- Temporary Accounts can use Timer in Parent Mode with defaults or local custom presets.
- Temporary Accounts can add a display name and verify email to become Verified.
- Temporary Accounts cannot enter Child Mode.
- Verified and Profile Manager accounts can enter Child Mode after PIN setup.
- Child Accounts always open Timer in Child Mode.
- Profile Manager accounts may manage Child Account timer preferences/presets only through explicitly documented manager tools.
- Timer does not implement profile switching, active profiles, managed child profiles, or app blocking.

## Offline behavior

| Feature | Offline behavior |
| --- | --- |
| Start/pause/resume/reset | Fully available. Timing must be local and immediate. |
| Completion feedback | Use local sound, native/browser speech, vibration, or visual fallback. |
| Presets | Use cached presets and built-in defaults. |
| Timer state | Save locally and queue sync where safe. Do not sync every tick. |
| Progress | Save locally if enabled and queue sync where safe. |
| Account/recovery/deletion | Requires online except local reset. |

## Reset and deletion impact

### Reset app

Deletes Timer App State for the current account/session, such as active timer, remaining seconds, status, and last selected preset.

Keeps Identity, Preferences, User Content, Progress, and Insights.

### Reset progress

Deletes Timer Progress, such as completion history and preset usage counts.

Keeps Identity, Preferences, App State, and User Content.

### Reset my data

Deletes Timer Preferences, App State, User Content, Progress, and Insights for the current account according to the shared data model.

Keeps account Identity.

### Delete account

Deletes or anonymizes account Identity and all Timer data according to the shared deletion flow and retention policy.

After deleting a Verified or Profile Manager account, the app returns to first launch and creates a fresh Temporary Account.

### Child Account deletion

Child Accounts cannot self-delete. A Profile Manager deletes the Child Account. That deletion removes or anonymizes Timer data linked to that Child Account according to policy.

## Platform notes

| Platform | Notes |
| --- | --- |
| Web | Browser tab throttling may affect long background timers; restore from timestamps. |
| iOS | Use native timing/notification behavior where appropriate and permitted. |
| Android | Use native timing/notification behavior where appropriate and permitted. |

## Acceptance criteria

- Timer renders a usable timer before network completion.
- Start/pause/resume/reset feedback is immediate.
- Running timer behavior is local and not dependent on sync.
- Completion feedback degrades safely if sound/speech/vibration is unavailable.
- Settings/state/content/progress use shared contracts.
- App data is classified using `docs/architecture/data-model.md`.
- Child Mode hides all account, settings, recovery, deletion, and manager tools.
- Offline timer use works with defaults/cached data.
- Reset app, reset progress, reset my data, and account deletion follow the shared data model.
- No profile switching or allowed-app logic exists in this app flow.
