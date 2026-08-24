#!/usr/bin/env node
// Builds packages/geography/content/landmarks.json from landmark-list.mjs,
// attaching a Tiko media picture wherever the library has one.
//
//   node tools/geography/build-landmarks.mjs           report
//   node tools/geography/build-landmarks.mjs --write   write the pack and fetch images
//
// Landmarks without a picture keep their glyph: a child still finds the place,
// and the gap is printed so the artwork can be commissioned.

import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { countriesNear, isInsideCountry } from './country-lookup.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const CONTENT_DIR = join(HERE, '..', '..', 'packages', 'geography', 'content')
const IMAGE_DIR = join(CONTENT_DIR, 'images')
const MEDIA_API = 'https://media.tikoapi.org/v1/media'
const IMAGE_WIDTH = 320
const WRITE = process.argv.includes('--write')
const SCHEMA_VERSION = 1

const slug = (value) => value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

/** Only an exact title counts: a near miss puts the wrong building on a card. */
async function findPicture(name) {
  const response = await fetch(`${MEDIA_API}?search=${encodeURIComponent(name)}&type=image&limit=50`)
  if (!response.ok) return null
  const data = (await response.json()).data ?? []
  return data.find((item) => (item.title ?? '').toLowerCase() === name.toLowerCase()) ?? null
}

async function download(item, id) {
  await mkdir(IMAGE_DIR, { recursive: true })
  const file = join(IMAGE_DIR, `${id}.png`)
  if (existsSync(file)) return `images/${id}.png`
  const path = new URL(item.original_url).pathname
  const response = await fetch(`https://data.tikocdn.org/cdn-cgi/image/width=${IMAGE_WIDTH},quality=82,f=auto${path}`)
  if (!response.ok) throw new Error(`${id}: image responded ${response.status}`)
  await writeFile(file, Buffer.from(await response.arrayBuffer()))
  return `images/${id}.png`
}

const source = JSON.parse(await readFile(join(CONTENT_DIR, 'country-landmarks.json'), 'utf8'))
/**
 * The authored landmarks, each identified by its id. An entry written before
 * ids existed takes the slug of its name, which is the id the pack has always
 * been built with — so the two sides meet either way.
 */
const LANDMARKS = Object.entries(source.countries).flatMap(([country, entry]) =>
  entry.landmarks.map((landmark) => ({ ...landmark, id: landmark.id ?? slug(landmark.name), country }))
)

const items = []
const withPicture = []
const withoutPicture = []
const misplaced = []
const seen = new Set()

for (const landmark of LANDMARKS) {
  const { country, name, lat, lon, glyph, importance } = landmark
  const key = landmark.id
  const id = `landmark.${key}`
  if (seen.has(id)) {
    misplaced.push(`${name}: duplicate id`)
    continue
  }
  seen.add(id)

  // The 50m outline drops Manhattan and most harbour islands, so "inside" is
  // too strict for a bridge or a statue on a rock. Within 0.75° of the country
  // is the honest test: it still catches a landmark in the wrong country.
  const near = isInsideCountry(country, { lat, lon })
    || countriesNear({ lat, lon }, 0.75).includes(country)
  if (!near) {
    misplaced.push(`${name} (${country})`)
  }

  const picture = await findPicture(name)
  if (picture) withPicture.push(name)
  else withoutPicture.push(`${name} (${country})`)

  items.push({
    id,
    name,
    glyph,
    // 1 shows from space, 10 only at the closest zoom.
    importance,
    country,
    marker: { lat, lon },
    ...(picture ? { mediaId: picture.id, image: WRITE ? await download(picture, key) : `images/${key}.png` } : {}),
    review: { state: 'draft', source: null }
  })
}

items.sort((a, b) => a.name.localeCompare(b.name))

// The authored file carries the ids from now on, so a later rename of the
// English title cannot quietly become a different landmark.
for (const entry of Object.values(source.countries)) {
  entry.landmarks = entry.landmarks.map((landmark) => {
    const { id, name, ...rest } = landmark
    return { id: id ?? slug(name), name, ...rest }
  })
}

if (WRITE) {
  await writeFile(join(CONTENT_DIR, 'country-landmarks.json'), `${JSON.stringify(source, null, 2)}\n`)
  await writeFile(join(CONTENT_DIR, 'landmarks.json'), `${JSON.stringify({
    schemaVersion: SCHEMA_VERSION,
    note: 'Built by tools/geography/build-landmarks.mjs from landmark-list.mjs. Every country has at least one. Coordinates are the landmark itself and every entry is draft until an editor has checked the name, the country and the position.',
    items
  }, null, 2)}\n`)
}

process.stdout.write(`${items.length} landmarks across ${new Set(items.map((item) => item.country)).size} countries\n`)
process.stdout.write(`${withPicture.length} with a Tiko picture, ${withoutPicture.length} showing their glyph\n`)
if (misplaced.length > 0) {
  process.stdout.write(`outside their country's outline (check these): ${misplaced.join('; ')}\n`)
}
