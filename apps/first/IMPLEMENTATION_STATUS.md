# Tiko First — Implementation Status

Source-of-truth documentation:
- `docs/apps/first.md` (product spec)
- `docs/plans/first-ios.md` (implementation plan)
- `docs/flows/shared/design-principles.md` (Tiko design values)
- `docs/flows/shared/user-modes.md` (identity / Parent–Child contract, via TikoKit)

Statuses: `NOT STARTED` · `IN PROGRESS` · `BLOCKED` · `IMPLEMENTED` · `VERIFIED`

## Working notes (context continuity)

- Cycle 1 (2026-07-25): whole app built on TikoKit — harness, eight localised
  routines, the in-order routine loop, progress store with daily reset, Parent
  Mode editor, release scaffolding, icon, screenshots, App Store record
  (6794608348), build 1.0 (1) uploaded. 80 tests green, release validation
  passes, installed on the iPhone 17 Pro Max / iPad Pro 13" simulators and on a
  physical iPhone 14 Pro.
- First is the simplest app in the family by design: **no microphone, no
  recognizer, no camera, no permission prompts at all.** Voice-out and tap only.
- Media note: routine and step art does not live in one media category (a
  toothbrush is in `tools`, cereal in `food`, a bus stop in `transport`), so
  `TikoMediaClient.searchMedia` was added to TikoKit and `FirstStore` resolves
  one search per distinct English key, then persists the URLs. Keys that do not
  resolve keep their emoji, which is a first-class fallback rather than a gap.
- Verification commands (from `apps/first/ios/`):
  - `xcodegen generate`
  - `xcodebuild -project TikoFirst.xcodeproj -scheme TikoFirst -destination 'platform=iOS Simulator,name=iPhone 17 Pro Max' -derivedDataPath .build/derived test` → 75 unit + 5 UI tests pass
  - `./scripts/validate-local.sh` → ✓ first: validation passed
- Submitted for review on 2026-07-25 (build 2, automatic release after
  approval). Remaining follow-up: the overnight daily-reset pass on a physical
  device, which the unit tests already cover deterministically.

## Requirements

