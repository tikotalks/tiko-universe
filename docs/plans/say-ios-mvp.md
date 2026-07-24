# Tiko Say: Native iOS MVP Plan

## Status

Planned.

## Objective

Validate a simple speech-practice loop on physical iOS devices:

1. Choose a category.
2. See one large image.
3. Hear the target word.
4. Repeat the word.
5. Receive immediate positive feedback.
6. Continue automatically to the next item.

The first version is native iOS and iPadOS only. It deliberately avoids backend, account, cross-platform, and content-management work until the interaction has been tested with real child speech.

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

Prefer on-device recognition when `supportsOnDeviceRecognition` is true. The first proof may limit supported locales rather than silently falling back to a network-dependent experience.

## Repository structure

Create:

```text
apps/say/ios/
├── TikoSay.xcodeproj
├── TikoSay/
│   ├── App/
│   │   ├── TikoSayApp.swift
│   │   └── AppEnvironment.swift
│   ├── Models/
│   │   ├── SayCategory.swift
│   │   ├── SayItem.swift
│   │   ├── PracticeSession.swift
│   │   └── RecognitionResult.swift
│   ├── Content/
│   │   ├── SayCatalog.swift
│   │   ├── categories.json
│   │   └── items.json
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
│       └── SayCatalogTests.swift
└── README.md
```

The implementation may adapt to existing native project conventions in `tiko-universe`, but the feature boundaries should remain intact.

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

### Item

```swift
struct SayItem: Identifiable, Codable, Hashable {
    let id: String
    let categoryID: String
    let labelKey: String
    let spokenText: String
    let acceptedAlternatives: [String]
    let imageName: String
    let difficulty: Int
}
```

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

Bundle three categories and fifteen items locally.

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

Do not connect the MVP to the media API. Bundled content makes speech behaviour easier to test and removes unrelated failure modes.

## Child flow

### Category screen

- Large visual tiles
- Category image and translated title
- No nested category hierarchy
- No account or setup wall

### Practice screen

- One image dominates the screen
- Written target word remains visible
- Microphone state is shown through a calm pulse or ring
- Child transcript remains hidden
- Controls: Replay, Skip, Back

### Item sequence

1. Present image and label.
2. Wait approximately 300 milliseconds.
3. Speak the target word.
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
9. Add target words and alternatives to `contextualStrings`.
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

The matcher answers only whether Apple heard the target or an approved equivalent.

### Normalisation

- lowercase using the selected locale
- remove punctuation
- trim and collapse whitespace
- normalize apostrophes where appropriate
- allow approved wrappers such as `a dog` or `the dog`
- compare against explicit alternatives

### Matching order

