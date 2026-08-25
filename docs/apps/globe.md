# Tiko Globe

## Job

A calm, playful, fully offline Earth explorer for children. The child gets a
real round 3D Earth that can be spun in any direction, zoomed from the whole
planet down toward individual countries, and tapped to hear and discover what
is there.

Working product name: **Tiko Globe**. Repository/app ID: `globe`.

The app should feel closer to **Google Earth for kids** than a conventional map,
but without roads, businesses, navigation, reviews, traffic, ads, satellite
clutter or dense labels. The Earth itself is the interface.

## Core product statement

**Spin the Earth. Zoom anywhere. Tap something. Hear what it is.**

A child should be able to understand the primary interaction without reading an
instruction screen.

## Product principles

- The globe is always a true round sphere; never a flat map disguised as a globe.
- Exploration before testing: Globe is discovery, not a quiz.
- Fully useful offline after install.
- iPad-first and touch-first, with iPhone support.
- No account, login, ads, subscriptions, streaks, coins or reward economy.
- Visual-first and speech-first; reading is optional.
- Large, forgiving touch targets and predictable gestures.
- Keep the Earth intentionally sparse and understandable.
- **Countries, Capitals, Animals and Landmarks are first-class exploration modes.**
- Tapping content should teach by naming it, not by asking the child to answer.
- Child Mode never opens a browser or external map provider.
- The same canonical geography dataset should later power Tiko Flags, Map and
  Map Puzzle.

## Core experience

The app opens directly on a complete round Earth floating in the main view.
There is no onboarding carousel and no map-provider chrome.

The child can:

- drag with one finger to spin Earth freely;
- pinch to zoom in and out;
- zoom all the way back out until the complete globe is visible;
- tap a country in Countries mode;
- tap a capital, animal or landmark in its corresponding mode;
- hear the selected country's/item's localized name;
- tap the speaker again to repeat it;
- use a simple Earth/Home action to return to the full-globe view.

Rotation, zooming, country selection, content selection and speech must work in
airplane mode from first launch.

## Exploration modes

A simple child-facing mode switch changes what the globe emphasizes. Only one
primary mode needs to be active at a time so the Earth never becomes cluttered.

Initial modes:

1. **Countries**
2. **Capitals**
3. **Animals**
4. **Landmarks**

The selector should use a large icon plus localized label. Changing mode does not
reset the current globe position or zoom level.

Possible later modes include Nature, Oceans, Dinosaurs/Fossils, Food, Culture,
Transport and Space. The content architecture should support these without
requiring a new renderer.

## Countries mode

Countries mode is the geographic foundation of Globe.

The globe shows:

- continents and coastlines;
- country boundaries;
- progressive country labels where they remain readable;
- no unrelated animal/landmark marker clutter.

### Country interaction

When the child taps a country:

1. the country becomes visually emphasized;
2. the app immediately speaks the localized country name;
3. the country name and flag appear in a simple card/label;
4. a speaker button lets the child hear the name again;
5. optional secondary information can show the capital and continent without
   overwhelming the primary name.

Example:

```text
[Malta shape highlighted]
🇲🇹 Malta
🔊 "Malta"
Capital: Valletta
Europe
```

The first tap should teach **"this shape/place is Malta"**. It should not open a
quiz or require a second action before speech.

Small countries and islands need forgiving hit targets. Where geographic area is
too small to tap reliably, the renderer may use an invisible enlarged hit region
or a nearby accessible label while preserving the correct visible geography.

## Capitals mode

Capitals mode highlights national capitals rather than generic cities.

At full-Earth scale only a carefully selected subset is shown. More capitals
appear as the child zooms toward a region so labels never turn into a dense cloud.

Tapping a capital should speak the city name immediately and show:

- capital name;
- country name;
- flag;
- large Tiko illustration/photo where available;
- repeat-speech action;
- one short optional fact.

Example:

```text
Valletta
Malta 🇲🇹
🔊 "Valletta"
"Valletta is the capital of Malta."
```

The launch dataset should cover the national capitals in the canonical Tiko
country list.

## Animals mode

Animals mode turns Earth into a visual animal-discovery surface.

Animals are not presented as if one exact coordinate were their entire habitat.
Each entry can have broad habitat regions plus representative discovery markers.
The UI must distinguish a friendly exploration marker from a scientific range
map.

Initial content should have broad world representation, for example:

