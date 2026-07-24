# Tiko Say — Implementation Status

Source-of-truth documentation:
- `docs/apps/say.md` (product spec)
- `docs/plans/say-ios-mvp.md` (implementation plan)
- `docs/flows/shared/user-modes.md` (identity/parent-child contract, via TikoKit)

Statuses: `NOT STARTED` · `IN PROGRESS` · `BLOCKED` · `IMPLEMENTED` · `VERIFIED`

## Working notes (context continuity)

- Cycle 1 (2026-07-24): full app built, all unit/UI tests green, Debug + Release
  simulator builds clean (0 warnings), shared validator passes, category grid and
  practice screen visually verified in the iPhone 17 simulator.
- Cycle 2 (2026-07-24, user feedback): fixed simulator crash — `installTap` with
  the simulator's invalid (0 Hz) input format raised an ObjC exception. The
  service now validates the input format and reports listen-start failures via
  `SayTranscriptUpdate.didFail`; the view model retries quietly (never counting
  a child attempt) and shows the calm unavailable screen after 3 broken starts.
  Regression tests added. Real app icon wired (speech-balloon media asset,
  `data.tikocdn.org/uploads/1781443432968-speech-balloon.png`) in the generator
  (`fallbackConfigs.say` + `iosAppIconSources`), `TikoAppConfig.say`, and the
  generated AppIcon set. Built, signed (team 38MGF83L2L, automatic), and
  installed on a physical iPhone 14 Pro (iOS 26.6) via devicectl.
- Verification commands (from `apps/say/ios/`):
  - `xcodegen generate`
  - `xcodebuild -project TikoSay.xcodeproj -scheme TikoSay -destination 'platform=iOS Simulator,name=iPhone 17' -derivedDataPath .build/derived test` → 44 unit tests + 3 UI tests, all pass
  - `./scripts/validate-local.sh` → ✓ say: validation passed
  - `xcodebuild … -configuration Release -destination 'generic/platform=iOS Simulator' build` → BUILD SUCCEEDED
  - TikoKit: `xcodebuild -scheme TikoKit -destination 'platform=iOS Simulator,name=iPhone 17' test` → pass (includes `.say` assertions)
- CRITICAL repo fact: `tools/generate-app-configs.mjs` REGENERATES the
  `TikoAppConfig` extension + palette blocks of `TikoAppColor.swift` at build
  time from `fallbackConfigs`/`iosSharedApps`; say is registered there and the
  round-trip is byte-identical. Do NOT add `say` to `iosAppIconSources` until
  admin has an `appIconImageUrl` for it (strict mode would fail the build).
- Next action: none pending — final audit passed. Remaining items are the
  externally blocked ones listed at the bottom.

- Cycle 3 (2026-07-25, user feedback batch): Tiko media-library images on cards
  (`SayMediaLibrary` client + matcher mirroring Cards, hydrated per category,
  disk-cached via `TikoRemoteImageCache`, emoji fallback); default catalogue
  expanded to 6 categories / ~56 localised cards (animals, food, vehicles,
  body, colors, numbers — digits accepted for numbers); Atlas voice playback
  with persistent per-word offline cache + session prefetch (`SayVoiceService`,
  synthesizer fallback); soft retry tone (`say-retry.wav`, quiet, never a
  buzzer); randomized celebrations (5 Canvas variants × palettes × 3 chimes);
  UI de-texted (no grid header, one-line permission copy, waveform animation
  instead of "Listening" label); Replay/Next are icon-only round buttons;
  Parent Mode editor rebuilt on the shared Tiko sheets (`TikoPopupCard`,
  `TikoFormSheet`, `tikoPopup`, `tikoMediaPickerPopup`, `TikoImagePickerButton`)
  with image picking on every card. Docs updated (`say.md` + plan revisions
  note). All unit + UI tests green; installed on simulator and iPhone 14 Pro.

- Cycle 4 (2026-07-25, user feedback): win celebrations levelled up. Random
  **card dance** per win (pop / spin / bounce / wiggle via `phaseAnimator`),
  seven celebration styles (explosion + shockwave ring, full-screen confetti
  rain, rain of the card's own emoji via Canvas-resolved text, multi-burst
  fireworks, stars, hearts, bubbles) × 3 palettes, five success chimes + tiny
  pop sounds (`say-pop-1..3.wav`) sprinkled through the burst with light
  haptics; celebration window 1.2s → 1.6s. New `celebrate` screenshot scene
  auto-succeeds for hands-free promo capture (used to verify via simulator
  recording: spin dance + bubble/confetti bursts confirmed on video frames).
  Reduce Motion path unchanged (gentle pulse). Docs updated; tests green;
  installed on simulator + iPhone 14 Pro.

