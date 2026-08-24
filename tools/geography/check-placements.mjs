#!/usr/bin/env node
// Guards the compiled packs against the placements that used to slip through:
// a hippo in Ireland, an orca in Botswana, a koala in the Tasman Sea.
//
//   node tools/geography/check-placements.mjs
//
// Runs on the committed packs, so a bad position fails the gate rather than
// reaching a child. The positions are authored now rather than derived, which
// makes this a check on the source rather than on a guess — but a typed
// coordinate goes wrong exactly as easily as a computed one.

import { readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { countriesNear, isLand, isInsideCountry } from './country-lookup.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const CONTENT_DIR = join(HERE, '..', '..', 'packages', 'geography', 'content')

const districts = JSON.parse(await readFile(join(CONTENT_DIR, 'districts.json'), 'utf8')).items
const water = new Set(districts.filter((district) => district.surface === 'water').map((district) => district.id))
const generic = new Set(districts.filter((district) => district.generic).map((district) => district.id))
const GENERATED_DIR = join(HERE, '..', '..', 'packages', 'geography', 'generated')
/**
 * How big each country is on the map. An atoll has no polygon worth testing
 * against at 50 m — Ducie Island is a ring of sand — so the check has to be as
 * strict as the geometry allows and no stricter.
 */
const span = new Map(
  JSON.parse(await readFile(join(GENERATED_DIR, 'countries.json'), 'utf8')).countries
    .map((country) => [country.id, country.labelSpanDegrees ?? 0])
)
const isTiny = (id) => (span.get(id) ?? 0) < 0.6

const animals = JSON.parse(await readFile(join(CONTENT_DIR, 'animals.json'), 'utf8')).items
const landmarks = JSON.parse(await readFile(join(CONTENT_DIR, 'landmarks.json'), 'utf8')).items

/**
 * Landmarks the 50 m outline cannot contain: reefs, atolls, sandbanks, a bridge
 * over a strait, and the South Pole. Everything else has to sit in its country.
 */
const OFFSHORE = new Set([
  'landmark.great-barrier-reef', 'landmark.bikini-atoll', 'landmark.bounty-bay',
  'landmark.south-pole', 'landmark.laayoune', 'landmark.bouvet-island',
  'landmark.crimean-bridge', 'landmark.chersonesus', 'landmark.louisa-reef',
  'landmark.ferghana-valley', 'landmark.fuvahmulah', 'landmark.grand-erg-oriental',
  'landmark.great-sand-sea', 'landmark.shimbiris', 'landmark.europa-island',
  'landmark.nadir-crater', 'landmark.annobon-island'
])

/** How far off its own coast a country's own animal may sit. */
const OFFSHORE_REACH_DEGREES = 2
/** And how far off a speck of an island, whose whole territory is its sea. */
const ISLAND_REACH_DEGREES = 6
/** And how far outside the outline a land animal may be, for a country too small to have an inside. */
const ASHORE_REACH_DEGREES = 0.4

const problems = []
/// Worth a look, but not worth stopping a build: see where they are raised.
const notes = []

for (const animal of animals) {
  const known = (animal.districts ?? []).filter((id) => !generic.has(id))
  const marine = known.length > 0 && known.every((id) => water.has(id))
  const terrestrial = known.length > 0 && known.every((id) => !water.has(id))

  for (const marker of animal.markers) {
    if (marker.country) {
      const wet = !isLand(marker)
      const reach = isTiny(marker.country)
        ? ISLAND_REACH_DEGREES
        : (wet ? OFFSHORE_REACH_DEGREES : ASHORE_REACH_DEGREES)
      if (!isInsideCountry(marker.country, marker) && !countriesNear(marker, reach).includes(marker.country)) {
        // Saying where it actually landed turns a complaint into a fix.
        const actually = countriesNear(marker, 0.5)
        problems.push(
          `${animal.name} is filed under ${marker.country} but sits at ${marker.lat}, ${marker.lon}` +
          (actually.length > 0 ? ` — which is in ${actually.join('/')}` : ' — which is open sea')
        )
      }
      // Land or sea at 50 m resolution is meaningless on a small island, and
      // the district a species is filed under is a rough world-scale grouping.
      // Worth saying, not worth failing a build over.
      if (marine && !wet) {
        notes.push(`${animal.name} lives only in water but stands inland in ${marker.country}`)
      }
      // A puffin on a sea cliff lands in the water at this resolution, and so
      // does anything else on a coast. Only open ocean is wrong.
      if (terrestrial && wet && countriesNear(marker, 0.3).length === 0) {
        notes.push(`${animal.name} lives on land but sits in open ocean off ${marker.country}`)
      }
      continue
    }
    // A world-scale marker answers to the district that placed it: an orca's
    // ocean marker belongs in water, its Arctic one on the ice.
    if (!marker.district || generic.has(marker.district)) continue
    const wet = !isLand(marker)
    if (water.has(marker.district) && !wet) {
      notes.push(`${animal.name} was placed by ${marker.district} but sits on land at ${marker.lat}, ${marker.lon}`)
    }
  }
}

for (const landmark of landmarks) {
  if (OFFSHORE.has(landmark.id)) continue
  const markers = landmark.markers ?? [landmark.marker]
  for (const marker of markers) {
    const country = marker.country ?? landmark.country
    if (!country) continue
    const reach = isTiny(country) ? ISLAND_REACH_DEGREES : 0.75
    if (!isInsideCountry(country, marker) && !countriesNear(marker, reach).includes(country)) {
      problems.push(`${landmark.name} is filed under ${country} but sits nowhere near it`)
    }
  }
}

if (notes.length > 0) {
  process.stdout.write(`${notes.length} placement(s) worth a look:\n`)
  for (const note of notes) process.stdout.write(`  - ${note}\n`)
}

if (problems.length > 0) {
  process.stderr.write(`${problems.length} placement problem(s):\n`)
  for (const problem of problems.slice(0, 40)) process.stderr.write(`  - ${problem}\n`)
  if (problems.length > 40) process.stderr.write(`  … and ${problems.length - 40} more\n`)
  process.exitCode = 1
} else {
  const markers = animals.reduce((total, animal) => total + animal.markers.length, 0)
  process.stdout.write(`placements ok: ${animals.length} animals (${markers} markers) and ${landmarks.length} landmarks, all where they belong\n`)
}
