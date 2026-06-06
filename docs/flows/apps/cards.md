# Cards User Flow Contract

## Purpose

Cards helps a child communicate by choosing visual cards, boards, or categories and optionally speaking the selected card. It proves media-backed content, custom communication sets, board state, speech fallback, and child-safe browsing.

## Primary child-facing flow

1. User opens Cards.
2. App immediately shows the default or last-opened board using local defaults or cached content.
3. User selects a card.
4. App gives immediate visual feedback.
5. App speaks the card label or configured phrase if speech is enabled.
6. App may record usage progress according to settings.
7. App syncs settings, board state, content, and progress in the background.

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
| Board grid | Main screen | Shows child-safe cards for choosing/speaking. |
| Card tap | Main screen | Selects and speaks a card immediately. |
| Category/board navigation | Child Mode / app surface | Moves between available boards without exposing settings. |
| Parent Mode settings | Parent Mode only | Opens Cards settings, account state, reset actions, and board/content management. |
| Child Mode exit | Child Mode only | Opens PIN gate before returning to Parent Mode. |

Child Mode must not expose account, recovery, deletion, profile manager, or parent settings controls.

## App settings contract

```ts
interface CardsSettings {
  language: string
  colorMode: 'light' | 'dark' | 'system'
  gridSize?: 'small' | 'medium' | 'large'
  speakOnSelect?: boolean
  showLabels?: boolean
  defaultBoardId?: string
  symbolStyle?: 'photo' | 'illustration' | 'text'
}
```

## App state contract

```ts
interface CardsState {
  lastBoardId?: string
  lastCategoryId?: string
  lastSelectedCardId?: string
}
```

## Progress contract

```ts
interface CardsProgress {
  cardUsage?: Array<{
    cardId: string
    count: number
    lastUsedAt: string
  }>
  boardUsage?: Array<{
    boardId: string
    count: number
    lastUsedAt: string
  }>
}
```

Progress is optional. Usage frequency and recommendation signals are Progress, not User Content.

## User content contract

```ts
interface CardsContent {
  boards?: Array<{
    id: string
    title: string
    cardIds: string[]
    order?: number
  }>
  cards?: Array<{
    id: string
    label: string
    speech?: string
    mediaId?: string
    color?: string
    order?: number
  }>
}
```

Custom boards, custom cards, and uploaded/selected media references are User Content.

## Data categories used

| Data | Category | Notes |
| --- | --- | --- |
| Grid size, labels, speech behavior | Preferences | User-configurable app behavior. |
| Default board | Preferences | Parent Mode controlled. |
| Last board/category/card | App State | Disposable current working state. |
| Custom boards | User Content | Intentionally created communication content. |
| Custom cards | User Content | Intentionally created communication content. |
| Card media references | User Content | User-selected or uploaded media. |
| Card/board usage counts | Progress | Usage-generated history. |
| Recommendations | Insights | Derived from Progress if implemented. |

## Account behavior

- Temporary Accounts can use Cards in Parent Mode with defaults or local custom content.
- Temporary Accounts can add a display name and verify email to become Verified.
- Temporary Accounts cannot enter Child Mode.
- Verified and Profile Manager accounts can enter Child Mode after PIN setup.
- Child Accounts always open Cards in Child Mode.
- Profile Manager accounts may manage Child Account card preferences/content only through explicitly documented manager tools.
- Cards does not implement profile switching, active profiles, managed child profiles, or app blocking.

## Offline behavior

| Feature | Offline behavior |
| --- | --- |
| Card selection | Fully available from built-in defaults and cached boards/cards. |
| Speech | Use cached generated audio, native/browser speech, or silent fallback. Selection must still work. |
| Media | Use cached images/media; missing media falls back to color/text tile. |
| Board edits | Save locally and queue sync where safe. |
| App state | Save locally and queue sync where safe. |
| Progress | Save locally if enabled and queue sync where safe. |
| Account/recovery/deletion | Requires online except local reset. |

## Reset and deletion impact

### Reset app

Deletes Cards App State for the current account/session, such as last opened board, category, and selected card.

Keeps Identity, Preferences, User Content, Progress, and Insights.

### Reset progress

Deletes Cards Progress, such as card usage, board usage, and usage-derived recommendations.

Keeps Identity, Preferences, App State, and User Content.

### Reset my data

Deletes Cards Preferences, App State, User Content, Progress, and Insights for the current account according to the shared data model.

Keeps account Identity.

### Delete account

Deletes or anonymizes account Identity and all Cards data according to the shared deletion flow and retention policy.

After deleting a Verified or Profile Manager account, the app returns to first launch and creates a fresh Temporary Account.

### Child Account deletion

Child Accounts cannot self-delete. A Profile Manager deletes the Child Account. That deletion removes or anonymizes Cards data linked to that Child Account according to policy.

## Platform notes

| Platform | Notes |
| --- | --- |
| Web | Use cached media and browser speech fallback where needed. |
| iOS | Cache image bytes where possible and use native speech fallback. |
| Android | Cache image bytes where possible and use native speech fallback. |

## Acceptance criteria

- Cards renders a usable board before network completion.
- Card selection feedback is immediate.
- Speech/media failures do not block selection.
- Settings/state/content/progress use shared contracts.
- App data is classified using `docs/architecture/data-model.md`.
- Child Mode hides all account, settings, recovery, deletion, and manager tools.
- Offline card use works with defaults/cached data.
- Reset app, reset progress, reset my data, and account deletion follow the shared data model.
- No profile switching or allowed-app logic exists in this app flow.
