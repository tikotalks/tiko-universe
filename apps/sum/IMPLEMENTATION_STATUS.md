# Tiko Sum — Implementation Status

Source-of-truth documentation:
- `docs/apps/sum.md` (product spec)
- `docs/plans/sum-ios.md` (implementation plan)
- `docs/flows/shared/design-principles.md` (Tiko design values)
- `docs/flows/shared/user-modes.md` (identity / Parent–Child contract, via TikoKit)

Statuses: `NOT STARTED` · `IN PROGRESS` · `BLOCKED` · `IMPLEMENTED` · `VERIFIED`

## Working notes (context continuity)

- Cycle 1 (2026-07-25): whole app built on the shared TikoKit engine that was
  extracted from Say (voice, celebration, feedback, speech practice, matcher,
  media library). App registered in the config generator with the calculator
  icon on a flat `#dd8966` background. All unit + UI tests green, Release build
  clean, installed on the iPhone 17 Pro Max / iPad Pro 13" simulators and on a
  physical iPhone 14 Pro.
- Cycle 2 (2026-07-25, user feedback): path tiles use Tiko media images
  (`mediaMatchKey` per default path, hydrated and persisted) instead of emoji,
  with the emoji kept only as the offline fallback.
- Cycle 3 (2026-07-25, user feedback — "why does the app ask for microphone?"):
  playback in TikoKit now always configures a plain `.playback` audio session
  (`TikoSpeech.configurePlaybackSession`), and `.playAndRecord` is configured
  only inside `listen()`. A child who never uses voice answering is never asked
  for the microphone. Answering became a parent setting with three modes —
  choose a tile / type the number / say it — and only the third one requests
  permissions, from the parent settings screen.
