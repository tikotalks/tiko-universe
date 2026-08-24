#!/usr/bin/env node
// Tiko Globe geography pipeline.
//
// Turns Natural Earth (public domain) into the two runtime assets the Globe app
// bundles: a canonical country record list and a binary geometry blob holding
// outlines (drawn as borders, tested for taps) and a pre-triangulated fill mesh.
//
//   node build-geography.mjs           rebuild the assets from the pinned source
//   node build-geography.mjs --check   validate the committed assets, no network
//
// Rebuilding needs `npm install` in this folder (earcut) and one download of the
// pinned Natural Earth release. Checking needs neither, so the repo-wide
// `npm run check` gate can run it anywhere.
//
// The source release and every transform parameter land in meta.json, because
// the ADR requires a generated asset to say exactly what it was made from.

import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const OUT_DIR = join(HERE, '..', '..', 'packages', 'geography', 'generated')
const CONTENT_DIR = join(HERE, '..', '..', 'packages', 'geography', 'content')
const CACHE_DIR = join(HERE, '.cache')

/** Pinned Natural Earth release. Bump deliberately; it changes every asset. */
const NE_RELEASE = 'v5.1.2'
const NE_BASE = `https://raw.githubusercontent.com/nvkelso/natural-earth-vector/${NE_RELEASE}/geojson`

/** Bump when the transform below changes shape or output meaning. */
const TRANSFORM_VERSION = 1
const FORMAT_VERSION = 1
const SCHEMA_VERSION = 1

/** 50m countries keep Malta and the other small states the product names. */
const COUNTRIES_SOURCE = 'ne_50m_admin_0_countries'
const PLACES_SOURCE = 'ne_10m_populated_places_simple'

/**
 * Douglas–Peucker tolerance ceiling, degrees — about 2 km at the equator. The
 * globe zooms in far enough to sit inside a small country, and at that range a
 * coarser coastline reads as a melted blob rather than a shape a child
 * recognises.
 */
const SIMPLIFY_TOLERANCE_DEG = 0.012
/** Rings smaller than this are dropped. Vatican City is ~3.6e-5, so it stays. */
const MIN_RING_AREA_DEG2 = 2e-5
/** Longest triangle edge on the fill mesh before it is split, degrees. */
const MAX_MESH_EDGE_DEG = 3
/**
 * Chaikin corner-cutting passes over each ring. Long straight borders keep
 * their line — the algorithm only cuts at vertices — while the jagged corners
 * simplification leaves behind soften into something that looks drawn rather
 * than surveyed. Purely cosmetic, and recorded in meta.json as such.
 */
const SMOOTH_PASSES = 1
/**
 * Countries whose climate the latitude rule gets wrong: deserts and dry steppes
 * that sit at latitudes which are green almost everywhere else, and the handful
 * of tropical highlands and cold islands that read the other way. Everything not
 * listed falls out of the latitude bands below.
 */
const CLIMATE_OVERRIDES = {
  desert: ['DZA', 'LBY', 'EGY', 'TUN', 'MAR', 'ESH', 'MRT', 'MLI', 'NER', 'TCD', 'SDN', 'SAU', 'ARE',
    'OMN', 'QAT', 'BHR', 'KWT', 'JOR', 'ISR', 'PSX', 'IRQ', 'IRN', 'AFG', 'PAK', 'TKM', 'UZB',
    'ERI', 'DJI', 'SOM', 'SOL', 'NAM', 'BWA', 'AUS', 'YEM', 'SYR'],
  steppe: ['KAZ', 'MNG', 'KGZ', 'TJK', 'AZE', 'ARM', 'GEO', 'ZAF', 'ARG', 'CHL', 'TUR', 'CHN', 'IND',
    'MEX', 'USA', 'ZWE', 'ZMB', 'AGO', 'MOZ', 'ETH', 'KEN', 'TZA'],
  polar: ['GRL', 'ATA', 'ATF', 'SGS', 'HMD', 'BVT'],
  boreal: ['ISL', 'NOR', 'SWE', 'FIN', 'RUS', 'CAN', 'EST', 'LVA'],
  tropical: ['BRA', 'COD', 'COG', 'IDN', 'MYS', 'PNG', 'PHL', 'COL', 'PER', 'ECU', 'VEN', 'GUY',
    'SUR', 'GUF', 'CRI', 'PAN', 'NIC', 'HND', 'GTM', 'BLZ', 'CMR', 'GAB', 'GNQ', 'CIV', 'GHA',
    'LBR', 'SLE', 'GIN', 'NGA', 'UGA', 'RWA', 'BDI', 'MDG', 'LKA', 'KHM', 'LAO', 'VNM', 'THA',
    'MMR', 'BGD', 'FJI', 'SLB', 'VUT']
}

