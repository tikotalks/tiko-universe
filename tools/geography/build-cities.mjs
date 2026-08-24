#!/usr/bin/env node
// Every place with a name on it: the capitals — all of them, because South
// Africa has three and Bolivia has two — the capitals of states and provinces,
// and the towns underneath. Which of them shows is decided by importance, so
// the whole Earth carries a handful of capitals and zooming into a country
// fills it in.
//
//   node tools/geography/build-cities.mjs           rebuild packages/geography/generated/cities.json
//   node tools/geography/build-cities.mjs --check   validate the committed one

import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const OUT_DIR = join(HERE, '..', '..', 'packages', 'geography', 'generated')
const CONTENT_DIR = join(HERE, '..', '..', 'packages', 'geography', 'content')
const CACHE_DIR = join(HERE, '.cache')
const NE_RELEASE = 'v5.1.2'
const NE_BASE = `https://raw.githubusercontent.com/nvkelso/natural-earth-vector/${NE_RELEASE}/geojson`
const SOURCE = 'ne_10m_populated_places_simple'
const MEDIA_API = 'https://media.tikoapi.org/v1/media'
const SCHEMA_VERSION = 1
const CHECK = process.argv.includes('--check')

/** Categories worth searching for a picture of a city. */
const MEDIA_CATEGORIES = ['cities', 'landmarks', 'travel', 'geography']

const slug = (value) => value.toLowerCase()
  .normalize('NFKD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

const normalise = (value) => (value ?? '')
  .normalize('NFKD').replace(/[̀-ͯ]/g, '')
  .toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()

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

/** Title → media item, for the handful of cities the library has a picture of. */
async function cityArtwork() {
  const found = new Map()
  for (const category of MEDIA_CATEGORIES) {
    for (let page = 1; page <= 6; page++) {
      const response = await fetch(`${MEDIA_API}?category=${category}&type=image&limit=100&page=${page}`)
      if (!response.ok) break
      const body = await response.json()
      for (const item of body.data ?? []) found.set(normalise(item.title), item)
      if (page >= (body.meta?.totalPages ?? 1)) break
    }
  }
  return found
}

/**
 * How soon a place shows. A national capital carries its whole country; a town
 * waits until a child is standing on it. Natural Earth's scalerank is how
 * prominent the place is on a map, which is the same question.
 */
function importanceOf({ featurecla, scalerank }) {
  const rank = Number.isFinite(scalerank) ? scalerank : 8
  switch (featurecla) {
    case 'Admin-0 capital': return Math.min(4, Math.max(2, 1 + Math.round(rank / 3)))
    case 'Admin-0 capital alt':
    case 'Admin-0 region capital': return 4
    case 'Admin-1 capital':
    case 'Admin-1 region capital': return Math.min(9, Math.max(5, 4 + Math.round(rank / 3)))
    case 'Scientific station': return 9
    default: return Math.min(10, Math.max(6, 5 + Math.round(rank / 3)))
  }
}

const KIND = {
  'Admin-0 capital': 'capital',
  'Admin-0 capital alt': 'capital',
  'Admin-0 region capital': 'capital',
  'Admin-1 capital': 'regional',
  'Admin-1 region capital': 'regional',
  'Scientific station': 'station',
}

const countries = JSON.parse(await readFile(join(OUT_DIR, 'countries.json'), 'utf8')).countries
const countryIds = new Set(countries.map((country) => country.id))
const artwork = CHECK ? new Map() : await cityArtwork()

const collection = await geojson(SOURCE)
const items = []
const seen = new Set()
const problems = []

for (const feature of collection.features) {
  const p = feature.properties
  const name = p.name ?? p.nameascii
  if (!name) continue
  if (p.featurecla === 'Historic place' || p.featurecla === 'Meteorological Station') continue

  const country = countryIds.has(p.adm0_a3) ? p.adm0_a3 : null
  if (!country) continue

  // Two towns of the same name in one country is common; the country and a
  // counter keep them apart without pretending they are the same place.
  let id = slug(`${name}-${country}`)
  let suffix = 2
  while (seen.has(id)) id = `${slug(`${name}-${country}`)}-${suffix++}`
  seen.add(id)

  const lat = p.latitude ?? feature.geometry?.coordinates?.[1]
  const lon = p.longitude ?? feature.geometry?.coordinates?.[0]
  if (!(lat >= -90 && lat <= 90) || !(lon >= -180 && lon <= 180)) {
    problems.push(`${name} (${country}) is off the planet`)
    continue
  }

  const picture = artwork.get(normalise(name))
  items.push({
    id,
    name,
    kind: KIND[p.featurecla] ?? 'city',
    // A country can have more than one seat of government, and the map should
    // say so rather than pick a favourite — South Africa governs from Pretoria,
    // legislates in Cape Town and judges in Bloemfontein. Natural Earth files
    // Johannesburg in the same class without flagging it, and it is not one.
    isCapital: p.adm0cap === 1 || p.capalt === 1,
    country,
    region: p.adm1name ?? null,
    importance: importanceOf(p),
    lat: Number(lat.toFixed(4)),
    lon: Number(lon.toFixed(4)),
    ...(picture ? { mediaId: slug(picture.title) } : {}),
  })
}

items.sort((a, b) => a.importance - b.importance || a.name.localeCompare(b.name))

for (const item of items) {
  if (!(item.importance >= 1 && item.importance <= 10)) problems.push(`${item.name} has importance ${item.importance}`)
}
// The countries whose several capitals are the reason this file exists.
for (const [country, expected] of [['ZAF', 3], ['BOL', 2]]) {
  const capitals = items.filter((item) => item.country === country && item.isCapital).length
  if (capitals < expected) problems.push(`${country} has ${capitals} capitals, expected ${expected}`)
}
if (problems.length > 0) {
  for (const problem of problems.slice(0, 20)) process.stderr.write(`${problem}\n`)
  process.exit(1)
}

const payload = `${JSON.stringify({
  schemaVersion: SCHEMA_VERSION,
  note: `Built by tools/geography/build-cities.mjs from Natural Earth ${NE_RELEASE} ${SOURCE}. Every capital, including the countries that have several.`,
  items,
}, null, 2)}\n`

const file = join(OUT_DIR, 'cities.json')
if (CHECK) {
  const committed = existsSync(file) ? await readFile(file, 'utf8') : ''
  // The pictures come from a live library, so only the geography is compared.
  const strip = (text) => text.replace(/\n\s*"mediaId": "[^"]*",?/g, '')
  if (strip(committed) !== strip(payload)) {
    process.stderr.write('cities.json does not match the source data — run node tools/geography/build-cities.mjs\n')
    process.exit(1)
  }
} else {
  await mkdir(OUT_DIR, { recursive: true })
  await writeFile(file, payload)
}

const capitals = items.filter((item) => item.isCapital).length
const withArt = items.filter((item) => item.mediaId).length
process.stdout.write(
  `cities ok: ${items.length} places, ${capitals} capitals across ` +
  `${new Set(items.filter((i) => i.isCapital).map((i) => i.country)).size} countries, ${withArt} with a picture\n`
)
