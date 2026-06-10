# Type User Flow Contract

## Purpose

Type helps a child communicate by typing words, phrases, or sentences and speaking them aloud. It proves text entry, saved phrases, speech fallback, offline drafts, and child-safe controls across web, iOS, and Android.

## Primary child-facing flow

1. User opens Type.
2. App immediately shows the typing surface using local defaults or cached settings.
3. User enters text with the platform keyboard or app-provided child-safe keyboard.
4. User taps speak.
5. App gives immediate visual feedback and speaks the text when speech is enabled.
6. App may save the current draft or selected phrase according to settings.
7. App syncs settings/state/progress in the background without delaying typing or speech.

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
| Text input | Main screen | Lets the user compose text. |
| Speak | Main screen | Speaks the current text or selected phrase immediately. |
| Clear | Main screen | Clears the current draft after safe child-facing affordance. |
| Saved phrases | Child Mode / app surface | Shows saved phrases if enabled and child-safe. |
| Parent Mode settings | Parent Mode only | Opens Type settings, account state, reset actions, and phrase management. |
| Child Mode exit | Child Mode only | Opens PIN gate before returning to Parent Mode. |

Child Mode must not expose account, recovery, deletion, profile manager, or parent settings controls.

## App settings contract

```ts
interface TypeSettings {
  language: string
  colorMode: 'light' | 'dark' | 'system'
  voice?: string
  speechRate?: number
  speakOnSubmit?: boolean
  showSavedPhrases?: boolean
  keyboardLayout?: 'qwerty' | 'abc' | 'native'
  textSize?: 'normal' | 'large' | 'extra-large'
}
```

## App state contract

```ts
interface TypeState {
  currentDraft?: string
  lastSpokenText?: string
  keyboardLayout?: 'qwerty' | 'abc' | 'native'
}
```

## Progress contract

```ts
interface TypeProgress {
  spokenHistory?: Array<{
    text: string
    spokenAt: string
  }>
  frequentWords?: Array<{
    word: string
    count: number
  }>
}
```

Progress is optional. Usage-derived phrase ranking and frequent-word signals are Progress, not User Content.

## User content contract

```ts
interface TypeContent {
  savedPhrases?: Array<{
    id: string
    text: string
    color?: string
    order?: number
  }>
}
```

Saved phrases are User Content because the user or manager intentionally creates them.

## Data categories used

| Data | Category | Notes |
| --- | --- | --- |
| Language, voice, speech rate | Preferences | Shared or app-specific behavior. |
| Keyboard layout | Preferences / App State | Preference when intentionally set; state when only last-used. |
| Current draft | App State | Disposable current working text. |
| Last spoken text | App State | Useful for restoring current experience. |
| Saved phrases | User Content | Intentionally created communication content. |
| Spoken history | Progress | Usage-generated history if enabled. |
| Frequent words | Progress | Usage-derived ranking or recommendation signal. |

## Account behavior

- Temporary Accounts can use Type in Parent Mode.
- Temporary Accounts can add a display name and verify email to become Verified.
- Temporary Accounts cannot enter Child Mode.
- Verified and Profile Manager accounts can enter Child Mode after PIN setup.
- Child Accounts always open Type in Child Mode.
- Profile Manager accounts may manage child-safe phrase defaults only through explicitly documented manager tools.
- Type does not implement profile switching, active profiles, managed child profiles, or app blocking.

## Offline behavior

| Feature | Offline behavior |
| --- | --- |
| Typing | Fully available. |
| Speak | Use cached generated audio, native/browser speech, or silent fallback. Typing must still work. |
| Current draft | Save locally and queue sync where safe. |
| Saved phrases | Use cached phrases; local edits may queue if durable local storage is available. |
| Progress | Save locally if enabled and queue sync where safe. |
| Account/recovery/deletion | Requires online except local reset. |

## Reset and deletion impact

### Reset app

Deletes Type App State for the current account/session, such as current draft, last spoken text, and temporary keyboard state.

Keeps Identity, Preferences, User Content, Progress, and Insights.

### Reset progress

Deletes Type Progress, such as spoken history, frequent-word counts, and usage-derived recommendations.

Keeps Identity, Preferences, App State, and User Content.

### Reset my data

Deletes Type Preferences, App State, User Content, Progress, and Insights for the current account according to the shared data model.

Keeps account Identity.

### Delete account

Deletes or anonymizes account Identity and all Type data according to the shared deletion flow and retention policy.

After deleting a Verified or Profile Manager account, the app returns to first launch and creates a fresh Temporary Account.

### Child Account deletion

Child Accounts cannot self-delete. A Profile Manager deletes the Child Account. That deletion removes or anonymizes Type data linked to that Child Account according to policy.

## Platform notes

| Platform | Notes |
| --- | --- |
| Web | May use browser speech fallback. Avoid blocking text entry on network calls. |
| iOS | May use native speech and keyboard behavior. Keep speak action immediate. |
| Android | May use native speech and keyboard behavior. Keep speak action immediate. |

## Acceptance criteria

- Type renders a usable typing surface before network completion.
- Speak action is immediate and degrades safely if TTS fails.
- Settings/state/content/progress use shared contracts.
- App data is classified using `docs/architecture/data-model.md`.
- Child Mode hides all account, settings, recovery, deletion, and manager tools.
- Offline typing works with defaults/cached data.
- Reset app, reset progress, reset my data, and account deletion follow the shared data model.
- No profile switching or allowed-app logic exists in this app flow.