/** Natural Earth's localized name columns, kept as a fallback for units Foundation does not know. */
const NAME_LOCALES = ['ar', 'bn', 'de', 'el', 'es', 'fa', 'fr', 'he', 'hi', 'hu', 'id', 'it',
  'ja', 'ko', 'nl', 'pl', 'pt', 'ru', 'sv', 'tr', 'uk', 'ur', 'vi', 'zh']

const MAGIC = 'TIKOGEO1'
const COUNTRY_RECORD_BYTES = 52
const RING_RECORD_BYTES = 12
const HEADER_BYTES = 8 + 6 * 4

// ---------------------------------------------------------------- geometry --

/** Shoelace area of a ring in square degrees; sign tells winding. */
function ringArea(points) {
  let sum = 0
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    sum += (points[j][0] - points[i][0]) * (points[j][1] + points[i][1])
  }
  return sum / 2
}

function perpendicularDistance(point, start, end) {
  const [x, y] = point
  const [x1, y1] = start
  const [x2, y2] = end
  const dx = x2 - x1
  const dy = y2 - y1
  if (dx === 0 && dy === 0) return Math.hypot(x - x1, y - y1)
  const t = Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy)))
  return Math.hypot(x - (x1 + t * dx), y - (y1 + t * dy))
}

/** Iterative Douglas–Peucker; recursion would blow the stack on Antarctica. */
function simplify(points, tolerance) {
  if (points.length <= 3) return points
  const keep = new Uint8Array(points.length)
  keep[0] = 1
  keep[points.length - 1] = 1
  const stack = [[0, points.length - 1]]
  while (stack.length > 0) {
    const [first, last] = stack.pop()
    let index = -1
    let maxDistance = tolerance
    for (let i = first + 1; i < last; i++) {
      const distance = perpendicularDistance(points[i], points[first], points[last])
      if (distance > maxDistance) {
        maxDistance = distance
        index = i
      }
    }
    if (index === -1) continue
    keep[index] = 1
    stack.push([first, index], [index, last])
  }
  return points.filter((_, i) => keep[i] === 1)
}

/** One Chaikin pass over a closed ring: every corner becomes two softer ones. */
function smoothRing(points) {
  if (points.length < 4) return points
  const smoothed = []
  for (let i = 0; i < points.length; i++) {
    const [ax, ay] = points[i]
    const [bx, by] = points[(i + 1) % points.length]
    smoothed.push([ax * 0.75 + bx * 0.25, ay * 0.75 + by * 0.25])
    smoothed.push([ax * 0.25 + bx * 0.75, ay * 0.25 + by * 0.75])
  }
  return smoothed
}

/** GeoJSON rings repeat the first point; the runtime closes them itself. */
function openRing(ring) {
  const points = ring.map(([lon, lat]) => [lon, lat])
  const first = points[0]
  const last = points[points.length - 1]
  if (points.length > 1 && first[0] === last[0] && first[1] === last[1]) points.pop()
  return points
}

function prepareRing(ring) {
  const opened = openRing(ring)
  if (opened.length < 3) return null
  // Relative, not absolute: one tolerance for the whole world either leaves
  // Russia's coast noisy or erases Malta. A ring is simplified against its own
  // size, so every shape loses roughly the same proportion of its detail.
  const size = Math.sqrt(Math.abs(ringArea(opened)))
  const tolerance = Math.min(SIMPLIFY_TOLERANCE_DEG, Math.max(size / 60, 0.0015))
  const simplified = simplify(opened, tolerance)
  if (simplified.length < 3) return null
  if (Math.abs(ringArea(simplified)) < MIN_RING_AREA_DEG2) return null
  let rounded = simplified
  for (let pass = 0; pass < SMOOTH_PASSES; pass++) rounded = smoothRing(rounded)
  return rounded
}

/** MultiPolygon and Polygon, normalized to a list of [outer, ...holes]. */
function polygonsOf(geometry) {
  if (geometry.type === 'Polygon') return [geometry.coordinates]
  if (geometry.type === 'MultiPolygon') return geometry.coordinates
  throw new Error(`unsupported geometry ${geometry.type}`)
}

/**
 * Triangulates one polygon in lon/lat, then splits any triangle edge longer
 * than MAX_MESH_EDGE_DEG. Splitting stays inside the original triangle, so the
 * mesh keeps the same footprint while bending onto the sphere instead of
 * cutting a chord through it. Both triangles sharing a long edge split it at
 * the same midpoint, so no T-junction cracks appear.
 */
/** Loaded lazily so `--check` runs without this folder's node_modules. */
let earcut = null
async function loadEarcut() {
  if (earcut === null) ({ default: earcut } = await import('earcut'))
  return earcut
}

