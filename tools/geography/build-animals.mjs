#!/usr/bin/env node
// Compiles the animals the app bundles from the authored files. Nothing here
// invents anything: every animal has an id, a name, an importance and real
// coordinates before this script runs, and all it does is put the two authored
// sources — the world-scale ranges and the country-by-country lists — into the
// one shape the globe reads.
//
// It used to do much more: scatter markers inside a district, match animals to
// artwork by their English titles, stand one species in for another when the
// library had no picture. All of that was guesswork covering for data that did
// not exist yet. The data exists now.
//
//   node tools/geography/build-animals.mjs           report
//   node tools/geography/build-animals.mjs --write   write packages/geography/content/animals.json

import { readFile, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const CONTENT_DIR = join(HERE, '..', '..', 'packages', 'geography', 'content')
const IMAGE_DIR = join(CONTENT_DIR, 'images')
const WRITE = process.argv.includes('--write')
const SCHEMA_VERSION = 1

const read = async (name) => JSON.parse(await readFile(join(CONTENT_DIR, name), 'utf8'))
const englishName = (entry) => entry.names?.en ?? entry.name ?? entry.id

/** The picture, if the library has one filed under the id the data points at. */
function artwork(mediaId) {
  if (!mediaId) return null
  return existsSync(join(IMAGE_DIR, `${mediaId}.png`)) ? `images/${mediaId}.png` : null
}

const districts = await read('districts.json')
const districtById = new Map(districts.items.map((district) => [district.id, district]))
const ranges = await read('animal-districts.json')
const byCountry = await read('country-animals.json')

/** One record per animal, however many places it turns up in. */
const animals = new Map()

function entity(entry) {
  const existing = animals.get(entry.id)
  if (existing) return existing
  const record = {
    id: `animal.${entry.id}`,
    name: englishName(entry),
    glyph: '🐾',
    importance: entry.importance ?? 6,
    districts: [],
    region: null,
    countries: [],
    markers: [],
    mediaId: entry.mediaId ?? null,
    image: artwork(entry.mediaId),
    review: { state: 'draft', source: null }
  }
  animals.set(entry.id, record)
  return record
}

// The world-scale ranges: where an animal shows when a child is looking at a
// continent rather than at one country.
const unknownDistricts = []
for (const item of ranges.items) {
  const record = entity(item)
  record.importance = Math.min(record.importance, item.importance ?? record.importance)
  for (const districtId of item.districtIds ?? []) {
    if (!districtById.has(districtId)) unknownDistricts.push(`${item.id} → ${districtId}`)
    else if (!record.districts.includes(districtId)) record.districts.push(districtId)
  }
  for (const marker of item.markers ?? []) {
    // The source lists a few animals twice, with overlapping ranges. Merging
    // them is this script's job; repeating their markers is not.
    const already = record.markers.some((existing) =>
      existing.lat === marker.lat && existing.lon === marker.lon && existing.district === marker.districtId)
    if (already) continue
    record.markers.push({ lat: marker.lat, lon: marker.lon, district: marker.districtId })
  }
}

// The country lists: what a child finds when they zoom into one country. These
// carry their own importance, because an ibex matters more in Switzerland than
// it does across the Alps at large.
const withoutPosition = []
let countryPlacements = 0
for (const [countryId, entry] of Object.entries(byCountry.countries)) {
  const reviewed = entry.review?.state === 'reviewed' || entry.review?.state === 'verified'
  for (const animal of entry.animals ?? []) {
    const record = entity(animal)
    if (animal.mediaId && !record.mediaId) {
      record.mediaId = animal.mediaId
      record.image = artwork(animal.mediaId)
    }
    if (!record.countries.includes(countryId)) record.countries.push(countryId)
    if (reviewed) record.review = { state: 'reviewed', source: entry.review.by ?? null }
    if (!(animal.lat >= -90 && animal.lat <= 90) || !(animal.lon >= -180 && animal.lon <= 180)) {
      withoutPosition.push(`${animal.id} in ${countryId}`)
      continue
    }
    record.markers.push({
      lat: animal.lat,
      lon: animal.lon,
      country: countryId,
      // Only once a child is inside that country: these fill a zoomed-in
      // country rather than crowding the continent.
      closeUp: true,
      ...(animal.importance >= 1 && animal.importance <= 10 ? { importance: animal.importance } : {})
    })
    countryPlacements += 1
  }
}

const items = [...animals.values()]
for (const item of items) {
  item.countries.sort()
  const names = item.districts.map((id) => englishName(districtById.get(id))).filter(Boolean)
  item.region = names.length > 0 ? names.join(' · ') : null
}
items.sort((a, b) => a.name.localeCompare(b.name))

// An animal with no coordinates anywhere is not drawn. The audit stripped the
// invented markers rather than keep fiction, and some of what is left cannot
// have a position at all — the dodo and the woolly mammoth among them.
const placed = items.filter((item) => item.markers.length > 0)
const homeless = items.filter((item) => item.markers.length === 0).map((item) => item.name)

const problems = []
for (const item of placed) {
  if (!(item.importance >= 1 && item.importance <= 10)) problems.push(`${item.id} has importance ${item.importance}`)
}
for (const unknown of unknownDistricts) problems.push(`unknown district: ${unknown}`)
for (const missing of withoutPosition) problems.push(`no coordinates: ${missing}`)
if (problems.length > 0) {
  for (const problem of problems) process.stderr.write(`${problem}\n`)
  process.exit(1)
}

if (WRITE) {
  await writeFile(join(CONTENT_DIR, 'animals.json'), `${JSON.stringify({
    schemaVersion: SCHEMA_VERSION,
    note: 'Compiled by tools/geography/build-animals.mjs from animal-districts.json and country-animals.json. Every position is authored; nothing here is inferred.',
    items: placed
  }, null, 2)}\n`)
}

const withArt = placed.filter((item) => item.image).length
process.stdout.write(
  `${placed.length} animals, ${placed.reduce((n, i) => n + i.markers.length, 0)} markers ` +
  `(${countryPlacements} inside countries), ${withArt} with a picture and ${placed.length - withArt} showing a paw print\n`
)
if (homeless.length > 0) {
  process.stdout.write(`no coordinates anywhere, so not shown: ${homeless.join(', ')}\n`)
}
