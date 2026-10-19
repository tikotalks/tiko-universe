# Tiko Flags

## Job

A focused, visual, fully offline flag-learning app for children. The app teaches
which national flag belongs to which country through simple recognition,
matching, speech and repetition.

Working product name: **Tiko Flags**. Repository/app ID: `flags`.

The app should be immediately understandable, calm and low-pressure. It is not a
trivia app and should not mix in capitals, landmarks or map questions. Its job is
simple: **learn the flags of the world**.

## Core product statement

**See a flag. Hear the country. Find it again.**

Tiko Flags should support children who read fluently, children who are learning
to read, and children who primarily understand through images and spoken words.

## Product principles

- One narrow learning goal: national flags and country recognition.
- Fully useful offline after install.
- Visual-first and speech-friendly; reading is optional.
- No accounts, ads, subscriptions, coins, streaks, lives or timers.
- No punishment for wrong answers.
- Large targets and very little UI around the actual flag task.
- Repetition should feel predictable, not competitive.
- Country names, flags and IDs come from the shared Tiko geography dataset.
- The app should work well for short sessions without requiring progress setup.
- Parent Mode can reduce or increase complexity without changing the core game.

## Main modes

The first release has three child-facing modes:

1. **Learn**
2. **Flag -> Country**
3. **Country -> Flag**

These are different views of the same country dataset, not independent content
systems.

## Learn mode

Learn is free exploration with no correct/incorrect state.

The child sees a clean grid or carousel of large national flags. The initial view
can be filtered by a country set such as First Flags, Europe, Africa or World.

Tapping a flag opens a simple focus view and speaks the localized country name.

Example:

```text
[large Malta flag]
Malta
🔊 "Malta"
Europe
```

The child can:

- tap flags repeatedly;
- hear the name again;
- move to previous/next country;
- return to the flag grid;
- optionally see a tiny country-shape/globe locator if shared geography support
  is ready, without turning Learn into a map lesson.

Learn mode should be useful even if the child never enters a quiz mode.

## Flag -> Country mode

A large flag is the primary stimulus. Under it are large country choices.

Example:

```text
[large Malta flag]

Malta
Italy
Poland
```

The number of choices is configurable: 2, 3 or 4.

### Correct selection

When the child selects the correct country:

- speak the country name;
- use a short positive visual response;
- optionally keep the solved pair visible briefly;
- continue to the next item automatically or via a large Next action depending
  on Parent Mode.

No points, streak counter or leaderboard is required.

### Incorrect selection

A wrong selection should not trigger a harsh red screen, buzzer, loss of life or
restart.

Instead:

- give a small neutral visual response;
- leave the question available;
- allow another selection immediately;
- optionally reduce emphasis on the attempted wrong choice;
- never block progress because of repeated mistakes.

The goal is recognition through repetition, not measuring failure.

## Country -> Flag mode

The app presents a localized country name and speaks it, then shows 2–4 large
flags.

Example:

```text
Malta
🔊 "Find Malta"

[🇲🇹] [🇮🇹] [🇵🇱]
```

This direction is essential for children who can associate a spoken country name
with a visual flag even when they do not read the text independently.

The prompt should support two speech styles:

- country name only: "Malta";
- instruction + name where localized well: "Find Malta."

Speech can replay at any time.

Correct/incorrect behavior follows the same calm rules as Flag -> Country.

## Country sets and progression

Do not begin with the entire world as one undifferentiated pool.

Recommended built-in sets:

### First Flags

A small starter pack chosen for visual distinctiveness and broad familiarity.
The exact set should be editorially reviewed rather than hard-coded into game
logic.

### Continents/regions

- Europe
- Africa
- Asia
- North America
- South America
- Oceania
- World

Depending on the canonical country taxonomy, subregions can be added later.

### Custom practice set

Parent Mode can select a small set of specific countries for repeated practice.
This is useful for families, classrooms and therapy contexts where a child may
need a personally relevant group rather than an entire continent.

The custom-set model should simply reference canonical country IDs.

## Difficulty and distractor quality

Random distractors are not enough. The game should understand when flags are
visually similar so difficulty can be controlled deliberately.

Examples of similarity dimensions:

- same stripe orientation;
- same color palette;
- same number/order of stripes;
- crosses;
- tricolors;
- stars/crescents;
- near-identical flags;
- flags with shared historical design families.

Conceptual examples:

Easy contrast:

```text
Japan / Canada / Brazil / United Kingdom
```

Harder contrast:

```text
Netherlands / Luxembourg / Croatia / Serbia
```

