#!/usr/bin/env node
// The names of the places that are not countries: the oceans and seas, and the
// islands inside countries. Sicily and Crete belong to a country that already
// has a label of its own, so without this they go by unnamed however far in a
// child zooms.
//
// Each name sits at the point furthest from that place's own edge — where a
// cartographer writes it, and the only place a long one fits. Natural Earth
// carries all of them in 26 languages, so a Dutch child reads "Middellandse
// Zee" and "Sicilië" without Tiko translating anything itself.
//
//   node tools/geography/build-places.mjs           rebuild seas.json and regions.json
//   node tools/geography/build-places.mjs --check   validate the committed ones

import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const OUT_DIR = join(HERE, '..', '..', 'packages', 'geography', 'generated')
const CACHE_DIR = join(HERE, '.cache')
const NE_RELEASE = 'v5.1.2'
const NE_BASE = `https://raw.githubusercontent.com/nvkelso/natural-earth-vector/${NE_RELEASE}/geojson`
const SCHEMA_VERSION = 1
const CHECK = process.argv.includes('--check')

/** Anything too small to name at any zoom this globe reaches. */
const MIN_AREA_DEG2 = 0.6
/** An island can be named far smaller than an ocean, and often has to be. */
const MIN_ISLAND_AREA_DEG2 = 0.004

const slug = (value) => value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

async function geojson(name) {
  await mkdir(CACHE_DIR, { recursive: true })
  const file = join(CACHE_DIR, `${NE_RELEASE}-${name}.geojson`)
  if (!existsSync(file)) {
    const response = await fetch(`${NE_BASE}/${name}.geojson`)
    if (!response.ok) throw new Error(`${name}: ${response.status}`)
    await writeFile(file, Buffer.from(await response.arrayBuffer()))
  }
  return JSON.parse(await readFile(file, 'utf8'))
}

/**
 * How soon a name shows. An ocean carries the whole Earth; the Bay of Biscay
 * waits until a child is looking at Europe. Natural Earth's scalerank says how
 * important a place is, which is the same question.
 */
function marineImportance({ featurecla, scalerank }) {
  if (featurecla === 'ocean') return 1
  const base = Math.min(10, Math.max(2, 3 + Math.round(scalerank * 1.4)))
  // A reef or a river mouth is a detail even when it is a famous one.
  return ['reef', 'river', 'sound', 'channel'].includes(featurecla) ? Math.min(10, base + 2) : base
}

/** Greenland from space, a Greek islet only once a child is standing on Greece. */
function islandImportance({ scalerank }) {
  return Math.min(10, Math.max(2, 2 + Math.round(scalerank ?? 5)))
}

function ringsOf(geometry) {
  return polygonsOf(geometry).flat()
}

/** Each polygon with its own holes, rather than every ring in one heap. */
function polygonsOf(geometry) {
  if (!geometry) return []
  return geometry.type === 'MultiPolygon' ? geometry.coordinates : [geometry.coordinates]
}

/**
 * The name goes on the biggest piece. The Caribbean Netherlands is three specks
 * a thousand kilometres apart, and the middle of all three is open sea.
 */
function largestPart(geometry) {
  const polygons = polygonsOf(geometry).filter((polygon) => polygon[0]?.length >= 4)
  if (polygons.length === 0) return []
  return polygons.reduce((best, polygon) => (area(polygon[0]) > area(best[0]) ? polygon : best))
}

function area(ring) {
  let sum = 0
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    sum += (ring[j][0] - ring[i][0]) * (ring[j][1] + ring[i][1])
  }
  return Math.abs(sum / 2)
}

function contains(rings, [x, y]) {
  let inside = false
  for (const ring of rings) {
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [xi, yi] = ring[i]
      const [xj, yj] = ring[j]
      if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside
    }
  }
  return inside
}

/** Distance to the nearest shore, in degrees, with longitude squeezed by latitude. */
function toShore(rings, [x, y]) {
  const squeeze = Math.max(0.2, Math.cos((y * Math.PI) / 180))
  let best = Infinity
  for (const ring of rings) {
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const ax = (ring[j][0] - x) * squeeze
      const ay = ring[j][1] - y
      const bx = (ring[i][0] - x) * squeeze
      const by = ring[i][1] - y
      const dx = bx - ax
      const dy = by - ay
      const length = dx * dx + dy * dy
      const t = length === 0 ? 0 : Math.max(0, Math.min(1, -(ax * dx + ay * dy) / length))
      best = Math.min(best, Math.hypot(ax + t * dx, ay + t * dy))
    }
  }
  return best
}

