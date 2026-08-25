#!/usr/bin/env node
// Compiles the people pack: the peoples, traditions and historical figures a
// child can meet on the map, from country-people.json.
//
//   node tools/geography/build-people.mjs           report
//   node tools/geography/build-people.mjs --write   write content/people.json
//
// The care rule lives in the authored file and is worth repeating here: this
// names a people or a tradition, never a costume for a modern nationality. A
// Viking is a Viking, not a Norwegian.

import { readFile, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const CONTENT_DIR = join(HERE, '..', '..', 'packages', 'geography', 'content')
const IMAGE_DIR = join(CONTENT_DIR, 'images')
const MEDIA_API = 'https://media.tikoapi.org/v1/media'
const CDN = 'https://data.tikocdn.org/cdn-cgi/image'
const WRITE = process.argv.includes('--write')
const SCHEMA_VERSION = 1

/**
 * id → the media title that pictures it, where the library's own title does not
 * follow from the name. Anything not listed here is looked up by its name, and
 * by the couple of shapes the library tends to use — so a picture published as
 * "Dogon Person" is found the day it appears, without editing this file.
 */
const ARTWORK = {
  viking: 'Viking Person',
  sami: 'Sami Person',
  inuit: 'Inuit Person',
  cowboy: 'Cowboy',
  samurai: 'Samurai',
  geisha: 'Geisha',
  maya: 'Maya Person',
  'native-american': 'Native American Person',
  maasai: 'Masai Person',
  maori: 'Maori-Person',
  'aboriginal-australians': 'Aboriginal Person',
  pharaoh: 'Egyptian Pharaoh',
  cossack: 'Russian Person',
  zulu: 'Zulu Person',
  'ancient-greek': 'Greek Person',
  'roman-legionary': 'Roman Person',
  'mongol-horseman': 'Mongol Warrior',
  inca: 'Inca Person',
  aztec: 'Aztec Person',
  celt: 'Celtic Person',
  volendam: 'Dutch Woman',
  pirate: 'Pirate',
  'joan-of-arc': 'Joan of Arc',
  'genghis-khan': 'Genghis Khan',
  alexander: 'Alexander the Great',
}

const slug = (value) => value.toLowerCase()
  .normalize('NFKD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

async function findPicture(title) {
  const response = await fetch(`${MEDIA_API}?search=${encodeURIComponent(title)}&type=image&limit=25`)
  if (!response.ok) return null
  const data = (await response.json()).data ?? []
  return data.find((item) => (item.title ?? '').toLowerCase() === title.toLowerCase()) ?? null
}

/**
 * The titles a picture of this person could plausibly carry. Tried in order,
 * first exact match wins: the mapped title if there is one, then the name
 * itself, then the two patterns the library already uses elsewhere.
 */
function titlesFor(id, name) {
  const titles = []
  if (ARTWORK[id]) titles.push(ARTWORK[id])
  titles.push(name)
  if (!/\bperson\b/i.test(name)) titles.push(`${name} Person`)
  titles.push(id.replace(/-/g, ' '))
  return [...new Set(titles)]
}

/** The first of those titles the library actually has a picture under. */
async function findAnyPicture(id, name) {
  for (const title of titlesFor(id, name)) {
    const found = await findPicture(title)
    if (found) return found
  }
  return null
}

async function download(item, id) {
  const file = join(IMAGE_DIR, `${id}.png`)
  if (existsSync(file)) return `images/${id}.png`
  const path = new URL(item.original_url ?? `https://data.tikocdn.org/${item.file_name}`).pathname
  const response = await fetch(`${CDN}/width=320,quality=85,f=png${path}`)
  if (!response.ok) return null
  await writeFile(file, Buffer.from(await response.arrayBuffer()))
  return `images/${id}.png`
}

const source = JSON.parse(await readFile(join(CONTENT_DIR, 'country-people.json'), 'utf8'))
const people = new Map()
const problems = []

for (const [countryId, entry] of Object.entries(source.countries)) {
  for (const person of entry.people ?? []) {
    const id = person.id ?? slug(person.name)
    if (!(person.importance >= 1 && person.importance <= 10)) {
      problems.push(`${countryId} ${id} has importance ${person.importance}`)
    }
    if (!(person.lat >= -90 && person.lat <= 90) || !(person.lon >= -180 && person.lon <= 180)) {
      problems.push(`${countryId} ${id} is off the planet`)
      continue
    }
    if (!['living', 'historical'].includes(person.era)) {
      problems.push(`${countryId} ${id} is neither living nor historical`)
    }

    const existing = people.get(id)
    const marker = { lat: person.lat, lon: person.lon, country: countryId, importance: person.importance }
    if (existing) {
      existing.markers.push(marker)
      if (!existing.countries.includes(countryId)) existing.countries.push(countryId)
      existing.importance = Math.min(existing.importance, person.importance)
      continue
    }
    people.set(id, {
      id: `person.${id}`,
      name: person.name,
      // Its own glyph where the entry gives one: two hundred identical figures
      // is a worse map than a drum, a canoe and a pair of skates. The era's
      // default only covers what has not been given one.
      glyph: person.glyph ?? (person.era === 'historical' ? '🛡️' : '🧑'),
      importance: person.importance,
      era: person.era,
      note: person.note ?? null,
      countries: [countryId],
      markers: [marker],
      mediaId: null,
      review: { state: 'draft', source: null },
    })
  }
}

if (problems.length > 0) {
  for (const problem of problems) process.stderr.write(`${problem}\n`)
  process.exit(1)
}

let withArt = 0
let alreadyHere = 0
for (const [id, item] of people) {
  // A file already on disk is the picture: it was downloaded on an earlier run,
  // or drawn and dropped in by hand. No need to ask the library again.
  if (existsSync(join(IMAGE_DIR, `${id}.png`))) {
    item.mediaId = id
    item.image = `images/${id}.png`
    withArt += 1
    alreadyHere += 1
    continue
  }
  const picture = WRITE ? await findAnyPicture(id, item.name) : null
  if (!picture) continue
  const image = await download(picture, id)
  if (!image) continue
  item.mediaId = id
  item.image = image
  withArt += 1
}

const items = [...people.values()].sort((a, b) => a.importance - b.importance || a.name.localeCompare(b.name))

if (WRITE) {
  await writeFile(join(CONTENT_DIR, 'people.json'), `${JSON.stringify({
    schemaVersion: SCHEMA_VERSION,
    note: 'Compiled by tools/geography/build-people.mjs from country-people.json. Peoples and traditions, and figures from history named as history.',
    items,
  }, null, 2)}\n`)
}

const living = items.filter((item) => item.era === 'living').length
process.stdout.write(
  `people ok: ${items.length} (${living} living, ${items.length - living} from history) ` +
  `in ${Object.keys(source.countries).length} countries, ${withArt} with a picture ` +
  `(${alreadyHere} already on disk, ${withArt - alreadyHere} fetched)\n`
)
