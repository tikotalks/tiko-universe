# Tiko Listen: Native iOS MVP Plan

## Status

Planned. Depends on the TikoKit engine extraction from [`sum-ios-mvp.md`](./sum-ios-mvp.md) Phase 0 (`TikoVoice`, `TikoCelebrate`) **plus one extra extraction: the shared word catalogue** (below). Cheapest build in the family — no microphone, no recognizer, no permissions.

## Objective

Ship the hear-and-find loop natively on the standard harness, sharing Say's vocabulary. Spec: [`docs/apps/listen.md`](../apps/listen.md).

## Phase 0b — shared word catalogue

Promote Say's localized default catalogue into TikoKit so Say and Listen (and Sum's numbers) stop duplicating content:

- New TikoKit module `TikoWordCatalog`: categories + default cards (id, category, emoji, media match key, per-language `title` / `speakText` / `listenFor`), the language-normalisation helper, and the media matcher (`SayMediaMatcher` generalised).
- Say's `SayCatalog`/`SayMediaLibrary` become thin wrappers (or direct users) of `TikoWordCatalog`; all Say tests stay green.
- Listen consumes the same catalogue, ignoring `listenFor`.
- Per-app override stores remain per app (Say edits must not change Listen unless the user makes them there — apps stay independent products; only the *defaults* are shared).

## Harness

- `.listen` in `TikoAppColor` + `TikoAppConfig` (suggested `#f59e0b`), registered in `tools/generate-app-configs.mjs`.
- `TikoAppKey.listen` + local bundles (en, nl, fr, es, de, mt).
- XcodeGen project at `apps/listen/ios` mirroring Say (bundle `mt.tiko.listen`, iOS 18.0, config pre-build, unit + UI tests, `validate-local.sh`).
- Release scaffolding day one (release config, store copy, screenshot scenes `home` / `round` / `celebrate` auto-play, CI registration, cloud-signing export options).
- **No mic/speech Info.plist keys** — their absence is a feature; the validator must not require them.

## Repository structure

```text
apps/listen/ios/
├── Project.yml
├── Sources/
│   ├── TikoListenApp.swift
│   ├── ListenAppConfig.swift
│   ├── ListenModels.swift        # ListenCard (no listenFor), CardOverride, Round, SessionState
│   ├── ListenCardStore.swift     # TikoWordCatalog defaults + per-language overrides + custom cards
│   ├── RoundBuilder.swift        # target + same-category distractors, adaptivity
│   ├── ListenSessionViewModel.swift
│   ├── ListenView.swift          # shell + category grid (media thumbnails)
│   ├── RoundView.swift           # 2–4 big cards, replay/next round buttons
│   ├── ListenParentEditor.swift  # Tiko popup sheets (Say editor minus listen-for)
│   ├── Info.plist / entitlements / Assets.xcassets
├── Tests/  (RoundBuilderTests, ListenCardStoreTests, ListenSessionViewModelTests, CatalogTests)
└── UITests/ (launch, open category → cards appear, parent editor opens)
```

## Round building (unit-tested)

```swift
struct Round {
    let target: ListenCard
    let cards: [ListenCard]   // target + distractors, shuffled; 2...4 total
}
```

Rules:

1. Distractors come from the **same category**, never the target, no duplicates.
2. Card count from the adaptivity state (or the parent-pinned count).
3. A session shuffles the category's visible cards; every card is a target exactly once.
4. Deterministic under an injected RNG for tests.

## Adaptivity (invisible, unit-tested)

- Start at 2 cards.
- +1 card after 3 consecutive first-tap successes (max 4).
- −1 card after any round with 2+ misses (min 2).
- Resets per session; parent pin overrides everything.

## Session state machine

```text
presenting → speakingWord → choosing
    → correct → celebrating → next round
    → miss → soft tone, dim card, re-speak → choosing
completed → big celebration → Restart / Choose category
```

Interruption handling as in Say (pause, tap to resume, nothing counted); replay re-speaks the word; next/skip advances.

## Voice, images, celebration

- `TikoVoice` speaks targets; a session prefetch makes the category fully offline.
- Images via the shared media matcher with emoji fallback and disk cache; category tiles use media thumbnails (Say pattern).
- `TikoCelebrate` for correct picks (card dance + variant + chime + pops) and session end; the soft retry tone for misses; Reduce Motion path throughout.

## Parent Mode

Say's editor on the Tiko sheets, minus the listen-for field, plus:

- **Hide titles** toggle per category (pure picture listening; VoiceOver labels remain).
- **Pin card count** (off / 2 / 3 / 4).
- Custom cards with media-library or uploaded images (family photos highlighted in the picker copy).

## Localisation

Defaults come localized from `TikoWordCatalog` (all six categories, en/nl/fr/es/de/mt). UI strings via `TikoI18n` (`listen.*` keys). When Say ships the Letters category it appears in Listen automatically via the shared catalogue.

## Tests

- `RoundBuilderTests` — same-category distractors, uniqueness, counts, every-card-once sessions, determinism.
- Adaptivity tests — grow/shrink/pin rules.
- `ListenCardStoreTests` — override/custom lifecycle per language + account, hidden cards excluded, relaunch persistence, independence from Say's store.
- `ListenSessionViewModelTests` (mock voice) — state machine, miss handling, completion, interruption/resume.
- UI tests — launch, category → round renders 2 cards, parent editor opens.

## Milestones

1. **Catalogue extraction** (Phase 0b) — `TikoWordCatalog` in TikoKit, Say migrated, Say tests green.
2. **Shell + rounds** — harness, category grid, RoundBuilder, mock voice, full loop with celebrations.
3. **Adaptivity + session polish** — invisible difficulty, resume, replay/next buttons.
4. **Parent Mode** — editor on Tiko sheets, hide-titles + pin-count settings, custom cards.
5. **Release scaffolding** — screenshot scenes, store metadata, validate, device run.

## Codex task sequence

Task 1 — Extract the shared word catalogue (`TikoWordCatalog` incl. media matcher + language normalisation) into TikoKit; migrate Say to it with all Say tests green.

Task 2 — Scaffold `apps/listen/ios` on the harness (`.listen` registered), category grid with media thumbnails, `RoundBuilder` + session view model + full loop with TikoVoice/TikoCelebrate; round/adaptivity/view-model tests. No mic keys, no permissions.

Task 3 — `ListenCardStore` (per-language overrides, custom cards) + Parent Mode editor on the shared Tiko sheets with hide-titles and pin-count settings; store tests.

Task 4 — Release scaffolding, screenshot scenes, CI registration, validation, physical-device pass.
