# Tiko Globe

## Job

A calm, playful, fully offline Earth explorer for children. The child can spin,
zoom and tap a simplified 3D globe to discover capitals, animals and landmarks
without needing to read, sign in or understand a quiz interface.

Working product name: **Tiko Globe**. Repository/app ID: `globe`.

The app should feel closer to "Google Earth for kids" than a conventional map:
no roads, businesses, navigation, reviews, traffic, ads or dense geographic
labels. The Earth itself is the interface.

## Product principles

- Exploration before testing: the default experience is discovery, not a quiz.
- Fully useful offline after install.
- iPad-first and touch-first, with iPhone support.
- No account, login, ads, subscriptions, streaks, coins or reward economy.
- Visual-first and speech-friendly; reading is optional.
- Large, forgiving touch targets and predictable gestures.
- Keep the globe intentionally sparse. Interesting objects matter more than map
  density.
- Capitals, animals and landmarks are the three first-class content layers.
- Child mode never opens a browser or external map provider.
- Parent Mode owns settings, optional downloads and content controls.
- The same geographic/content dataset should later power Tiko Flags, Map and
  Map Puzzle.

## Core experience

The app opens directly on Earth. There is no onboarding carousel.

The child can:

- drag with one finger to rotate the globe;
- pinch to zoom;
- tap a visible marker;
- tap the Earth to focus a country/region where supported;
- use a simple Home/Earth action to return to the full globe;
- optionally use a visible speaker action to hear the selected item's name.

The globe should continue to work if the device has never had an internet
connection.

### Default layers

The first public release has exactly three child-facing layers:

1. **Capitals**
2. **Animals**
3. **Landmarks**

All three can be enabled together. A simple layer control can also isolate one
category. Layer controls should use both icon and text, not color alone.

Possible later layers include nature, oceans, dinosaurs/fossils, food, culture,
transport and space, but they are explicitly outside the first release.

## Capitals

Capitals are special locations rather than generic city POIs.

At globe scale, only a small number of high-salience markers are visible. More
capitals appear as the child zooms in. The app must avoid creating a cloud of
hundreds of labels.

A capital card contains, at minimum:

- city name;
- country name;
- country flag;
- large illustration/photo or Tiko artwork where available;
- spoken city name;
- spoken country name;
- one short optional fact.

Example:

```text
Valletta
Malta 🇲🇹
[Speak]
"Valletta is the capital of Malta."
```

Capital markers should be visually consistent and distinguishable from animal
and landmark markers without relying only on color.

## Animals

Animals are not pinned to a single misleading exact coordinate as if that point
were the animal's only habitat. Each animal entry has one or more broad habitat
regions and one or more representative marker positions chosen for exploration.

Examples for an initial pack:

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

An animal card contains:

- common name;
- large Tiko illustration;
- spoken name;
- broad place/region text;
- one short child-friendly fact;
- optional animal sound only when the sound is accurate and appropriately
  licensed.

The app must avoid false precision. Content should say things such as "Lives in
parts of eastern and southern Africa" rather than implying that an animal lives
at the exact marker point.

## Landmarks

Landmarks provide recognizable anchors between abstract geography and real
places.

The first pack should aim for broad geographic representation, not only Europe
and North America. Candidate examples:

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
- Grand Harbour / Valletta landmark content for Malta.

A landmark card contains:

- landmark name;
- country;
- image/illustration;
- spoken name;
- one short fact.

Only use imagery that Tiko owns, generates, commissions or can legally bundle.
Do not scrape photographs from map/search providers.

## Country discovery

Countries are supporting geography, not a fourth marker layer.

When a child zooms toward or taps a country, the app may show its name and flag
and emphasize the country shape. Country labels should appear progressively and
remain sparse.

A lightweight country sheet may later contain:

- country name;
- flag;
- capital;
- continent;
- selected animals and landmarks already present in the app.

This creates a natural connection between Globe and future Flags/Map games.

## Interaction model

### Rotate

One-finger drag rotates Earth with light momentum. Motion must stop quickly and
predictably; the globe should never spin wildly.

### Zoom

Pinch zoom moves between three conceptual scales:

- **Earth**: continents and a handful of featured markers;
- **Region**: country boundaries and more markers;
- **Country**: country label, capital and nearby content.

