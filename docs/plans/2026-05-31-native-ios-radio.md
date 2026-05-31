# Native iOS Radio Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Upgrade `apps/radio/ios` into a native-first children's audio app with a robust playback model, native audio controls, categories, parent controls, and a clean API boundary.

**Architecture:** Radio iOS should preserve the product contract — safe child-facing audio playback curated by a caregiver — while using native iOS powers: `AVPlayer`, background audio, lock-screen metadata, remote commands, haptics, sheets, local persistence, and only a constrained `WKWebView` bridge where YouTube requires it. Do not mirror the web floating player/popup layout 1:1.

**Tech Stack:** SwiftUI, Swift 5.9+, iOS 17+, XcodeGen, TikoKit Swift Package, AVFoundation, MediaPlayer, WebKit for YouTube fallback, Observation.

---

## Native Product Direction

Use native capabilities that the web app cannot fully own:

- `AVPlayer` for R2/upload/audio URLs.
- Proper background audio session and lock-screen controls.
- `MPNowPlayingInfoCenter` metadata.
- `MPRemoteCommandCenter` play/pause/skip.
- Native sheets for adding tracks/categories and parent controls.
- Local curated library that works without account setup.
- Parent mode PIN stays local-first, with future identity recovery boundary.

YouTube is the exception: keep a constrained `WKWebView` bridge for YouTube playback, but do not make the whole app a web player.

## Existing Starting Point

- Existing app folder: `apps/radio/ios`
- Existing files:
  - `apps/radio/ios/Project.yml`
  - `apps/radio/ios/Sources/TikoRadioApp.swift`
  - `apps/radio/ios/Sources/RadioView.swift`
  - `apps/radio/ios/Sources/Info.plist`
  - `apps/radio/ios/Tests/TikoRadioTests.swift`
- Current `RadioView.swift` already contains local track models, a hidden YouTube `WKWebView`, and add-track UI. Plan should refactor this into smaller native services/views.

## Acceptance Criteria

- Radio state/playback lives outside the giant view in testable native models/services.
- Local/audio-url tracks use `AVPlayer`; YouTube uses WebKit only as needed.
- App supports foreground play/pause/next and basic background/lock-screen metadata.
- Categories are native chips/sections, not web-like dropdowns.
- Parent mode controls are native sheets and do not block child playback by default.
- Local library persists and can later sync through API clients.

---

### Task 1: Split Radio Models from View

**Objective:** Move models out of `RadioView.swift` so playback and UI can evolve safely.

**Files:**
- Create: `apps/radio/ios/Sources/RadioModels.swift`
- Modify: `apps/radio/ios/Sources/RadioView.swift`
- Modify: `apps/radio/ios/Tests/TikoRadioTests.swift`

**Steps:**
1. Move `RadioTrack`, `TrackSource`, and category structs/enums into `RadioModels.swift`.
2. Keep them `Codable`, `Equatable`, `Identifiable`, `Sendable` where possible.
3. Add focused tests for JSON round-trip and YouTube ID parsing if that logic exists.
4. Keep `RadioView.swift` compiling with the moved types.

**Verify:** Mac `xcodebuild test`; Linux source review shows `RadioView.swift` is smaller.

**Commit:** `refactor(ios): split radio models from view`

---

### Task 2: Add Native Radio Library Store

**Objective:** Centralize local track/category persistence.

**Files:**
- Create: `apps/radio/ios/Sources/RadioLibraryStore.swift`
- Modify: `apps/radio/ios/Sources/RadioView.swift`
- Modify: `apps/radio/ios/Tests/TikoRadioTests.swift`

**Implementation notes:**

Use an `@Observable @MainActor final class RadioLibraryStore` with:

- `tracks: [RadioTrack]`
- `categories: [RadioCategory]`
- `selectedCategoryID: String?`
- `load()` / `save()` using JSON file storage or `UserDefaults` for v1.
- `addTrack`, `removeTrack`, `addCategory`, `assignTrack` methods.

Add API boundary only as protocol:

```swift
protocol RadioSyncClient {
    func fetchLibrary() async throws -> RadioLibrarySnapshot
    func pushLibrary(_ snapshot: RadioLibrarySnapshot) async throws
}
```

**Commit:** `feat(ios): add radio library store`

---

### Task 3: Add Native Audio Playback Service

**Objective:** Use `AVPlayer` for non-YouTube tracks and isolate YouTube WebKit playback.

**Files:**
- Create: `apps/radio/ios/Sources/RadioPlaybackService.swift`
- Modify: `apps/radio/ios/Sources/RadioView.swift`
- Test: `apps/radio/ios/Tests/TikoRadioTests.swift`

**Implementation notes:**

Create an `@Observable @MainActor final class RadioPlaybackService` with:

- `currentTrack: RadioTrack?`
- `isPlaying: Bool`
- `duration/progress` if available
- `play(track:)`
- `pause()`
- `resume()`
- `stop()`
- `next(in:)`

