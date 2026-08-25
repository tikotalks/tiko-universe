#!/usr/bin/env node
// Adds authored landmarks to country-landmarks.json. Unlike an animal, a
// landmark has one true position, so each entry carries its own coordinates —
// nothing here is generated.
//
//   node tools/geography/add-country-landmarks.mjs additions/landmarks-europe.json [--write]

import { readFile, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { countriesNear, isInsideCountry } from './country-lookup.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const CONTENT_DIR = join(HERE, '..', '..', 'packages', 'geography', 'content')
const WRITE = process.argv.includes('--write')
const SOURCE = process.argv.find((argument) => argument.endsWith('.json') && !argument.startsWith('--'))

const slug = (value) => value.toLowerCase()
  .normalize('NFKD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

const additions = JSON.parse(await readFile(resolve(SOURCE), 'utf8'))
const target = JSON.parse(await readFile(join(CONTENT_DIR, 'country-landmarks.json'), 'utf8'))

const problems = []
let added = 0
let skipped = 0

for (const [countryId, landmarks] of Object.entries(additions)) {
  const entry = target.countries[countryId]
  if (!entry) {
    problems.push(`${countryId} is not a country in this build`)
    continue
  }
  const already = new Set(entry.landmarks.map((landmark) => landmark.id))

  for (const landmark of landmarks) {
    const id = landmark.id ?? slug(landmark.name)
    if (already.has(id)) {
      skipped += 1
      continue
    }
    const { lat, lon } = landmark
    if (!(lat >= -90 && lat <= 90) || !(lon >= -180 && lon <= 180)) {
      problems.push(`${countryId} ${id} is off the planet`)
      continue
    }
    // A landmark that is not in the country it is filed under is the one
    // mistake this file exists to prevent.
    if (!isInsideCountry(countryId, { lat, lon }) && !countriesNear({ lat, lon }, 1).includes(countryId)) {
      problems.push(`${countryId} ${id} at ${lat}, ${lon} is nowhere near ${countryId}`)
      continue
    }
    entry.landmarks.push({
      id,
      names: { en: landmark.name },
      i18nKey: `geography.landmarks.${id}`,
      lat,
      lon,
      importance: landmark.importance,
      glyph: landmark.glyph ?? '📍',
      mediaId: null,
    })
    already.add(id)
    added += 1
  }
  entry.landmarks.sort((a, b) => a.importance - b.importance || a.id.localeCompare(b.id))
}

if (problems.length > 0) {
  for (const problem of problems.slice(0, 25)) process.stderr.write(`${problem}\n`)
  process.exit(1)
}
if (WRITE) {
  await writeFile(join(CONTENT_DIR, 'country-landmarks.json'), `${JSON.stringify(target, null, 2)}\n`)
}

const counts = Object.values(target.countries).map((entry) => entry.landmarks.length)
const total = counts.reduce((sum, count) => sum + count, 0)
process.stdout.write(
  `${added} added, ${skipped} already there — ${total} landmarks over ${counts.length} countries ` +
  `(${(total / counts.length).toFixed(1)} each, ${counts.filter((count) => count < 10).length} still under ten)\n`
)