function triangulatePolygon(rings) {
  const flat = []
  const holeIndices = []
  rings.forEach((ring, index) => {
    if (index > 0) holeIndices.push(flat.length / 2)
    for (const [lon, lat] of ring) flat.push(lon, lat)
  })
  const indices = earcut(flat, holeIndices.length > 0 ? holeIndices : null, 2)
  if (indices.length === 0) return { vertices: [], indices: [] }

  const vertices = flat.slice()
  const midpoints = new Map()
  const midpointOf = (a, b) => {
    const key = a < b ? `${a}:${b}` : `${b}:${a}`
    const existing = midpoints.get(key)
    if (existing !== undefined) return existing
    const index = vertices.length / 2
    vertices.push((vertices[a * 2] + vertices[b * 2]) / 2, (vertices[a * 2 + 1] + vertices[b * 2 + 1]) / 2)
    midpoints.set(key, index)
    return index
  }
  const edgeLength = (a, b) => Math.hypot(
    vertices[a * 2] - vertices[b * 2],
    vertices[a * 2 + 1] - vertices[b * 2 + 1]
  )

  const queue = []
  for (let i = 0; i < indices.length; i += 3) queue.push([indices[i], indices[i + 1], indices[i + 2]])
  const out = []
  while (queue.length > 0) {
    const [a, b, c] = queue.pop()
    const ab = edgeLength(a, b)
    const bc = edgeLength(b, c)
    const ca = edgeLength(c, a)
    const longest = Math.max(ab, bc, ca)
    if (longest <= MAX_MESH_EDGE_DEG) {
      out.push(a, b, c)
      continue
    }
    if (longest === ab) {
      const m = midpointOf(a, b)
      queue.push([a, m, c], [m, b, c])
    } else if (longest === bc) {
      const m = midpointOf(b, c)
      queue.push([b, m, a], [m, c, a])
    } else {
      const m = midpointOf(c, a)
      queue.push([c, m, b], [m, a, b])
    }
  }
  return { vertices, indices: out }
}

// ------------------------------------------------------------------ source --

async function readSource(name) {
  await mkdir(CACHE_DIR, { recursive: true })
  const cached = join(CACHE_DIR, `${NE_RELEASE}-${name}.geojson`)
  if (!existsSync(cached)) {
    const url = `${NE_BASE}/${name}.geojson`
    process.stdout.write(`downloading ${url}\n`)
    const response = await fetch(url)
    if (!response.ok) throw new Error(`${url} responded ${response.status}`)
    await writeFile(cached, Buffer.from(await response.arrayBuffer()))
  }
  const raw = await readFile(cached)
  return { json: JSON.parse(raw.toString('utf8')), sha256: createHash('sha256').update(raw).digest('hex') }
}

/**
 * Natural Earth's admin-0 code is the only key that is unique per unit: three
 * separate features carry ISO_A3_EH "AUS" (Australia and two of its island
 * territories), so ISO codes cannot identify a record on their own.
 */
function countryIdOf(properties) {
  return properties.ADM0_A3
}

/**
 * `country` — the unit is the ISO country itself, so the system can localize
 * its name and it owns the flag. `territory` — part of an ISO country but
 * mapped separately (Australia's island territories share ISO code AUS).
 * `unrecognized` — no ISO code at all; the source's default worldview decides
 * both the shape and the name, and the record says so.
 */
/**
 * A country's colour comes from its climate, so the Earth reads as land rather
 * than as a political map: sand for the deserts, deep green for the tropics,
 * white for the ice. Latitude gets most of it right; the overrides above fix
 * the deserts and the cold islands it cannot see.
 */
function climateOf(id, labelLat) {
  for (const [climate, ids] of Object.entries(CLIMATE_OVERRIDES)) {
    if (ids.includes(id)) return climate
  }
  const latitude = Math.abs(labelLat)
  if (latitude >= 66) return 'polar'
  if (latitude >= 55) return 'boreal'
  if (latitude >= 40) return 'temperate'
  if (latitude >= 30) return 'mediterranean'
  if (latitude >= 23) return 'subtropical'
  return 'tropical'
}

function isoRoleOf(id, iso3) {
  if (iso3 === null) return 'unrecognized'
  return iso3 === id ? 'country' : 'territory'
}

/** Natural Earth's own sovereignty classification, kept verbatim in lower case. */
const SOVEREIGNTY_BY_TYPE = {
  'Sovereign country': 'sovereign',
  Country: 'country',
  Dependency: 'dependency',
  Disputed: 'disputed',
  Indeterminate: 'indeterminate',
  Sovereignty: 'dependency'
}