Routing:

- `.r2` / `.upload` / URL-backed audio → `AVPlayer`.
- `.youtube` → `YouTubePlaybackBridge` using existing hidden `WKWebView` logic.

**Important:** Do not hide all player logic inside SwiftUI view closures.

**Commit:** `feat(ios): add native radio playback service`

---

### Task 4: Configure Background Audio and Lock Screen Controls

**Objective:** Make the app behave like a real native audio app.

**Files:**
- Modify: `apps/radio/ios/Sources/Info.plist`
- Modify: `apps/radio/ios/Sources/RadioPlaybackService.swift`
- Create: `apps/radio/ios/Sources/RadioNowPlayingService.swift`

**Implementation notes:**

- Add background mode for audio in `Info.plist` if product direction approves background playback.
- Configure `AVAudioSession.sharedInstance().setCategory(.playback)`.
- Update `MPNowPlayingInfoCenter.default().nowPlayingInfo` with title/artist/artwork when available.
- Register `MPRemoteCommandCenter` handlers for play/pause/next/previous.

**Verify on device/simulator:** lock screen metadata appears for audio-url tracks. Note YouTube background restrictions separately.

**Commit:** `feat(ios): add radio lock screen playback controls`

---

### Task 5: Native Child Player Screen

**Objective:** Replace web-like floating player mental model with a native child-first player.

**Files:**
- Create: `apps/radio/ios/Sources/RadioPlayerView.swift`
- Create: `apps/radio/ios/Sources/RadioTrackGrid.swift`
- Modify: `apps/radio/ios/Sources/RadioView.swift`

**Implementation notes:**

- Main content: category chips + large track tiles.
- Bottom/native player bar only when something is selected.
- Large play/pause button, next button, and current title/artwork.
- Haptic feedback on play/pause/next.
- Use Tiko app shell with `.radio` color.

**Verify:** child can start/stop tracks without seeing add/edit controls.

**Commit:** `feat(ios): add native radio player screen`

---

### Task 6: Native Add Track and Category Sheets

**Objective:** Move caregiver library management into native sheets.

**Files:**
- Create: `apps/radio/ios/Sources/AddTrackSheet.swift` or refactor existing embedded sheet into this file
- Create: `apps/radio/ios/Sources/AddCategorySheet.swift`
- Modify: `apps/radio/ios/Sources/RadioView.swift`

**Implementation notes:**

- YouTube add: paste URL, parse video ID, fetch title later via API/TODO.
- Audio URL add: accept title + URL for R2/upload testing.
- Category add/edit uses big rows and color picker.
- All caregiver actions require parent/edit mode, not child main screen.

**Commit:** `feat(ios): add native radio management sheets`

---

### Task 7: Parent Mode and PIN as Native Sheet

**Objective:** Make parent controls native, local-first, and non-blocking.

**Files:**
- Create: `apps/radio/ios/Sources/ParentModeSheet.swift`
- Create: `apps/radio/ios/Sources/PinStore.swift`
- Modify: `apps/radio/ios/Sources/RadioView.swift`
- Test: `apps/radio/ios/Tests/TikoRadioTests.swift`

**Implementation notes:**

- Store PIN hash locally.
- Unlock parent mode for current session.
- Child mode remains default.
- No password/account assumptions.
- Optional recovery through identity magic link is a TODO boundary only.

**Test:** PIN hash verification works; wrong PIN fails; no raw PIN persisted.

**Commit:** `feat(ios): add native radio parent mode`

---

### Task 8: API Boundary for Future Library Sync

**Objective:** Prepare native app for Cloudflare sync without blocking local v1.

**Files:**
- Create: `apps/radio/ios/Sources/RadioAPIClient.swift`
- Modify: `apps/radio/ios/Sources/RadioLibraryStore.swift`

**Implementation notes:**

- Use `actor RadioAPIClient`.
- Base URL is configurable for dev/prod.
- Add typed request/response models only for known contracts.
- Do not call old Supabase or invent auth; use Tiko identity session later.

**Commit:** `feat(ios): add radio api client boundary`

---

### Task 9: Validation and Handoff

**Linux checks:**

```bash
npm run typecheck
npm test -- --run
find apps/radio/ios -type f | sort
```

**Mac checks:**

```bash
cd apps/radio/ios
xcodegen generate
xcodebuild test -scheme TikoRadio -destination 'platform=iOS Simulator,name=iPhone 15' CODE_SIGNING_ALLOWED=NO
```

**Manual smoke:**

- Launch app in child mode.
- Select category, play a track, pause/resume/next.
- Add YouTube URL in parent mode and play via WebKit bridge.
- Add audio URL and play via AVPlayer.
- Background/lock-screen controls work for AVPlayer tracks if enabled.
- Restart app; library persists.
