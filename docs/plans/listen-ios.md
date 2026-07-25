# Tiko Listen: Native iOS Production Plan

## Status

Planned. Depends on the TikoKit engine extraction from [`sum-ios.md`](./sum-ios.md) Phase 0 (`TikoVoice`, `TikoCelebrate`) **plus one extra extraction: the shared word catalogue** (below). Cheapest build in the family — no microphone, no recognizer, no permissions.

## Objective

Ship Tiko Listen **to the App Store**: the hear-and-find loop on the standard harness, sharing Say's vocabulary, all seven categories (incl. Letters) in six languages, release pipeline from day one. Spec: [`docs/apps/listen.md`](../apps/listen.md). The exit criterion is a submitted, review-ready App Store release. The Say Letters follow-up ([`say-ios-mvp.md`](./say-ios-mvp.md) “Follow-up: Letters category”) is part of this launch train, landing in the shared catalogue.

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
2. **Letters in the catalogue** — execute the Say Letters follow-up (26+ localised letter cards, Maltese extras, homophone listen-for for Say's benefit); both apps gain the category.
3. **Shell + rounds** — harness, category grid, RoundBuilder, mock voice, full loop with celebrations.
4. **Adaptivity + session polish** — invisible difficulty, resume, replay/next buttons.
5. **Parent Mode** — editor on Tiko sheets, hide-titles + pin-count settings, custom cards incl. photo upload.
6. **Accessibility + polish pass** — VoiceOver audit (hide-titles keeps labels), Dynamic Type, Reduce Motion, dark mode, iPad layouts.
7. **Release** — icon, screenshot scenes (`home`, `round`, `celebrate` auto-play), App Store metadata + reviewer notes, privacy labels, age rating, pricing, archive/upload/**submit for review with automatic release** via the Say pipeline.
8. **Device validation** — physical iPhone + iPad.

## Codex task sequence

Task 1 — Extract the shared word catalogue (`TikoWordCatalog` incl. media matcher + language normalisation) into TikoKit; migrate Say to it with all Say tests green.

Task 2 — Add the Letters category to the shared catalogue per the Say plan's Letters follow-up (localised letter cards + Maltese extras + homophone listen-for), updating Say's catalog tests.

Task 3 — Scaffold `apps/listen/ios` on the harness (`.listen` registered), category grid with media thumbnails, `RoundBuilder` + session view model + full loop with TikoVoice/TikoCelebrate; round/adaptivity/view-model tests. No mic keys, no permissions.

Task 4 — `ListenCardStore` (per-language overrides, custom cards incl. photo upload) + Parent Mode editor on the shared Tiko sheets with hide-titles and pin-count settings; store tests.

Task 5 — Accessibility/polish pass, release scaffolding (icon, screenshot scenes, metadata, reviewer notes, privacy, CI registration), archive + upload + submit for review per the Say release runbook, physical-device validation.