The product does not need street-level zoom. A hard maximum zoom avoids blurry
map data and keeps the experience focused.

### Select

Tapping a marker:

1. keeps the marker selected;
2. gently moves it toward a comfortable viewing position if needed;
3. opens a large bottom card;
4. exposes the speak action;
5. never starts audio unexpectedly unless Parent Mode explicitly enables
   auto-speak.

Tap outside or swipe the card down to dismiss.

### Search

Child-facing search is not required for v1. Exploration is the primary model.
A later accessible search/list view can help children who cannot reliably use a
3D gesture surface and should be considered an accessibility feature, not just a
power-user feature.

## Visual direction

The globe should use Tiko's visual language rather than a conventional GIS map.

Recommended treatment:

- soft ocean color;
- simple, slightly varied land colors;
- clear but low-contrast country boundaries;
- minimal/no terrain texture in v1;
- no roads;
- no commercial POIs;
- no satellite imagery;
- no tiny labels;
- large illustrated content markers;
- gentle depth, atmosphere and lighting without photorealism;
- dark-mode compatible presentation without turning Earth into a black map.

The globe must still be understandable when all illustrations are hidden and
VoiceOver is used.

## Offline architecture

Tiko Globe is local-first and has no runtime map dependency.

```text
SwiftUI iOS app
  TikoKit / Parent Mode / accessibility
  GlobeView
       |
       v
Native iOS globe renderer
  RealityKit/Metal-backed 3D sphere
  camera + rotation + hit testing
  marker billboards / overlays
       |
       v
GlobeCore KMP
  content models
  layer/filter logic
  geographic coordinates
  marker density rules
  localization keys
  content validation
       |
       +--> bundled Natural Earth derived geography
       +--> bundled Tiko content database
       +--> bundled images/audio
```

The rendering implementation is platform-native. Shared geographic/content rules
belong in KMP so a later Android client can reuse the same content and behavior.

### Why not MapLibre Native for the globe

MapLibre Native is useful for normal native vector maps and supports local data,
but native globe projection is not currently a production feature. Tiko Globe
therefore must not depend on MapLibre Native gaining globe support.

A future Tiko Map app can use MapLibre Native for a flat map. Tiko Globe remains
independent.

See `docs/adrs/2026-08-24-globe-renderer-and-offline-data.md`.

## Geographic data

Use **Natural Earth** as the primary v1 base geography.

Natural Earth provides public-domain vector/raster geography at suitable world
and regional scales. For this app we need only a small subset:

- land/ocean geometry;
- admin-0 country polygons/boundaries;
- major lakes if visually useful;
- populated places filtered to national capitals;
- optional continent/region metadata.

Do not bundle the complete Natural Earth dataset. Add a build-time extraction
step that produces only the simplified assets needed by the app.

OpenStreetMap is not required for v1. This keeps the base map small and avoids
adding ODbL-derived database obligations where the extra street-level detail has
no product value. If OSM data is introduced later, attribution and share-alike
requirements must be reviewed explicitly before shipping it.

### Generated globe assets

The build pipeline should produce versioned assets such as:

```text
assets/globe/
  geography-v1.json
  countries-v1.bin
  capitals-v1.json
  earth-albedo-v1.webp
  content-v1.json
  markers/
  audio/
```

Exact formats can change after the renderer spike. The important boundary is
that raw GIS data is transformed at build time, not parsed on every launch.

## Content model

Conceptual shared model:

```json
{
  "id": "animal.african-elephant",
  "type": "animal",
  "titleKey": "globe.animal.africanElephant.title",
  "factKey": "globe.animal.africanElephant.fact1",
  "image": "animals/african-elephant.webp",
  "speech": {
    "titleKey": "globe.animal.africanElephant.title"
  },
  "markers": [
    { "lat": -2.1, "lon": 34.7, "region": "east-africa" },
    { "lat": -19.0, "lon": 24.5, "region": "southern-africa" }
  ],
  "countries": ["KEN", "TZA", "BWA", "ZAF"],
  "minScale": "region",
  "priority": 80,
  "schemaVersion": 1
}
```

Coordinates are representative discovery markers, not scientific habitat
boundaries. Entries requiring real habitat boundaries can later reference a
separate generalized region geometry.

