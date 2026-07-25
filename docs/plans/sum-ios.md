# Tiko Sum: Native iOS Production Plan

## Status

Planned.

## Objective

Ship Tiko Sum **to the App Store**: speak every key press, answer by choice (tap or voice), celebrate with the shared engine, gamified formula paths across all four operators — on the standard Tiko harness, in six languages, with the release pipeline from day one. Spec: [`docs/apps/sum.md`](../apps/sum.md). This is a production plan: the exit criterion is a submitted, review-ready App Store release, not a proof of concept.

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
│   ├── SumCatalog.swift           # 12 default paths, NumberSpeller rules, operator vocabulary
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
    case plus, minus, times, dividedBy, equals
}

struct Formula: Codable, Hashable {
    var tokens: [FormulaToken]
    var operands: [Int]      // derived
    var result: Int          // derived; guaranteed 0...100, never negative, division always exact
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

### NumberSpeller (the hard production detail)

Numbers 0–100 must be spoken as correct words in every supported language. This is per-language grammar, implemented as data-driven rules in a `NumberSpeller` component with exhaustive unit tests (0–100 golden lists per language):

| Language | Rule shape | Examples |
| --- | --- | --- |
| en | tens-units | twenty-one, ninety-nine |
| nl | units-"en"-tens (inverted) | eenentwintig, tweeënnegentig (diaeresis rules) |
| de | units-"und"-tens (inverted) | einundzwanzig ("ein", not "eins", in compounds) |
| fr | mixed vigesimal | vingt et un, soixante-dix, quatre-vingts, quatre-vingt-onze |
| es | fused twenties, "y" thirties+ | veintiuno, treinta y uno, cien |
| mt | units-"u"-tens | wieħed u għoxrin, ħamsa u disgħin |

`FormulaSpeaker` renders token sequences to per-language utterances (“drie… plus… vijf… is…”) via `NumberSpeller` + the operator vocabulary; each token spoken on key press, whole formula on equals. All utterances prefetched per session through `TikoVoice` so the keypad is offline-capable.

### Input

Voice answering ships at launch (opt-in, per the spec): `TikoSpeechPractice` listens after the tiles appear; `listenFor` = the correct value's digits + the `NumberSpeller` word in the active language. Permission flow, availability fallback, and privacy rules identical to Say. Tap always works in parallel.

## Distractor rules (unit-tested)

1. Candidates: correct ±1, ±2, ±10, digit-swap, first operand, second operand.
2. Filter: ≥ 0, ≤ max range, ≠ correct, unique.
3. Pick two, seeded per formula for deterministic tests; if fewer than two survive, widen with ±3, ±4.

## Localisation

Operator vocabulary and the `NumberSpeller` rules for en, nl, fr, es, de, mt live in `SumCatalog` (data plus per-language rule tables, not code branches). Parent-editable pronunciation overrides per language follow the Say override pattern. UI strings via `TikoI18n` (`sum.*` keys). Twelve default paths localised (titles + emoji) per language.

## Tests (production bar)

- `NumberSpellerTests` — golden lists 0–100 for **all six languages**, including the inversion, diaeresis, "ein/eins", vigesimal, and conjunction rules.
- `DistractorGeneratorTests` — rules, bounds, uniqueness, determinism, ×/÷ candidates, exact-division guarantee.
- `FormulaSpeakerTests` — token → utterance per language, multi-digit composition, all four operators, equals phrasing.
- `SumPathStoreTests` — defaults per language, overrides scoped per language/account, hide/reset/custom lifecycle, relaunch persistence.
- `SumPlayViewModelTests` (mock voice + recognizer) — full state machine, retry ladder incl. tile fading and guided second retry, path completion, skip, interruption/resume, voice-answer accept/ignore/denied/unavailable paths.
- UI tests: launch, keypad → tiles, path plays, parent editor via header pencil, settings toggles.
- Release validation (`validate-local.sh`) and both CI workflows green.

## Milestones

1. **Engine extraction** (Phase 0) — TikoKit modules, Say migrated, all Say tests green.
2. **NumberSpeller** — all six languages with golden-list tests; this unblocks everything spoken.
3. **Speaking keypad + tiles** — harness shell, TikoVoice per-press speech, all four operators, equals → distractor tiles, celebrations, full retry ladder.
4. **Paths** — twelve localised default paths, session flow, end celebration, interruption/resume.
5. **Parent Mode** — path editor, pronunciation overrides, free-play constraints, voice-answer toggle (all on Tiko sheets), defaults resettable.
6. **Voice answering** — TikoSpeechPractice behind the toggle with the complete permission/denial/unavailable flows, tested in all six languages.
7. **Accessibility + polish pass** — VoiceOver audit, Dynamic Type on parent surfaces, Reduce Motion, dark mode, iPad layouts, empty/edge states.
8. **Release** — icon (media-library asset via the shared generator), screenshot scenes (`home`, `practice`, `celebrate` auto-play), App Store metadata + reviewer notes, privacy labels (User ID/Email only if identity used — mirror Say), age rating, pricing, archive via cloud signing, upload, **submit for review with automatic release** using the pipeline established for Say.
9. **Device validation** — physical iPhone + iPad, real voice-answer sessions, offline run-through.

## Codex task sequence

Task 1 — Extract Say's voice/celebration/recognition/matcher engine into TikoKit (`TikoVoice`, `TikoCelebrate`, `TikoSpeechPractice`, `TikoWordMatcher`), migrate Say to it, keep every Say test green.

Task 2 — Implement `NumberSpeller` for en/nl/fr/es/de/mt with golden-list tests 0–100, plus the operator vocabulary and `FormulaSpeaker`.

Task 3 — Scaffold `apps/sum/ios` on the harness (`.sum` color/config/i18n registered), keypad with all four operators + mode picker, TikoVoice per-press speech with prefetch, `DistractorGenerator` + answer tiles + play state machine with retry ladder and celebrations; generator and view-model tests.

Task 4 — Paths end-to-end (twelve localised defaults) + `SumPathStore` overrides/custom + Parent Mode editor, pronunciation overrides, and constraints on the shared Tiko sheets; store tests.

Task 5 — Voice answering via TikoSpeechPractice behind the parent toggle with the full Say permission flow, tested per language.

Task 6 — Accessibility/polish pass, release scaffolding (icon, screenshot scenes, metadata, reviewer notes, privacy, CI registration), archive + upload + submit for review per the Say release runbook.