/**
 * Sovereign states the source has no capital class for. A capital is only ever
 * taken from an explicit capital record — inferring one from "biggest town"
 * would put an unverified place name in a child's ear.
 */
const CAPITAL_ABSENT_IN_SOURCE = {
  NRU: 'Nauru has no capital city; government sits in Yaren district'
}

function localizedNames(properties) {
  const names = {}
  for (const locale of NAME_LOCALES) {
    const value = properties[`NAME_${locale.toUpperCase()}`]
    if (typeof value === 'string' && value.length > 0) names[locale] = value
  }
  return names
}

/**
 * Capitals keyed by the source's own country code. Sovereign capitals win over
 * the alternates, and a territory's regional seat (Nuuk, Ramallah) counts —
 * a child tapping Greenland should still be told what the place there is.
 */
const CAPITAL_CLASS_RANK = {
  'Admin-0 capital': 0,
  'Admin-0 capital alt': 1,
  'Admin-0 region capital': 2
}

function capitalsByCountry(places) {
  const capitals = new Map()
  for (const feature of places.features) {
    const properties = feature.properties
    const rank = CAPITAL_CLASS_RANK[properties.featurecla]
    if (rank === undefined) continue
    const key = properties.adm0_a3
    const candidate = {
      name: properties.name,
      lat: properties.latitude,
      lon: properties.longitude,
      rank
    }
    const existing = capitals.get(key)
    if (!existing || candidate.rank < existing.rank) capitals.set(key, candidate)
  }
  return capitals
}

// ------------------------------------------------------------------ encode --

function encodeGeometry(countries) {
  const ringRecords = []
  const outlinePoints = []
  const meshVertices = []
  const meshIndices = []

  for (const country of countries) {
    country.ringOffset = ringRecords.length
    country.meshVertexOffset = meshVertices.length / 2
    country.meshIndexOffset = meshIndices.length
    let meshVertexCount = 0

    for (const polygon of country.polygons) {
      polygon.forEach((ring, index) => {
        ringRecords.push({ pointOffset: outlinePoints.length / 2, pointCount: ring.length, isHole: index > 0 ? 1 : 0 })
        for (const [lon, lat] of ring) outlinePoints.push(lon, lat)
      })
      const mesh = triangulatePolygon(polygon)
      const base = meshVertexCount
      for (const value of mesh.vertices) meshVertices.push(value)
      for (const index of mesh.indices) meshIndices.push(base + index)
      meshVertexCount += mesh.vertices.length / 2
    }

    country.ringCount = ringRecords.length - country.ringOffset
    country.meshVertexCount = meshVertexCount
    country.meshIndexCount = meshIndices.length - country.meshIndexOffset
  }

  const size = HEADER_BYTES
    + countries.length * COUNTRY_RECORD_BYTES
    + ringRecords.length * RING_RECORD_BYTES
    + outlinePoints.length * 4
    + meshVertices.length * 4
    + meshIndices.length * 4
  const buffer = Buffer.alloc(size)
  let offset = 0
  buffer.write(MAGIC, offset, 'ascii'); offset += 8
  for (const value of [FORMAT_VERSION, countries.length, ringRecords.length,
    outlinePoints.length / 2, meshVertices.length / 2, meshIndices.length]) {
    buffer.writeUInt32LE(value, offset); offset += 4
  }
  for (const country of countries) {
    buffer.write(country.id.padEnd(4, '\0').slice(0, 4), offset, 'ascii'); offset += 4
    for (const value of [country.labelPoint.lon, country.labelPoint.lat,
      country.bbox[0], country.bbox[1], country.bbox[2], country.bbox[3]]) {
      buffer.writeFloatLE(value, offset); offset += 4
    }
    for (const value of [country.ringOffset, country.ringCount,
      country.meshVertexOffset, country.meshVertexCount,
      country.meshIndexOffset, country.meshIndexCount]) {
      buffer.writeUInt32LE(value, offset); offset += 4
    }
  }
  for (const ring of ringRecords) {
    buffer.writeUInt32LE(ring.pointOffset, offset); offset += 4
    buffer.writeUInt32LE(ring.pointCount, offset); offset += 4
    buffer.writeUInt32LE(ring.isHole, offset); offset += 4
  }
  for (const value of outlinePoints) { buffer.writeFloatLE(value, offset); offset += 4 }
  for (const value of meshVertices) { buffer.writeFloatLE(value, offset); offset += 4 }
  for (const value of meshIndices) { buffer.writeUInt32LE(value, offset); offset += 4 }
  if (offset !== size) throw new Error(`encoder wrote ${offset} of ${size} bytes`)

  return {
    buffer,
    counts: {
      countries: countries.length,
      rings: ringRecords.length,
      outlinePoints: outlinePoints.length / 2,
      meshVertices: meshVertices.length / 2,
      meshTriangles: meshIndices.length / 3
    }
  }
}

