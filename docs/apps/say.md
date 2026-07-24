# Tiko Say

## Job

A calm child-facing speech-practice app. The child chooses a category, sees one image, hears its name, repeats the word, and receives an immediate celebration when Apple speech recognition hears the intended word.

## Product boundary

Tiko Say is a separate app, not a mode inside Cards.

Cards is a communication and visual-choice tool. Say has a different interaction loop, microphone permissions, speech-recognition state, retry behaviour, and success feedback. Keeping it separate protects the simplicity of both products.

## Initial platform

The MVP is native iOS and iPadOS only.

Use Apple frameworks:

- SwiftUI for the interface
- `AVSpeechSynthesizer` for target-word playback
- `SFSpeechRecognizer` and `SFSpeechAudioBufferRecognitionRequest` for speech recognition
- `AVAudioEngine` for microphone capture
- SwiftUI animation, `Canvas`, sound, and haptics for celebration

Web and Android are explicitly deferred until the child interaction and recognition behaviour have been validated on physical iOS devices.

## Core child flow

1. Open without login.
2. Choose a visual category.
3. See one large image and its written label.
4. Hear the target word once.
5. The app starts listening automatically after playback finishes.
6. Repeat the target word.
7. A recognised match triggers a large positive celebration.
8. The next item appears automatically.
9. An unclear or incorrect recognition result retries calmly without negative feedback.

## Interaction principles

- Never display a red cross, buzzer, or spoken “wrong.”
- Never trap a child on one item.
- Replay and skip remain available.
- Recognition determines what Apple heard. It is not a clinical pronunciation score.
- The child-facing screen does not show transcripts, confidence values, or technical status.
- The loop should be quick: image, word, listen, celebrate, next.

## MVP content

Three bundled categories with five bundled items each:

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

Content and images are bundled locally for the first proof. Backend content management and Tiko media integration are deferred.

## App state

The practice experience should use an explicit state machine:

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

Expected flow:

```text
presenting
→ speaking
→ preparingToListen
→ listening
→ processing
    → celebrating → next item
    → retrying → listening
```

## Recognition behaviour

- Request microphone and speech-recognition permission only when the activity is about to start.
- Stop recognition while the app speaks, otherwise it may recognise its own voice.
- Use the selected locale.
- Enable partial recognition results.
- Add the target and accepted alternatives to `contextualStrings`.
- Prefer on-device recognition when the locale and device support it.
- Never store microphone recordings.
- Discard transcripts after the current attempt.
- Cancel recognition when the app backgrounds or leaves the practice screen.

## Matching rules

Match the recognised transcript against the target and configured alternatives after normalisation.

Normalisation should include:

- lowercase conversion
- punctuation removal
- whitespace trimming and collapsing
- approved leading articles or phrases per language
- explicit configured recognition alternatives

Fuzzy matching must be conservative:

- fewer than four characters: no fuzzy matching
- four to five characters: at most one edit, only when tests show it is safe
- six or more characters: configurable similarity threshold

Short words such as `cat`, `dog`, and `car` must not accept nearby words such as `hat`, `dot`, or `card`.

## Retry behaviour

- Attempts 1 and 2: listen again calmly.
- Attempt 3: replay the target automatically, then listen again.
- Attempt 4: allow the configured relaxed matcher.
- Attempt 5: make Skip more prominent.
- Skip remains available at all times.

## Celebration

A successful match should trigger:

- image scale or bounce
- particle burst behind the image
- short success sound
- light haptic feedback
- optional background pulse
- automatic advance after roughly one second

Respect Reduce Motion by replacing the particle burst with a gentle scale and colour transition.

## Privacy

- No saved microphone recordings
- No uploaded audio
- No transcript analytics
- No child identity required
- Clear parent-facing permission explanation
- On-device recognition preferred for the MVP

## Accessibility

- large touch targets
- portrait and landscape layouts
- iPad-first design that remains usable on iPhone
- VoiceOver labels on parent-facing controls
- Dynamic Type on permission and settings screens
- Reduce Motion support
- Guided Access compatibility
- no colour-only state communication

## MVP non-goals

- Web or Android support
- Backend content API
- Tiko identity
- Parent PIN
- User-created content
- Downloadable content packs
- Progress sync
- Scores, streaks, or leaderboards
- Pronunciation percentages
- Clinical or AI pronunciation feedback
- Teacher dashboard

## Definition of done

- The app opens without login.
- A child can choose one of three categories.
- The target image fills most of the practice screen.
- The target word is spoken automatically.
- Listening starts only after playback finishes.
- A recognised target triggers celebration and advances.
- Unrecognised speech retries calmly.
- Replay and Skip always work.
- Recognition stops when the app backgrounds or the screen closes.
- No recording is retained.
- A development debug overlay exposes target, transcript, state, attempt, locale, and on-device support.
- Matching and state transitions have unit tests.
- The complete flow works on a physical iPad.

## Implementation plan

See [`docs/plans/say-ios-mvp.md`](../plans/say-ios-mvp.md).
