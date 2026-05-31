# Native iOS Yes No Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Upgrade `apps/yes-no/ios` from a basic SwiftUI parity scaffold into a native-first child communication app that uses iOS capabilities for speech, haptics, persistence, and caregiver setup.

**Architecture:** Keep `apps/yes-no/ios` as a product-first native client that imports `packages/tikokit-ios`. Do not mirror the Vue screen 1:1; preserve the product contract (ask a prompt, answer Yes/No, remember choices, optional recovery) while using native SwiftUI, `AVSpeechSynthesizer`, `SensoryFeedback`/haptics, sheets, AppStorage, and the future shared HTTPS identity/TTS contracts.

**Tech Stack:** SwiftUI, Swift 5.9+, iOS 17+, XcodeGen, TikoKit Swift Package, AVFoundation, Observation where state grows beyond simple `@State`/`@AppStorage`.

---

## Native Product Direction

This app is not a web port. The web app's job is "a child can answer a caregiver's question with two big choices." The iOS app should feel like a tactile native AAC tool:

- Big native answer surfaces that respond immediately to touch with haptics and sound.
- Native speech for prompt and answer using `AVSpeechSynthesizer` first; the Tiko TTS API can layer in later for consistent custom voices/cache.
- Native sheets for sentence presets, history, and caregiver setup instead of web popups.
- Offline-first local persistence with future API sync boundaries kept isolated.
- No login wall. Device user exists implicitly; recovery/setup is caregiver-initiated.

## Existing Starting Point

- Existing app folder: `apps/yes-no/ios`
- Existing files:
  - `apps/yes-no/ios/Project.yml`
  - `apps/yes-no/ios/Sources/TikoYesNoApp.swift`
  - `apps/yes-no/ios/Sources/YesNoView.swift`
  - `apps/yes-no/ios/Sources/Info.plist`
  - `apps/yes-no/ios/Tests/TikoYesNoTests.swift`
- Existing shared package: `packages/tikokit-ios`

## Acceptance Criteria

- The main screen is usable in one hand and by a child without reading settings copy.
- Tapping Yes/No gives instant visual state, haptic feedback, and spoken answer.
- Prompt text can be spoken, edited, reset, and chosen from native presets.
- History is available to a caregiver but not visually dominant for the child.
- Caregiver setup uses no passwords and does not block app usage.
- API/TTS/identity integration points are isolated behind small clients/protocols.
- Linux-side validation can inspect project shape; Mac-side validation uses XcodeGen + xcodebuild.

---

### Task 1: Add Native Speech Service

**Objective:** Replace TODO speech placeholders with a native `AVSpeechSynthesizer` service that can speak prompt and answers offline.

**Files:**
- Create: `apps/yes-no/ios/Sources/YesNoSpeechService.swift`
- Modify: `apps/yes-no/ios/Sources/YesNoView.swift`
- Test: `apps/yes-no/ios/Tests/TikoYesNoTests.swift`

**Step 1: Create speech service**

```swift
import AVFoundation

@MainActor
final class YesNoSpeechService {
    private let synthesizer = AVSpeechSynthesizer()

    func speak(_ text: String, languageCode: String = "en-US") {
        let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return }

        if synthesizer.isSpeaking {
            synthesizer.stopSpeaking(at: .immediate)
        }

        let utterance = AVSpeechUtterance(string: trimmed)
        utterance.voice = AVSpeechSynthesisVoice(language: languageCode)
        utterance.rate = AVSpeechUtteranceDefaultSpeechRate * 0.92
        utterance.pitchMultiplier = 1.04
        synthesizer.speak(utterance)
    }

    func stop() {
        synthesizer.stopSpeaking(at: .immediate)
    }
}
```

**Step 2: Wire into view**

Add `@State private var speech = YesNoSpeechService()` to `YesNoView`, and call:

```swift
speech.speak(effectiveSentence)
speech.speak(choice.label)
```

**Step 3: Verify on Mac**

Run from `apps/yes-no/ios`:

```bash
xcodegen generate
xcodebuild test -scheme TikoYesNo -destination 'platform=iOS Simulator,name=iPhone 15' CODE_SIGNING_ALLOWED=NO
```

Expected: project builds; manual simulator tap speaks prompt/answers.

**Step 4: Commit**

```bash
git add apps/yes-no/ios/Sources/YesNoSpeechService.swift apps/yes-no/ios/Sources/YesNoView.swift apps/yes-no/ios/Tests/TikoYesNoTests.swift
git commit -m "feat(ios): add native speech to yes no"
```

---

### Task 2: Add Tactile Answer Interaction

**Objective:** Make answer selection feel native with visual selection state and haptic feedback.

**Files:**
- Modify: `apps/yes-no/ios/Sources/YesNoView.swift`
- Optional Modify: `packages/tikokit-ios/Sources/TikoKit/TikoChoiceGrid.swift`
- Test: `apps/yes-no/ios/Tests/TikoYesNoTests.swift`

**Step 1: Track selected answer flash**

Add state:

```swift
@State private var selectedAnswerID: String?
@State private var answerPulse = false
```

In `selectChoice(_:)`:

```swift
selectedAnswerID = choice.id
answerPulse = true
UIImpactFeedbackGenerator(style: choice.id == "yes" ? .medium : .rigid).impactOccurred()
speech.speak(choice.label)

Task { @MainActor in
    try? await Task.sleep(for: .milliseconds(450))
    answerPulse = false
}
```