// ------------------------------------------------------------------- build --

async function build() {
  const [countriesSource, placesSource] = await Promise.all([
    readSource(COUNTRIES_SOURCE),
    readSource(PLACES_SOURCE)
  ])
  const capitals = capitalsByCountry(placesSource.json)

  const countries = []
  for (const feature of countriesSource.json.features) {
    const properties = feature.properties
    const id = countryIdOf(properties)
    const polygons = []
    for (const polygon of polygonsOf(feature.geometry)) {
      const rings = polygon.map(prepareRing).filter((ring) => ring !== null)
      if (rings.length > 0) polygons.push(rings)
    }
    if (polygons.length === 0) {
      process.stdout.write(`skipping ${properties.NAME_EN}: every ring fell below the area floor\n`)
      continue
    }

    // The largest single landmass, not the bounding box: France's box reaches
    // French Guiana and the Netherlands' reaches the Caribbean, which would
    // make both of them look like giants next to Egypt.
    let largestArea = 0
    for (const polygon of polygons) {
      largestArea = Math.max(largestArea, Math.abs(ringArea(polygon[0])))
    }
    const labelSpanDegrees = Math.sqrt(largestArea)

    let minLon = 180, minLat = 90, maxLon = -180, maxLat = -90
    for (const polygon of polygons) {
      for (const [lon, lat] of polygon[0]) {
        minLon = Math.min(minLon, lon); maxLon = Math.max(maxLon, lon)
        minLat = Math.min(minLat, lat); maxLat = Math.max(maxLat, lat)
      }
    }
    // The places file and the countries file disagree on a few codes
    // (South Sudan is SDS in one and SSD in the other), so try each of them.
    const capital = capitals.get(properties.ADM0_A3)
      ?? capitals.get(properties.ISO_A3_EH)
      ?? capitals.get(properties.ADM0_ISO)
      ?? capitals.get(id)
    const iso3 = properties.ISO_A3_EH && properties.ISO_A3_EH !== '-99' ? properties.ISO_A3_EH : null
    const iso2 = properties.ISO_A2_EH && properties.ISO_A2_EH !== '-99' ? properties.ISO_A2_EH : null
    const isoRole = isoRoleOf(id, iso3)
    const sovereignty = SOVEREIGNTY_BY_TYPE[properties.TYPE] ?? 'indeterminate'

    countries.push({
      id,
      iso2: isoRole === 'country' ? iso2 : null,
      iso3,
      name: properties.NAME_EN,
      names: localizedNames(properties),
      continent: properties.CONTINENT,
      region: properties.REGION_UN,
      // Natural Earth's own four-colour-map palette index: neighbours never
      // share one. Kept for anything that needs countries told apart by colour
      // alone; the globe itself colours by climate.
      mapColor: properties.MAPCOLOR9,
      climate: climateOf(id, properties.LABEL_Y),
      isoRole,
      sovereignty,
      labelPoint: { lat: properties.LABEL_Y, lon: properties.LABEL_X },
      // Roughly how wide the country reads on a map, in degrees — what decides
      // whether it has earned a name at the current zoom.
      labelSpanDegrees,
      bbox: [minLon, minLat, maxLon, maxLat],
      capital: capital ? { name: capital.name, lat: capital.lat, lon: capital.lon } : null,
      schemaVersion: SCHEMA_VERSION,
      polygons
    })
  }

  countries.sort((a, b) => a.id.localeCompare(b.id))
  await loadEarcut()
  const { buffer, counts } = encodeGeometry(countries)

  const records = countries.map((country) => ({
    id: country.id,
    iso2: country.iso2,
    iso3: country.iso3,
    name: country.name,
    names: country.names,
    continent: country.continent,
    region: country.region,
    mapColor: country.mapColor,
    climate: country.climate,
    isoRole: country.isoRole,
    sovereignty: country.sovereignty,
    labelPoint: country.labelPoint,
    labelSpanDegrees: country.labelSpanDegrees,
    bbox: country.bbox,
    capital: country.capital,
    schemaVersion: SCHEMA_VERSION
  }))

  await mkdir(OUT_DIR, { recursive: true })
  await writeFile(join(OUT_DIR, 'countries.json'), `${JSON.stringify({ schemaVersion: SCHEMA_VERSION, countries: records }, null, 2)}\n`)
  await writeFile(join(OUT_DIR, 'geometry.bin'), buffer)
  await writeFile(join(OUT_DIR, 'meta.json'), `${JSON.stringify({
    generator: 'tools/geography/build-geography.mjs',
    formatVersion: FORMAT_VERSION,
    schemaVersion: SCHEMA_VERSION,
    transformVersion: TRANSFORM_VERSION,
    source: {
      name: 'Natural Earth',
      license: 'public domain',
      terms: 'https://www.naturalearthdata.com/about/terms-of-use/',
      release: NE_RELEASE,
      worldview: 'Natural Earth default; disputed units follow the source and are marked status: unrecognized',
      files: [
        { name: `${COUNTRIES_SOURCE}.geojson`, sha256: countriesSource.sha256 },
        { name: `${PLACES_SOURCE}.geojson`, sha256: placesSource.sha256 }
      ]
    },
    transform: {
      simplifyToleranceDegrees: SIMPLIFY_TOLERANCE_DEG,
      minRingAreaSquareDegrees: MIN_RING_AREA_DEG2,
      maxMeshEdgeDegrees: MAX_MESH_EDGE_DEG,
      chaikinSmoothingPasses: SMOOTH_PASSES
    },
    counts,
    bytes: { geometryBin: buffer.length }
  }, null, 2)}\n`)

  process.stdout.write(`${counts.countries} countries, ${counts.rings} rings, ${counts.outlinePoints} outline points, ${counts.meshTriangles} triangles, ${(buffer.length / 1e6).toFixed(2)} MB\n`)
  const withoutCapital = records.filter((country) => country.capital === null && country.sovereignty === 'sovereign')
  if (withoutCapital.length > 0) {
    process.stdout.write(`no capital in the source for: ${withoutCapital.map((c) => c.name).join(', ')}\n`)
  }
}

