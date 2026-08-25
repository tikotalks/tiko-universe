# ADR: Tiko Globe renderer and offline geography

Date: 2026-08-24

Status: Proposed

## Context

Tiko Globe needs a child-friendly, interactive 3D Earth that works completely
offline. The product only needs world/regional geography plus Tiko-owned content
markers such as capitals, animals and landmarks. It does not need roads,
businesses, navigation, traffic, live POIs or satellite imagery.

The Tiko stack is iPad/iOS first and should keep content/data reusable for later
Android and web clients.

MapLibre Native is attractive for offline vector maps, but its native globe
projection is not currently a production capability. Making the app depend on a
future MapLibre Native globe implementation would put a core product requirement
behind an external roadmap.

OpenStreetMap can provide much more detail than Globe needs, but that detail adds
size, preprocessing work and ODbL obligations without providing v1 product value.

Natural Earth provides public-domain world geography at scales suited to a globe
and includes country boundaries and populated places/capitals.

## Decision

### Renderer

Tiko Globe will use a purpose-built native globe renderer on iOS rather than a
map SDK as the core globe surface.

The first implementation should spike a simple 3D sphere using a
RealityKit/Metal-backed approach and prove:

- one-finger globe rotation;
- pinch zoom;
- camera constraints;
- sphere hit testing;
- conversion between hit point and latitude/longitude;
- country/region highlighting;
- billboard/overlay markers;
- deterministic marker density;
- acceptable performance on the oldest supported iPad/iPhone.

The implementation may use lower-level Metal if RealityKit prevents required
camera, hit-testing or marker behavior. The product contract is the important
decision; the exact Apple rendering abstraction can change after the spike.

A future Android client may use its own native renderer while sharing content,
coordinates, filtering and validation through KMP.

### Geography source

Natural Earth is the canonical v1 base source for:

- land/ocean geometry;
- admin-0 country geometry/boundaries;
- selected major physical features if needed;
- national capital seed data.

A build-time pipeline will extract, normalize and simplify the required data into
versioned Tiko assets. Runtime parsing of raw GIS distributions is not required.

Natural Earth source version and transformation version must be recorded in the
generated asset metadata.

### Tiko content

Capitals, animals and landmarks are maintained as Tiko content referencing
canonical country IDs and coordinates/regions.

Animal marker coordinates are representative discovery points, not habitat
claims. Habitat facts require their own sourced editorial data.

Landmark locations and facts require verification before release.

### Offline contract

All v1 geography and core content ships with the app. The core experience must
work from first launch in airplane mode.

No runtime dependency is allowed on:

- Google Maps;
- Apple Maps;
- Mapbox;
- MapLibre tile servers;
- Protomaps servers;
- OpenStreetMap tile servers;
- Tiko APIs.

Optional downloadable packs may be added later but cannot be required for the
base app.

### MapLibre

MapLibre Native remains a valid candidate for a future flat **Tiko Map** app. It
is deliberately not a dependency of **Tiko Globe**.

If native MapLibre globe support becomes mature later, replacing the renderer
may be evaluated separately. Content and geography contracts should make such a
replacement possible without rewriting the content model.

### OpenStreetMap

Do not include OpenStreetMap-derived data in the v1 globe unless a concrete
requirement cannot be satisfied by Natural Earth/Tiko data.

If OSM-derived data is introduced later:

- record exactly which generated assets derive from OSM;
- show appropriate OpenStreetMap attribution;
- include the ODbL notice/link as required;
- review derivative database/share-alike implications before release.

## Consequences

### Positive

- The app can be genuinely offline.
- No map-provider billing or runtime availability risk.
- The renderer can be designed specifically for children rather than for GIS.
- The base geography can be very small.
- Natural Earth reduces licensing complexity for the base map.
- Tiko controls marker density, animation, accessibility and visual language.
- Shared content remains reusable by Flags, Map and Map Puzzle.

### Negative

- Tiko owns more rendering code than if a map SDK provided globe projection.
- Country hit testing and marker projection must be implemented/tested.
- Renderer parity across iOS/Android/web will require platform work.
- We do not get street-level mapping for free; this is intentional for v1.

## Validation before implementation commitment

The renderer spike must demonstrate on a real supported iPad and iPhone:

1. stable 60 fps target during ordinary globe rotation on current hardware;
2. acceptable 30 fps minimum on the oldest supported device;
3. reliable marker hit testing with at least 100 synthetic markers;
4. smooth pinch zoom and bounded momentum;
5. correct lat/lon conversion around the date line and poles;
6. a reduced-motion path;
7. no network access required;
8. a viable approach for selecting/highlighting country geometry.

If the spike fails, evaluate a lower-level Metal renderer before reconsidering a
third-party globe engine.

## References

- Natural Earth data is public domain: https://www.naturalearthdata.com/about/terms-of-use/
- MapLibre Native iOS provides full control over map sources/styles but native
  globe projection remains an open upstream feature request as of this ADR date.
- OpenStreetMap data is licensed under the ODbL and requires attribution; derived
  database obligations must be reviewed if adopted.
