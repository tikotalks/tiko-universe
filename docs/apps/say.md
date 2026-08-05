# Tiko Say

## Job

A calm child-facing speech-practice app. The child chooses a category, sees one card, hears its word, repeats the word, and receives an immediate celebration when Apple speech recognition hears the intended word.

## Product boundary

Tiko Say is a separate app, not a mode inside Cards.

Cards is a communication and visual-choice tool. Say has a different interaction loop, microphone permissions, speech-recognition state, retry behaviour, and success feedback. Keeping it separate protects the simplicity of both products.

## Tiko harness

Say is a Tiko app and uses the same harness as every other Tiko app. No exclusions. It follows the family's [design principles](../flows/shared/design-principles.md) — icon-only round child controls, no in-app descriptions or explanations, one thing at a time, everything speaks, everything editable, celebration never punishment.

- `TikoAppShell` from `packages/tikokit-ios` for the shared header, settings sheet, account/setup surfaces, language selection, and colour mode.
- `TikoIdentity` for device-first session bootstrap: the app opens immediately on a Temporary Account, exactly like every other Tiko app.
- The shared account and mode model from [`docs/flows/shared/user-modes.md`](../flows/shared/user-modes.md): Parent Mode and Child Mode, PIN-gated Child Mode exit, verified accounts, Profile Manager child accounts.
- `TikoI18n` / `Localizable.xcstrings` for all text. No hardcoded strings.
- `TikoSpeech` for target-word playback where it fits, and the shared `TikoAppColor` entry for Say.

Parent Mode is where all configuration lives: card editing, language, settings, account. Child Mode shows only the practice experience.

## Initial platform

The MVP is native iOS and iPadOS only.

Use Apple frameworks plus the Tiko voice service:

- SwiftUI for the interface
- **Tiko Atlas voice** for target-word playback (the same generated voices as the other apps), with a persistent per-word disk cache so playback works offline; `AVSpeechSynthesizer` is the fallback when a word is uncached and the network is unreachable. Session words are prefetched when practice starts.
- `SFSpeechRecognizer` and `SFSpeechAudioBufferRecognitionRequest` for speech recognition
- `AVAudioEngine` for microphone capture
- SwiftUI animation, `Canvas`, sound, and haptics for celebration

Web and Android are explicitly deferred until the child interaction and recognition behaviour have been validated on physical iOS devices.

## Cards

The practice unit is a card. Every card has three text fields plus an image:

- **Title** — the written label shown on screen.
- **Speak text** — what the app says aloud. Usually the title, but editable separately (for example title `Dog`, speak text `the dog`).
- **Listen for** — one or more accepted recognition targets. The first entry is the primary target; the rest are accepted alternatives (`dog`, `a dog`, `doggy`).

All three fields are per language: a card resolves its title, speak text, and listen-for list for the active app language.

Card images come from the Tiko media library: default cards resolve a library image automatically (matched by name/tags per category, cached on disk so previously seen images work offline), the bundled emoji is the offline fallback, and parents can pick any library image or upload their own via the standard media picker.

### Default cards and editing

The bundled categories and items are **default cards**, not fixed content. In Parent Mode a caregiver can:

- edit any default card: title, speak text, listen-for alternatives, and image
- hide a default card from practice
- reset an edited card back to its bundled default
- add custom cards to any category
- edit or delete custom cards
- reorder cards within a category

Child Mode never exposes editing. Edits are stored per account and per language, so an English edit does not overwrite the Dutch defaults.

## Languages

Say must work in as many languages as possible.

- The app language follows the shared Tiko language setting from the shell.
- Default cards ship localised (title, speak text, listen-for) for every Tiko-supported language; missing locales fall back per standard `TikoI18n` rules.
- `AVSpeechSynthesizer` voices and `SFSpeechRecognizer` locale are driven by the active language, never hardcoded.
- Matching rules are language-aware: locale-correct lowercasing, per-language approved articles and wrappers (`a dog`, `de hond`, `un perro`), and per-language alternatives.
- If speech recognition does not support the active language on this device, show a clear parent-facing notice and offer the closest supported language; never fail silently.
- Prefer on-device recognition when the locale supports it.

## Core child flow

1. Open without login (Temporary Account bootstrap, like every Tiko app).
2. Choose a visual category.
3. See one large card image and its title.
4. Hear the speak text once.
5. The app starts listening automatically after playback finishes.
6. Repeat the target word.
7. A recognised match triggers a large positive celebration.
8. The next card appears automatically.
9. An unclear or incorrect recognition result retries calmly without negative feedback.

## Interaction principles

- Never display a red cross, harsh buzzer, or spoken “wrong.” A miss is acknowledged by one soft, quiet sound and a calm retry.
- Never trap a child on one card.
- Replay and next are always available as icon-only round buttons.
- Minimal text everywhere: the listening state is a small animated waveform, not a label; explanations are one short sentence at most.
- Recognition determines what Apple heard. It is not a clinical pronunciation score.
- The child-facing screen does not show transcripts, confidence values, or technical status.
- The loop should be quick: image, word, listen, celebrate, next.
- Parent Mode editing uses the shared Tiko popup sheets (`TikoPopupCard`/`TikoFormSheet`) and the standard media picker, like every other Tiko app.

## Default content