| # | Requirement | Source | Status | Implementation | Verification |
|---|---|---|---|---|---|
| 1 | Opens without login on the shared harness; Parent/Child Mode per contract | `docs/flows/shared/user-modes.md` | VERIFIED | `Sources/FirstView.swift`, `Sources/TikoFirstApp.swift` | UI test `testParentModeOpensRoutineEditor`; guest launch with no account |
| 2 | Routine grid of large picture tiles with progress at a glance | `docs/apps/first.md` | VERIFIED | `Sources/FirstView.swift` (`FirstHomeView`, `StepDots`) | UI test `testLaunchShowsRoutineGrid`; simulator screenshots |
| 3 | Current step fills the screen, spoken once as it becomes current | `docs/apps/first.md` | VERIFIED | `Sources/RoutineView.swift`, `Sources/RoutineViewModel.swift` | `RoutineViewModelTests.testBeginPresentsAndSpeaksTheFirstStep`; heard on device |
| 4 | Ordered strip: finished steps ticked and dimmed, upcoming steps quiet | `docs/apps/first.md` | VERIFIED | `Sources/RoutineView.swift` (`stepStrip`) | Screenshots; UI test for the strip |
| 5 | Steps cross off strictly in order; a future step only previews | `docs/apps/first.md` | VERIFIED | `Sources/FirstProgressStore.swift` (`resolve`), `RoutineViewModel.complete` | `FirstProgressTests.testCompletingOutOfOrderIsRefused`, UI test `testFutureStepInTheStripCannotBeCompleted` |
| 6 | Undo the most recent tick only | `docs/plans/first-ios.md` | VERIFIED | `FirstProgressStore.undoLast` | `testUndoLastRemovesOnlyTheMostRecentTick`, `testUndoAfterCompletionReopensTheLastStep` |
| 7 | Skip, when a parent allows it per routine, marks skipped-not-ticked | `docs/plans/first-ios.md` | VERIFIED | `FirstProgressStore`, `RoutineViewModel.skipCurrent` | `testSkipIsRefusedUnlessTheRoutineAllowsIt`, `testSkippedStepCountsAsResolvedButRendersAsSkipped` |
| 8 | Step tick celebration and a big finish celebration | `docs/apps/first.md` | VERIFIED | `Sources/RoutineView.swift`, TikoKit `TikoCelebrate`/`TikoFeedback` | Observed in the simulator; celebrate screenshot scene |
| 9 | Replay always available as an icon-only round button | `docs/apps/first.md` | VERIFIED | `Sources/RoutineView.swift` (`controls`) | UI test asserts `first.control.replay`; screenshots |
| 10 | Interruptions and force-quits resume at the right step | `docs/apps/first.md` | VERIFIED | `FirstProgressStore` (write-on-resolve), `RoutineViewModel.begin` | `testProgressSurvivesAFreshStoreForTheSameAccount`, `testInterruptionStopsTalkingAndKeepsProgress` |
| 11 | Daily reset for Morning/Bedtime across a real date boundary | `docs/apps/first.md` | VERIFIED | `FirstProgressStore.shouldDailyReset` (injectable clock/calendar) | `testDailyResetRoutineIsFreshOnTheNextDay`, `…DoesNotFireLaterTheSameDay`, `…SurvivesADSTBoundary` |
| 12 | Language switches keep progress | `docs/apps/first.md` | VERIFIED | Step IDs are language-independent | `testProgressSurvivesALanguageSwitch` |
| 13 | Eight localised default routines in six languages | `docs/apps/first.md` | VERIFIED | `Sources/FirstCatalog.swift` | `FirstCatalogTests` (every routine and step title present per language) |
| 14 | Full Parent Mode editing on the shared Tiko sheets, per language | `docs/apps/first.md` | VERIFIED | `Sources/FirstParentEditor.swift`, `Sources/FirstStore.swift` | `FirstStoreTests` (override/custom/hide/reorder/duplicate/reset lifecycle) |
| 15 | One-tap duplication (the first/then template) | `docs/apps/first.md` | VERIFIED | `FirstStore.duplicateRoutine` | `testDuplicatingGivesAnIndependentCopyWithFreshStepIDs` |
| 16 | Per-routine settings: daily reset, allow skip, pin as current | `docs/apps/first.md` | VERIFIED | `FirstStore.setRoutineSettings` | `testPinningIsExclusive`, `testAHiddenRoutineIsNeverThePinnedOne` |
| 17 | A pinned routine opens directly on launch | `docs/apps/first.md` | VERIFIED | `Sources/FirstView.swift` `.onAppear` | `FirstStoreTests` pin coverage; verified by pinning on device |
| 18 | Parent Mode can reset progress and see what is done today | `docs/apps/first.md` | VERIFIED | `FirstParentEditor`, `FirstProgressStore.wasCompletedToday` | `testWasCompletedTodayOnlyCountsTodaysFinish` |
| 19 | Step images from the media library with emoji fallback, offline after first use | `docs/apps/first.md` | VERIFIED | `FirstStore.hydrateMedia`, TikoKit `searchMedia` + `TikoRemoteImageCache` | Screenshots show resolved art for every default step; persisted across relaunch |
| 20 | Photo upload for step images via the system picker | `docs/apps/first.md` | VERIFIED | `Sources/FirstParentEditor.swift` (`tikoMediaPickerSheet`) | Picked an image per step in the simulator; no permission prompt |
| 21 | Zero permission prompts | `docs/plans/first-ios.md` | VERIFIED | No usage-description keys in `Sources/Info.plist`; no AV/Speech APIs | Clean install walked through a full routine: no dialog |
| 22 | Editing a routine mid-run keeps the child's place | `docs/plans/first-ios.md` | VERIFIED | `RoutineViewModel.refresh`, progress pruning | `testRefreshKeepsProgressWhenAParentEditsTheRoutine`, `testDeletedStepsDropOutOfProgress` |
| 23 | Reduce Motion, dark mode, iPad and landscape layouts | `docs/apps/first.md` | VERIFIED | `Sources/RoutineView.swift` (reduceMotion paths, size classes) | Light/dark screenshots on iPhone and iPad; landscape sizing path |
| 24 | VoiceOver labels and values throughout | `docs/apps/first.md` | VERIFIED | accessibility identifiers/labels/values on every control | Labels asserted in UI tests; strip announces done/skipped/upcoming |
| 25 | Release plumbing: release config, CI registration, validation script | `docs/apps/ios-release.md` | VERIFIED | `apps/first/release/*`, `release.config.json`, `.github/workflows/*` | `./scripts/validate-local.sh` passes |
| 26 | App Store 1.0: metadata, age rating 4+, pricing free, review notes | `docs/apps/ios-release.md` | IMPLEMENTED | `apps/first/release/app-store/en-US.json` | Verified through the App Store Connect API after each write |
| 27 | App Store 1.0: build uploaded, six screenshots per device | `docs/apps/ios-release.md` | IMPLEMENTED | `artifacts/archives/first/export/TikoFirst.ipa` | Upload succeeded; 6 screenshots on each of iPhone 6.9" and iPad 13" |
| 28 | App Store 1.0: submitted for review with automatic release | `docs/apps/ios-release.md` | VERIFIED | `scratchpad/first_submit.rb` | Build 2 attached, releaseType AFTER_APPROVAL, version 1.0 state WAITING_FOR_REVIEW |
| 29 | Binary links no permission-gated frameworks | Apple ITMS-90683 | VERIFIED | `packages/tikokit-ios/Package.swift` (`TikoSpeechKit` split) | `otool -L` on the archived binary: no Speech.framework |
| 30 | Device validation through a real-day cycle (morning + bedtime reset) | `docs/apps/first.md` | IN PROGRESS | — | Installed on a physical iPhone 14 Pro and walked through a routine; the overnight daily-reset pass needs a real date boundary, which the unit tests cover deterministically |

## Notes on the release

- **ITMS-90683 (build 1, rejected in processing)** — linking `Speech.framework`
  made Apple require `NSSpeechRecognitionUsageDescription` even though First
  never listens. Rather than add a purpose string for an unused API, speech
  recognition moved into its own `TikoSpeechKit` SPM product that only Say and
  Sum depend on. Build 2 links no Speech and processed cleanly.
- **App Privacy** — no interactive sign-in turned out to be needed: the
  submission was accepted with the privacy section as the account default. If a
  future review asks for explicit answers, they are User ID + Email Address,
  used for App Functionality, linked to the user, no tracking.
- Nothing is blocked. Version 1.0 is `WAITING_FOR_REVIEW` and set to release
  automatically after approval.
