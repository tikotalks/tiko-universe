# @tiko/geography

The canonical geography every Tiko geography app reads: one country record per
Natural Earth admin-0 unit, and the globe geometry that draws and hit-tests them.

Everything in `generated/` is produced by `tools/geography/build-geography.mjs`
and committed, because the apps that use it must work from first launch in
airplane mode — nothing here is fetched at runtime.

```bash
npm run geography:build    # rebuild from the pinned Natural Earth release
npm run geography:check    # validate the committed assets (part of `npm run check`)
```

## `generated/countries.json`

```jsonc
{
  "id": "MLT",              // Natural Earth ADM0_A3 — the only per-unit unique key
  "iso2": "MT",             // present when this unit *is* the ISO country; drives the flag
  "iso3": "MLT",
  "name": "Malta",          // English; `names` carries the source's other languages
  "continent": "Europe",
  "isoRole": "country",     // country | territory | unrecognized
  "sovereignty": "sovereign", // Natural Earth's own classification
  "labelPoint": { "lat": 35.89, "lon": 14.43 },
  "bbox": [minLon, minLat, maxLon, maxLat],
  "capital": { "name": "Valletta", "lat": 35.89, "lon": 14.51 }
}
```

A capital is only ever taken from an explicit capital record in the source. Where
the source has none — Nauru, and most dependencies — `capital` is `null` rather
than a guess: an unverified place name is not something to say out loud to a child.

`isoRole: "unrecognized"` marks units the source maps without an ISO code
(Kosovo, Somaliland, Northern Cyprus, Siachen Glacier). Their shape and name are
Natural Earth's default worldview, recorded as such in `generated/meta.json`
rather than redrawn by hand.

## `generated/geometry.bin`

Little-endian, described by `meta.json` and read by `GlobeGeometry.swift`:

| Block | Contents |
| --- | --- |
| header | `TIKOGEO1`, format version, and the five table counts |
| countries | id, label point, bbox, and the ring/mesh ranges belonging to the unit |
| rings | offset, length and hole flag of each outline ring |
| outline points | `lon, lat` float pairs — drawn as borders, tested for taps |
| mesh vertices | `lon, lat` float pairs of the pre-triangulated fill |
| mesh indices | `uint32`, country-local, three per triangle |

Fills are triangulated at build time and split until no triangle edge spans more
than 3°, so the mesh bends onto the sphere instead of cutting a chord through it.
Outlines keep their own simplified rings: the same points draw the borders and
answer "which country did the child tap".

## `generated/meta.json`

The Natural Earth release, the SHA-256 of each source file, the transform
parameters and the output counts. The ADR requires a generated asset to say
exactly what it was made from; this is that record.

Natural Earth is public domain: <https://www.naturalearthdata.com/about/terms-of-use/>

## Authored content — the files to edit and verify

Everything a person (or another agent) decides by hand lives in `content/` as
JSON. Nothing here is generated; the packs the app bundles are built from these.

| File | What it decides |
| --- | --- |
| `country-animals.json` | which animals a child finds when they zoom into each country |
| `country-landmarks.json` | the landmarks of each country, with coordinates and how far out they show |
| `animal-districts.json` | which part of the world each animal lives in, and the library titles it is filed under |
| `districts.json` | the regions themselves — where they are, how wide, land or water |

### The rule

**Only animals actually found wild in that country.** Nothing is added
automatically from the surrounding region: the region can be right while the
country is wrong, and a child has no way to tell. Globe also never substitutes a
different animal for a missing one — a tortoise standing in for a sea turtle is
a false claim — so a name with no picture is reported rather than shown.

### Reviewing a country

Each country carries a review state:

```jsonc
"MLT": {
  "country": "Malta",
  "review": { "state": "verified", "by": "sil", "at": "2026-08-24" },
  "animals": [
    {
      "name": "Chameleon",
      "at": { "lat": 35.893, "lon": 14.433 },   // where it stands in this country
      "note": "Naturalised; common on Malta and Gozo"
    }
  ],
  "alsoWanted": [
    { "name": "Octopus", "note": "no picture in the media library" }
  ]
}
```

### Positions and importance

Every marker has real coordinates, and every subject has an importance from
**1 (shows from space) to 10 (only at the closest zoom)**.

- `at` on a country's animal is where that animal stands inside that country.
- `at` in `animal-districts.json` is where the animal appears across the region
  it lives in, one entry per district point.
- `importance` lives on the subject: in `animal-districts.json` for an animal,
  on each landmark in `country-landmarks.json`.

Both are ordinary data. Set them by hand and the build keeps them; leave them
out and the build works them out and writes them back, so the file always shows
exactly where everything is. The zoom bands are: importance ≤ 2 around the whole
Earth, ≤ 4 across a continent, ≤ 6 over a region, ≤ 8 at country scale, and
everything at the closest zoom.

- `state: "draft"` — written from general knowledge, not checked. This is where
  241 of the 242 countries are today.
- `state: "verified"` — a person has been through the list; `by` and `at` say who
  and when. The checker rejects `verified` without them.
- `animals[].name` must be a title in the Tiko media library. A name with no
  picture is not shown on the globe and appears in
  [`docs/apps/globe-media-gaps.md`](../../docs/apps/globe-media-gaps.md).
- `alsoWanted` records animals the country genuinely has that Globe cannot show
  at all yet — they only exist to ask for artwork.

### After editing

```bash
npm run geography:check      # structure, references, and every marker's placement
npm run geography:content    # rebuild the packs the app bundles, and the gap report
```

`geography:check` catches a country with no animals, a landmark outside its own
country, an unknown district, a duplicate, coordinates off the planet, and a
`verified` entry with nobody's name on it. What it cannot check is whether a
chameleon really lives in Malta — that is what the review state is for.
