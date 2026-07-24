# Tiko Say: Native iOS MVP Plan

## Status

Implemented (see `apps/say/IMPLEMENTATION_STATUS.md`), with post-MVP product revisions applied on top of this plan — `docs/apps/say.md` is the current source of truth where they differ:

- Six default categories (~56 localised cards) instead of the initial 3×5.
- Card images resolve from the Tiko media library (per-category matching, disk-cached) with the bundled emoji as offline fallback; parents pick images via the shared media picker.
- Word playback uses the Tiko Atlas voice service with a persistent per-word offline cache and session prefetch; `AVSpeechSynthesizer` is the offline fallback.
- A miss plays one soft acknowledgement tone (still no harsh buzzer or red cross).
- Celebrations randomly vary style (confetti/stars/hearts/fireworks/bubbles) and chime.
- Replay/Next are icon-only round buttons; the listening state is an animated waveform, not text; UI copy is minimal.
- Parent Mode editing uses the shared Tiko popup sheets (`TikoPopupCard`/`TikoFormSheet`) and `tikoMediaPickerPopup`.

## Objective

Validate a simple speech-practice loop on physical iOS devices:

1. Choose a category.
2. See one large card.
3. Hear the target word.
4. Repeat the word.
5. Receive immediate positive feedback.
6. Continue automatically to the next card.

The first version is native iOS and iPadOS only. It deliberately avoids backend content-catalogue and cross-platform work until the interaction has been tested with real child speech — but it ships on the standard Tiko harness like every other Tiko app: `TikoAppShell`, `TikoIdentity`, the shared Parent Mode / Child Mode model, and full localisation.

## Tiko harness

Say uses the same native harness as every other Tiko iOS app. No exclusions.

- Depend on `TikoKit` (`packages/tikokit-ios`): `TikoAppShell`, `TikoIdentity`, `TikoI18n`, `TikoPopupSheets`, `TikoSpeech`, `TikoMediaPicker` where applicable.
- Add a `.say` case to `TikoAppColor` in TikoKit first and use it as the canonical app colour.
- Identity follows [`docs/flows/shared/user-modes.md`](../flows/shared/user-modes.md): automatic Temporary Account on first launch, Parent Mode by default, Child Mode behind verification + PIN, PIN-gated exit from Child Mode.
- Parent Mode owns: card editing, category management, language, settings, account/verification, delete/reset.
- Child Mode owns: category grid and the practice loop only. No editing, no settings, no account surfaces.
- All strings go through `TikoI18n` / `Localizable.xcstrings`.

## Languages

Say must work in as many languages as possible.

- The active language comes from the shared shell language setting.
- Default cards ship localised (title, speak text, listen-for) for every Tiko-supported language, with standard fallback rules.
- TTS voice selection and `SFSpeechRecognizer` locale derive from the active language.
- Query `SFSpeechRecognizer.supportedLocales()` at runtime; if the active language is unsupported, show a parent-facing notice in Parent Mode and offer the nearest supported locale. Never fail silently and never block Child Mode with a technical error.
- Normalisation and approved wrappers are per language (`a dog` in English, `de hond` in Dutch, `un perro` in Spanish), driven by configuration, not code branches.
- Prefer on-device recognition when `supportsOnDeviceRecognition` is true for the locale.

## Platform decision

Target iOS and iPadOS 18 or later for the initial proof.

Use:

- SwiftUI
- Speech
- AVFAudio
- AVFoundation
- Swift concurrency

Speech recognition uses the established Apple stack:

- `SFSpeechRecognizer`
- `SFSpeechAudioBufferRecognitionRequest`
- `SFSpeechRecognitionTask`
- `AVAudioEngine`

Target-word playback uses:

- `AVSpeechSynthesizer`
- `AVSpeechUtterance`
- `AVSpeechSynthesisVoice`

Prefer on-device recognition when `supportsOnDeviceRecognition` is true. Locales without on-device support may use Apple's server-based recognition with the standard privacy notes, or be surfaced as limited in Parent Mode — never a silent degradation.

## Repository structure

Create:

