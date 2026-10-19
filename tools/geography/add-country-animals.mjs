#!/usr/bin/env node
// Adds authored animals to country-animals.json. The species list is the claim
// and is written by hand; the position is a point inside that country, chosen
// deterministically so the same animal lands in the same place on every build.
//
//   node tools/geography/add-country-animals.mjs additions/africa.json
//   node tools/geography/add-country-animals.mjs additions/africa.json --write
//
// An additions file is { "SDN": [{ "name": "Nile crocodile",
// "scientificName": "Crocodylus niloticus", "importance": 3 }, ...] }.
// Nothing is inferred: a country gets an animal because somebody put it there.

import { readFile, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { pointsInsideCountry } from './country-lookup.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const CONTENT_DIR = join(HERE, '..', '..', 'packages', 'geography', 'content')
const GENERATED_DIR = join(HERE, '..', '..', 'packages', 'geography', 'generated')
const WRITE = process.argv.includes('--write')
const SOURCE = process.argv.find((argument) => argument.endsWith('.json') && !argument.startsWith('--'))

if (!SOURCE) {
  process.stderr.write('usage: add-country-animals.mjs <additions.json> [--write]\n')
  process.exit(1)
}

const slug = (value) => value.toLowerCase()
  .normalize('NFKD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

const additions = JSON.parse(await readFile(resolve(SOURCE), 'utf8'))
const target = JSON.parse(await readFile(join(CONTENT_DIR, 'country-animals.json'), 'utf8'))
const countries = JSON.parse(await readFile(join(GENERATED_DIR, 'countries.json'), 'utf8')).countries
const byId = new Map(countries.map((country) => [country.id, country]))

const problems = []
let added = 0
let skipped = 0

for (const [countryId, animals] of Object.entries(additions)) {
  const country = byId.get(countryId)
  const entry = target.countries[countryId]
  if (!country || !entry) {
    problems.push(`${countryId} is not a country in this build`)
    continue
  }

  const already = new Set(entry.animals.map((animal) => animal.id))
  const wanted = animals.filter((animal) => !already.has(animal.id ?? slug(animal.name)))
  skipped += animals.length - wanted.length
  if (wanted.length === 0) continue

  // Spread through the country rather than stacked on its middle. Seeded by the
  // country, so adding one animal does not move the others.
  const points = pointsInsideCountry(
    countryId,
    wanted.length + entry.animals.length,
    country.labelPoint,
    `${countryId}:added`
  ).slice(entry.animals.length)

  wanted.forEach((animal, index) => {
    const point = points[index]
    if (!point) {
      problems.push(`${countryId}: no room inside for ${animal.name}`)
      return
    }
    const id = animal.id ?? slug(animal.name)
    entry.animals.push({
      id,
      names: { en: animal.name },
      i18nKey: `geography.animals.${id}`,
      scientificName: animal.scientificName ?? null,
      taxonRank: animal.taxonRank ?? 'species',
      status: animal.status ?? 'wild',
      importance: animal.importance,
      mediaId: animal.mediaId ?? null,
      lat: Number(point.lat.toFixed(3)),
      lon: Number(point.lon.toFixed(3)),
      locationSource: { source: 'curated-country' },
    })
    added += 1
  })

  entry.animals.sort((a, b) => a.importance - b.importance || a.id.localeCompare(b.id))
}

for (const [countryId, entry] of Object.entries(target.countries)) {
  for (const animal of entry.animals) {
    if (!(animal.importance >= 1 && animal.importance <= 10)) {
      problems.push(`${countryId} ${animal.id} has importance ${animal.importance}`)
    }
  }
}

if (problems.length > 0) {
  for (const problem of problems.slice(0, 20)) process.stderr.write(`${problem}\n`)
  process.exit(1)
}

if (WRITE) {
  await writeFile(join(CONTENT_DIR, 'country-animals.json'), `${JSON.stringify(target, null, 2)}\n`)
}

const counts = Object.values(target.countries).map((entry) => entry.animals.length)
const total = counts.reduce((sum, count) => sum + count, 0)
process.stdout.write(
  `${added} added, ${skipped} already there — ${total} placements over ${counts.length} countries ` +
  `(${(total / counts.length).toFixed(1)} each, ${counts.filter((count) => count < 8).length} still under eight)\n`
)