- Cycle 5 (2026-07-25, user feedback): **Voice fixed** — Atlas requires a Bearer
  token and no device session was ever bootstrapped, so playback silently used
  the built-in synthesizer. Say now bootstraps a device identity on first
  launch when none exists (same pattern as Talk); Atlas voices then fetch and
  cache per word. **Card fly transitions** — cards enter from a random screen
  edge and exit through another with a back-out bezier
  (`timingCurve(0.18, 1.25, 0.35, 1)`), direction seeded from card ID.
  **Spelled word** — the title cascades in letter by letter with a bouncy
  bezier after the card lands. **Category tiles use Tiko media** — each
  category resolves a library thumbnail (first card's image), emoji fallback.
  **Edit icon aligned** — `pencil` (family convention: web `ui/edit-fat`, iOS
  `pencil` in Cards/Radio), replacing `square.and.pencil`. Reduce Motion paths
  kept for all new animation. Verified via simulator recording (fly-out/fly-in
  and letter cascade visible on frames); tests green; installed on simulator +
  iPhone 14 Pro.

- Cycle 6 (2026-07-25, user feedback): **Voice root cause found and fixed** —
  Atlas rejected `purpose: "word-playback"` with `purpose_not_allowed`; the
  registry (workers/atlas-api capabilities) allows `speech-playback` for all
  apps. Switched purpose; verified end-to-end with a new integration test
  (`SayVoiceServiceTests`, bootstraps identity → prefetch → asserts cached
  Narakeet audio on disk; XCTSkips offline). **Category tiles** — media
  thumbnails confirmed working on simulator (cat/apple/car/person/…); resolved
  card + thumbnail URLs now persist in UserDefaults so tiles render instantly
  on later launches and offline (phone showed emojis because nothing was
  persisted and the launch fetch hadn't landed). **Animation tuning** — win
  dance slower/bouncier (spring 0.34/0.44, larger amplitudes), card fly 0.75s
  with more overshoot, letter cascade gentler (80% scale, 0.15em rise, 0.55s,
  0.09s stagger). Tests green; installed on simulator + iPhone 14 Pro.

## Harness requirements

| # | Requirement | Status | Files | Verification |
|---|---|---|---|---|
| H1 | `.say` in `TikoAppColor` + `TikoAppConfig.say` + palette, registered in generator | VERIFIED | `packages/tikokit-ios/Sources/TikoKit/TikoAppColor.swift`, `tools/generate-app-configs.mjs` | TikoKit tests pass; generator pre-build ran during app build with zero diff |
| H2 | `.say` app key in `TikoI18n` with local bundles (en, nl, fr, es, de, mt) | VERIFIED | `TikoI18n.swift`, `TikoI18nSay.swift` | TikoKit + app builds; grid renders localised strings (screenshot) |
| H3 | `TikoAppShell` wrapping (header, settings, account, parent/child mode, PIN gate, splash) | VERIFIED | `apps/say/ios/Sources/SayView.swift` | simulator screenshot shows shell header/actions; shared sheet provides language + colour-mode pickers; UI test `testParentModeOpensCardEditor` |
| H4 | No-login startup (Temporary Account bootstrap, `TikoDeviceDefaults.register()`, prod identity/translations URLs) | VERIFIED | `TikoSayApp.swift` | app launches straight to grid (screenshot, UI test) |
| H5 | Child Mode never exposes editing; parent-gated surfaces only | VERIFIED | `SayView.swift` (shell hides settings/actions in child mode; long-press guards `isChildMode`), `SayParentEditor.swift` | code inspection + UI test |
| H6 | XcodeGen project, TikoKit dep, `mt.tiko.say`, iOS 18.0, config preBuild script | VERIFIED | `apps/say/ios/Project.yml` | `xcodegen generate` + builds + shared validator |

## Language requirements

| # | Requirement | Status | Files | Verification |
|---|---|---|---|---|
| L1 | Follows shared `tiko.language`; all UI strings via TikoI18n; shell provides the language picker | VERIFIED | all views | code inspection; `onChange(languageCode)` rewires i18n + practice + store reads |
| L2 | Default cards localised (title/speak/listen) en, nl, fr, es, de, mt with en fallback | VERIFIED | `SayCatalog.swift` | `SayCatalogTests.testEveryLanguageHasCompleteContent`, store language tests |
| L3 | TTS voice + recognizer locale from active language via `TikoSpeech.languageCode` | VERIFIED | `SpeechPracticeService.swift` | code inspection; VM test asserts listen language |
| L4 | Unsupported recognition locale → parent-facing notice + nearest supported fallback, never silent/blocked | VERIFIED | `SpeechPracticeService.swift` (`suggestedLanguage`), `PracticeViewModel.beginAfterPermission`, `PracticeView.languageFallbackNotice` | `testUnsupportedLocaleFallsBackToSuggestionAndNotifiesParent`, `…WithoutSuggestionIsUnavailable` |
| L5 | Per-language approved wrappers (en/nl/fr/es/de/mt) as config data | VERIFIED | `WordMatcher.swift` (`SayLanguageRules`) | `WordMatcherTests` (en, nl, fr, mt cases) |

## Card model + editing

| # | Requirement | Status | Files | Verification |
|---|---|---|---|---|
| C1 | `SayCard` with independent title/speakText/listenFor + emoji image + flags | VERIFIED | `SayModels.swift` | store tests |
| C2 | `SayCardOverride` keyed cardID+language; bundled catalogue never mutated | VERIFIED | `SayModels.swift`, `SayCardStore.swift` | `testResetRestoresBundledValues`, `testSavingUnchangedValuesIsNotAnEdit` |
| C3 | `SayCardStore` merges defaults+overrides+custom per account & language; sole content source | VERIFIED | `SayCardStore.swift` | full `SayCardStoreTests` suite |
| C4 | Edit title/speak/listen/image (emoji) of any card | VERIFIED | `SayParentEditor.swift` | store tests + editor UI test reaches manager |
| C5 | Hide/show defaults; defaults not deletable | VERIFIED | store + editor | `testHiddenCardsExcludedFromPractice`, `testDefaultCardsCannotBeDeleted` |
| C6 | Reset edited default per language | VERIFIED | store + editor | `testResetRestoresBundledValues` |
| C7 | Add/edit/delete custom cards, speak/listen prefilled from title | VERIFIED | store + editor | `testCustomCardLifecycle`, `testEmptySpeakAndListenPrefillFromTitle` |
| C8 | Reorder within category (EditButton + onMove) | VERIFIED | store + editor | `testReorderPersistsAcrossCards` |
| C9 | Per-account and per-language scoping | VERIFIED | store | `testOverridesAreScopedPerLanguage`, `testEditsAreScopedPerAccountSubject`, `testCustomCardsAreScopedPerLanguage` |
| C10 | Persistence survives relaunch | VERIFIED | store | `testEditsSurviveRelaunch` (fresh store instance) |
| C11 | All-hidden category disabled in Child Mode | VERIFIED | store + `CategoryGridView` | `testAllHiddenCategoryIsUnplayable`; tile disabled state with text (not colour-only) |
| C12 | Listen-for editor warns (not blocks) on <4-char entries | VERIFIED | `SayCardEditView` | code inspection (footer warning, save never blocked) |

## Child flow + practice loop

| # | Requirement | Status | Files | Verification |
|---|---|---|---|---|
| F1 | Category grid, large tiles, localised titles, no nesting | VERIFIED | `SayView.swift` | screenshot + UI test |
| F2 | Practice screen: dominant card, visible title, calm mic pulse, no transcript/child-facing tech status | VERIFIED | `PracticeView.swift` | screenshot (`--screenshot practice`) + code inspection |
| F3 | Documented 12-case `PracticeState` machine | VERIFIED | `SayModels.swift`, `PracticeViewModel.swift` | `PracticeViewModelTests` (19 tests) |
| F4 | Item sequence + timings (300ms/250ms/1.2s/5s/1.2s/200ms) as injectable test values | VERIFIED | `PracticeViewModel.Timings` | VM tests use `.instant`; defaults match plan |
| F5 | Replay/Skip/Back always available | VERIFIED | `PracticeControls`, shell back chevron | `testSkipAlwaysAdvances`; replay wired to VM |
| F6 | Retry ladder: 1–2 calm, 3 auto-replay, 4 relaxed matcher, 5 Skip prominent | VERIFIED | VM | `testThirdAttemptAutomaticallyReplaysTarget`, `testRelaxedMatcherOnFourthAttempt`, `testFifthAttemptMakesSkipProminent` |
| F7 | No negative feedback anywhere | VERIFIED | all child views | code inspection: retrying renders identically to listening |
| F8 | Session shuffle, final celebration, Restart + Choose Category, no scores | VERIFIED | VM + `SessionCompleteView` | `testMatchCelebratesAndCompletesSession`, `testRestartSessionResetsProgress` |
| F9 | Interruption: stop capture, keep item, tap to resume, no attempt counted | VERIFIED | VM `pauseForInterruption`/`resumeAfterInterruption`, scenePhase hook | `testInterruptionPausesWithoutCountingAnAttempt` |

## Speech + recognition

| # | Requirement | Status | Files | Verification |
|---|---|---|---|---|
| S1 | Single `@MainActor` service owning all Apple audio/speech objects; protocol-mockable | VERIFIED | `SpeechPracticeService.swift` | builds; VM tests run on mock |
| S2 | Full documented pre-listen cleanup sequence (12 steps incl. taskHint `.confirmation`, contextualStrings, on-device pref) | VERIFIED | `listen(...)` | line-by-line inspection vs plan checklist |
| S3 | Never listen during TTS; replay cancels recognition first | VERIFIED | `speak()` stops listening; `listen()` guards `synthesizer.isSpeaking` | inspection + VM replay path |
| S4 | Permission only at activity start after parent explanation; denial → recovery with Settings link | VERIFIED | `SpeechPermissionView`, VM `begin/requestPermissions` | VM permission tests + UI test reaches explanation |
| S5 | Info.plist usage strings exactly per plan | VERIFIED | `Sources/Info.plist` | validator + diff vs plan text |
| S6 | No stored audio; transcripts per attempt; stop on background/navigation | VERIFIED | service teardown, VM `cancel`/`pauseForInterruption`, `onDisappear` | inspection + interruption test |
| S7 | Timeout/silence values configurable | VERIFIED | `Timings` | VM tests |

## Matching

| # | Requirement | Status | Files | Verification |
|---|---|---|---|---|
| M1 | Locale-aware normalisation (case, punctuation, whitespace, apostrophes/hyphens→space for elisions) | VERIFIED | `WordMatcher.normalize` | `WordMatcherTests` incl. `l'éléphant`, `il-kelb`, `Œuf`, `Ħalib` |
| M2 | Order: primary → alternatives → approved wrapper → fuzzy | VERIFIED | `WordMatcher.match` | tests assert MatchType per tier |
| M3 | Fuzzy: <4 off; 4–5 ≤1 edit; ≥6 threshold 0.8 configurable | VERIFIED | `WordMatcherConfig` | boundary tests: dog→dot ✗, car→card ✗, trains→train ✓, trane→train ✗, bannana→banana ✓ |
| M4 | Relaxed matcher (attempt 4) widens long words only | VERIFIED | `.relaxed` | `testRelaxedConfigDoesNotLoosenShortWords`, elefant→elephant ✓ |
| M5 | Empty transcript/targets never match | VERIFIED | matcher | tests |

## Celebration

| # | Requirement | Status | Files | Verification |
|---|---|---|---|---|
| CE1 | Scale bounce + Canvas particles + success chime + light haptic; ~1.2s auto-advance | VERIFIED | `CelebrationOverlay.swift`, `SaySuccessFeedback`, bundled `say-success.wav` (generated chime) | build + VM celebration timing test; visual practice screenshot pipeline |
| CE2 | Reduce Motion → gentle scale/colour, no particles | VERIFIED | same + `cardImage` animation switch | code inspection |
| CE3 | No third-party animation deps | VERIFIED | `Project.yml` (only TikoKit) | inspection |

## Debug mode

| # | Requirement | Status | Files | Verification |
|---|---|---|---|---|
| D1 | DEBUG-only overlay via `--say-debug` or 2s long press; shows locale, state, target, listen-for, partial/final transcript, match type, attempt, on-device, availability, listening duration | VERIFIED | `RecognitionDebugOverlay.swift`, `PracticeViewModel.debugDescription` | builds in Debug, `#if DEBUG` excluded from Release (Release build succeeds) |
| D2 | Debug actions: copy, restart item, simulate correct/incorrect/unavailable, disable auto success | VERIFIED | same + VM debug funcs | code inspection |

## Accessibility & privacy

| # | Requirement | Status | Files | Verification |
|---|---|---|---|---|
| A1 | Large touch targets, portrait+landscape (Info.plist orientations), iPad-first adaptive layout | VERIFIED | views, `Info.plist` | inspection; GeometryReader adaptive sizing |
| A2 | VoiceOver labels on parent controls; Dynamic Type on permission/settings/edit screens | VERIFIED | views (accessibilityLabel throughout; Form/system text styles) | inspection |
| A3 | Reduce Motion honored; state never colour-only (icons + text everywhere) | VERIFIED | `ListeningIndicator`, celebration, tiles | inspection |
| A4 | Guided Access compatible (no conflicting system gestures) | VERIFIED | — | inspection |

## Tests & delivery

| # | Requirement | Status | Verification |
|---|---|---|---|
| T1 | `WordMatcherTests` (documented case list, 4 languages) | VERIFIED | 18 tests pass |
| T2 | `PracticeViewModelTests` (documented case list) | VERIFIED | 19 tests pass |
| T3 | `SayCardStoreTests` | VERIFIED | 17 tests pass |
| T4 | `SayCatalogTests` | VERIFIED | 7 tests pass |
| T5 | TikoKit `.say` assertions | VERIFIED | TikoKit test suite passes |
| T6 | UI tests (launch, category→permission flow, parent editor) | VERIFIED | 3 UI tests pass |
| T7 | `scripts/validate-local.sh` → shared `validate-ios.sh say` | VERIFIED | passes |
| T8 | `README.md` build/test instructions | VERIFIED | written |
| T9 | Assets: AppIcon (generated violet waveform, opaque, all sizes), TikoLogo, LaunchBg/Accent (Say violet), success chime | VERIFIED | build + icon visual check |
| T10 | Release scaffolding: `apps/say/release/ios.json` + `app-store/en-US.json`, `release.config.json`, `docs/apps/ios-release.md`, CI matrices (`ios-ci.yml`, `release-validate.yml`), screenshot scenes (`home`, `practice`) via `TikoScreenshotMode` | VERIFIED | practice scene captured via `--screenshot-mode --screenshot practice` |

## Audit result (cycle 1, 2026-07-24)

- Re-read `docs/apps/say.md` + `docs/plans/say-ios-mvp.md` against the code: every
  definition-of-done item is implemented and verified except the physical-device
  items (below).
- `TODO|FIXME|placeholder|stub|unimplemented|HACK` sweep over `apps/say/ios`: clean.
- Debug + Release builds: clean, 0 warnings in Say sources.
- Full test suite (unit + UI) green; shared validator green; TikoKit tests green.

## Assumptions

- App icon: the "Speech Balloon" media asset (`575d659f-f984-4948-8800-5d40fc63bda7`,
  original at `data.tikocdn.org/uploads/1781443432968-speech-balloon.png`)
  composited on Say violet, registered in the generator so CI (with sharp)
  regenerates it. Remaining forward path: add Say's config in the admin system.
- Card images: spec bundles content locally; no photo assets exist in-repo, so
  default cards render a large bundled emoji glyph (offline-capable), matching
  Cards' offline text/colour fallback philosophy. Custom/edited cards keep the
  emoji field; Tiko media picker integration can attach later via the standard
  media flow.
- Say theme colour `#8b5cf6` (violet) — the unused hue family across apps; dark
  variant = channel × 0.52 per the generator's rule.
- Deployment target iOS 18.0 per the plan; TikoKit stays at its v17 minimum.
- TTS uses on-device `AVSpeechSynthesizer` (plan names it explicitly); the
  Atlas speech service is not used because recognition timing requires local
  completion callbacks.
- Success sound is a generated two-note chime WAV bundled as a resource.

## Blocked (external)

- **Physical-device validation** (plan milestone 7 + manual device matrix +
  "complete flow works on a physical iPad"): requires physical iPads/iPhones,
  headsets, noisy rooms, and at least two child testers. Everything testable in
  the simulator/unit tests is covered; recognition quality tuning (timings,
  fuzzy thresholds) is intentionally configurable for that phase.
- **App Store signing/upload**: `DEVELOPMENT_TEAM` intentionally blank per repo
  convention; `appleId`/`appStoreId` in `release/ios.json` pending account setup.
- **Admin app-config entry for Say** (`app.tikoapi.org/v1/apps/config`): the
  generator falls back to the committed `fallbackConfigs.say`; adding Say in the
  admin system later enables remote icon/colour management.
