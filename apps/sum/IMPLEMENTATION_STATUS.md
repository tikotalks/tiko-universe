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
- Verification commands (from `apps/sum/ios/`):
  - `xcodegen generate`
  - `xcodebuild -project TikoSum.xcodeproj -scheme TikoSum -destination 'platform=iOS Simulator,name=iPhone 17 Pro Max' -derivedDataPath .build/derived test` → all unit + UI tests pass
  - `./scripts/validate-local.sh` → ✓ sum: validation passed
  - Say's suite re-run after every TikoKit change (shared engine): passes
- CRITICAL repo fact: `tools/generate-app-configs.mjs` regenerates the
  `TikoAppConfig` extension and the palette blocks of `TikoAppColor.swift` from
  `fallbackConfigs`/`iosSharedApps`; `sum` is registered there and the
  round-trip is byte-identical. Do not add `sum` to `iosAppIconSources`.
- Next action: publish the App Privacy answers in the App Store Connect web UI
  (the `appDataUsages` API no longer exists — verified 404 on every path), then
  re-run the submission script. Everything else for 1.0 is done.

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
| 9 | Paths: 12 default runs from counting to times tables and fair shares | `docs/apps/sum.md` | VERIFIED | `Sources/SumCatalog.swift` | `SumCatalogTests` (every default formula valid) |
| 10 | Number words 0–100 in en/nl/fr/es/de/mt with correct grammar | `docs/apps/sum.md` | VERIFIED | `Sources/NumberSpeller.swift` | `NumberSpellerTests` golden lists per language |
| 11 | Operator pronunciations editable per language | `docs/apps/sum.md` | VERIFIED | `Sources/SumParentEditor.swift`, `Sources/SumPathStore.swift` | `SumPathStoreTests`; edited and relaunched |
| 12 | Celebration on success, soft acknowledgement on a miss — never punishment | `docs/flows/shared/design-principles.md` | VERIFIED | `Sources/SumPlayView.swift`, TikoKit `TikoCelebrate` | Observed all celebration variants in the simulator |
| 13 | Tiko harness: shell, identity bootstrap, Parent/Child Mode with PIN | `docs/flows/shared/user-modes.md` | VERIFIED | `Sources/SumView.swift`, `Sources/TikoSumApp.swift` | UI test `testParentModeOpensPathEditor`; guest launch with no account |
| 14 | Everything editable: paths, formulas, titles, images, custom paths | `docs/apps/sum.md` | VERIFIED | `Sources/SumParentEditor.swift` | `SumPathStoreTests`; edits survive relaunch, account-scoped |
| 15 | Icon-only child controls, no in-app explanatory text | `docs/flows/shared/design-principles.md` | VERIFIED | `Sources/SumPlayView.swift` | Screenshots: replay/next are round icon buttons |
| 16 | Offline: voices cached per utterance, media cached, paths local | `docs/apps/sum.md` | VERIFIED | TikoKit `TikoVoiceService` cache, `Sources/SumPathStore.swift` | Airplane-mode run after first use |
| 17 | Release plumbing: config, CI, validation, screenshots, archive | `docs/apps/ios-release.md` | VERIFIED | `apps/sum/release/*`, `release.config.json`, `.github/workflows/*` | `npm run release:validate`; archive + export succeed with cloud signing |
| 18 | App Store 1.0: metadata, age rating 4+, pricing free, review details | `docs/apps/ios-release.md` | IMPLEMENTED | `apps/sum/release/app-store/en-US.json` | Verified via the App Store Connect API after each write |
| 19 | App Store 1.0: build uploaded and attached, release AFTER_APPROVAL | `docs/apps/ios-release.md` | IMPLEMENTED | `artifacts/archives/sum/export/TikoSum.ipa` | Build 1 processed VALID and attached to version 1.0 |
| 20 | App Store 1.0: App Privacy answers published | `docs/apps/ios-release.md` | BLOCKED | — | External dependency: the `appDataUsages` REST API was removed (404 on every path) and the App Store Connect web session has expired, so the questionnaire needs an interactive sign-in |
| 21 | App Store 1.0: submitted for review | `docs/apps/ios-release.md` | BLOCKED | `scratchpad/sum_submit.rb` | Submission returns "not in valid state" until #20 is published |

## Blocked items (exact external dependency)

- **#20 App Privacy** — Apple removed the privacy-declaration endpoints from the
  App Store Connect API, so the answers (User ID + Email Address, used for App
  Functionality, linked to the user, not used for tracking — identical to Say)
  must be entered at
  `https://appstoreconnect.apple.com/apps/6794587838/distribution/privacy`.
  That page needs an interactive Apple ID sign-in, which cannot be automated.
- **#21 Submission** — unblocks the moment #20 is published; re-run
  `sum_submit.rb`, which attaches the build, sets `AFTER_APPROVAL` and submits.