1. Exact normalized target
2. Explicit alternative
3. Approved phrase wrapper
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
    let items: [SayItem]
    var currentIndex: Int
    var attemptsByItem: [String: Int]
    var completedItemIDs: Set<String>
    var skippedItemIDs: Set<String>
}
```

MVP behaviour:

- shuffle the five category items at session start
- complete after all five items
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
Alternatives: an elephant, elefant
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

### SayCatalogTests

Cover:

- unique IDs
- valid category references
- existing image assets
- non-empty spoken text
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

### 1. Static app shell

Build:

- Xcode project and app target
- category grid
- practice screen
- bundled catalogue
- navigation
- mock state machine
- Replay, Skip, Back
- development debug overlay

Acceptance:

- categories open
- items advance through mocked results
- layout works on iPad and iPhone
- catalogue and state tests pass

### 2. Speech playback

Build:

- `AVSpeechSynthesizer` service
- locale-specific voice selection
- async completion
- replay handling
- interruption handling

Acceptance:

- each item is spoken once
- replay does not queue duplicate utterances
- listening cannot start during playback

### 3. Live recognition

Build:

- permission flow
- audio engine
- `SFSpeechRecognizer`
- partial and final transcripts
- contextual strings
- timeout and cancellation
- on-device support checks
- recognition debug data

Acceptance:

- physical-device speech appears in debug mode
- recognition stops cleanly
- app speech cannot trigger success
- microphone does not remain active after navigation

### 4. Matching and retries

Build:

- normalization
- exact and alternative matches
- approved phrases
- conservative fuzzy matching
- retry sequence
- automatic replay
- skip emphasis

Acceptance:

- matcher tests pass
- false positives for short words remain low
- no child can become trapped
- incorrect attempts receive no negative feedback

### 5. Celebration and polish

Build:

- particle celebration
- haptics
- success sound
- Reduce Motion path
- session-complete screen

Acceptance:

- success feels immediate
- repeated celebrations remain smooth
- animation does not delay the next item unnecessarily

### 6. Real-child validation

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

- App launches without login.
- Three categories and fifteen items are available.
- Target word is spoken automatically.
- Recognition begins after playback finishes.
- Correct recognition celebrates and advances.
- Unrecognised speech retries calmly.
- Replay and Skip always work.
- Permission failures have a recovery path.
- Recognition stops on backgrounding and navigation.
- No recording is retained.
- Debug mode exposes recognition behaviour.
- Unit tests cover matching and state transitions.
- The complete flow works on a physical iPad.

## Explicit non-goals

- backend content API
- Tiko identity or parent PIN
- user-created content
- remote media catalogue
- saved progress
- points or streaks
- pronunciation percentages
- AI or clinical feedback
- teacher administration
- web or Android implementation
- shared TypeScript speech layer

## Codex task sequence

### Task 1: Static SwiftUI proof

```text
Create the initial native SwiftUI app structure for Tiko Say under apps/say/ios.

Requirements:
- Follow the existing tiko-universe product-first structure.
- Target iOS and iPadOS 18 or later.
- Use SwiftUI.
- Add three bundled categories: Animals, Food and Vehicles.
- Add five bundled practice items per category.
- Build a category grid and a single-item practice screen.
- Implement the PracticeState state machine.
- Use a mock speech service for now.
- Add Replay, Skip and Back actions.
- Add a development-only debug overlay.
- Add unit tests for catalogue loading and practice-state transitions.
- Do not implement real speech recognition yet.
- Do not add a backend or cross-platform abstraction.
- Document build and test instructions in apps/say/ios/README.md.
```

### Task 2: Apple speech integration

```text
Implement the native Apple speech service for Tiko Say.

Requirements:
- Use AVSpeechSynthesizer to speak the target word.
- Use SFSpeechRecognizer, SFSpeechAudioBufferRecognitionRequest and AVAudioEngine to recognise microphone input.
- Request microphone and speech-recognition permissions.
- Use the selected item locale.
- Enable partial recognition results.
- Add the target and accepted alternatives to contextualStrings.
- Prefer on-device recognition when supportsOnDeviceRecognition is true.
- Never start listening until AVSpeechSynthesizer has finished.
- Cancel and clean up all previous recognition state before a new attempt.
- Stop recognition when leaving the screen or backgrounding the app.
- Never store microphone audio.
- Feed recognised text into the existing mockable service interface.
- Expose recognition state and transcript in the development debug overlay.
- Add tests where framework boundaries can be mocked.
```

### Task 3: Matching, retries, and celebration

```text
Implement target-word matching, retry behaviour and celebration for Tiko Say.

Requirements:
- Normalize case, punctuation and whitespace.
- Support explicit accepted alternatives.
- Support approved leading phrases such as “a dog” for English.
- Do not fuzzy-match words shorter than four characters.
- Add conservative configurable fuzzy matching for longer words.
- Add unit tests for accepted and rejected examples.
- Retry calmly when no match is found.
- Automatically replay the word after the third unsuccessful attempt.
- Make Skip more prominent after the fifth attempt.
- Never show negative visual or audio feedback.
- Trigger a SwiftUI particle celebration, success sound and haptic on success.
- Respect Reduce Motion.
- Automatically move to the next item after celebration.
```