// ------------------------------------------------------------------- check --

/**
 * The authored content that rides on top of the geography: animals and
 * landmarks. Every country reference has to resolve, every coordinate has to be
 * on Earth, and every entry has to say whether an editor has been through it —
 * an unreviewed fact is not something to say out loud to a child.
 */
async function checkContent(countryIds) {
  const problems = []
  const files = [
    { name: 'animals.json', type: 'animal', markers: 'markers' },
    { name: 'landmarks.json', type: 'landmark', markers: 'marker' }
  ]
  const seen = new Set()
  let districtIds = new Set()
  try {
    const districts = JSON.parse(await readFile(join(CONTENT_DIR, 'districts.json'), 'utf8'))
    districtIds = new Set(districts.items.map((district) => district.id))
    for (const district of districts.items) {
      if (!district.name) problems.push(`district ${district.id} has no name`)
      if (!(district.points?.length > 0)) problems.push(`district ${district.id} has no points`)
      for (const point of district.points ?? []) {
        if (!(point.lat >= -90 && point.lat <= 90) || !(point.lon >= -180 && point.lon <= 180)) {
          problems.push(`district ${district.id} has a point outside the world`)
        }
      }
    }
  } catch (error) {
    problems.push(`districts.json could not be read: ${error.message}`)
  }

  for (const file of files) {
    let parsed
    try {
      parsed = JSON.parse(await readFile(join(CONTENT_DIR, file.name), 'utf8'))
    } catch (error) {
      problems.push(`${file.name} could not be read: ${error.message}`)
      continue
    }
    if (parsed.schemaVersion !== SCHEMA_VERSION) {
      problems.push(`${file.name} is schema ${parsed.schemaVersion}, expected ${SCHEMA_VERSION}`)
    }
    for (const item of parsed.items ?? []) {
      const where = `${file.name} ${item.id ?? '(no id)'}`
      if (!item.id || !item.id.startsWith(`${file.type}.`)) problems.push(`${where} has no ${file.type}. id`)
      if (seen.has(item.id)) problems.push(`duplicate content id ${item.id}`)
      seen.add(item.id)
      if (!item.name) problems.push(`${where} has no name`)
      if (!item.glyph) problems.push(`${where} has no glyph`)
      if (!(item.priority >= 1 && item.priority <= 100)) problems.push(`${where} has priority ${item.priority} outside 1–100`)
      if (!item.review || !['draft', 'reviewed'].includes(item.review.state)) {
        problems.push(`${where} has no review state`)
      }

      for (const districtId of item.districts ?? []) {
        if (!districtIds.has(districtId)) problems.push(`${where} references unknown district ${districtId}`)
      }

      const references = item.country ? [item.country] : (item.countries ?? [])
      for (const id of references) {
        if (!countryIds.has(id)) problems.push(`${where} references ${id}, which is not a country in this build`)
      }

      const markers = file.markers === 'marker' ? [item.marker] : (item.markers ?? [])
      if (markers.length === 0) problems.push(`${where} has no marker`)
      for (const marker of markers) {
        if (!marker || !(marker.lat >= -90 && marker.lat <= 90) || !(marker.lon >= -180 && marker.lon <= 180)) {
          problems.push(`${where} has a marker outside the world`)
        }
      }
    }
  }
  return problems
}

