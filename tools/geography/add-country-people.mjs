#!/usr/bin/env node
// Merges authored batches of peoples into content/country-people.json.
//
//   node tools/geography/add-country-people.mjs           report
//   node tools/geography/add-country-people.mjs --write   write the file
//
// Reads every tools/geography/additions/people-*.json. Each holds one entry per
// country: a people, a tradition, or a figure from history, named as history.
// The care rule the pack carries is the one thing this cannot check for you —
// name a people or a tradition, never a costume for a modern nationality.
//
// What it can check is where they stand. An entry may give lat/lon; anything
// that lands outside its own country falls back to the capital, and then to the
// label point, and says so. A country that already has an entry is left alone,
// so this can be run again over a file that has grown.

import { readdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { isInsideCountry, countriesNear } from './country-lookup.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const CONTENT_DIR = join(HERE, '..', '..', 'packages', 'geography', 'content')
const GENERATED_DIR = join(HERE, '..', '..', 'packages', 'geography', 'generated')
const ADDITIONS_DIR = join(HERE, 'additions')
const WRITE = process.argv.includes('--write')

/** How far outside its own outline a marker may sit before it is moved. */
const REACH_DEGREES = 0.4
/** And how far for a country too small, or too scattered, to have an inside. */
const ISLAND_REACH_DEGREES = 6

const countries = new Map(
  JSON.parse(await readFile(join(GENERATED_DIR, 'countries.json'), 'utf8'))
    .countries.map((country) => [country.id, country])
)

const isTiny = (country) => {
  const size = country.labelSpanDegrees ?? 0
  if (size < 0.6) return true
  const [minLon, minLat, maxLon, maxLat] = country.bbox ?? [0, 0, 0, 0]
  return Math.max(maxLon - minLon, maxLat - minLat) / Math.max(size, 0.01) > 4
}

/** Whether a point is close enough to count as being in this country. */
function fits(country, point) {
  if (!point) return false
  if (isInsideCountry(country.id, point)) return true
  const reach = isTiny(country) ? ISLAND_REACH_DEGREES : REACH_DEGREES
  return countriesNear(point, reach).includes(country.id)
}

const source = JSON.parse(await readFile(join(CONTENT_DIR, 'country-people.json'), 'utf8'))
const files = (await readdir(ADDITIONS_DIR))
  .filter((name) => name.startsWith('people-') && name.endsWith('.json'))
  .sort()

const added = []
const moved = []
const problems = []
const skipped = []

for (const file of files) {
  const batch = JSON.parse(await readFile(join(ADDITIONS_DIR, file), 'utf8'))
  for (const [countryId, person] of Object.entries(batch.countries)) {
    const country = countries.get(countryId)
    if (!country) {
      problems.push(`${file}: ${countryId} is not a country on the globe`)
      continue
    }
    if ((source.countries[countryId]?.people ?? []).some((existing) => existing.id === person.id)) {
      skipped.push(`${countryId} already has ${person.id}`)
      continue
    }

    // Where they stand: what was authored, else the capital, else the label
    // point — which is inside the country's own drawn shape by construction.
    const authored = Number.isFinite(person.lat) && Number.isFinite(person.lon)
      ? { lat: person.lat, lon: person.lon }
      : null
    const capital = country.capital ? { lat: country.capital.lat, lon: country.capital.lon } : null
    let point = authored
    if (!fits(country, point)) {
      if (authored) {
        moved.push(
          `${countryId} ${person.id}: ${authored.lat}, ${authored.lon} is outside ${country.name}` +
          ` — moved to ${capital ? country.capital.name : 'the label point'}`
        )
      }
      point = fits(country, capital) ? capital : country.labelPoint
    }
    if (!point) {
      problems.push(`${countryId} ${person.id} has nowhere to stand`)
      continue
    }

    const entry = {
      id: person.id,
      name: person.name,
      era: person.era,
      importance: person.importance,
      lat: Number(point.lat.toFixed(2)),
      lon: Number(point.lon.toFixed(2)),
      note: person.note,
    }
    if (person.glyph) entry.glyph = person.glyph
    source.countries[countryId] ??= { people: [] }
    source.countries[countryId].people ??= []
    source.countries[countryId].people.push(entry)
    added.push(`${countryId} ${person.name}`)
  }
}

if (problems.length > 0) {
  for (const problem of problems) process.stderr.write(`  ! ${problem}\n`)
}
for (const note of moved) process.stdout.write(`  ~ ${note}\n`)

// Countries in the order the globe knows them, so the file reads like a map
// rather than like the order the batches happened to be written in.
const order = [...countries.keys()]
const sorted = {}
for (const id of order) {
  if (source.countries[id]) sorted[id] = source.countries[id]
}
for (const [id, entry] of Object.entries(source.countries)) {
  if (!sorted[id]) sorted[id] = entry
}
source.countries = sorted

if (WRITE && problems.length === 0) {
  await writeFile(join(CONTENT_DIR, 'country-people.json'), `${JSON.stringify(source, null, 2)}\n`)
}

const total = Object.keys(source.countries).length
process.stdout.write(
  `people added: ${added.length} in ${files.length} batch(es), ${skipped.length} already there, ` +
  `${moved.length} moved to a point inside their country — ${total} of ${countries.size} countries have someone\n`
)
if (problems.length > 0) process.exitCode = 1