```text
apps/say/ios/
├── Project.yml
├── TikoSay.xcodeproj
├── TikoSay/
│   ├── App/
│   │   ├── TikoSayApp.swift
│   │   └── AppEnvironment.swift
│   ├── Models/
│   │   ├── SayCategory.swift
│   │   ├── SayCard.swift
│   │   ├── SayCardOverride.swift
│   │   ├── PracticeSession.swift
│   │   └── RecognitionResult.swift
│   ├── Content/
│   │   ├── SayCatalog.swift
│   │   ├── SayCardStore.swift
│   │   ├── categories.json
│   │   └── cards.json
│   ├── Speech/
│   │   ├── SpeechPracticeService.swift
│   │   ├── WordMatcher.swift
│   │   ├── SpeechPermissionService.swift
│   │   └── SpeechPracticeError.swift
│   ├── Features/
│   │   ├── Categories/
│   │   │   ├── CategoryGridView.swift
│   │   │   └── CategoryTileView.swift
│   │   ├── Practice/
│   │   │   ├── PracticeView.swift
│   │   │   ├── PracticeViewModel.swift
│   │   │   ├── PracticeImageView.swift
│   │   │   ├── ListeningIndicator.swift
│   │   │   └── PracticeControls.swift
│   │   ├── ParentMode/
│   │   │   ├── CardListView.swift
│   │   │   ├── CardEditView.swift
│   │   │   └── CardEditViewModel.swift
│   │   ├── Celebration/
│   │   │   ├── CelebrationOverlay.swift
│   │   │   └── CelebrationParticle.swift
│   │   └── Permissions/
│   │       └── SpeechPermissionView.swift
│   ├── Debug/
│   │   └── RecognitionDebugOverlay.swift
│   ├── Resources/
│   │   ├── Assets.xcassets
│   │   └── Localizable.xcstrings
│   └── Tests/
│       ├── WordMatcherTests.swift
│       ├── PracticeViewModelTests.swift
│       ├── SayCardStoreTests.swift
│       └── SayCatalogTests.swift
└── README.md
```

The app depends on the local `TikoKit` package (`packages/tikokit-ios`) via XcodeGen, matching the other native apps (see Talk/Yes-No project setups). The implementation may adapt to existing native project conventions in `tiko-universe`, but the feature boundaries should remain intact.

## Models

### Category

```swift
struct SayCategory: Identifiable, Codable, Hashable {
    let id: String
    let titleKey: String
    let imageName: String
    let sortOrder: Int
}
```

### Card

The practice unit is a card. Every card has a shown title, a speak text, and one or more listen-for targets, all per language.

```swift
struct SayCard: Identifiable, Codable, Hashable {
    let id: String
    let categoryID: String
    /// Written label shown on the practice screen.
    let title: String
    /// What AVSpeechSynthesizer says. Defaults to the title but is editable separately.
    let speakText: String
    /// Recognition targets. First entry is the primary target, the rest are accepted alternatives.
    let listenFor: [String]
    let imageName: String
    let difficulty: Int
    let isCustom: Bool
    let isHidden: Bool
    let sortOrder: Int
}
```

Bundled default cards resolve `title`, `speakText`, and `listenFor` per language from the localised catalogue. Custom cards and edits are stored per language.

### Card override

Default cards are editable. An edit never mutates the bundled catalogue; it is stored as an override keyed by card ID and language, so a card can always be reset to its default and an English edit does not affect the Dutch defaults.

```swift
struct SayCardOverride: Codable, Hashable {
    let cardID: String
    let languageCode: String
    var title: String?
    var speakText: String?
    var listenFor: [String]?
    var imageName: String?
    var isHidden: Bool
    var sortOrder: Int?
}
```

`SayCardStore` merges the bundled catalogue with overrides and custom cards for the active account and language, and is the only content source the practice and parent-mode features read from. Persistence is local-first (per account, via the standard TikoKit storage conventions); sync through the Tiko data layer follows the same path as the other apps.

### Recognition result

```swift
struct RecognitionResult: Equatable {
    let transcript: String
    let isFinal: Bool
    let matchType: MatchType?
}

enum MatchType: Equatable {
    case exact
    case alternative
    case approvedPhrase
    case fuzzy
}
```

### Practice state

```swift
enum PracticeState: Equatable {
    case idle
    case presenting
    case speaking
    case preparingToListen
    case listening
    case processing
    case retrying(attempt: Int)
    case celebrating
    case permissionRequired
    case recognitionUnavailable
    case completed
    case error(String)
}
```

## Content

Bundle three categories and fifteen default cards locally, localised for every Tiko-supported language.

### Animals

- Cat
- Dog
- Lion
- Elephant
- Monkey

### Food

- Apple
- Banana
- Bread
- Milk
- Egg

### Vehicles

- Car
- Bus
- Train
- Boat
- Plane