function decodeHeader(buffer) {
  if (buffer.length < HEADER_BYTES) throw new Error('geometry.bin is truncated')
  if (buffer.toString('ascii', 0, 8) !== MAGIC) throw new Error('geometry.bin has the wrong magic')
  return {
    formatVersion: buffer.readUInt32LE(8),
    countryCount: buffer.readUInt32LE(12),
    ringCount: buffer.readUInt32LE(16),
    outlinePointCount: buffer.readUInt32LE(20),
    meshVertexCount: buffer.readUInt32LE(24),
    meshIndexCount: buffer.readUInt32LE(28)
  }
}

async function check() {
  const problems = []
  const [countriesRaw, geometry, metaRaw] = await Promise.all([
    readFile(join(OUT_DIR, 'countries.json'), 'utf8'),
    readFile(join(OUT_DIR, 'geometry.bin')),
    readFile(join(OUT_DIR, 'meta.json'), 'utf8')
  ])
  const { countries } = JSON.parse(countriesRaw)
  const meta = JSON.parse(metaRaw)
  const header = decodeHeader(geometry)

  if (header.formatVersion !== FORMAT_VERSION) problems.push(`geometry.bin is format ${header.formatVersion}, the reader expects ${FORMAT_VERSION}`)
  if (header.countryCount !== countries.length) problems.push(`geometry.bin holds ${header.countryCount} countries, countries.json holds ${countries.length}`)
  if (!meta.source?.release) problems.push('meta.json does not record the Natural Earth release')
  if (meta.transformVersion !== TRANSFORM_VERSION) problems.push(`meta.json records transform ${meta.transformVersion}, the pipeline is at ${TRANSFORM_VERSION}`)

  const seen = new Set()
  for (const country of countries) {
    if (seen.has(country.id)) problems.push(`duplicate country id ${country.id}`)
    seen.add(country.id)
    if (!/^[A-Z]{3}$/.test(country.id)) problems.push(`${country.id} is not a three-letter id`)
    if (country.iso2 !== null && !/^[A-Z]{2}$/.test(country.iso2)) problems.push(`${country.id} has a malformed iso2 ${country.iso2}`)
    if (country.iso3 !== null && !/^[A-Z]{3}$/.test(country.iso3)) problems.push(`${country.id} has a malformed iso3 ${country.iso3}`)
    if (!['country', 'territory', 'unrecognized'].includes(country.isoRole)) problems.push(`${country.id} has an unknown isoRole ${country.isoRole}`)
    if (!['sovereign', 'country', 'dependency', 'disputed', 'indeterminate'].includes(country.sovereignty)) problems.push(`${country.id} has an unknown sovereignty ${country.sovereignty}`)
    if (country.isoRole === 'country' && country.iso2 === null) problems.push(`${country.id} is a country without an iso2`)
    if (!country.name) problems.push(`${country.id} has no English name`)
    if (!(country.mapColor >= 1 && country.mapColor <= 9)) problems.push(`${country.id} has map colour ${country.mapColor} outside 1–9`)
    if (!(country.labelSpanDegrees > 0)) problems.push(`${country.id} has no label span`)
    if (!['polar', 'boreal', 'temperate', 'mediterranean', 'subtropical', 'tropical', 'desert', 'steppe'].includes(country.climate)) {
      problems.push(`${country.id} has an unknown climate ${country.climate}`)
    }
    const { lat, lon } = country.labelPoint ?? {}
    if (!(lat >= -90 && lat <= 90) || !(lon >= -180 && lon <= 180)) problems.push(`${country.id} has a label point outside the world: ${lon},${lat}`)
    const [minLon, minLat, maxLon, maxLat] = country.bbox ?? []
    if (!(minLon <= maxLon) || !(minLat <= maxLat)) problems.push(`${country.id} has an inverted bbox`)
    if (country.capital) {
      if (!(country.capital.lat >= -90 && country.capital.lat <= 90) || !(country.capital.lon >= -180 && country.capital.lon <= 180)) {
        problems.push(`${country.id} has a capital outside the world`)
      }
      if (!country.capital.name) problems.push(`${country.id} has a capital without a name`)
    }
    if (country.schemaVersion !== SCHEMA_VERSION) problems.push(`${country.id} is schema ${country.schemaVersion}, expected ${SCHEMA_VERSION}`)
  }

  let offset = HEADER_BYTES
  const records = []
  for (let i = 0; i < header.countryCount; i++) {
    const base = offset + i * COUNTRY_RECORD_BYTES
    records.push({
      id: geometry.toString('ascii', base, base + 4).replace(/\0/g, ''),
      ringOffset: geometry.readUInt32LE(base + 28),
      ringCount: geometry.readUInt32LE(base + 32),
      meshVertexOffset: geometry.readUInt32LE(base + 36),
      meshVertexCount: geometry.readUInt32LE(base + 40),
      meshIndexOffset: geometry.readUInt32LE(base + 44),
      meshIndexCount: geometry.readUInt32LE(base + 48)
    })
  }
  offset += header.countryCount * COUNTRY_RECORD_BYTES
  const ringsOffset = offset
  offset += header.ringCount * RING_RECORD_BYTES
  const outlineOffset = offset
  offset += header.outlinePointCount * 8
  const meshVertexOffset = offset
  offset += header.meshVertexCount * 8
  const meshIndexOffset = offset
  offset += header.meshIndexCount * 4
  if (offset !== geometry.length) problems.push(`geometry.bin is ${geometry.length} bytes, the table of contents describes ${offset}`)

  for (let i = 0; i < records.length; i++) {
    const record = records[i]
    if (record.id !== countries[i].id) problems.push(`geometry country ${i} is ${record.id}, countries.json has ${countries[i].id}`)
    if (record.ringCount === 0) problems.push(`${record.id} has no outline rings`)
    if (record.meshIndexCount === 0) problems.push(`${record.id} has no fill triangles`)
    if (record.ringOffset + record.ringCount > header.ringCount) problems.push(`${record.id} points past the ring table`)
    for (let r = record.ringOffset; r < record.ringOffset + record.ringCount; r++) {
      const ringBase = ringsOffset + r * RING_RECORD_BYTES
      const pointOffset = geometry.readUInt32LE(ringBase)
      const pointCount = geometry.readUInt32LE(ringBase + 4)
      if (pointCount < 3) problems.push(`${record.id} has a ring of ${pointCount} points`)
      if (pointOffset + pointCount > header.outlinePointCount) problems.push(`${record.id} has a ring past the point table`)
    }
    for (let k = 0; k < record.meshIndexCount; k++) {
      const index = geometry.readUInt32LE(meshIndexOffset + (record.meshIndexOffset + k) * 4)
      if (index >= record.meshVertexCount) {
        problems.push(`${record.id} has a triangle index ${index} past its ${record.meshVertexCount} vertices`)
        break
      }
    }
  }

  for (let p = 0; p < header.outlinePointCount; p++) {
    const lon = geometry.readFloatLE(outlineOffset + p * 8)
    const lat = geometry.readFloatLE(outlineOffset + p * 8 + 4)
    if (!(lon >= -180.001 && lon <= 180.001) || !(lat >= -90.001 && lat <= 90.001)) {
      problems.push(`outline point ${p} is outside the world: ${lon},${lat}`)
      break
    }
  }
  for (let v = 0; v < header.meshVertexCount; v++) {
    const lon = geometry.readFloatLE(meshVertexOffset + v * 8)
    const lat = geometry.readFloatLE(meshVertexOffset + v * 8 + 4)
    if (!(lon >= -180.001 && lon <= 180.001) || !(lat >= -90.001 && lat <= 90.001)) {
      problems.push(`mesh vertex ${v} is outside the world: ${lon},${lat}`)
      break
    }
  }

  problems.push(...await checkContent(new Set(countries.map((country) => country.id))))

  // Dependencies frequently have no seat of government in the source, so only
  // sovereign states are held to capital coverage, minus the documented gaps.
  const sovereign = countries.filter((country) => country.sovereignty === 'sovereign')
  const withCapital = sovereign.filter((country) => country.capital !== null)
  const unexplained = sovereign.filter((country) => country.capital === null && !CAPITAL_ABSENT_IN_SOURCE[country.id])
  if (unexplained.length > 0) {
    problems.push(`sovereign states without a capital: ${unexplained.map((c) => `${c.name} (${c.id})`).join(', ')}`)
  }

  if (problems.length > 0) {
    process.stderr.write(`${problems.length} problem(s) in the generated geography:\n`)
    for (const problem of problems) process.stderr.write(`  - ${problem}\n`)
    process.exitCode = 1
    return
  }
  const content = JSON.parse(await readFile(join(CONTENT_DIR, 'animals.json'), 'utf8')).items.length
    + JSON.parse(await readFile(join(CONTENT_DIR, 'landmarks.json'), 'utf8')).items.length
  process.stdout.write(`geography ok: ${countries.length} countries, ${withCapital.length} sovereign capitals, ${content} content markers, ${header.meshIndexCount / 3} triangles, ${(geometry.length / 1e6).toFixed(2)} MB\n`)
}

const wantsCheck = process.argv.includes('--check')
await (wantsCheck ? check() : build())
