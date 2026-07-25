# Tiko Sum: Native iOS MVP Plan

## Status

Planned.

## Objective

Ship the math-communication loop natively on iOS/iPadOS: speak every key press, answer by choice (tap or voice), celebrate with the shared engine, and gamify predefined formula paths — all on the standard Tiko harness. Spec: [`docs/apps/sum.md`](../apps/sum.md).

Sum is the first app built **on the engine Say produced**, so this plan starts by promoting that engine into TikoKit instead of copying it.

## Phase 0 — extract the shared engine into TikoKit

Move these from `apps/say/ios/Sources` into `packages/tikokit-ios` (public API, unit tests move with them; Say switches to the TikoKit versions in the same change):

| Say file | TikoKit module | Notes |
| --- | --- | --- |
| `SayVoiceService.swift` | `TikoVoice` | Atlas + per-utterance disk cache + synthesizer fallback + prefetch. Parameterise the `app` string. |
| `CelebrationOverlay.swift` (variants, card dances, `SayFeedback`, sounds) | `TikoCelebrate` | Bundle the chime/pop/retry WAVs as TikoKit resources. |
| `SpeechPracticeService.swift` + protocol | `TikoSpeechPractice` | Recognition stream, availability/fallback locale logic, format-guard crash fix. |
| `WordMatcher.swift` + `SayLanguageRules` | `TikoWordMatcher` | Per-language wrappers stay data-driven. |
| The override/custom-card store pattern | stays per-app | Each app keeps its own store; the pattern is copied, the content differs. |

Acceptance: Say builds and its full test suite passes against the TikoKit versions; no app-local copies remain.

## Harness

- `.sum` in `TikoAppColor` + `TikoAppConfig` (suggested `#22c55e`), registered in `tools/generate-app-configs.mjs` (`fallbackConfigs` + `iosSharedApps`) — remember the generator regenerates those blocks at build time.
- `TikoAppKey.sum` + local translation bundles (en, nl, fr, es, de, mt) in TikoKit.
- XcodeGen project at `apps/sum/ios` mirroring Say's `Project.yml` (bundle `mt.tiko.sum`, iOS 18.0, config pre-build script, unit + UI test targets, `validate-local.sh`).
- Release scaffolding day one: `apps/sum/release/ios.json` + `app-store/en-US.json`, screenshot scenes via `TikoScreenshotMode` (`home`, `practice`, `celebrate` auto-play), registration in `release.config.json`, CI matrices, `exportOptions.plist` (cloud signing, per the Say release).

## Repository structure

```text
apps/sum/ios/
├── Project.yml
├── Sources/
│   ├── TikoSumApp.swift
│   ├── SumAppConfig.swift
│   ├── SumModels.swift            # Formula, FormulaToken, AnswerChoice, SumPath, PathOverride, PlayState
│   ├── SumCatalog.swift           # default paths, localized number/operator words 0–20
│   ├── SumPathStore.swift         # defaults + per-language overrides + custom paths (Say store pattern)
│   ├── FormulaSpeaker.swift       # token → spoken string per language; drives TikoVoice
│   ├── DistractorGenerator.swift  # answer-tile generation rules
│   ├── SumPlayViewModel.swift     # state machine for free play and paths
│   ├── SumView.swift              # shell + mode picker (free play / paths)
│   ├── KeypadView.swift
│   ├── AnswerTilesView.swift
│   ├── PathListView.swift
│   ├── SumParentEditor.swift      # Tiko popup sheets: paths, symbol pronunciation, constraints
│   ├── Info.plist / entitlements / Assets.xcassets
├── Tests/  (DistractorGeneratorTests, FormulaSpeakerTests, SumPathStoreTests, SumPlayViewModelTests)
└── UITests/ (launch, keypad speaks→tiles appear, parent editor opens)
```

## Models

```swift
enum FormulaToken: Codable, Hashable {
    case digit(Int)          // composes multi-digit operands
    case plus, minus, equals
}

struct Formula: Codable, Hashable {
    var tokens: [FormulaToken]
    var operands: [Int]      // derived
    var result: Int          // derived; MVP guarantees 0...100, never negative
}

struct AnswerChoice: Hashable {
    let value: Int
    let isCorrect: Bool
}

struct SumPath: Identifiable, Codable, Hashable {
    let id: String
    var title: String        // per language via catalog/overrides
    var emoji: String
    var imageURL: URL?
    var formulas: [Formula]  // exactly what plays, in order
    let isCustom: Bool
    var isHidden: Bool
    var sortOrder: Int
}
```