Capital and landmark entries use the same common structure with type-specific
fields.

## Marker density and collision

The app must never render all content simultaneously.

Each item has:

- minimum visible scale;
- priority;
- category;
- optional country/region grouping;
- one or more marker positions.

At each frame/zoom state, a deterministic selection algorithm chooses markers
based on viewport, scale, priority and minimum screen spacing. The same inputs
must produce the same visible markers so the UI does not flicker.

Suggested v1 targets:

- Earth scale: roughly 8–20 markers visible;
- region scale: roughly 15–35 markers;
- country scale: roughly 10–30 markers depending on screen size.

Exact numbers are tuning values, not content rules.

## Localization and speech

All UI and content text uses Tiko's normal localization system.

Content must never store English prose as its canonical identifier. Use stable
keys and locale bundles.

For speech:

- prefer high-quality on-device system TTS for names/facts where pronunciation
  is acceptable;
- allow selected names to ship with curated prerecorded pronunciation when TTS
  performs poorly;
- speech must work offline for the supported language path;
- never require a cloud TTS request to use the app.

The first release can localize a smaller curated content pack properly rather
than shipping hundreds of untranslated entries.

## Accessibility

The 3D globe cannot be the only way to access content.

Required for v1:

- VoiceOver labels for all visible controls and marker selections;
- at least 44x44 pt effective touch targets for controls;
- reduced-motion mode that removes momentum and animated camera travel;
- no information conveyed only by color;
- optional spoken names;
- no timers or failure sounds;
- repeatable selection/speech without penalties;
- an accessible ordered list of currently visible/featured items, reachable
  without manipulating the globe precisely;
- Dynamic Type for cards and controls;
- support for Switch Control and external pointer/keyboard basics.

The accessible list can focus the globe when an item is selected, keeping both
interaction models synchronized.

## Parent Mode

Keep settings deliberately small:

- enabled layers: capitals / animals / landmarks;
- auto-speak on/off;
- sound effects on/off;
- reduced animation override where useful;
- language/content language;
- reset exploration state;
- later: optional downloadable content packs.

No Parent Mode setting should be required for first use.

## Privacy and safety

- No location permission.
- No account required.
- No advertising or tracking SDK.
- No child-generated public content.
- No external web links in Child Mode.
- Analytics, if added, must follow Tiko's child/privacy doctrine and should not
  contain precise interaction coordinates that could become an unnecessary
  behavioral profile.
- Content facts need an editorial source field internally even if sources are not
  shown on every child card.

## Content quality rules

Geography content can become politically and scientifically sensitive. The data
pipeline must distinguish factual display decisions from product styling.

- Country/boundary source and version must be recorded.
- Disputed boundaries must not be silently hand-drawn by app developers.
- Avoid presenting representative animal markers as exact habitat science.
- Landmarks must have verified names and locations.
- Facts must have an editorial source/reference and review status.
- Flags and country names should come from the same canonical geography dataset
  used by the other Tiko geography apps.
- Content changes should be data changes, not renderer changes.

## Initial content target

A useful v1 does not need thousands of markers.

Target:

- all widely recognized sovereign-state national capitals supported by the
  chosen canonical country list;
- 40–60 curated animals with broad global representation;
- 40–60 curated landmarks with broad global representation;
- country shapes/names/flags required to contextualize those items.

Start smaller internally (for example 20 capitals, 15 animals, 15 landmarks) to
validate the interaction before scaling content production.

## App size budget

The app should remain comfortably downloadable as a normal App Store install.
The world geography itself should be small because there are no roads, buildings
or satellite tiles.

Initial engineering budget, to validate with real assets:

- simplified geography: under 25 MB;
- base globe textures/meshes: under 25 MB;
- core illustrations: 40–100 MB depending on resolution/count;
- audio: under 30 MB for curated clips; prefer on-device TTS where practical;
- total v1 target: ideally under 150 MB compressed download.

These are product budgets, not guarantees. CI should report asset size so growth
is visible.

## Performance targets

On supported iPads/iPhones:

- first interactive globe frame within 2 seconds on a warm install target;
- stable 60 fps during normal rotation on modern supported hardware;
- minimum acceptable 30 fps on the oldest supported device;
- no network wait before first interaction;
- marker collision/density work must not block rendering;
- app should tolerate rapid spin/zoom/tap without queueing long animations;
- memory should remain bounded when repeatedly opening content cards.

