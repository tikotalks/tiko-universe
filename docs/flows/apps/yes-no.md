# Yes No User Flow Contract

## Purpose

Yes No is the first proof app for the shared Tiko platform. It proves immediate app use, account-type based identity, Parent Mode and Child Mode behavior, shared settings/state, TTS fallback, offline behavior, reset behavior, and native parity.

## Primary child-facing flow

1. User opens Yes No.
2. App immediately shows Yes and No controls using local defaults or cached settings.
3. User taps Yes or No.
4. App gives immediate visual feedback.
5. App speaks the selected label or sentence if speech is enabled.
6. App saves latest answer or history only if that setting/state behavior is enabled.
7. App syncs in the background without delaying feedback.

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
| Yes | Main screen | Selects/speaks affirmative response immediately. |
| No | Main screen | Selects/speaks negative response immediately. |
| Parent Mode settings | Parent Mode only | Opens Yes No settings, account state, reset actions, and app data controls. |
| Child Mode exit | Child Mode only | Opens PIN gate before returning to Parent Mode. |
| Help/support | Parent Mode | Opens support/help information. |

Child Mode must not expose account, recovery, deletion, profile manager, or parent settings controls.

## App settings contract

```ts
interface YesNoSettings {
  language: string
  colorMode: 'light' | 'dark' | 'system'
  sentence: string
  labels?: {
    yes?: string
    no?: string
  }
  speakOnSelect?: boolean
  visualFeedback?: boolean
  saveAnswerHistory?: boolean
}
```

## App state contract

```ts
interface YesNoState {
  latestAnswer?: 'yes' | 'no'
}
```

## Progress contract

Answer history is Progress, not App State.

```ts
interface YesNoProgress {
  answerHistory?: Array<{
    answer: 'yes' | 'no'
    label: string
    answeredAt: string
  }>
  counts?: {
    yes: number
    no: number
  }
}
```

Progress is optional and may not be implemented in the first version.

## Data categories used

| Data | Category | Notes |
| --- | --- | --- |
| Labels | Preferences | User-configurable app behavior. |
| Sentence | Preferences | User-configurable app behavior. |
| Language | Preferences | May come from account preference or app override. |
| Color mode | Preferences | May come from account preference or app override. |
| Latest answer | App State | Disposable current/last working state. |
| Answer history | Progress | Usage-generated history. |
| Yes/no counts | Progress | Usage-generated analytics. |
| Custom yes/no boards | User Content | Future feature only. |

## Account behavior

- Temporary Accounts can use Yes No in Parent Mode.
- Temporary Accounts cannot enter Child Mode.
- Verified and Profile Manager accounts can enter Child Mode after PIN setup.
- Child Accounts always open Yes No in Child Mode.
- Yes No does not implement profile switching, active profiles, managed child profiles, or app blocking.
- Child Accounts can use Yes No if the app is available on the device, browser, or deployment environment.

## Offline behavior

| Feature | Offline behavior |
| --- | --- |
| Yes/No selection | Fully available. |
| Speech | Use cached generated audio, native/browser speech, or silent fallback. Selection must still work. |
| Settings changes | Save locally and queue sync where safe. |
| Latest answer | Save locally and queue sync where safe. |
| Answer history/progress | Save locally if enabled and queue sync where safe. |
| Recovery/deletion | Requires online except local reset. |

## Reset and deletion impact

### Reset app

Deletes Yes No App State for the current account/session, such as latest answer.

Keeps:

- Identity
- Preferences
- User Content
- Progress
- Insights

### Reset progress

Deletes Yes No Progress, such as answer history and usage counts.

Keeps:

- Identity
- Preferences
- App State
- User Content

### Reset my data

Deletes Yes No Preferences, App State, User Content, Progress, and Insights for the current account according to the shared data model.

Keeps account Identity.

### Delete account

Deletes or anonymizes account Identity and all Yes No data according to the shared deletion flow and retention policy.

After deleting a Verified or Profile Manager account, the app returns to first launch and creates a fresh Temporary Account.

### Child Account deletion

Child Accounts cannot self-delete. A Profile Manager deletes the Child Account. That deletion removes or anonymizes Yes No data linked to that Child Account according to policy.

## Platform notes

| Platform | Notes |
| --- | --- |
| Web | Use browser speech fallback if generation audio is unavailable. |
| iOS | Use native speech fallback where appropriate. Keep taps immediate. |
| Android | Use native speech fallback where appropriate. Keep taps immediate. |

## Acceptance criteria

- Yes/No controls render before network completion.
- Selection feedback is immediate.
- Speech failure does not block selection.
- Settings/state use shared app-api contracts.
- App data is classified using `docs/architecture/data-model.md`.
- Child Mode hides all account, settings, recovery, deletion, and manager tools.
- Offline use works for core selection.
- Reset app, reset progress, reset my data, and account deletion follow the shared data model.
- No profile switching or allowed-app logic exists in this app flow.