`SumPathStore` mirrors `SayCardStore`: bundled defaults resolved per language, `PathOverride` keyed by path ID + language, custom paths per account, hide/reset/reorder, persisted in UserDefaults per subject, resolved media images cached.

## Play state machine

```text
presenting → speakingFormula → choosing
    → celebrating → next formula (path) / clear (free play)
    → retrying(attempt) → speakingFormula (re-speak) → choosing (one distractor removed)
completed (path end) → big celebration → Restart / Choose path
```

- Attempt 1 miss: soft tone, re-speak, fade one distractor (two tiles remain).
- Attempt 2 miss: soft tone, re-speak, the correct tile gently pulses (guided success — the child still makes the choice).
- There is no attempt 3 state: with one obvious tile the loop always resolves positively.
- Skip always available; interruption handling identical to Say (pause capture, tap to resume, no attempt counted).

## Speech

- **Output**: `FormulaSpeaker` renders token sequences to per-language utterances (“drie… plus… vijf… is…”), each token spoken on key press, whole formula on equals. All utterances prefetched per session through `TikoVoice` so the keypad is offline-capable.
- **Input (optional)**: when the parent enables voice answering, `TikoSpeechPractice` listens after the tiles appear; `listenFor` = the correct value's digits + number word in the active language (the Say numbers catalog already localises 1–10; Sum extends 0–20 plus tens). Permission flow, availability fallback, and privacy rules identical to Say. Tap always works in parallel.

## Distractor rules (unit-tested)

1. Candidates: correct ±1, ±2, ±10, digit-swap, first operand, second operand.
2. Filter: ≥ 0, ≤ max range, ≠ correct, unique.
3. Pick two, seeded per formula for deterministic tests; if fewer than two survive, widen with ±3, ±4.

## Localisation

Number words 0–20 + “ten/twenty…” tens + plus/minus/equals words for en, nl, fr, es, de, mt live in `SumCatalog` (data, not code). Parent-editable pronunciation overrides per language follow the Say override pattern. UI strings via `TikoI18n` (`sum.*` keys).

## Tests

- `DistractorGeneratorTests` — rules, bounds, uniqueness, determinism.
- `FormulaSpeakerTests` — token → utterance per language, multi-digit composition (“1”,“2” → “twelve”), equals phrasing.
- `SumPathStoreTests` — defaults per language, overrides scoped per language/account, hide/reset/custom lifecycle, relaunch persistence.
- `SumPlayViewModelTests` (mock voice + recognizer) — full state machine, retry ladder incl. tile fading and guided second retry, path completion, skip, interruption, voice-answer accept/ignore paths.
- UI tests: launch, keypad → tiles, parent editor via header pencil.

## Milestones

1. **Engine extraction** (Phase 0) — TikoKit modules, Say migrated, all Say tests green.
2. **Static shell** — harness, keypad UI, mode picker, catalog, mock voice; keypad “speaks” via mock.
3. **Speaking keypad + tiles** — TikoVoice wired, per-press speech, equals → distractor tiles, celebrations on correct, retry ladder.
4. **Paths** — path list, session flow, end celebration, default paths localised.
5. **Parent Mode** — path editor, pronunciation overrides, constraints, voice-answer toggle (all on Tiko sheets).
6. **Voice answering** — TikoSpeechPractice integration behind the toggle, permission flow.
7. **Polish + release scaffolding** — screenshot scenes, App Store metadata, validate, device run.

## Codex task sequence

Task 1 — Extract Say's voice/celebration/recognition/matcher engine into TikoKit (`TikoVoice`, `TikoCelebrate`, `TikoSpeechPractice`, `TikoWordMatcher`), migrate Say to it, keep every Say test green.

Task 2 — Scaffold `apps/sum/ios` on the harness (`.sum` color/config/i18n key registered), keypad + mode picker + `SumCatalog` with localized number/operator words 0–20 and five default paths, mock voice, unit tests for catalog and speaker.

Task 3 — Wire TikoVoice (per-press speech, prefetch), implement `DistractorGenerator` + answer tiles + play state machine with the retry ladder and celebrations; view-model and generator tests.

Task 4 — Paths end-to-end + `SumPathStore` with per-language overrides and custom paths + Parent Mode editor on the shared Tiko sheets; store tests.

Task 5 — Optional voice answering via TikoSpeechPractice behind a parent toggle with the Say permission flow; add release scaffolding, screenshot scenes, and CI registration.