/**
 * Where the name goes: the point inside the water furthest from any shore.
 * Found by looking, not by averaging — the middle of the Mediterranean's
 * bounding box is in Algeria.
 */
function labelPoint(rings) {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const ring of rings) {
    for (const [x, y] of ring) {
      minX = Math.min(minX, x); maxX = Math.max(maxX, x)
      minY = Math.min(minY, y); maxY = Math.max(maxY, y)
    }
  }

  let best = [(minX + maxX) / 2, (minY + maxY) / 2]
  let bestDistance = -Infinity
  let stepX = (maxX - minX) / 24
  let stepY = (maxY - minY) / 24
  let [fromX, toX, fromY, toY] = [minX, maxX, minY, maxY]

  for (let pass = 0; pass < 4; pass++) {
    for (let x = fromX; x <= toX; x += stepX) {
      for (let y = fromY; y <= toY; y += stepY) {
        if (!contains(rings, [x, y])) continue
        const distance = toShore(rings, [x, y])
        if (distance > bestDistance) {
          bestDistance = distance
          best = [x, y]
        }
      }
    }
    ;[fromX, toX] = [best[0] - stepX, best[0] + stepX]
    ;[fromY, toY] = [best[1] - stepY, best[1] + stepY]
    stepX /= 6
    stepY /= 6
  }
  return { point: best, reach: bestDistance }
}

/**
 * Fiji and Wrangel Island sit on the date line, where a ring runs from 179 to
 * -179 and every measurement of it comes out as the width of the world. Shifted
 * into one continuous stretch of longitude, they measure like anything else.
 */
function unwrap(rings) {
  const lons = rings.flat().map(([lon]) => lon)
  if (Math.max(...lons) - Math.min(...lons) <= 180) return rings
  return rings.map((ring) => ring.map(([lon, lat]) => [lon < 0 ? lon + 360 : lon, lat]))
}

/**
 * Turns one Natural Earth collection into a pack of named places. `pick` says
 * which features count, `importanceOf` how soon each shows, and the rest is the
 * same either way: find the point furthest inside it, keep every translation
 * the source has, and drop anything too small to carry its own name.
 */
function compile(collection, { pick, importanceOf, minArea }) {
  const items = []
  const seen = new Set()
  const skipped = []

  for (const feature of collection.features) {
    const properties = Object.fromEntries(
      Object.entries(feature.properties).map(([key, value]) => [key.toLowerCase(), value])
    )
    if (!pick(properties)) continue
    const name = properties.name_en ?? properties.name
    if (!name) continue
    const rings = ringsOf(feature.geometry).filter((ring) => ring.length >= 4)
    if (rings.length === 0) continue
    const size = rings.reduce((total, ring) => total + area(ring), 0)
    if (size < minArea) {
      skipped.push(name)
      continue
    }

    const id = slug(name)
    if (seen.has(id)) continue
    seen.add(id)

    const { point, reach } = labelPoint(unwrap(largestPart(feature.geometry)))
    const names = {}
    for (const [key, value] of Object.entries(properties)) {
      if (!key.startsWith('name_') || !value) continue
      const code = key.slice(5)
      if (code.length > 3) continue
      names[code] = value
    }

    items.push({
      id,
      name,
      names,
      kind: properties.featurecla,
      importance: importanceOf(properties),
      // How much room the name has: a label wider than the place it names is
      // worse than no label, and the app uses this to decide.
      reachDegrees: Number(reach.toFixed(3)),
      lat: Number(point[1].toFixed(4)),
      // Back into the range the rest of the world uses, for anything that was
      // unwrapped across the date line to be measured.
      lon: Number((((point[0] + 540) % 360) - 180).toFixed(4)),
    })
  }

  items.sort((a, b) => a.importance - b.importance || a.name.localeCompare(b.name))
  return { items, skipped }
}

