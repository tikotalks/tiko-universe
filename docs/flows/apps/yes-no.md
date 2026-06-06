# Yes No User Flow Contract

## Purpose

Yes No is the first proof app for the shared Tiko platform. It proves device-first identity, immediate child-facing use, shared settings/state, TTS fallback, offline behavior, and native parity.

## Primary child-facing flow

1. User opens Yes No.
2. App immediately shows Yes and No controls using local defaults or cached settings.
3. User taps Yes or No.
4. App gives immediate visual feedback.
5. App speaks the selected label or sentence if speech is enabled.
6. App saves latest answer/history only if that setting/state behavior is enabled.
7. App syncs in the background without delaying feedback.

## Shared flows used

- Startup/session: `docs/flows/shared/startup-and-session.md`
- Identity/profile: `docs/flows/shared/identity-and-profiles.md`
- Settings/state: `docs/flows/shared/settings-and-app-state.md`
- Offline/sync: `docs/flows/shared/offline-and-sync.md`
- Platform compliance: `docs/flows/shared/platform-compliance.md`

## Entry points

| Entry | Location | Behavior |
| --- | --- | --- |
| Yes | Main screen | Selects/speaks affirmative response immediately. |
| No | Main screen | Selects/speaks negative response immediately. |
| Settings | Caregiver-visible control | Opens Yes No settings. PIN optional unless changing account/security/destructive data. |
| Profile/account | Shared profile entry | Opens shared Profile Overview. |
| Help/support | Settings/Profile Overview | Opens support/help information. |

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
  answerHistory?: Array<{
    answer: 'yes' | 'no'
    label: string
    answeredAt: string
  }>
}
```

## Profile behavior

- Settings are profile-scoped.
- State is profile-scoped if answer history is enabled.
- The app may run local-only without a synced profile.
- Profile switch reloads labels, sentence, language, and history for the selected profile.

## Offline behavior

| Feature | Offline behavior |
| --- | --- |
| Yes/No selection | Fully available. |
| Speech | Use cached generated audio, native/browser speech, or silent fallback. Selection must still work. |
| Settings changes | Save locally and queue sync. |
| Answer history | Save locally if enabled and queue sync. |
| Recovery/deletion | Requires online except local reset. |

## Deletion impact

### Profile deletion

Deletes Yes No settings and answer history for that profile.

### Local reset

Clears local Yes No settings/state and returns to defaults on this device. Synced server data may still exist.

### Account/user deletion

Deletes or anonymizes all synced Yes No settings/state/history associated with the user, subject to platform retention policy.

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
- Profile entry opens shared Profile Overview.
- Offline use works for core selection.
- Deletion impact is clear in shared deletion flow.
