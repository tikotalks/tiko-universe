#!/usr/bin/env node
// Guards the animal pack against the placements that keep slipping through:
// a hippo in Ireland, an orca in Botswana, a koala in the Tasman Sea.
//
//   node tools/geography/check-placements.mjs
//
// Runs on the committed pack, so a bad mapping fails the gate rather than
// reaching a child.

import { readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { countriesNear, isLand, isInsideCountry } from './country-lookup.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const CONTENT_DIR = join(HERE, '..', '..', 'packages', 'geography', 'content')

const districts = JSON.parse(await readFile(join(CONTENT_DIR, 'districts.json'), 'utf8')).items
const marine = new Set(districts.filter((district) => district.isMarine).map((district) => district.id))
const generic = new Set(districts.filter((district) => district.isGeneric).map((district) => district.id))
const animals = JSON.parse(await readFile(join(CONTENT_DIR, 'animals.json'), 'utf8')).items
const landmarks = JSON.parse(await readFile(join(CONTENT_DIR, 'landmarks.json'), 'utf8')).items

/**
 * Landmarks the 50m outline cannot contain: a reef, two atolls, and the South
 * Pole. Listed so the check stays strict for everything else.
 */
const OFFSHORE_LANDMARKS = new Set([
  'landmark.great-barrier-reef', 'landmark.bikini-atoll', 'landmark.bounty-bay',
  'landmark.south-pole', 'landmark.laayoune'
])

/** Coastal and semi-aquatic animals belong in the water at the edge of their district. */
const AT_HOME_IN_WATER = /puffin|seal|manatee|otter|penguin|walrus|beaver|hippopotamus|crocodile|alligator|turtle|frog|toad|tadpole|swan|goose|mallard|duck|flamingo|stork|heron|gull|booby/i

const problems = []

for (const animal of animals) {
  // Water means water. "Worldwide" and "rivers and lakes" are generic, not
  // marine: an ant belongs on the ground like anything else.
  const onlyWater = animal.districts.every((id) => marine.has(id))

  for (const marker of animal.markers) {
    if (marker.closeUp) {
      if (marker.atSea) {
        // A sea animal belongs to a country by sitting off its coast.
        if (isLand(marker)) {
          problems.push(`${animal.name} is off ${marker.country}'s coast but the point is on land`)
        }
        if (!onlyWater) {
          problems.push(`${animal.name} lives on land but was put out to sea off ${marker.country}`)
        }
        continue
      }
      // A country smaller than the simplification tolerance has no interior to
      // stand in; its own label point is as close as the geometry allows.
      // A country smaller than the simplification tolerance is placed on its
      // own outline instead of inside it.
      const tiny = countriesNear(marker, 0.2).includes(marker.country)
      if (!isInsideCountry(marker.country, marker) && !tiny) {
        problems.push(`${animal.name} is placed in ${marker.country} but the point is nowhere near it`)
      }
      if (onlyWater) {
        problems.push(`${animal.name} lives only in water but is standing inside ${marker.country}`)
      }
      continue
    }
    // Each marker answers to the district that placed it: an orca's ocean
    // marker belongs in water, its Arctic one on the ice.
    const wet = !isLand(marker)
    const fromWater = marine.has(marker.district)
    if (fromWater && !wet) {
      problems.push(`${animal.name} was placed by ${marker.district} but sits on land at ${marker.lat}, ${marker.lon}`)
    }
    if (!fromWater && wet && !AT_HOME_IN_WATER.test(animal.name)) {
      problems.push(`${animal.name} was placed by ${marker.district} but sits in water at ${marker.lat}, ${marker.lon}`)
    }
    if (onlyWater && !wet) {
      problems.push(`${animal.name} lives only in water but sits on land at ${marker.lat}, ${marker.lon}`)
    }
  }
}

for (const landmark of landmarks) {
  if (OFFSHORE_LANDMARKS.has(landmark.id)) continue
  const point = landmark.marker
  const near = isInsideCountry(landmark.country, point)
    || countriesNear(point, 0.75).includes(landmark.country)
  if (!near) {
    problems.push(`${landmark.name} is filed under ${landmark.country} but sits nowhere near it`)
  }
}

if (problems.length > 0) {
  process.stderr.write(`${problems.length} placement problem(s):\n`)
  for (const problem of problems.slice(0, 40)) process.stderr.write(`  - ${problem}\n`)
  process.exitCode = 1
} else {
  const markers = animals.reduce((total, animal) => total + animal.markers.length, 0)
  process.stdout.write(`placements ok: ${animals.length} animals (${markers} markers) and ${landmarks.length} landmarks, all where they belong\n`)
}