function validate(items, label) {
  const problems = []
  for (const item of items) {
    if (!(item.lat >= -90 && item.lat <= 90) || !(item.lon >= -180 && item.lon <= 180)) {
      problems.push(`${item.name} is off the planet`)
    }
    if (!(item.importance >= 1 && item.importance <= 10)) problems.push(`${item.name} has importance ${item.importance}`)
    if (item.reachDegrees <= 0) problems.push(`${item.name} has no room for its own name`)
  }
  if (problems.length > 0) {
    for (const problem of problems) process.stderr.write(`${label}: ${problem}\n`)
    process.exit(1)
  }
}

async function emit(file, note, items) {
  const payload = `${JSON.stringify({ schemaVersion: SCHEMA_VERSION, note, items }, null, 2)}\n`
  const path = join(OUT_DIR, file)
  if (CHECK) {
    if (!existsSync(path) || (await readFile(path, 'utf8')) !== payload) {
      process.stderr.write(`${file} does not match the source data — run node tools/geography/build-places.mjs\n`)
      process.exit(1)
    }
    return
  }
  await mkdir(OUT_DIR, { recursive: true })
  await writeFile(path, payload)
}

// ------------------------------------------------------------------ water --

const MARINE = 'ne_50m_geography_marine_polys'
const water = compile(await geojson(MARINE), {
  pick: () => true,
  importanceOf: marineImportance,
  minArea: MIN_AREA_DEG2,
})
validate(water.items, 'seas')
// The five oceans a child is taught, as a check that the source is the source.
for (const ocean of ['Atlantic Ocean', 'Pacific Ocean', 'Indian Ocean', 'Southern Ocean', 'Arctic Ocean']) {
  if (!water.items.some((item) => item.name === ocean)) {
    process.stderr.write(`seas: ${ocean} is missing\n`)
    process.exit(1)
  }
}
await emit(
  'seas.json',
  `Built by tools/geography/build-places.mjs from Natural Earth ${NE_RELEASE} ${MARINE}. The point is the place inside the water furthest from any shore.`,
  water.items
)

// ----------------------------------------------------------------- islands --

const REGIONS = 'ne_10m_geography_regions_polys'
const islands = compile(await geojson(REGIONS), {
  pick: (properties) => ['island', 'island group'].includes((properties.featurecla ?? '').toLowerCase()),
  importanceOf: islandImportance,
  minArea: MIN_ISLAND_AREA_DEG2,
})
validate(islands.items, 'islands')
for (const island of ['Sicily', 'Crete', 'Corsica']) {
  if (!islands.items.some((item) => item.name === island)) {
    process.stderr.write(`islands: ${island} is missing\n`)
    process.exit(1)
  }
}
await emit(
  'islands.json',
  `Built by tools/geography/build-places.mjs from Natural Earth ${NE_RELEASE} ${REGIONS}. Islands inside countries, which the country layer cannot name.`,
  islands.items
)

// -------------------------------------------------------------- territories --

// The parts of countries that have names of their own: Alaska, Zanzibar,
// Scotland, the Canaries — and the Caribbean Netherlands, which is as close as
// any Natural Earth layer gets to naming Bonaire.
const SUBUNITS = 'ne_50m_admin_0_map_subunits'
const territories = compile(await geojson(SUBUNITS), {
  // A subunit whose code matches its country is the whole country under
  // another spelling, and the country layer already draws that.
  pick: (properties) => properties.su_a3 !== properties.adm0_a3 && properties.name !== properties.admin,
  importanceOf: ({ scalerank, labelrank }) => Math.min(10, Math.max(3, 2 + Math.round((labelrank ?? scalerank ?? 5)))),
  minArea: MIN_ISLAND_AREA_DEG2,
})
validate(territories.items, 'territories')
for (const part of ['Alaska', 'Caribbean Netherlands', 'Scotland']) {
  if (!territories.items.some((item) => item.name === part)) {
    process.stderr.write(`territories: ${part} is missing\n`)
    process.exit(1)
  }
}
await emit(
  'territories.json',
  `Built by tools/geography/build-places.mjs from Natural Earth ${NE_RELEASE} ${SUBUNITS}. Parts of countries with names of their own.`,
  territories.items
)

const oceans = water.items.filter((item) => item.kind === 'ocean').length
process.stdout.write(
  `places ok: ${water.items.length} named waters (${oceans} oceans), ` +
  `${islands.items.length} named islands, ${territories.items.length} named parts of countries, ` +
  `${water.skipped.length + islands.skipped.length + territories.skipped.length} too small to name\n`
)