Do not connect the MVP to the remote media catalogue. Bundled default content makes speech behaviour easier to test and removes unrelated failure modes. These are **default cards**: Parent Mode can edit, hide, reset, reorder, and extend them (see Parent Mode below).

## Parent Mode: card editing

All content management lives in Parent Mode, behind the standard shell surfaces. Child Mode never shows any of it.

Per category, Parent Mode shows the card list with:

- **Edit** a card: title (shown), speak text (said), listen-for list (heard) — each field editable independently, with speak text defaulting to the title and the primary listen-for target defaulting to a normalised title. Image editable via the standard picker (bundled assets first; `TikoMediaPicker`/photo import may land later).
- **Hide / show** a card in practice.
- **Reset** an edited default card back to its bundled values for the active language.
- **Add** a custom card to any category (title required; speak text and listen-for prefilled from the title).
- **Delete** custom cards (default cards can only be hidden, not deleted).
- **Reorder** cards within a category.

Rules:

- Edits and custom cards are stored per account and per language via `SayCardOverride`.
- A category must always have at least one visible card to be playable; an all-hidden category is shown as disabled in Child Mode.
- The listen-for editor should make it easy to add multiple accepted alternatives and should warn (not block) on entries shorter than four characters, where fuzzy matching is disabled.

## Child flow

### Category screen

- Large visual tiles
- Category image and translated title
- No nested category hierarchy
- No login or setup wall (Temporary Account bootstrap via `TikoIdentity`, like every Tiko app)

### Practice screen

- One card image dominates the screen
- The card title remains visible
- Microphone state is shown through a calm pulse or ring
- Child transcript remains hidden
- Controls: Replay, Skip, Back

### Item sequence

1. Present card image and title.
2. Wait approximately 300 milliseconds.
3. Speak the card's speak text.
4. Wait for `AVSpeechSynthesizer` completion.
5. Wait approximately 250 milliseconds.
6. Begin recognition.
7. Accept a strong match as soon as it stabilises.
8. Stop recognition.
9. Celebrate.
10. Advance automatically.

## Speech service

Create one observable service that owns all Apple audio and speech objects.

```swift
@MainActor
final class SpeechPracticeService: ObservableObject {
    @Published private(set) var transcript = ""
    @Published private(set) var isListening = false
    @Published private(set) var audioLevel: Float = 0
    @Published private(set) var error: SpeechPracticeError?

    func requestPermissions() async -> Bool

    func speak(
        _ text: String,
        locale: Locale
    ) async throws

    func listen(
        locale: Locale,
        contextualWords: [String],
        timeout: Duration
    ) async throws -> RecognitionResult

    func stop()
}
```

The service owns:

- `SFSpeechRecognizer`
- `SFSpeechRecognitionTask`
- `SFSpeechAudioBufferRecognitionRequest`
- `AVAudioEngine`
- `AVSpeechSynthesizer`
- `AVAudioSession` configuration

Before every recognition attempt:

1. Cancel the previous recognition task.
2. End the previous recognition request.
3. Remove any existing input tap.
4. Stop and reset the audio engine.
5. Configure the recognizer locale.
6. Create a new recognition request.
7. Set `shouldReportPartialResults = true`.
8. Set `taskHint = .confirmation`.
9. Add the card's listen-for targets to `contextualStrings`.
10. Set `requiresOnDeviceRecognition = true` only when supported.
11. Install a new input tap.
12. Start the audio engine and recognition task.

Only one recognition task may be active at a time.

## Audio lifecycle

The app must not recognise its own playback.

Replay behaviour:

1. Cancel recognition.
2. Stop and reset the audio engine.
3. Speak the word.
4. Wait for synthesizer completion.
5. Resume recognition after a short delay.

On app backgrounding or navigation away from the practice screen:

- cancel recognition
- stop the engine
- remove the input tap
- discard the current transcript

On return, keep the same item and require a tap to resume. An interruption should not count as a failed attempt.

## Permissions

Add:

```xml
<key>NSMicrophoneUsageDescription</key>
<string>Tiko Say uses the microphone to listen while your child practises saying words. Audio is not stored by Tiko Say.</string>

<key>NSSpeechRecognitionUsageDescription</key>
<string>Tiko Say uses speech recognition to check whether the practice word was heard.</string>
```

Do not request permissions on application launch.

Flow:

1. Select a category.
2. Show a short parent-facing explanation.
3. Tap Continue.
4. Request microphone and speech-recognition permissions.
5. Start the activity.

If denied, show a parent-facing recovery screen with a button to open the app’s Settings page.

## Matching