Respect Low Power Mode and reduced motion by lowering nonessential animation.

## MVP

Include:

- native interactive 3D Earth;
- fully bundled offline geography;
- capitals layer;
- animals layer;
- landmarks layer;
- progressive marker density;
- marker selection and child-friendly detail card;
- flags/country context;
- offline speech path;
- Parent Mode layer/audio settings;
- accessible list alternative;
- core TikoKit integration;
- localization-ready content schema;
- content validation pipeline.

Exclude from v1:

- roads and street maps;
- businesses/POIs;
- navigation/routing;
- device location;
- satellite imagery;
- live weather;
- live country data;
- cloud-required content;
- multiplayer/social features;
- quizzes, points or scoring;
- terrain/elevation mesh;
- AR mode;
- user-created markers;
- downloadable community packs.

## Future connection to Tiko Geography

Globe should be the exploratory member of a four-app geography family:

1. **Flags** — recognize countries.
2. **Map** — locate countries.
3. **Map Puzzle** — understand how countries fit together.
4. **Globe** — explore what exists in those places.

The apps should not copy data into four incompatible formats. Build a shared
`GeographyCore`/dataset once stable enough, containing canonical countries,
capitals, flags, localized names and common IDs. Globe-specific content (animals
and landmarks) can reference the same country IDs.

Do not prematurely force the renderer into this shared layer. Share data and
rules; keep the UI/rendering appropriate to each app.

## Implementation order

1. **Renderer spike** — native sphere, rotation, pinch zoom, hit testing and 100
   synthetic markers on iPad/iPhone.
2. **Geography build pipeline** — extract/simplify Natural Earth country and
   capital data into versioned app assets.
3. **GlobeCore model** — schema, localization keys, filtering, priorities,
   collision/density decisions and validation.
4. **Visual globe pass** — Tiko ocean/land styling, country boundaries and
   camera behavior.
5. **Marker system** — category visuals, selection, focus and bottom card.
6. **Capitals vertical slice** — real country/flag/capital content and speech.
7. **Animals vertical slice** — representative-region rules and illustrations.
8. **Landmarks vertical slice** — verified coordinates, imagery and facts.
9. **Accessibility pass** — VoiceOver, visible-item list, reduced motion,
   Dynamic Type, Switch Control.
10. **Parent Mode and localization** — category toggles, speech settings and
    first translated content packs.
11. **Content scale-up** — expand to launch targets only after marker density
    and card UX are proven.
12. **Offline/device QA** — airplane-mode, cold launch, low storage, older
    device, rotation, multitasking and app termination tests.

## Testing strategy

### Unit/shared tests

- schema migrations;
- latitude/longitude validation;
- country reference validation;
- deterministic marker priority output;
- localization key completeness;
- content asset existence;
- duplicate IDs;
- representative animal marker disclosure rules.

### Snapshot/data tests

- generated country asset count;
- capital coverage;
- canonical IDs stable across dataset updates;
- no unexpectedly large asset growth;
- screenshots at fixed globe orientations for major renderer regressions.

### Device tests

- rotate/pinch/tap under rapid input;
- VoiceOver exploration;
- reduced motion;
- airplane mode from first launch;
- memory after repeated cards;
- iPad portrait/landscape;
- iPhone compact layouts.

## Definition of done

- The app opens directly to a useful Earth with no login.
- Airplane mode does not remove any v1 geography, capital, animal or landmark
  functionality.
- A child can rotate, zoom, select and hear content without reading.
- Capitals, animals and landmarks remain visually distinguishable without color
  alone.
- Marker density remains understandable at all supported zoom levels.
- VoiceOver users can reach the same content through an ordered alternative to
  precise globe manipulation.
- Country/capital data has a recorded source/version and passes validation.
- Animal entries do not claim false coordinate precision.
- No runtime dependency on Google Maps, Apple Maps, Mapbox or a tile server.
- No child-facing external links, ads, tracking or account requirement.
- The architecture leaves shared country/flag/capital data reusable by Flags,
  Map and Map Puzzle without coupling those apps to the 3D renderer.