- African elephant;
- lion;
- giraffe;
- zebra;
- polar bear;
- brown bear;
- giant panda;
- tiger;
- red kangaroo;
- koala;
- emperor penguin;
- llama;
- jaguar;
- bison;
- camel;
- gorilla;
- orangutan;
- whale;
- dolphin;
- sea turtle.

Tapping an animal speaks its name and opens a visual card with:

- common name;
- large Tiko illustration;
- broad place/region description;
- one short child-friendly fact;
- repeat-speech action;
- optional accurately sourced/licensed animal sound.

Avoid false precision. Prefer wording such as "Lives in parts of eastern and
southern Africa" over implying that the animal lives at one pin.

## Landmarks mode

Landmarks connect abstract geography to recognizable real-world places.

The first pack should deliberately represent different continents and cultures.
Candidate examples include:

- Eiffel Tower;
- Colosseum;
- Great Pyramid of Giza;
- Great Wall of China;
- Taj Mahal;
- Sydney Opera House;
- Statue of Liberty;
- Golden Gate Bridge;
- Christ the Redeemer;
- Machu Picchu;
- Petra;
- Burj Khalifa;
- Sagrada Família;
- Moai of Rapa Nui;
- Mount Fuji;
- landmark content around Valletta / Grand Harbour.

Tapping a landmark speaks its name and shows:

- landmark name;
- country;
- image/illustration;
- one short fact;
- repeat-speech action.

Only bundle imagery that Tiko owns, commissions, generates or can legally
redistribute. Do not scrape map/search-provider photography.

## Interaction model

### Spin

One-finger drag rotates the sphere directly. The child should feel as if they are
holding and turning Earth.

- Rotation works horizontally, vertically and diagonally.
- Light momentum is allowed.
- Momentum stops quickly and predictably.
- The globe must never enter an uncontrolled long spin.
- Reduced Motion removes or strongly reduces momentum.

### Zoom

Pinch zoom changes the camera distance from the globe.

Conceptual scales:

- **Earth** — the complete round planet is visible;
- **Region** — continents and groups of countries dominate;
- **Country** — country shape, labels and nearby mode content are easier to
  inspect.

The child must always be able to zoom back out to a visibly round complete Earth.
There is no street-level zoom. A maximum zoom keeps the product focused and
avoids implying street-map precision.

### Select

Selection depends on mode:

- Countries: tap country surface -> highlight + speak country name.
- Capitals: tap capital marker -> speak capital name + card.
- Animals: tap animal marker -> speak animal name + card.
- Landmarks: tap landmark marker -> speak landmark name + card.

Selection stays visible until another item is selected or the child dismisses it.
The app must not require hover, long press or tiny targets.

### Mode switching

The current camera position is preserved when changing mode. If the child is
looking at Japan in Countries mode and switches to Animals, the globe remains on
Japan and reveals the appropriate nearby animal content.

This makes modes feel like different ways of looking at the same Earth rather
than separate screens.

### Search/list alternative

Free exploration is primary, but the 3D globe cannot be the only route to
content. An accessible ordered list should expose countries and currently
available mode content. Selecting an item from the list moves/focuses the globe
on it.

## Visual direction

The globe should be unmistakably Tiko rather than a GIS product.

Recommended treatment:

- clearly spherical Earth with gentle atmosphere/depth;
- soft ocean color;
- simple land colors;
- subtle country boundaries;
- selected country gets a strong but friendly highlight;
- minimal or no terrain texture in v1;
- no roads;
- no businesses/commercial POIs;
- no satellite imagery;
- no tiny labels;
- large illustrated animal/landmark markers;
- marker icons remain recognizable without color alone;
- dark-mode compatible without turning Earth into an unreadable black map.

## Offline architecture

Tiko Globe is local-first and has no runtime map dependency.

```text
SwiftUI iOS app
  TikoKit / Parent Mode / accessibility
  GlobeView + ModeSelector
       |
       v
Native iOS globe renderer
  RealityKit/Metal-backed sphere
  camera + rotation + zoom
  country polygon hit testing
  marker billboards / overlays
       |
       v
GlobeCore / GeographyCore KMP
  canonical countries
  capitals
  content models
  mode/filter logic
  coordinates
  marker density rules
  localization keys
  content validation
       |
       +--> bundled Natural Earth derived geography
       +--> bundled Tiko content database
       +--> bundled flags/images/audio
```