The matcher answers only whether Apple heard one of the card's listen-for targets or an approved equivalent.

### Normalisation

- lowercase using the active language's locale
- remove punctuation
- trim and collapse whitespace
- normalize apostrophes where appropriate
- allow per-language approved wrappers such as `a dog` / `the dog` (English), `de hond` (Dutch), configured per language
- compare against the card's listen-for alternatives

### Matching order

1. Exact normalized primary listen-for target
2. Other listen-for alternatives
3. Approved per-language phrase wrapper
4. Conservative fuzzy match

### Fuzzy rules

Starting rules:

- fewer than 4 characters: disabled
- 4 to 5 characters: maximum edit distance 1, with explicit rejection tests
- 6 or more characters: configurable similarity threshold around 0.8

Examples:

```text
dog → dog                 accept
dog → a dog               accept
dog → dot                 reject
car → card                reject
elephant → an elephant    accept
banana → bannana          configurable
```

All thresholds must be configurable and unit tested. Do not advertise the result as pronunciation accuracy.

## Retry logic

- Attempt 1: listen normally.
- Attempt 2: restart or continue listening without negative feedback.
- Attempt 3: replay the target, then listen again.
- Attempt 4: enable the configured relaxed matcher.
- Attempt 5: make Skip more prominent.
- Skip remains available at all times.

Never show a red cross, buzzer, spoken “wrong,” or failure animation.

## Timing defaults

```text
Initial presentation delay:    300 ms
Delay after TTS finishes:      250 ms
Silence before retry:          1.2 seconds
Recognition attempt timeout:   5 seconds
Celebration duration:          1.2 seconds
Delay before next item:        200 ms
```

Treat these as test values and keep them easy to adjust during real-device testing.

## Celebration

Initial success feedback:

- image scales from 1.0 to approximately 1.15
- particles burst from behind the image
- short success sound
- light haptic
- subtle background pulse
- automatic advance

Use SwiftUI and `Canvas`; do not add a third-party animation dependency.

Respect Reduce Motion by replacing particles with a gentle scale and colour transition.

## Session

```swift
struct PracticeSession {
    let category: SayCategory
    let cards: [SayCard]
    var currentIndex: Int
    var attemptsByCard: [String: Int]
    var completedCardIDs: Set<String>
    var skippedCardIDs: Set<String>
}
```

MVP behaviour:

- build the session from `SayCardStore` (defaults + overrides + custom cards, hidden cards excluded)
- shuffle the category's visible cards at session start
- complete after all cards in the category
- show a final celebration
- offer Restart and Choose Category
- do not save scores or accuracy percentages

## Debug mode

A development-only overlay is mandatory.

Enable it with a launch argument or a long press in development builds.

Display:

```text
Locale: en-US
State: listening
Target: elephant
Listen for: elephant, an elephant, elefant
Partial transcript: an elephant
Final transcript: an elephant
Match type: alternative
Attempt: 2
On-device supported: true
Recognizer available: true
Listening duration: 1.8 s
```

Debug actions:

- copy debug information
- restart current item
- simulate correct result
- simulate incorrect result
- simulate unavailable recognizer
- disable automatic success

## Accessibility and privacy

Required:

- no saved or uploaded recordings
- no transcript analytics
- stop audio capture outside the active item
- large touch targets
- VoiceOver labels on parent-facing controls
- Dynamic Type on permission and settings screens
- Reduce Motion support
- high contrast
- portrait and landscape layouts
- Guided Access compatibility
- no colour-only state communication

## Tests

### WordMatcherTests

Cover:

- exact matches
- capitalization and punctuation
- whitespace
- leading articles and approved phrases
- accepted alternatives
- empty transcripts
- short-word rejection
- fuzzy boundaries
- locale-specific characters
- similar incorrect words

### PracticeViewModelTests

Cover:

- initial state
- speaking-to-listening transition
- correct result
- incorrect result
- retry count
- automatic replay
- skip
- next item
- session completion
- permission denial
- recognition unavailable
- cancellation and backgrounding

### SayCardStoreTests

Cover:

- default cards resolve for the active language
- language fallback for missing localisations
- an override changes title, speak text, and listen-for independently
- overrides are scoped per language (an English edit leaves Dutch defaults untouched)
- reset removes the override and restores bundled values
- hidden cards are excluded from practice sessions
- custom cards persist, edit, and delete
- default cards cannot be deleted
- an all-hidden category is reported as unplayable

### SayCatalogTests

Cover:

