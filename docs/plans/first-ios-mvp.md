# Tiko First: Native iOS MVP Plan

## Status

Planned. Depends on the TikoKit engine extraction defined in [`sum-ios-mvp.md`](./sum-ios-mvp.md) Phase 0 (`TikoVoice`, `TikoCelebrate`) — build after or alongside Sum.

## Objective

Ship the visual-routine loop natively: ordered picture steps, spoken, crossed off strictly in order, celebrated, fully parent-editable. Spec: [`docs/apps/first.md`](../apps/first.md).

First is the simplest app in the family: **no microphone, no recognizer, no permissions at all.** It is voice-out + tap only.

## Harness

- `.first` in `TikoAppColor` + `TikoAppConfig` (suggested `#06b6d4`), registered in `tools/generate-app-configs.mjs`.
- `TikoAppKey.first` + local translation bundles (en, nl, fr, es, de, mt).
- XcodeGen project at `apps/first/ios` mirroring Say (bundle `mt.tiko.first`, iOS 18.0, config pre-build, unit + UI tests, `validate-local.sh`).
- Release scaffolding day one (release config, App Store copy, screenshot scenes `home` / `routine` / `celebrate` auto-play, CI registration, cloud-signing export options).

## Repository structure

```text
apps/first/ios/
├── Project.yml
├── Sources/
│   ├── TikoFirstApp.swift
│   ├── FirstAppConfig.swift
│   ├── FirstModels.swift          # Routine, RoutineStep, RoutineOverride, RoutineProgress
│   ├── FirstCatalog.swift         # 5 default routines, localized step content (en/nl/fr/es/de/mt)
│   ├── FirstStore.swift           # defaults + per-language overrides + custom routines (Say store pattern)
│   ├── FirstProgressStore.swift   # per-routine tick state, daily reset, resume
│   ├── RoutineViewModel.swift     # order enforcement, speak-on-advance, celebrations
│   ├── FirstView.swift            # shell + routine grid
│   ├── RoutineView.swift          # big current step, progress strip, done button
│   ├── FirstParentEditor.swift    # Tiko popup sheets: routines, steps, settings
│   ├── Info.plist / entitlements / Assets.xcassets
├── Tests/  (FirstCatalogTests, FirstStoreTests, FirstProgressTests, RoutineViewModelTests)
└── UITests/ (launch, open routine, tick a step, parent editor opens)
```

## Models

```swift
struct RoutineStep: Identifiable, Codable, Hashable {
    let id: String
    var title: String
    var speakText: String        // defaults to title
    var emoji: String
    var imageURL: URL?
    var sortOrder: Int
}

struct Routine: Identifiable, Codable, Hashable {
    let id: String
    var title: String
    var emoji: String
    var imageURL: URL?
    var steps: [RoutineStep]
    var dailyReset: Bool         // Morning/Bedtime default true
    var allowSkip: Bool          // default false
    var isPinned: Bool           // "current" routine, opens directly
    let isCustom: Bool
    var isHidden: Bool
    var sortOrder: Int
}

struct RoutineProgress: Codable {
    let routineID: String
    var completedStepIDs: [String]   // ordered
    var lastUpdated: Date            // drives daily reset
}
```

`FirstStore` follows the Say override pattern exactly: bundled defaults resolved per language, overrides keyed by routine/step ID + language, custom routines per account, hide/reset/reorder, UserDefaults per subject, media images resolved per the Say matcher (routines media category) and persisted.

`FirstProgressStore` is separate from content: ticks per routine per account, `dailyReset` clears progress when `lastUpdated` is before today (local calendar), manual reset API for Parent Mode.

## Routine state machine

```text
idle → presenting(step) → (speak step via TikoVoice) → waiting
waiting --done tap on current--> ticking (small celebration) → presenting(next) …
waiting --tap future step--> preview (speak it, no state change)
waiting --replay--> speak current again
presenting(last done) → completed → big celebration → Done / Again (resets if not dailyReset-managed)
```

Rules (unit-tested):

- Only the current step can be completed; completing out of order is impossible by construction.
- Skip (when the routine allows it) marks the step skipped-not-ticked and advances; skipped steps render distinctly but count toward completion.
- Backgrounding persists progress instantly; reopening resumes at the current step and re-speaks it.
- Un-ticking: tapping the most recent ticked step un-does it (kids change their minds; parents asked for it in Cards). Only the last tick is undoable.

## Voice + celebration

- `TikoVoice` speaks each step as it becomes current, prefetches the whole routine's speak texts at open (offline after first run).
- Step tick → small celebration (single chime + tick morph animation); routine complete → the full randomized celebration with the routine's emoji raining.
- Reduce Motion path throughout via `TikoCelebrate`.

## Localisation

Default routines/steps localized in `FirstCatalog` for en, nl, fr, es, de, mt (data, not code). UI strings via `TikoI18n` (`first.*` keys). Custom content is per language, same rules as Say.

## Tests

- `FirstCatalogTests` — 5 routines, unique IDs, complete content per language, sensible step counts.
- `FirstStoreTests` — override/custom/hide/reset lifecycle, per-language + per-account scoping, relaunch persistence.
- `FirstProgressTests` — in-order enforcement, undo-last, skip semantics, resume, daily reset across a simulated date boundary, manual reset.
- `RoutineViewModelTests` (mock voice) — speak-on-advance, preview, completion celebration trigger, background/resume.
- UI tests — launch shows routines; open Morning, tick first step, progress strip updates; parent editor opens from the header pencil.

## Milestones

1. **Shell + catalog** — harness, routine grid, localized defaults, mock voice.
2. **Routine loop** — big-step view, in-order ticking, progress strip, undo-last, resume; celebrations wired.
3. **Progress rules** — daily reset, pinned routine direct-open, allow-skip.
4. **Parent Mode** — full editor on Tiko sheets (routines, steps, images via media picker, settings), defaults resettable per language.
5. **Polish + release scaffolding** — screenshot scenes, store metadata, validate, device run.

## Codex task sequence

Task 1 — Scaffold `apps/first/ios` on the harness (`.first` registered), routine grid + `FirstCatalog` with five localized default routines, mock voice, catalog tests.

Task 2 — Routine loop: current-step view, strict in-order ticking with undo-last, progress strip, resume, TikoVoice speak-on-advance + prefetch, TikoCelebrate step/finish celebrations; progress + view-model tests.

Task 3 — `FirstStore` overrides/custom routines per language and account + Parent Mode editor on the shared Tiko sheets incl. media picker, per-routine settings (daily reset, allow skip, pin); store tests.

Task 4 — Release scaffolding, screenshot scenes, CI registration, validation, physical-device pass.
