# Shared Offline and Sync Flow Contract

## Purpose

Define what every Tiko app must do when offline, reconnecting, syncing, or resolving conflicts.

## Rule

Offline must preserve the core child-facing function wherever technically possible. Network loss must never become a login wall.

## Offline states

| State | Meaning | UI behavior |
| --- | --- | --- |
| Online synced | Latest known local data is synced. | No warning needed. |
| Online syncing | Writes or reads are in progress. | Small caregiver-visible sync indicator. |
| Online unsynced | Writes failed but network exists. | Retry quietly, show in Profile Overview/settings. |
| Offline clean | Device is offline with no pending writes. | Show offline status only in caregiver/profile UI unless useful. |
| Offline dirty | Device is offline with pending writes. | Queue writes, show unsynced status in caregiver/profile UI. |
| Reconnecting | Network returned and queued work is being processed. | Non-blocking sync indicator. |
| Conflict | Local and remote data both changed. | Resolve automatically for safe fields, ask caregiver for destructive cases. |

## Required offline behavior by area

| Area | Offline behavior |
| --- | --- |
| Child-facing app use | Must keep working from built-in defaults and local cache. |
| TTS/speech | Use cached generated audio, browser/native speech fallback, or silent fallback depending on app. |
| Profile switching | Allow cached profile switching. Do not require server roundtrip. |
| App settings | Allow local changes and queue sync where safe. |
| Recovery email | Disabled until online. |
| Forgotten PIN recovery | Disabled until online unless local destructive reset is chosen. |
| Account deletion | Allow local reset. Do not claim server deletion completed. |
| Media upload | Queue only if app has durable local file access. Otherwise explain online required. |
| Content packs | Use cached packs. New downloads require online. |

## Queue rules

Pending writes must include:

```ts
interface PendingWrite {
  id: string
  type: 'settings' | 'state' | 'profile' | 'profile-delete' | 'account-delete' | 'media'
  app?: string
  profileId?: string
  payload: unknown
  createdAt: string
  lastTriedAt?: string
  attemptCount: number
}
```

Rules:

- Queue writes locally when safe.
- Retry with backoff.
- Preserve order for destructive writes.
- Deletion writes must cancel or invalidate older queued writes for the deleted scope.
- Queued data must be cleared by account deletion/local reset.
- Do not queue raw session tokens inside write payloads.

## Sync after reconnect

1. Detect network availability.
2. Verify or restore session.
3. Process destructive queued writes first.
4. Push safe queued local writes.
5. Fetch latest profile/settings/state.
6. Resolve conflicts.
7. Update local cache and sync state.
8. Clear completed queue items.

## Conflict policy

| Data | Default policy |
| --- | --- |
| Display settings | Last-write-wins. |
| Language | Last-write-wins unless app has active unsaved local interaction. |
| Accessibility settings | Last-write-wins, but never interrupt active session. |
| App state history | Merge if append-only, otherwise last-write-wins. |
| Profile delete | Delete wins. |
| Account delete | Delete wins and cancels all other writes. |
| Media delete | Delete wins. |
| PIN changes | Latest verified caregiver action wins. |

## Offline copy rules

Use calm and useful language.

Allowed:

- `You are offline. The app still works on this device.`
- `Changes will sync when internet is back.`
- `This action needs internet.`

Avoid:

- `Login failed.`
- `Account unavailable.`
- `Fatal sync error.`
- Any language that suggests the child cannot communicate because the server is unavailable.

## Acceptance criteria

- Every app has a useful offline mode.
- Every app documents which features degrade offline.
- Sync state is visible in caregiver/profile UI.
- Child-facing usage is not interrupted by reconnect or conflict handling.
- Deletion and recovery never make false claims while offline.
