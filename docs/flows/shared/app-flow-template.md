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
5. App syncs state/settings/progress in the background where relevant.

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
| Main action | Child Mode / app surface |  |
| Parent Mode settings | Parent Mode only |  |
| Child Mode exit | Child Mode only | PIN gate before Parent Mode. |
| Help/support | Parent Mode |  |

Child Mode must not expose account, recovery, deletion, profile manager, or parent settings controls.

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

## Progress contract

```ts
interface {AppName}Progress {
}
```

Progress is optional. If the app does not store usage-derived history yet, document that explicitly.

## User content contract

```ts
interface {AppName}Content {
}
```

User Content is optional. If the app does not let users create/upload/save custom content yet, document that explicitly.

## Data categories used

Use `docs/architecture/data-model.md`.

| Data | Category | Notes |
| --- | --- | --- |
|  | Identity / Preferences / App State / User Content / Progress / Insights |  |

## Account behavior

Document behavior for:

- Temporary Account
- Verified Account
- Profile Manager Account
- Child Account
- Parent Mode
- Child Mode

Rules:

- Do not use profile switching.
- Do not use active profiles.
- Do not use managed child profiles.
- Do not implement allowed-app or blocked-app logic.

## Offline behavior

| Feature | Offline behavior |
| --- | --- |
| Core child-facing action |  |
| Settings changes |  |
| App State |  |
| Progress |  |
| TTS/audio |  |
| Media/content |  |
| Account/recovery/deletion |  |

## Reset and deletion impact

Document exactly what happens for:

- Reset app
- Reset progress
- Reset my data
- Delete account
- Child Account deletion, if relevant

## Platform notes

| Platform | Notes |
| --- | --- |
| Web |  |
| iOS |  |
| Android |  |

## Acceptance criteria

- App opens without login.
- Main action works offline with defaults/cached data where possible.
- Child Mode hides account, recovery, deletion, profile manager, and parent settings controls.
- Settings/state/progress/content follow documented contracts.
- App data is classified using `docs/architecture/data-model.md`.
- Reset and deletion behavior follows the shared data model.
- Account deletion is reachable through shared Parent Mode flow where relevant.
- Platform-specific differences are documented.
- No profile switching or allowed-app logic exists in this app flow.