- Cycle 4 (2026-07-25, user feedback — "free play also needs multiply and
  divide"): all four operators are available by default; the parent toggles now
  restrict rather than unlock. Division only accepts exact results (equals stays
  dimmed otherwise, never an error).
- Cycle 5 (2026-07-25, user feedback — "presets should just be 10s, and in the
  game we choose + − × ÷"): the twelve themed paths are gone. The home screen
  now asks one question — difficulty (10 / 20 / 50 / 100) — and the operator is
  picked on a second icon-only screen (+ − × ÷ or one shuffle tile for mixed).
  `SumGenerator` deals ten random non-trivial sums per run; `SumRunSpec` keeps
  difficulty + operators so "play again" deals a brand-new ten. `SumPathStore`
  lost the default-path override machinery it no longer had anything to
  override — it is parent-authored paths and operator words only.
- Cycle 5, same round, on how the game feels:
  - The sum lands part by part ("10" … "+" … "20"), each part spoken as it
    lands with a small pop (`TikoFeedback.playPop`, new in TikoKit). No `=` on
    screen.
  - The answer tiles are dealt and live from the first beat (`state` enters
    `.revealing` synchronously; `isAnswerable` covers revealing + choosing), so
    a child who already knows never waits out the voice.
  - A wrong pick stays on screen: half-second red flash + wobble on the tile
    that was actually touched, then it dims and goes inert. No re-speak, no
    vanishing tile. Last tile standing pulses.
  - The winning tile dances inside its own localized `TikoCelebrationOverlay`
    burst rather than a full-screen one; full-screen is kept for the end of ten.
  - The next sum's voice is prefetched while the current one is being answered.
  - End screen: bouncing emoji, fireworks, and two labelled buttons — Back and
    Play again.
- Verification commands (from `apps/sum/ios/`):
  - `xcodegen generate`
  - `xcodebuild -project TikoSum.xcodeproj -scheme TikoSum -destination 'platform=iOS Simulator,name=iPhone 17 Pro Max' -derivedDataPath .build/derived test` → all unit + UI tests pass
  - `./scripts/validate-local.sh` → ✓ sum: validation passed
  - Say's suite re-run after every TikoKit change (shared engine): passes
- CRITICAL repo fact: `tools/generate-app-configs.mjs` regenerates the
  `TikoAppConfig` extension and the palette blocks of `TikoAppColor.swift` from
  `fallbackConfigs`/`iosSharedApps`; `sum` is registered there and the
  round-trip is byte-identical. Do not add `sum` to `iosAppIconSources`.
- Submitted for review on 2026-07-25 (build 1, automatic release after
  approval).

## Requirements

| # | Requirement | Source | Status | Implementation | Verification |
|---|---|---|---|---|---|
| 1 | Home grid: free play tile + themed path tiles with Tiko media images | `docs/apps/sum.md` | VERIFIED | `Sources/SumView.swift`, `Sources/SumPathStore.swift` | UI test `testLaunchShowsHomeGrid`; simulator screenshots |
| 2 | Speaking keypad: every digit, operator and equals spoken on press | `docs/apps/sum.md` | VERIFIED | `Sources/SumPlayView.swift` (`KeypadView`), `Sources/FormulaSpeaker.swift` | `SumPlayViewModelTests`; verified aloud on device |
| 3 | Result is never displayed — the answer is always a choice | `docs/apps/sum.md` | VERIFIED | `Sources/SumPlayViewModel.swift`, `Sources/DistractorGenerator.swift` | `DistractorGeneratorTests`; screenshots show `12 ÷ 3 =` with tiles |
| 4 | All four operators in free play, parent-restrictable, max-number cap | `docs/apps/sum.md` | VERIFIED | `Sources/SumPlayView.swift`, `Sources/SumView.swift` (settings) | UI tests `testFreePlayOffersAllFourOperators`, `…MultiplyProducesAnswerTiles`, `…DivideProducesAnswerTiles` |
| 5 | Exact division only; invalid formulas dim equals rather than erroring | `docs/apps/sum.md` | VERIFIED | `Sources/SumModels.swift` (`Formula.result`) | `FormulaTests`; UI test for `12 ÷ 3` |
| 6 | Answer modes: choose / type / say, a parent setting | `docs/apps/sum.md` | VERIFIED | `Sources/SumModels.swift` (`SumAnswerMode`), `Sources/SumPlayViewModel.swift`, `AnswerTypePad` in `Sources/SumPlayView.swift` | `SumTypeModeTests`, voice tests in `SumPlayViewModelTests` |
| 7 | No microphone prompt unless voice answering is chosen | user feedback, cycle 3 | VERIFIED | `packages/tikokit-ios/Sources/TikoKit/TikoVoice.swift`, `TikoSpeechPractice.swift` | Launched clean install through a full path: no permission dialog |
| 8 | Typed answers: miss clears calmly, third miss falls back to two guided tiles | `docs/apps/sum.md` | VERIFIED | `Sources/SumPlayViewModel.swift` (`typeFallbackActive`) | `SumTypeModeTests` |
| 9 | Presets are difficulty only (10/20/50/100); the operator is picked in the game | user feedback, cycle 5 | IMPLEMENTED | `Sources/SumCatalog.swift`, `Sources/SumView.swift` (`SumOperatorPickerView`) | UI tests `testHomeShowsDifficultyPresetsNotOperatorModes`, `testPresetOffersEveryOperatorPlusMixed` |
| 9a | A run is ten random valid non-trivial sums; play again deals a fresh ten | user feedback, cycle 5 | IMPLEMENTED | `Sources/SumGenerator.swift`, `SumRunSpec` in `Sources/SumModels.swift` | `SumGeneratorTests`; `testATenSumRunEndsOnTheEndScreen`, `testPlayAgainDealsAFreshRoundForAPreset` |
| 9b | The sum lands part by part, spoken and popped as it lands, no `=` shown | user feedback, cycle 5 | IMPLEMENTED | `Sources/SumPlayViewModel.swift` (`revealParts`), `Sources/SumPlayView.swift` (`formulaPart`) | `testFormulaLandsOnePartAtATimeAndIsSpokenAsItLands` |
| 9c | Tiles are live before the reveal finishes; the next sum's voice is prerendered | user feedback, cycle 5 | IMPLEMENTED | `Sources/SumPlayViewModel.swift` (`isAnswerable`, `prefetchNextFormula`) | `testTilesAreLiveBeforeTheFormulaFinishesLanding`, `testNextFormulaIsPrerenderedWhileTheCurrentOneIsAnswered` |
| 9d | A wrong pick stays visible, flashes red, then switches itself off | user feedback, cycle 5 | IMPLEMENTED | `Sources/SumPlayViewModel.swift` (`wrongValue`/`disabledValues`), `AnswerTileView` | `testWrongPickStaysOnScreenThenSwitchesItselfOff`, `testTappingAnOffTileDoesNothing`, `testLastTileStandingPulses` |
| 9e | The winning tile dances inside its own fireworks; end screen after ten | user feedback, cycle 5 | IMPLEMENTED | `AnswerTileView` + `completionView` in `Sources/SumPlayView.swift` | `testCorrectPickMarksTheWinningTile`; UI test `testSkippingTenSumsReachesTheEndScreen` |
| 10 | Number words 0–100 in en/nl/fr/es/de/mt with correct grammar | `docs/apps/sum.md` | VERIFIED | `Sources/NumberSpeller.swift` | `NumberSpellerTests` golden lists per language |
| 11 | Operator pronunciations editable per language | `docs/apps/sum.md` | VERIFIED | `Sources/SumParentEditor.swift`, `Sources/SumPathStore.swift` | `SumPathStoreTests`; edited and relaunched |
| 12 | Celebration on success, soft acknowledgement on a miss — never punishment | `docs/flows/shared/design-principles.md` | VERIFIED | `Sources/SumPlayView.swift`, TikoKit `TikoCelebrate` | Observed all celebration variants in the simulator |
| 13 | Tiko harness: shell, identity bootstrap, Parent/Child Mode with PIN | `docs/flows/shared/user-modes.md` | VERIFIED | `Sources/SumView.swift`, `Sources/TikoSumApp.swift` | UI test `testParentModeOpensPathEditor`; guest launch with no account |
| 14 | Everything editable: parent-authored paths, formulas, titles, images | `docs/apps/sum.md` | IMPLEMENTED | `Sources/SumParentEditor.swift` | `SumPathStoreTests`; edits survive relaunch, account-scoped |
| 15 | Icon-only child controls, no in-app explanatory text | `docs/flows/shared/design-principles.md` | VERIFIED | `Sources/SumPlayView.swift` | Screenshots: replay/next are round icon buttons |
| 16 | Offline: voices cached per utterance, media cached, paths local | `docs/apps/sum.md` | VERIFIED | TikoKit `TikoVoiceService` cache, `Sources/SumPathStore.swift` | Airplane-mode run after first use |
| 17 | Release plumbing: config, CI, validation, screenshots, archive | `docs/apps/ios-release.md` | VERIFIED | `apps/sum/release/*`, `release.config.json`, `.github/workflows/*` | `npm run release:validate`; archive + export succeed with cloud signing |
| 18 | App Store 1.0: metadata, age rating 4+, pricing free, review details | `docs/apps/ios-release.md` | IMPLEMENTED | `apps/sum/release/app-store/en-US.json` | Verified via the App Store Connect API after each write |
| 19 | App Store 1.0: build uploaded and attached, release AFTER_APPROVAL | `docs/apps/ios-release.md` | IMPLEMENTED | `artifacts/archives/sum/export/TikoSum.ipa` | Build 1 processed VALID and attached to version 1.0 |
| 20 | App Store 1.0: submitted for review | `docs/apps/ios-release.md` | VERIFIED | `scratchpad/sum_submit.rb` | Build 1 attached, releaseType AFTER_APPROVAL, version 1.0 state WAITING_FOR_REVIEW |

## Open for the next release (1.1)

- The App Store record still describes 1.0: "Paths: playful rows of five sums"
  and "Twelve playful paths" in `release/app-store/en-US.json`. Version 1.0 is
  in review with that copy — rewrite the description and write fresh release
  notes when 1.1 is cut, not before.
- Screenshot scenes: `home`, `practice`, `keypad` still work. The operator
  picker is a new scene (`--screenshot operators`) that is not yet in
  `release/ios.json` — add it if it earns a slot in the six.
- Not verified on device or in the simulator by this cycle: this machine has
  Xcode 16.3 / iOS 18.4 SDK, and `TikoSpeechPractice.swift` uses the iOS 26
  `allowBluetoothHFP` option, so the project only compiles on the iOS 26
  toolchain. Unit and UI tests were run against a temporarily patched local
  copy (reverted); re-run on the iOS 26 toolchain before archiving.

## Notes on the release

- The first submission attempt failed with "appStoreVersions … is not in valid
  state" while the screenshot sets were still being rebuilt after a duplicate
  cleanup. Re-running the same script once the six screenshots per device were
  settled succeeded — the App Privacy questionnaire was never the blocker.
- Nothing is blocked. Version 1.0 is `WAITING_FOR_REVIEW` and set to release
  automatically after approval.