Very similar pairs/groups may include cases such as Indonesia/Monaco or
Romania/Chad, depending on the current canonical flag assets.

Difficulty must not be inferred only from country popularity. It should account
for actual visual similarity.

## Distractor algorithm

Each country can have a computed or editorial similarity profile. Question
generation chooses distractors based on current difficulty.

Suggested levels:

- **Easy**: strongly visually distinct alternatives;
- **Normal**: mixed alternatives with some shared features;
- **Hard**: deliberately similar flags/country choices.

For very young or motor-challenged users, 2-choice mode can remain available at
any difficulty level.

The same seed/session state should produce deterministic questions for tests.

## Flag assets

Flags must be bundled locally as high-quality vector assets wherever practical.

Requirements:

- preserve official/current proportions and design details;
- do not redraw flags approximately for stylistic consistency;
- maintain canonical country ID -> flag asset mapping;
- render cleanly at small and large sizes;
- provide accessible country-name labels rather than trying to describe every
  flag visually as the primary accessible name;
- record source/version/update date in the geography-data pipeline.

Tiko UI can frame flags in a consistent card shape, but should not crop or alter
the actual flag design.

## Shared geography data

Tiko Flags should consume the same canonical country records as Globe, Map and
Map Puzzle.

Conceptually:

```json
{
  "id": "MLT",
  "iso2": "MT",
  "iso3": "MLT",
  "nameKey": "country.MLT.name",
  "continent": "EU",
  "flagAsset": "flags/MT.svg",
  "capitalId": "capital.valletta",
  "geometryId": "country.MLT",
  "schemaVersion": 1
}
```

Flags initially needs only country IDs, localized names, region grouping and flag
assets, but it must not invent a parallel data model that later needs merging.

## Similarity metadata

Flag-specific metadata can sit next to canonical geography without polluting the
base country model.

Example:

```json
{
  "countryId": "NLD",
  "features": {
    "layout": "horizontal-tricolor",
    "colors": ["red", "white", "blue"],
    "symbolCount": 0
  },
  "similarCountryIds": ["LUX", "HRV", "RUS"],
  "schemaVersion": 1
}
```

The exact schema can evolve. The requirement is that distractor quality is data-
driven and testable.

## Speech and localization

Every country name uses Tiko localization keys.

Speech is core to the app:

- Learn tap -> speak country name;
- Flag -> Country correct answer -> speak country name;
- Country -> Flag question -> speak prompt/name;
- visible speaker action repeats the name/prompt;
- core supported-language speech should work offline;
- curated bundled pronunciation can override poor on-device TTS for country
  names where needed.

Do not store English country names as game IDs.

## Visual direction

The flag itself must dominate the screen.

Recommended principles:

- large flag area;
- generous whitespace;
- very large answer buttons/cards;
- minimal decorative chrome;
- strong selected/focus state;
- avoid tiny labels and dense country lists during gameplay;
- subtle positive motion, never casino-style effects;
- no red/green-only correctness communication;
- TikoKit typography, spacing, Parent Mode and accessibility conventions.

## Accessibility

Required for v1:

- VoiceOver labels use localized country names;
- answer choices are large native-accessible controls;
- minimum practical touch target >= 44x44 pt;
- support 2-choice mode;
- spoken prompts/names can be repeated indefinitely;
- no timed questions;
- no lives or failure lockouts;
- correctness is not communicated only by color;
- reduced-motion path;
- Dynamic Type for country-name options;
- Switch Control and external pointer/keyboard basics;
- flag imagery has meaningful accessible association with its country record.

## Parent Mode

Settings should remain small and practical:

- active country set/continent;
- custom practice countries;
- number of choices: 2 / 3 / 4;
- enabled game directions: Flag -> Country / Country -> Flag;
- difficulty: Easy / Normal / Hard;
- spoken prompts on/off;
- auto-continue on/off;
- sound effects on/off;
- reset local learning history.

No Parent Mode setup should be needed for first use.

## Local learning state

The app can adapt repetition locally without creating an account.

Store lightweight device-local statistics such as:

- times shown;
- correct selections;
- incorrect selections;
- last practiced timestamp;
- current familiarity bucket.

This can bias future questions toward flags that need more repetition while still
mixing in known flags.

Do not present this as a competitive score to the child. Parent Mode may later
show a calm overview such as "practicing" / "recognized often" if useful.

Cloud sync is not required for v1.

## Offline architecture