The rendering implementation is platform-native. Shared country/content rules
belong in KMP so later Tiko geography apps and an Android client can reuse them.

### Why not MapLibre Native for the globe

MapLibre Native is useful for conventional vector maps and local map data, but
native globe projection is not currently a production dependency Tiko should
rely on. Globe therefore uses a purpose-built native spherical renderer.

A future flat Tiko Map app can independently evaluate MapLibre Native.

See `docs/adrs/2026-08-24-globe-renderer-and-offline-data.md`.

## Geographic data

Use **Natural Earth** as the primary v1 base geography. It provides appropriately
scaled public-domain geography for world/region exploration.

Needed subsets:

- land/ocean geometry;
- admin-0 country polygons/boundaries;
- national capitals;
- major lakes if useful;
- continent/region metadata.

A build-time pipeline should simplify and transform source geography into
versioned runtime assets. Raw GIS data should not be parsed on every launch.

OpenStreetMap is not required for v1 because roads, buildings and street-level
POIs provide no product value here.

## Shared geography model

Globe, Flags, Map and Map Puzzle should eventually use one canonical country
record rather than maintaining incompatible copies.

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
  "labelPoint": { "lat": 35.8997, "lon": 14.5146 },
  "schemaVersion": 1
}
```

Globe-specific animal/landmark records reference these stable country IDs.

Example content record:

```json
{
  "id": "animal.african-elephant",
  "type": "animal",
  "titleKey": "globe.animal.africanElephant.title",
  "factKey": "globe.animal.africanElephant.fact1",
  "image": "animals/african-elephant.webp",
  "markers": [
    { "lat": -2.1, "lon": 34.7, "region": "east-africa" },
    { "lat": -19.0, "lon": 24.5, "region": "southern-africa" }
  ],
  "countries": ["KEN", "TZA", "BWA", "ZAF"],
  "priority": 80,
  "schemaVersion": 1
}
```

## Marker density

Capitals, Animals and Landmarks must never render every marker simultaneously.
Each entry has a minimum scale, priority and category. A deterministic collision
system chooses a readable subset for the current zoom and viewport.

Suggested tuning targets:

- Earth scale: roughly 8–20 markers;
- region scale: roughly 15–35 markers;
- country scale: roughly 10–30 markers depending on screen size.

Countries mode uses progressive labels rather than POI marker density.

## Localization and speech

All UI, country names and content use Tiko localization keys.

Speech is a core interaction, not decorative accessibility metadata.

- Country taps speak the localized country name by default.
- Capital/animal/landmark taps speak their localized names by default.
- A visible speaker action repeats the name.
- Prefer high-quality on-device speech where available.
- Curated bundled pronunciation can override poor system pronunciation.
- Core supported-language speech must not require a cloud request.
- Facts can be spoken optionally but names remain the primary audio response.

## Accessibility

Required for v1:

- VoiceOver labels for every control and selectable item;
- effective touch targets of at least 44x44 pt for controls;
- forgiving country hit testing;
- reduced-motion mode;
- no information conveyed only by color;
- repeatable speech without penalties;
- Dynamic Type for cards and controls;
- accessible ordered list as an alternative to precise globe manipulation;
- Switch Control and external pointer/keyboard basics;
- mode selector usable independently of the 3D surface.

## Parent Mode

Keep settings small:

- default mode;
- spoken names on/off if a caregiver explicitly wants silence;
- sound effects on/off;
- reduced animation override where useful;
- language/content language;
- reset exploration state;
- later: optional downloadable content packs.

No Parent Mode setup is required before first use.

## Privacy and safety

- No location permission.
- No account required.
- No advertising or tracking SDK.
- No child-generated public content.
- No external web links in Child Mode.
- No runtime Google Maps, Apple Maps, Mapbox or tile-server dependency.
- Analytics, if later added, must follow Tiko child/privacy doctrine.
- Editorial facts keep source/review metadata internally.

## Content quality rules

- Record source/version for country boundaries and canonical country data.
- Do not silently hand-draw disputed boundaries.
- Use the same country IDs/names/flags across all Tiko geography apps.
- Verify capital and landmark names/coordinates.
- Do not present representative animal markers as exact habitat science.
- Every child-facing fact has editorial source/reference and review state.
- Content changes should normally be data changes rather than renderer changes.

## Initial content target

Launch target:

- canonical country list with localized names and flags;
- corresponding national capitals;
- 40–60 curated animals with broad global representation;
- 40–60 curated landmarks with broad global representation.

Internal development should start with a much smaller vertical slice to prove
interaction and density before content production scales up.

## App size budget

Initial engineering targets, to validate against real assets:

- simplified geography: under 25 MB;
- base globe textures/meshes: under 25 MB;
- core illustrations: 40–100 MB;
- curated audio: under 30 MB, preferring on-device speech where practical;
- total v1 target: ideally under 150 MB compressed download.

CI should report asset-size growth.

## Performance targets

- First interactive Earth frame within roughly 2 seconds on a warm install
  target.
- Stable 60 fps during normal spin/zoom on modern supported hardware.
- Minimum acceptable 30 fps on the oldest supported device.
- No network wait before first interaction.
- Country hit testing and marker collision must not block rendering.
- Rapid spin/zoom/tap must not queue long camera animations.
- Repeated card opening must not cause unbounded memory growth.

## MVP

Include:

- true native round 3D Earth;
- free rotation/spinning;
- pinch zoom from complete Earth to country scale and back;
- fully bundled offline geography;
- Countries mode with tap-to-highlight and automatic spoken country name;
- Capitals mode;
- Animals mode;
- Landmarks mode;
- mode selector preserving camera state;
- marker density/collision handling;
- flags/country context;
- offline speech path;
- accessible list alternative;
- TikoKit / Parent Mode integration;
- localization-ready shared geography schema;
- content validation pipeline.

Exclude from v1:

- roads/street maps;
- businesses/POIs;
- navigation/routing;
- device location;
- satellite imagery;
- live weather or live country data;
- cloud-required content;
- multiplayer/social features;
- quizzes, points or scoring;
- terrain/elevation mesh;
- AR;
- user-created markers;
- community content packs.

## Tiko Geography family

Globe is the exploratory member of a four-app family:

1. **Flags** — recognize countries through their flags.
2. **Map** — locate countries.
3. **Map Puzzle** — understand how countries fit together.
4. **Globe** — freely explore countries and what exists around the world.

Share canonical geography data and rules, but keep each app's interaction model
focused and appropriate to its purpose.

## Implementation order

1. Native renderer spike: round sphere, free rotation, pinch zoom and hit testing.
2. Geography pipeline: Natural Earth countries/capitals -> simplified versioned
   assets.
3. Countries vertical slice: polygon hit testing, highlight, localized name,
   flag and automatic speech.
4. Shared GeographyCore models and validation.
5. Mode selector that preserves camera position/zoom.
6. Capitals mode and progressive density.
7. Animals mode and representative-region content rules.
8. Landmarks mode and verified media/content.
9. Accessibility alternative list and reduced-motion behavior.
10. Parent Mode, localization and pronunciation QA.
11. Content scale-up to launch targets.
12. Offline/device/performance QA.

## Testing strategy

### Shared/data tests

- country IDs and ISO mappings;
- geometry/country-reference validation;
- capital coverage;
- latitude/longitude validation;
- localization-key completeness;
- flag/content asset existence;
- duplicate IDs;
- deterministic marker visibility;
- animal representative-marker disclosure rules.

### Renderer/device tests

- complete Earth remains visibly spherical at minimum zoom;
- free rotation in all directions;
- pinch zoom limits;
- rapid spin/zoom/tap input;
- country hit testing, including small islands;
- mode switching preserves camera state;
- automatic speech matches selected item;
- VoiceOver and alternative list;
- reduced motion;
- airplane mode from first launch;
- iPad portrait/landscape and iPhone compact layouts.

## Definition of done

- The app opens directly to a complete round interactive Earth with no login.
- A child can spin the globe naturally in any direction.
- A child can zoom from the full planet toward a country and back out again.
- Countries, Capitals, Animals and Landmarks are distinct selectable modes.
- Tapping a country in Countries mode highlights it and speaks its localized
  name immediately.
- Tapping a capital, animal or landmark speaks its localized name and exposes a
  clear visual detail card.
- All v1 modes remain useful in airplane mode.
- Marker density remains understandable at every supported zoom level.
- Small countries remain practically selectable.
- VoiceOver users can access equivalent content without precise globe gestures.
- No runtime dependency exists on Google Maps, Apple Maps, Mapbox or a tile
  server.
- Shared country/flag/capital data is reusable by Flags, Map and Map Puzzle
  without coupling those apps to the 3D renderer.
