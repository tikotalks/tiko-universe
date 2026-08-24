#!/usr/bin/env node
// The names of the water, from Natural Earth's marine areas. Oceans, seas,
// gulfs, bays and straits, each with the point furthest from any shore inside
// it — which is where a cartographer writes the name, and the only place a
// long one fits.
//
// Natural Earth carries the names in 26 languages, so they come along: a Dutch
// child reads "Middellandse Zee" without Tiko having to translate anything.
//
//   node tools/geography/build-seas.mjs           rebuild packages/geography/generated/seas.json
//   node tools/geography/build-seas.mjs --check   validate the committed one

import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const OUT_DIR = join(HERE, '..', '..', 'packages', 'geography', 'generated')
const CACHE_DIR = join(HERE, '.cache')
const NE_RELEASE = 'v5.1.2'
const NE_BASE = `https://raw.githubusercontent.com/nvkelso/natural-earth-vector/${NE_RELEASE}/geojson`
const SOURCE = 'ne_50m_geography_marine_polys'
const SCHEMA_VERSION = 1
const CHECK = process.argv.includes('--check')

/** Water too small to name at any zoom this globe reaches. */
const MIN_AREA_DEG2 = 0.6

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
 * important the water is, which is the same question.
 */
function importanceOf({ featurecla, scalerank }) {
  if (featurecla === 'ocean') return 1
  const base = Math.min(10, Math.max(2, 3 + Math.round(scalerank * 1.4)))
  // A reef or a river mouth is a detail even when it is a famous one.
  return ['reef', 'river', 'sound', 'channel'].includes(featurecla) ? Math.min(10, base + 2) : base
}

function ringsOf(geometry) {
  if (!geometry) return []
  return geometry.type === 'MultiPolygon'
    ? geometry.coordinates.flat()
    : geometry.coordinates
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

const collection = await geojson(SOURCE)
const items = []
const seen = new Set()
const skipped = []

for (const feature of collection.features) {
  const properties = feature.properties
  const name = properties.name_en ?? properties.name
  if (!name) continue
  const rings = ringsOf(feature.geometry).filter((ring) => ring.length >= 4)
  if (rings.length === 0) continue
  const size = rings.reduce((total, ring) => total + area(ring), 0)
  if (size < MIN_AREA_DEG2) {
    skipped.push(name)
    continue
  }

  const id = slug(name)
  if (seen.has(id)) continue
  seen.add(id)

  const { point, reach } = labelPoint(rings)
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
    // How much room the name has: a label wider than its water is worse than
    // no label, and the app uses this to decide.
    reachDegrees: Number(reach.toFixed(3)),
    lat: Number(point[1].toFixed(4)),
    lon: Number(point[0].toFixed(4)),
  })
}

items.sort((a, b) => a.importance - b.importance || a.name.localeCompare(b.name))

const problems = []
for (const item of items) {
  if (!(item.lat >= -90 && item.lat <= 90) || !(item.lon >= -180 && item.lon <= 180)) {
    problems.push(`${item.name} is off the planet`)
  }
  if (!(item.importance >= 1 && item.importance <= 10)) problems.push(`${item.name} has importance ${item.importance}`)
  if (item.reachDegrees <= 0) problems.push(`${item.name} has no room for its own name`)
}
// The five oceans a child is taught, as a check that the source is the source.
for (const ocean of ['Atlantic Ocean', 'Pacific Ocean', 'Indian Ocean', 'Southern Ocean', 'Arctic Ocean']) {
  if (!items.some((item) => item.name === ocean)) problems.push(`${ocean} is missing`)
}
if (problems.length > 0) {
  for (const problem of problems) process.stderr.write(`${problem}\n`)
  process.exit(1)
}

const payload = `${JSON.stringify({
  schemaVersion: SCHEMA_VERSION,
  note: `Built by tools/geography/build-seas.mjs from Natural Earth ${NE_RELEASE} ${SOURCE}. The point is the place inside the water furthest from any shore.`,
  items,
}, null, 2)}\n`

const file = join(OUT_DIR, 'seas.json')
if (CHECK) {
  if (!existsSync(file) || (await readFile(file, 'utf8')) !== payload) {
    process.stderr.write('seas.json does not match the source data — run node tools/geography/build-seas.mjs\n')
    process.exit(1)
  }
} else {
  await mkdir(OUT_DIR, { recursive: true })
  await writeFile(file, payload)
}

const oceans = items.filter((item) => item.kind === 'ocean').length
process.stdout.write(
  `seas ok: ${items.length} named waters (${oceans} oceans), ${skipped.length} too small to name\n`
)
