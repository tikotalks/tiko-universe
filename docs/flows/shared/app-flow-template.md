# App Flow Template

Copy this template to `docs/flows/apps/{app-name}.md` for every Tiko app.

# {App Name} User Flow Contract

## Purpose

Describe what this app does and who it helps.

## Primary child-facing flow

1. User opens app.
2. App renders immediately with local defaults/cached settings.
3. User performs the app's core action.
4. App gives immediate feedback.
5. App syncs state/settings in the background where relevant.

## Shared flows used

- Startup/session: `docs/flows/shared/startup-and-session.md`
- Identity/profile: `docs/flows/shared/identity-and-profiles.md`
- Settings/state: `docs/flows/shared/settings-and-app-state.md`
- Offline/sync: `docs/flows/shared/offline-and-sync.md`
- Platform compliance: `docs/flows/shared/platform-compliance.md`

## Entry points

| Entry | Location | Behavior |
| --- | --- | --- |
| Main action |  |  |
| Settings |  |  |
| Profile/account |  |  |
| Help/support |  |  |

## App settings contract

```ts
interface {AppName}Settings {
  language?: string
  colorMode?: 'light' | 'dark' | 'system'
}
```

## App state contract

```ts
interface {AppName}State {
}
```

## Profile behavior

Document whether app data is:

- profile-scoped
- device-scoped
- user-scoped
- local-only
- synced

## Offline behavior

| Feature | Offline behavior |
| --- | --- |
| Core child-facing action |  |
| Settings changes |  |
| TTS/audio |  |
| Media/content |  |
| Account/recovery/deletion |  |

## Deletion impact

Document exactly what happens when:

- profile is deleted
- local data is reset
- account/user is deleted

## Platform notes

| Platform | Notes |
| --- | --- |
| Web |  |
| iOS |  |
| Android |  |

## Acceptance criteria

- App opens without login.
- Main action works offline with defaults/cached data where possible.
- Profile entry opens the shared Profile Overview.
- Settings/state follow documented contracts.
- Account deletion is reachable through shared flow.
- Platform-specific differences are documented.
