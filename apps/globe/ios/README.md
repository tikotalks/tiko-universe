# Tiko Globe — iOS

A round Earth a child can spin, zoom and tap. Tapping a country highlights it
and says its name; everything works in airplane mode from first launch. Spec:
[`docs/apps/globe.md`](../../../docs/apps/globe.md), renderer and data decision:
[`docs/adrs/2026-08-24-globe-renderer-and-offline-data.md`](../../../docs/adrs/2026-08-24-globe-renderer-and-offline-data.md).

## Build & test

```sh
cd apps/globe/ios
xcodegen generate
xcodebuild -project TikoGlobe.xcodeproj -scheme TikoGlobe \
  -destination 'platform=iOS Simulator,name=iPhone 17 Pro Max' test
```

## How it is put together

| Piece | What it owns |
| --- | --- |
| `GlobeMath` | lat/lon ↔ unit sphere, date-line-safe longitude arithmetic, ray/sphere |
| `GlobeCamera` | yaw, pitch and distance; drag scaling, zoom limits, tap → lat/lon, and the projection back the other way for labels |
| `GlobeGeography` | the bundled `countries.json` + `geometry.bin` from `packages/geography` |
| `GlobeHitTesting` | which country a point is in, and which one a near-miss meant |
| `GlobeRenderer` + `GlobeShaders.metal` | ocean sphere, country fills, borders, highlight |
| `GlobeSurfaceView` | the `MTKView` and its three gestures |
| `GlobeController` | mode, selection, speech, momentum, focus animations, labels and marker density |
| `GlobeContent` | the modes, and the authored animal/landmark packs behind them |
| `GlobeView` | the TikoKit shell, the selection card, the country list |

The renderer is purpose-built rather than a map SDK, per the ADR. Country fills
are triangulated at build time and drawn from one buffer with a per-vertex
country index, so highlighting a country is a uniform change rather than a
rebuilt mesh. Borders are the outline rings drawn as lines just above the
surface; the ocean sphere sits just below it, which is what keeps the three
layers from fighting over the same depth.

Pinch is anchored: whatever is under the fingers when a pinch starts stays
under them, so moving two fingers together also carries the globe — the way a
map behaves. The `+`/`−` controls exist for the same reason the country list
does: pinching is not available to everyone.

Country names are drawn as SwiftUI text over the Metal view, not into it, so
they get the system's font rendering and Dynamic Type. A country earns a name
once its largest landmass covers enough of what is on screen — measured from
the landmass, not the bounding box, or France's overseas territories would make
it look bigger than Egypt — and a name is dropped if it would collide with one
already placed.

Hit testing runs on the CPU against the same outline rings: even-odd crossing
inside a country's bounding box, then a nearest-outline pass within a tolerance
derived from the current zoom, so a fingertip aimed at Malta gets Malta.

## Naming and flags

Country names come from the system (`Locale.localizedString(forRegionCode:)`),
which covers every ISO country in every language iOS ships — Maltese and
Armenian included, which the source data does not carry. Units that are not ISO
countries fall back to Natural Earth's own localized names, then to English.
Flags are regional-indicator emoji, and only units that *are* the ISO country
fly one.

## Modes

Countries, Capitals, Animals and Landmarks. Switching leaves the camera exactly
where it is. Capitals come from the geography itself; Animals and Landmarks are
authored in `packages/geography/content` and validated by
`npm run geography:check`.

Every content entry carries a review state, and every one of them is currently
`draft`. That is why a card shows a name, a country and a broad region and
nothing else: a fact without a source is not something to say to a child. The
illustrations, the sourced facts and the editorial pass are TIKO-067.

## Not here yet

| Missing | Card |
| --- | --- |
| Device frame-rate validation (the ADR's gate) | TIKO-069 |
| App icon — the catalog slot is empty, the header uses an SF Symbol | TIKO-065 |
| Marker density tuning against the plan's per-scale targets | TIKO-066 |
| Illustrations, sourced facts and the editorial pass for content | TIKO-067 |
| The geography rules moved into shared Kotlin | TIKO-068 |