```text
SwiftUI iOS app
  TikoKit / Parent Mode / accessibility
  LearnView / QuizView
       |
       v
FlagsCore / GeographyCore KMP
  canonical countries
  localized country keys
  country sets
  flag similarity metadata
  question generator
  local learning-state rules
  validation
       |
       +--> bundled flag vectors
       +--> bundled geography dataset
       +--> on-device speech / curated pronunciations
```

No runtime API is needed for normal play.

## Privacy

- No account required.
- No location permission.
- No advertising/tracking SDK.
- No child-generated public content.
- Learning history remains local in v1.
- No external web links in Child Mode.
- Analytics, if later added, must follow Tiko child/privacy doctrine and should
  avoid building unnecessary individual learning profiles.

## Canonical country scope

The launch list must be defined centrally and documented. Do not let each app
independently decide what constitutes a country.

The geography dataset should explicitly handle:

- sovereign-state inclusion policy;
- dependent territories if/when included;
- disputed recognition cases;
- flag version/date;
- localized country naming rules.

Flags should render the result of that shared policy rather than embedding
political assumptions in gameplay code.

## MVP

Include:

- bundled canonical flag set;
- Learn mode;
- Flag -> Country mode;
- Country -> Flag mode;
- 2/3/4 choice layouts;
- First Flags + continent/world sets;
- visual-similarity-aware distractors;
- Easy/Normal/Hard difficulty;
- localized country names;
- offline speech path;
- calm retry behavior;
- Parent Mode settings;
- local learning/repetition state;
- TikoKit/accessibility integration;
- shared GeographyCore country IDs/data.

Exclude from v1:

- capitals quizzes;
- landmarks;
- country-location/map questions;
- flag drawing/building;
- historical flags;
- regional/state/province flags;
- multiplayer;
- leaderboards;
- scores/streaks/lives;
- online-required content;
- accounts/cloud sync.

## Later ideas

Only after the recognition product is strong:

### Flag builder

Let the child assemble a flag from simple shapes/colors while preserving the
actual design. This is a separate learning interaction, not required for MVP.

### Map connection

A solved/learned country could optionally expose a small "show me" action that
opens/focuses the same country in Tiko Globe or a future Tiko Map app, provided
cross-app navigation remains simple and child-safe.

### Additional flag packs

Regional, state/province, territory or historical packs can be considered later
as separately curated datasets. They should never dilute the core national-flag
experience by default.

## Implementation order

1. Canonical GeographyCore country/flag record and flag asset pipeline.
2. Flag rendering component with aspect-ratio and accessibility tests.
3. Learn mode with tap-to-speak.
4. Basic Flag -> Country with 2 choices and deterministic question generation.
5. Country -> Flag with spoken prompt.
6. 3/4 choice layouts and responsive iPad/iPhone UI.
7. Similarity metadata extraction/editorial overrides.
8. Difficulty-aware distractor algorithm.
9. First Flags/continent/world sets and Parent Mode custom set.
10. Local familiarity/repetition model.
11. Localization/pronunciation QA.
12. Accessibility/device/offline QA.

## Testing strategy

### Data tests

- every included country has a unique canonical ID;
- every country has an available flag asset;
- flag assets parse/render correctly;
- country-set membership is valid;
- localization keys exist;
- similarity references point to valid countries;
- no duplicate answer choices in generated questions;
- correct answer always belongs to the active set.

### Question-generation tests

- 2/3/4 choice counts;
- deterministic seeded output;
- Easy distractors are sufficiently distinct;
- Hard mode prefers configured similar flags;
- custom-set questions never leak countries outside the set;
- very small sets degrade gracefully instead of producing duplicates.

### Device/accessibility tests

- airplane mode from first launch;
- VoiceOver order/labels;
- repeated speech;
- 2-choice large targets;
- Dynamic Type;
- reduced motion;
- iPad portrait/landscape;
- iPhone compact layouts;
- repeated wrong selections do not lock the question or create harsh feedback.

## Definition of done

- The app launches into useful flag content with no login.
- All launch flags and localized country names are available offline.
- A child can freely browse flags and hear each country's name.
- A child can play both Flag -> Country and Country -> Flag.
- 2, 3 and 4 choice modes remain accessible and readable.
- Wrong answers never cause lives, timers, lockouts or punitive feedback.
- Question distractors become meaningfully harder through visual similarity
  rather than arbitrary randomness.
- Country IDs, names and flags come from the same canonical geography dataset
  used by Globe and future Map apps.
- Core speech works without a required cloud request.
- The app remains tightly focused on flags rather than becoming a general
  geography trivia app.
