#!/usr/bin/env node
// Compiles the landmarks the app bundles from country-landmarks.json. Every
// landmark is authored with an id, a name, its own coordinates and how far out
// it should show, so this only reshapes them and attaches whatever artwork the
// media library already has under the id the data points at.
//
//   node tools/geography/build-landmarks.mjs           report
//   node tools/geography/build-landmarks.mjs --write   write packages/geography/content/landmarks.json

import { readFile, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { countriesNear, isInsideCountry } from './country-lookup.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const CONTENT_DIR = join(HERE, '..', '..', 'packages', 'geography', 'content')
const IMAGE_DIR = join(CONTENT_DIR, 'images')
const WRITE = process.argv.includes('--write')
const SCHEMA_VERSION = 1

/**
 * The 50 m outline drops Manhattan and most harbour islands, so "inside" is too
 * strict for a bridge or a statue on a rock. Within this of the country is the
 * honest test, and it still catches a landmark in the wrong one.
 */
const NEAR_ENOUGH_DEGREES = 0.75

const englishName = (entry) => entry.names?.en ?? entry.name ?? entry.id

function artwork(mediaId) {
  if (!mediaId) return null
  return existsSync(join(IMAGE_DIR, `${mediaId}.png`)) ? `images/${mediaId}.png` : null
}

const source = JSON.parse(await readFile(join(CONTENT_DIR, 'country-landmarks.json'), 'utf8'))

/** Two entries sharing an id within this really are the same place. */
const SAME_PLACE_DEGREES = 2

const groups = new Map()
const problems = []
const misplaced = []
const collisions = []
const shared = []

for (const [country, entry] of Object.entries(source.countries)) {
  const reviewed = entry.review?.state === 'reviewed' || entry.review?.state === 'verified'
  for (const landmark of entry.landmarks ?? []) {
    const { lat, lon } = landmark
    if (!(lat >= -90 && lat <= 90) || !(lon >= -180 && lon <= 180)) {
      problems.push(`${landmark.id} is off the planet`)
      continue
    }
    if (!isInsideCountry(country, { lat, lon }) && !countriesNear({ lat, lon }, NEAR_ENOUGH_DEGREES).includes(country)) {
      misplaced.push(`${englishName(landmark)} (${country})`)
    }

    // A landmark can sit in two countries at once — Iguaçu Falls is on the
    // border and belongs to both. Two places that merely share a name are a
    // different thing entirely, and are told apart by how far apart they are.
    const existing = groups.get(landmark.id)
    if (existing) {
      const near = existing.markers.some((marker) =>
        Math.abs(marker.lat - lat) <= SAME_PLACE_DEGREES && Math.abs(marker.lon - lon) <= SAME_PLACE_DEGREES)
      if (near) {
        existing.markers.push({ lat, lon, country })
        if (!existing.countries.includes(country)) existing.countries.push(country)
        shared.push(`${englishName(landmark)} (${existing.countries.join('/')})`)
        continue
      }
      // Same id, different place. Kept, under a name of its own, and reported:
      // two landmarks answering to one id is a fault in the source.
      collisions.push(`${englishName(landmark)} in ${country}`)
    }

    const id = existing ? `${landmark.id}-${country.toLowerCase()}` : landmark.id
    groups.set(id, {
      id: `landmark.${id}`,
      name: englishName(landmark),
      glyph: landmark.glyph ?? '📍',
      // 1 shows from space, 10 only at the closest zoom.
      importance: landmark.importance,
      countries: [country],
      markers: [{ lat, lon, country }],
      ...(landmark.mediaId ? { mediaId: landmark.mediaId } : {}),
      ...(artwork(landmark.mediaId) ? { image: artwork(landmark.mediaId) } : {}),
      review: { state: reviewed ? 'reviewed' : 'draft', source: reviewed ? entry.review.by ?? null : null }
    })
  }
}

const items = [...groups.values()].map((item) => ({
  ...item,
  country: item.countries.length === 1 ? item.countries[0] : undefined,
  countries: item.countries.length > 1 ? item.countries : undefined,
  marker: item.markers.length === 1 ? item.markers[0] : undefined,
  markers: item.markers.length > 1 ? item.markers : undefined
})).map((item) => JSON.parse(JSON.stringify(item)))

for (const item of items) {
  if (!(item.importance >= 1 && item.importance <= 10)) problems.push(`${item.id} has importance ${item.importance}`)
  if (!item.glyph) problems.push(`${item.id} has no glyph`)
}
if (problems.length > 0) {
  for (const problem of problems) process.stderr.write(`${problem}\n`)
  process.exit(1)
}

items.sort((a, b) => a.name.localeCompare(b.name))

if (WRITE) {
  await writeFile(join(CONTENT_DIR, 'landmarks.json'), `${JSON.stringify({
    schemaVersion: SCHEMA_VERSION,
    note: 'Compiled by tools/geography/build-landmarks.mjs from country-landmarks.json. Every coordinate is authored.',
    items
  }, null, 2)}\n`)
}

const withPicture = items.filter((item) => item.image).length
const reach = new Set(items.flatMap((item) => item.countries ?? [item.country]))
process.stdout.write(`${items.length} landmarks across ${reach.size} countries\n`)
process.stdout.write(`${withPicture} with a Tiko picture, ${items.length - withPicture} showing their glyph\n`)
if (shared.length > 0) {
  process.stdout.write(`on a border, so listed by two countries: ${shared.join('; ')}\n`)
}
if (collisions.length > 0) {
  process.stdout.write(
    `SAME ID, DIFFERENT PLACE (${collisions.length}) — the source gives one id to two landmarks, ` +
    `kept apart here by adding the country: ${collisions.join('; ')}\n`
  )
}
if (misplaced.length > 0) {
  process.stdout.write(`outside their country's outline (check these): ${misplaced.length} — ${misplaced.slice(0, 12).join('; ')}\n`)
}