Six bundled categories with a rich default set (~56 cards), localised for every supported language:

- **Animals** (10): cat, dog, lion, elephant, monkey, horse, cow, pig, duck, rabbit
- **Food** (10): apple, banana, bread, milk, egg, cheese, water, tomato, cookie, ice cream
- **Vehicles** (8): car, bus, train, boat, plane, bike, truck, tractor
- **Body** (8): head, nose, mouth, ear, eye, hand, foot, hair
- **Colors** (10): red, blue, green, yellow, orange, pink, purple, white, black, brown
- **Numbers** (10): one through ten (spoken digits also count as correct)
- **Letters** (26+): the alphabet, spoken by letter name — planned addition, see the implementation plan's Letters tasks. Each letter accepts its common homophone transcriptions ("b", "bee", "be"); Maltese adds its extra letters (ċ, ġ, ħ, ż, għ, ie). Letter *sounds* (phonics) stay authorable per card via the speak-text field.

Default card text is bundled locally; images resolve from the Tiko media library per category with emoji fallback. Parent Mode edits and custom cards persist locally per account first; sync through the standard Tiko data layer follows the same path as the other apps.

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
    case requestingPermission
    case permissionDenied
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

- Request microphone and speech-recognition permission only when the activity is about to start, and request it directly: opening a category presents the system prompt itself. Nothing dismissible may stand in front of it (App Store guideline 5.1.1(iv)) — the explanation renders behind the prompt, and the only recovery screen is the one shown *after* a refusal, which links to Settings.
- Stop recognition while the app speaks, otherwise it may recognise its own voice.
- Use the active app language's locale.
- Enable partial recognition results.
- Add the card's listen-for targets to `contextualStrings`.
- Prefer on-device recognition when the locale and device support it.
- Never store microphone recordings.
- Discard transcripts after the current attempt.
- Cancel recognition when the app backgrounds or leaves the practice screen.

## Matching rules

Match the recognised transcript against the card's listen-for targets after normalisation.

Normalisation should include:

- locale-aware lowercase conversion
- punctuation removal
- whitespace trimming and collapsing
- approved leading articles or phrases per language
- the card's configured listen-for alternatives

Fuzzy matching must be conservative:

- fewer than four characters: no fuzzy matching
- four to five characters: at most one edit, only when tests show it is safe
- six or more characters: configurable similarity threshold

Short words such as `cat`, `dog`, and `car` must not accept nearby words such as `hat`, `dot`, or `card`.

## Retry behaviour

A miss plays one soft, quiet acknowledgement tone (never a harsh buzzer) and retries:

- Attempts 1 and 2: listen again calmly.
- Attempt 3: replay the target automatically, then listen again.
- Attempt 4: allow the configured relaxed matcher.
- Attempt 5: make Skip more prominent.
- Skip remains available at all times.

## Celebration

Winning should feel like a small party, and rewards stay interesting by varying every time. Each success randomly picks:

- a **card dance** — the image itself pops, spins, bounces or wiggles
- a **celebration style** — explosion with shockwave ring, full-screen confetti rain, a rain of the card's own emoji, multi-burst fireworks, stars, hearts, or bubbles — with varying colour palettes
- a **success chime** from several, plus a few tiny pop sounds sprinkled through the burst with light haptics

A successful match triggers all of the above, then advances automatically after roughly one and a half seconds.

Respect Reduce Motion by replacing the particles with a gentle scale and colour transition.

## Privacy

- No saved microphone recordings
- No uploaded audio
- No transcript analytics
- No child identity required to practise
- Clear parent-facing permission explanation
- On-device recognition preferred for the MVP

## Accessibility

- large touch targets
- portrait and landscape layouts
- iPad-first design that remains usable on iPhone
- VoiceOver labels on parent-facing controls
- Dynamic Type on permission, settings, and card-editing screens
- Reduce Motion support
- Guided Access compatibility
- no colour-only state communication

## MVP non-goals

- Web or Android support
- Backend content catalogue and remote media library (edits are local-first; sync follows the standard Tiko data path later)
- Progress sync
- Scores, streaks, or leaderboards
- Pronunciation percentages
- Clinical or AI pronunciation feedback
- Teacher dashboard

## Definition of done

- The app opens without login on a Temporary Account via the shared Tiko harness.
- The app runs inside `TikoAppShell` with the shared Parent Mode / Child Mode model and PIN-gated Child Mode exit.
- A child can choose one of three categories.
- The card image fills most of the practice screen.
- The speak text is spoken automatically in the active language.
- Listening starts only after playback finishes.
- A recognised listen-for target triggers celebration and advances.
- Unrecognised speech retries calmly.
- Replay and Skip always work.
- In Parent Mode a caregiver can edit a default card's title, speak text, and listen-for list; hide it; reset it; and add a custom card. Edits survive relaunch.
- Switching the app language switches card content, TTS voice, and recognition locale; unsupported recognition locales show a parent-facing notice.
- Recognition stops when the app backgrounds or the screen closes.
- No recording is retained.
- A development debug overlay exposes target, transcript, state, attempt, locale, and on-device support.
- Matching, card resolution/overrides, and state transitions have unit tests.
- The complete flow works on a physical iPad.

## Implementation plan

See [`docs/plans/say-ios-mvp.md`](../plans/say-ios-mvp.md).