**Step 2: Prefer shared TikoKit affordance if needed**

If the current `TikoChoiceGrid` cannot show selected/pressed state without app-local duplication, extend it carefully:

```swift
public init(
    choices: [TikoAnswerChoice],
    selectedChoiceID: String? = nil,
    onSelect: @escaping (TikoAnswerChoice) -> Void
)
```

Use `.scaleEffect(selected ? 1.04 : 1)` and `.animation(.spring(response: 0.22, dampingFraction: 0.7), value: selectedChoiceID)`.

**Step 3: Verify**

- Tap Yes: green answer pulses, haptic fires, answer is spoken.
- Tap No: red answer pulses, haptic fires, answer is spoken.
- Repeated taps do not queue stale speech forever.

**Step 4: Commit**

```bash
git add apps/yes-no/ios/Sources/YesNoView.swift packages/tikokit-ios/Sources/TikoKit/TikoChoiceGrid.swift
git commit -m "feat(ios): add tactile answer feedback"
```

---

### Task 3: Native Prompt Presets Sheet

**Objective:** Replace web-style prompt editing with a native preset picker plus focused edit mode.

**Files:**
- Create: `apps/yes-no/ios/Sources/PromptPresetSheet.swift`
- Modify: `apps/yes-no/ios/Sources/YesNoView.swift`
- Test: `apps/yes-no/ios/Tests/TikoYesNoTests.swift`

**Step 1: Add model**

```swift
struct PromptPreset: Identifiable, Equatable {
    let id: String
    let title: String
    let prompt: String
    let symbol: String
}

let defaultPromptPresets: [PromptPreset] = [
    .init(id: "eat", title: "Eat", prompt: "Do you want to go eat?", symbol: "fork.knife"),
    .init(id: "drink", title: "Drink", prompt: "Do you want something to drink?", symbol: "cup.and.saucer.fill"),
    .init(id: "play", title: "Play", prompt: "Do you want to play?", symbol: "figure.play"),
    .init(id: "rest", title: "Rest", prompt: "Do you want to rest?", symbol: "moon.zzz.fill")
]
```

**Step 2: Build native sheet**

Use a bottom sheet with big rows and icons, not a web dropdown:

```swift
struct PromptPresetSheet: View {
    let presets: [PromptPreset]
    let onSelect: (PromptPreset) -> Void
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            List(presets) { preset in
                Button {
                    onSelect(preset)
                    dismiss()
                } label: {
                    Label(preset.prompt, systemImage: preset.symbol)
                        .font(.system(.title3, design: .rounded).weight(.bold))
                        .padding(.vertical, 8)
                }
            }
            .navigationTitle("Choose question")
        }
    }
}
```

**Step 3: Verify**

- Preset sheet opens from a header or prompt control.
- Selecting a preset updates `sentence` and returns to child-friendly main view.

**Step 4: Commit**

```bash
git add apps/yes-no/ios/Sources/PromptPresetSheet.swift apps/yes-no/ios/Sources/YesNoView.swift apps/yes-no/ios/Tests/TikoYesNoTests.swift
git commit -m "feat(ios): add yes no prompt presets"
```

---

### Task 4: Caregiver Setup Sheet Boundary

**Objective:** Add native caregiver setup shell without implementing backend exchange prematurely.

**Files:**
- Create: `apps/yes-no/ios/Sources/CaregiverSetupSheet.swift`
- Modify: `apps/yes-no/ios/Sources/YesNoView.swift`

**Step 1: Build sheet UI**

The sheet should support:

- Child display name.
- Optional email for recovery.
- `Send magic link` disabled until email is syntactically valid.
- Copy that says app works without setup.
- No password fields.

**Step 2: Add TODO only at API boundary**

```swift
// TODO: POST to identity API email endpoint with current device session bearer token.
```

Do not create fake auth state or password flows.

**Step 3: Verify**

Manual simulator pass: setup sheet opens, validates email, dismisses, no app usage blocked.

**Step 4: Commit**

```bash
git add apps/yes-no/ios/Sources/CaregiverSetupSheet.swift apps/yes-no/ios/Sources/YesNoView.swift
git commit -m "feat(ios): add caregiver setup shell for yes no"
```

---

### Task 5: Mac Build Validation + Handoff

**Objective:** Validate source shape on Linux and native build on Mac.

**Files:**
- Modify: `docs/plans/2026-05-31-native-ios-yes-no.md` only if findings need documentation.

**Step 1: Linux-side checks**

```bash
npm run typecheck
npm test -- --run
```

Expected: no TypeScript regressions from shared package edits.

**Step 2: Mac-side checks**

```bash
cd apps/yes-no/ios
xcodegen generate
xcodebuild test -scheme TikoYesNo -destination 'platform=iOS Simulator,name=iPhone 15' CODE_SIGNING_ALLOWED=NO
```

**Step 3: Manual smoke**

- Launch app.
- Tap speaker: prompt speaks.
- Tap Yes/No: answer speaks, haptic/animation fires, history updates.
- Open presets: selecting preset updates prompt.
- Open setup: app remains usable without setup.

**Step 4: Commit any fixes**

Use focused `fix(ios): ...` commits.