- unique IDs
- valid category references
- existing image assets
- non-empty title, speak text, and listen-for values in every supported language
- valid difficulty values

### Manual device matrix

Test on:

- one recent iPad
- one older supported iPad
- one iPhone
- built-in microphone
- wired or Bluetooth headphones
- quiet room
- household or television noise
- adult speech
- at least two children with different speech clarity

Simulator testing is not sufficient for recognition quality.

## Milestones

### 1. Static app shell on the Tiko harness

Build:

- Xcode project and app target with the `TikoKit` dependency
- `.say` case in `TikoAppColor`
- `TikoAppShell` integration: header, settings sheet, account surface, language selection
- shared Parent Mode / Child Mode model with PIN-gated Child Mode exit
- category grid
- practice screen
- bundled localised default-card catalogue
- navigation
- mock state machine
- Replay, Skip, Back
- development debug overlay

Acceptance:

- app boots on a Temporary Account without login, like the other Tiko apps
- Parent Mode and Child Mode behave per the shared user-modes contract
- categories open
- cards advance through mocked results
- all text goes through `TikoI18n` and switches with the app language
- layout works on iPad and iPhone
- catalogue and state tests pass

### 2. Parent Mode card editing

Build:

- `SayCardStore` merging bundled defaults, per-language overrides, and custom cards
- card list per category in Parent Mode
- card editor: title, speak text, listen-for list, image
- hide/show, reset-to-default, reorder
- add and delete custom cards
- local per-account persistence

Acceptance:

- editing a default card changes what is shown, said, and accepted in practice
- reset restores the bundled default for the active language
- edits in one language do not affect another language
- hidden cards never appear in Child Mode
- custom cards survive relaunch
- Child Mode exposes no editing surface
- card-store tests pass

### 3. Speech playback

Build:

- `AVSpeechSynthesizer` service speaking the card's speak text
- voice selection driven by the active app language
- async completion
- replay handling
- interruption handling

Acceptance:

- each card is spoken once
- replay does not queue duplicate utterances
- listening cannot start during playback

### 4. Live recognition

Build:

- permission flow
- audio engine
- `SFSpeechRecognizer`
- partial and final transcripts
- contextual strings
- timeout and cancellation
- on-device and locale support checks, with the parent-facing unsupported-language notice
- recognition debug data

Acceptance:

- physical-device speech appears in debug mode
- recognition stops cleanly
- app speech cannot trigger success
- microphone does not remain active after navigation

### 5. Matching and retries

Build:

- locale-aware normalization
- exact and listen-for alternative matches
- per-language approved phrases
- conservative fuzzy matching
- retry sequence
- automatic replay
- skip emphasis

Acceptance:

- matcher tests pass
- false positives for short words remain low
- no child can become trapped
- incorrect attempts receive no negative feedback

### 6. Celebration and polish

Build:

- particle celebration
- haptics
- success sound
- Reduce Motion path
- session-complete screen

Acceptance:

- success feels immediate
- repeated celebrations remain smooth
- animation does not delay the next card unnecessarily

### 7. Real-child validation

Evaluate:

- whether the task is understood without explanation
- recognition start timing
- rejection rate for correct attempts
- acceptance rate for incorrect words
- replay usage
- skip usage
- automatic-advance speed
- whether celebration motivates or distracts

Do not expand content before this milestone.

## MVP definition of done

- App launches without login on a Temporary Account via `TikoIdentity`.
- App runs inside `TikoAppShell` with the shared Parent Mode / Child Mode model and PIN-gated Child Mode exit.
- Three categories and fifteen default cards are available, localised for supported languages.
- The card's speak text is spoken automatically in the active language.
- Recognition begins after playback finishes, using the active language's locale.
- Correct recognition celebrates and advances.
- Unrecognised speech retries calmly.
- Replay and Skip always work.
- Parent Mode can edit a default card's title, speak text, and listen-for list; hide it; reset it; add and delete custom cards. Edits persist across relaunch and are scoped per language.
- Switching the app language switches card content, TTS voice, and recognition locale; unsupported recognition locales show a parent-facing notice.
- Permission failures have a recovery path.
- Recognition stops on backgrounding and navigation.
- No recording is retained.
- Debug mode exposes recognition behaviour.
- Unit tests cover matching, card store resolution/overrides, and state transitions.
- The complete flow works on a physical iPad.

## Explicit non-goals

- backend content catalogue API (edits are local-first; sync follows the standard Tiko data path later)
- remote media catalogue
- saved progress or progress sync
- points or streaks
- pronunciation percentages
- AI or clinical feedback
- teacher administration
- web or Android implementation
- shared TypeScript speech layer

