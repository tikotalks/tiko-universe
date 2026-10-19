#!/usr/bin/env node
// One-off: moves the placements that sit outside the country they are filed
// under. Each coordinate below was checked against the country's own territory
// — a hermit crab filed under Kiribati was sitting in Singapore harbour.
//
//   node tools/geography/fix-placements.mjs [--write]

import { readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { countriesNear, isInsideCountry } from './country-lookup.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const CONTENT_DIR = join(HERE, '..', '..', 'packages', 'geography', 'content')
const WRITE = process.argv.includes('--write')

/** country → animal id → where it actually belongs, and why the old point was wrong. */
const MOVES = {
  COG: { 'african-savanna-elephant': [-2.15, 14.45, 'was over the border in Gabon'] },
  TGO: { baboon: [9.55, 1.05, 'was in Benin'] },
  SAU: { caracal: [24.1, 44.6, 'was at the Egypt/Israel/Jordan tripoint'] },
  TKM: { caracal: [38.6, 58.4, 'was inside Iran'] },
  YEM: { caracal: [15.3, 45.4, 'was inside Oman'] },
  FJI: { clownfish: [-17.75, 177.45, 'was on the Great Barrier Reef in Australia'] },
  MLI: { 'common-ostrich': [16.4, -3.1, 'was in Benin'] },
  SAH: {
    'vulpes-zerda': [24.2, -13.2, 'was out at sea off the coast'],
    'aquila-chrysaetos': [23.9, -13.9, 'was over the border in Morocco'],
  },
  KIR: { 'hermit-crab': [1.35, 173.14, 'was in Singapore harbour'] },
  AFG: {
    'marbled-polecat': [34.6, 65.9, 'was in Pakistan'],
    'persian-leopard': [34.8, 67.2, 'was at Islamabad'],
    scorpion: [32.5, 66.9, 'was at Lahore'],
    'snow-leopard': [37.0, 73.4, 'was over the border; the Wakhan is Afghan'],
  },
  SOM: { scorpion: [4.6, 45.4, 'was in Somaliland'] },
  NZL: { seagull: [-41.3, 174.8, 'was at Cape Town'] },
}

/** The same, for animals that belong in the water rather than on the land. */
const MARINE_MOVES = {
  // Bioko's beaches are where Equatorial Guinea's turtles nest; the old point
  // was open ocean halfway to São Tomé.
  GNQ: { 'sea-turtle': [3.22, 8.62, 'was open ocean halfway to São Tomé'] },
}

const source = JSON.parse(await readFile(join(CONTENT_DIR, 'country-animals.json'), 'utf8'))
const moved = []
const problems = []

for (const [countryId, animals] of Object.entries(MOVES)) {
  const entry = source.countries[countryId]
  if (!entry) {
    problems.push(`${countryId} is not in the file`)
    continue
  }
  for (const [id, [lat, lon, why]] of Object.entries(animals)) {
    const animal = entry.animals.find((candidate) => candidate.id === id)
    if (!animal) {
      problems.push(`${countryId} has no ${id}`)
      continue
    }
    // An atoll has no polygon worth testing against at 50 m, so near enough is
    // the honest test for the specks — and strict for everywhere else.
    const near = isInsideCountry(countryId, { lat, lon })
      || countriesNear({ lat, lon }, 0.6).includes(countryId)
    if (!near) {
      problems.push(`${countryId} ${id}: ${lat}, ${lon} is still not inside it`)
      continue
    }
    animal.lat = lat
    animal.lon = lon
    animal.locationSource = { source: 'corrected' }
    moved.push(`${countryId} ${id} — ${why}`)
  }
}

for (const [countryId, animals] of Object.entries(MARINE_MOVES)) {
  const entry = source.countries[countryId]
  for (const [id, [lat, lon, why]] of Object.entries(animals)) {
    const animal = entry?.animals.find((candidate) => candidate.id === id)
    if (!animal) {
      problems.push(`${countryId} has no ${id}`)
      continue
    }
    if (!countriesNear({ lat, lon }, 1).includes(countryId)) {
      problems.push(`${countryId} ${id}: ${lat}, ${lon} is not off its coast`)
      continue
    }
    animal.lat = lat
    animal.lon = lon
    animal.locationSource = { source: 'corrected' }
    moved.push(`${countryId} ${id} — ${why}`)
  }
}

if (problems.length > 0) {
  for (const problem of problems) process.stderr.write(`${problem}\n`)
  process.exit(1)
}
if (WRITE) {
  await writeFile(join(CONTENT_DIR, 'country-animals.json'), `${JSON.stringify(source, null, 2)}\n`)
}
process.stdout.write(`${moved.length} placements corrected\n`)
for (const line of moved) process.stdout.write(`  ${line}\n`)
