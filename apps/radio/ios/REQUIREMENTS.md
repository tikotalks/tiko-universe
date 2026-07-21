# Tiko Radio — Requirements & Test Coverage

Tiko Radio is a calm, big-tile music player for young children. Its core job is to
present songs grouped into colourful **collections**, let a child open a track and
**play / pause / skip** it, with **shuffle** and **repeat** options, all in a
large-target, low-clutter interface. Songs are backed by YouTube / audio sources
and organised into collections the parent can add to. **The app must be fully
usable without an account; login is optional.**

This document is the requirements-based test spec that the pilot XCTest / XCUITest
suite verifies. Each requirement notes how it is covered:

- **[unit]** — covered by an XCTest unit test in `Tests/TikoRadioTests.swift`
- **[ui]** — covered by an XCUITest in `UITests/TikoRadioUITests.swift`
- **[manual]** — not yet automated (documented gap)

## Library: tracks & collections

1. A track carries a title, optional artist, a source (YouTube / R2 / upload), an
   optional YouTube video id, thumbnail, duration and a collection id. **[unit]**
   (`testRadioTrackInitDefaults`, `testRadioTracksRoundTripJSON`)
2. A track's spoken source id can be parsed from a plain id or any YouTube URL
   form (watch, `youtu.be`, shorts / embed / live). **[unit]**
   (`testYouTubeVideoIDParserHandlesPlainID`, `…WatchURL`, `…ShortURL`, `…ShortsURL`)
3. A track with no collection is filed under the built-in "Unsorted" collection
   when added. **[unit]** (`testAddTrackDefaultsToUncategorized`)
4. The app ships a built-in set of colourful collections (Animals, Stories, Music,
   Calm, Favorites, Unsorted), each with a title, SF Symbol and colour. **[unit]**
   (`testDefaultCollectionsCatalog`)
5. Tracks can be filtered by collection, and a collection reports its track count.
   **[unit]** (`testTracksFilteredByCollection`)

## Persistence & management

6. The library (tracks + collections + selection) persists across launches. **[unit]**
   (`testRadioLibraryStorePersistsTracks`,
   `testRadioLibraryStorePersistsCollectionsAndMovesTracks`)
7. Collections can be created (with an auto-assigned colour and unique id) and
   renamed; tracks can be renamed and moved between collections; deleting a
   collection re-files its tracks to "Unsorted". **[unit]**
   (`testAddCategoryAssignsUniqueIdAndColor`, `testRemoveCollectionRefilesTracks`,
   `testRadioLibraryStorePersistsCollectionsAndMovesTracks`) **[manual]** (editor UI)
8. Adding a song from a YouTube URL fetches its title / artist metadata. **[manual]**

## Playback

9. Playback starts idle: no current track, not playing, zero progress. **[unit]**
   (`testPlaybackServiceStartsIdle`)
10. Opening a track shows the player detail with big **play / pause**, **skip
    back** and **skip forward** controls plus **shuffle** and **repeat** toggles.
    **[ui]** (`testOpeningCollectionAndTrackShowsPlaybackControls`)
11. In linear order, **skip forward** advances to the next track and wraps from the
    last track back to the first; **skip back** wraps from the first to the last.
    **[unit]** (`testQueueAdvanceWrapsAround`, `testQueueRewindWrapsAround`)
12. With **shuffle** on, skipping selects an in-range track (deterministic with an
    injected generator). **[unit]** (`testQueueShuffleStaysInRange`,
    `testQueueShuffleIsDeterministicWithSeededGenerator`)
13. Navigation on an empty queue is a no-op (returns no index); a single-track
    queue always resolves to that track. **[unit]** (`testQueueEmptyReturnsNil`,
    `testQueueSingleTrack`)
14. Play / pause / resume / stop transition the playback service state and reset
    progress on stop. **[unit]** (`testPlaybackPauseAndStopResetState`) **[manual]**
    (actual audio / YouTube WebView playback)
15. Shuffle and repeat preferences persist (settings toggles). **[manual]** (UI toggles)

## Account is OPTIONAL (the App Review fix)

16. The app is fully usable without an account — the collection grid is shown and a
    track can be opened and played with no login. **[ui]**
    (`testAppIsUsableWithoutLogin`, `testOpeningCollectionAndTrackShowsPlaybackControls`)
17. Login is optional and reachable from the account menu (email + one-time code).
    A **"Skip for now"** action dismisses the login popup and returns the user to
    the working app. **[ui]** (`testSkipForNowReturnsToUsableApp`)
18. **REGRESSION (App Review 2.1 — "app reverted back after inputting an email"):**
    Tiko Radio uses the exact same TikoKit account/login popup as Tiko Yes-No, so
    it inherits both the bug's risk and the fix. The account/login popup must be
    **non-dismissible** by the keyboard, an outside tap, or a drag. Opening the
    login popup, tapping the email field and typing an email must **NOT** dismiss
    the card — it stays present so the user can finish signing in. **[ui]**
    (`testLoginPopupSurvivesEmailInput`)

## Appearance & lifecycle

19. Colour mode (system / light / dark) and language are selectable and drive the
    UI. **[manual]**
20. A branded app shell / header with a back affordance navigates
    home → collection → player. **[manual]**

---

### Coverage summary

- **Unit (XCTest):** requirements 1–7, 9, 11–14 — the track / collection model,
  the YouTube id parser, library persistence & management, and the pure playback
  queue (advance / rewind / shuffle / wrap-around) logic.
- **UI (XCUITest):** requirements 10, 16, 17, 18 — launch usability without an
  account, opening a collection → track → playback controls, "Skip for now", and
  the non-dismissible login-popup regression.
- **Manual / not yet automated:** 7 (editor UI), 8, 14 (real playback), 15, 19,
  20. These need additional coverage in future iterations.