## Codex task sequence

### Task 1: Static SwiftUI proof on the Tiko harness

```text
Create the initial native SwiftUI app structure for Tiko Say under apps/say/ios.

Requirements:
- Follow the existing tiko-universe product-first structure and XcodeGen setup used by the other native apps.
- Target iOS and iPadOS 18 or later.
- Use SwiftUI.
- Depend on the local TikoKit package (packages/tikokit-ios).
- Add a .say case to TikoAppColor in TikoKit with a unit test.
- Wrap the app in TikoAppShell: shared header, settings sheet, account surface, language selection.
- Use the shared Parent Mode / Child Mode model from docs/flows/shared/user-modes.md, including PIN-gated Child Mode exit.
- Route all strings through TikoI18n / Localizable.xcstrings; no hardcoded text.
- Add three bundled categories: Animals, Food and Vehicles.
- Add five default cards per category. Each card has: title (shown), speakText (said), listenFor (accepted recognition targets), image — localised per supported language.
- Build a category grid and a single-card practice screen.
- Implement the PracticeState state machine.
- Use a mock speech service for now.
- Add Replay, Skip and Back actions.
- Add a development-only debug overlay.
- Add unit tests for catalogue loading and practice-state transitions.
- Do not implement real speech recognition yet.
- Document build and test instructions in apps/say/ios/README.md.
```

### Task 2: Parent Mode card editing

```text
Implement editable cards for Tiko Say.

Requirements:
- The bundled cards are defaults, not fixed content.
- Add a SayCardStore that merges bundled defaults, per-language overrides (SayCardOverride), and custom cards, per account.
- In Parent Mode, per category: list cards; edit title, speak text, and listen-for list independently; edit the image; hide/show; reset an edited default card to its bundled values; add custom cards; delete custom cards (defaults can only be hidden); reorder.
- Prefill speak text and the primary listen-for target from the title when creating or clearing fields.
- Warn (do not block) on listen-for entries shorter than four characters.
- Store edits per account and per language; an English edit must not affect Dutch defaults.
- Persist locally and survive relaunch; follow TikoKit storage conventions so backend sync can attach later.
- Child Mode must never expose any editing surface; practice sessions read only from SayCardStore and exclude hidden cards.
- Treat an all-hidden category as disabled in Child Mode.
- Add SayCardStoreTests covering resolution, overrides, per-language scoping, reset, hiding, and custom-card lifecycle.
```

### Task 3: Apple speech integration

```text
Implement the native Apple speech service for Tiko Say.

Requirements:
- Use AVSpeechSynthesizer to speak the card's speak text.
- Use SFSpeechRecognizer, SFSpeechAudioBufferRecognitionRequest and AVAudioEngine to recognise microphone input.
- Request microphone and speech-recognition permissions.
- Drive TTS voice and recognizer locale from the active app language, never a hardcoded locale.
- Check SFSpeechRecognizer.supportedLocales(); show a parent-facing notice when the active language is unsupported and offer the nearest supported locale.
- Enable partial recognition results.
- Add the card's listen-for targets to contextualStrings.
- Prefer on-device recognition when supportsOnDeviceRecognition is true.
- Never start listening until AVSpeechSynthesizer has finished.
- Cancel and clean up all previous recognition state before a new attempt.
- Stop recognition when leaving the screen or backgrounding the app.
- Never store microphone audio.
- Feed recognised text into the existing mockable service interface.
- Expose recognition state and transcript in the development debug overlay.
- Add tests where framework boundaries can be mocked.
```

### Task 4: Matching, retries, and celebration

```text
Implement target-word matching, retry behaviour and celebration for Tiko Say.

Requirements:
- Normalize case (locale-aware), punctuation and whitespace.
- Match against the card's listen-for list: primary target first, then alternatives.
- Support per-language approved leading phrases (for example "a dog" in English, "de hond" in Dutch), driven by configuration.
- Do not fuzzy-match words shorter than four characters.
- Add conservative configurable fuzzy matching for longer words.
- Add unit tests for accepted and rejected examples in at least two languages.
- Retry calmly when no match is found.
- Automatically replay the word after the third unsuccessful attempt.
- Make Skip more prominent after the fifth attempt.
- Never show negative visual or audio feedback.
- Trigger a SwiftUI particle celebration, success sound and haptic on success.
- Respect Reduce Motion.
- Automatically move to the next card after celebration.
```
