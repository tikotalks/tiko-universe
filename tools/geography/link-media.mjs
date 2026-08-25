#!/usr/bin/env node
// Finds the picture for every animal and landmark that has none, and bundles a
// copy so Globe still works in airplane mode.
//
//   node tools/geography/link-media.mjs           report what it would link
//   node tools/geography/link-media.mjs --write   link them and fetch the images
//   node tools/geography/link-media.mjs --animals / --landmarks   just one kind
//
// It writes `mediaId` into the **authored** files — country-animals.json,
// animal-districts.json, country-landmarks.json — so a rebuild keeps the link.
// Writing it into the compiled packs instead would last exactly until the next
// build-animals run.
//
// The one rule that matters: a wrong picture on a child's card is worse than no
// picture. Globe already knows how to show nothing — a landmark falls back to
// its glyph, an animal without art is left off that country's list entirely.
// So this matches on the title and nothing else. "African Crocodile" does not
// get to stand in for a Nile crocodile, and "Flag of China" never gets to be
// the Great Wall.

import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const CONTENT_DIR = join(HERE, '..', '..', 'packages', 'geography', 'content')
const IMAGE_DIR = join(CONTENT_DIR, 'images')
const MEDIA_API = 'https://media.tikoapi.org/v1/media'
/** Wide enough for a card, small enough that a thousand of them still ship. */
const IMAGE_WIDTH = 320
const WRITE = process.argv.includes('--write')
const ONLY_ANIMALS = process.argv.includes('--animals')
const ONLY_LANDMARKS = process.argv.includes('--landmarks')
/** How many downloads to have in flight. */
const CONCURRENCY = 8

/**
 * The handful of subjects whose picture the library files under another name.
 * Curated by hand and by eye, one line each, because the alternative — scoring
 * partial word overlap — is what offered "London" for the Tower of London,
 * "Poseidon" for the Temple of Poseidon and "Cat" for the Van cat. Every rule
 * general enough to catch "Lake Titicaca" for "Titicaca" was also loose enough
 * to catch those, so the list is explicit and short.
 */
const ALIASES = {
  'common-buzzard': 'Buzzard',
  'tower-of-belem': 'Belem Tower',
  vanern: 'Lake Vänern',
  'dojran-lake': 'Lake Dojran',
  'urmia-lake': 'Lake Urmia',
  damavand: 'Mount Damavand',
  ajloun: 'Ajloun Castle',
  'brimstone-hill-fortress': 'Brimstone Hill Fortress National Park',
  titicaca: 'Lake Titicaca',
}

const normalise = (value) => (value ?? '')
  .toLowerCase()
  .normalize('NFKD')
  .replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9]+/g, ' ')
  .trim()

/** The whole library, once. Fifty requests beats one per subject. */
async function library() {
  const items = []
  for (let page = 1; page <= 200; page++) {
    const response = await fetch(`${MEDIA_API}?type=image&limit=100&page=${page}`)
    if (!response.ok) throw new Error(`media api responded ${response.status}`)
    const body = await response.json()
    items.push(...(body.data ?? []))
    if (items.length >= (body.meta?.total ?? 0)) break
  }
  return items
}

/**
 * The library item that is this subject, or nothing. The title has to *be* the
 * name — or the alias says which title to take. There is deliberately no
 * partial-credit tier: Globe shows a glyph perfectly well when it has no
 * picture, and a wrong picture on a child's card is worse than none. A tortoise
 * standing in for a sea turtle tells a child something false and they have no
 * way to know.
 */
function bestMatch(index, subject) {
  const alias = ALIASES[subject.id]
  if (alias) {
    const item = index.byTitle.get(normalise(alias))
    if (item) return { item, points: 100 }
  }
  const exact = index.byTitle.get(normalise(subject.name))
  return exact ? { item: exact, points: 100 } : null
}

function imageURL(item) {
  const base = item.original_url ?? ''
  if (!base.includes('data.tikocdn.org')) return base
  return `https://data.tikocdn.org/cdn-cgi/image/width=${IMAGE_WIDTH},quality=82,f=png${new URL(base).pathname}`
}

async function download(item, slug) {
  await mkdir(IMAGE_DIR, { recursive: true })
  const file = join(IMAGE_DIR, `${slug}.png`)
  if (existsSync(file)) return true
  const response = await fetch(imageURL(item))
  if (!response.ok) return false
  await writeFile(file, Buffer.from(await response.arrayBuffer()))
  return true
}

const items = await library()
const index = { items, byTitle: new Map() }
for (const item of items) {
  const key = normalise(item.title)
  if (key && !index.byTitle.has(key)) index.byTitle.set(key, item)
}
process.stdout.write(`library: ${items.length} images\n`)

/**
 * Every subject that wants a picture and has no `mediaId`, gathered across the
 * authored files so one animal in nine countries is looked up once.
 */
const wanted = new Map()
const files = {}

async function load(name) {
  files[name] = JSON.parse(await readFile(join(CONTENT_DIR, name), 'utf8'))
  return files[name]
}

function want(entry, kind) {
  if (entry.mediaId) return
  const name = entry.names?.en ?? entry.name ?? entry.id
  const existing = wanted.get(entry.id)
  if (existing) {
    existing.entries.push(entry)
    return
  }
  wanted.set(entry.id, { id: entry.id, name, kind, entries: [entry] })
}

const countryAnimals = await load('country-animals.json')
const ranges = await load('animal-districts.json')
const countryLandmarks = await load('country-landmarks.json')

if (!ONLY_LANDMARKS) {
  for (const country of Object.values(countryAnimals.countries)) {
    for (const animal of country.animals ?? []) want(animal, 'animal')
  }
  for (const range of ranges.items) want(range, 'animal')
}
if (!ONLY_ANIMALS) {
  for (const country of Object.values(countryLandmarks.countries)) {
    for (const landmark of country.landmarks ?? []) want(landmark, 'landmark')
  }
}

const linked = []
const unmatched = []
for (const subject of wanted.values()) {
  const match = bestMatch(index, subject)
  if (!match) {
    unmatched.push(subject)
    continue
  }
  linked.push({ ...subject, match })
}

if (!WRITE) {
  const byKind = (kind) => linked.filter((item) => item.kind === kind).length
  const missingKind = (kind) => unmatched.filter((item) => item.kind === kind)
  process.stdout.write(
    `would link ${linked.length}: ${byKind('animal')} animals, ${byKind('landmark')} landmarks\n` +
    `still no picture in the library: ${missingKind('animal').length} animals, ` +
    `${missingKind('landmark').length} landmarks\n`
  )
  process.exit(0)
}

// Fetch first, link second: a `mediaId` pointing at a file that failed to
// download would leave the app looking for a picture that is not in the bundle.
const queue = [...linked]
const failed = []
await Promise.all(Array.from({ length: CONCURRENCY }, async () => {
  while (queue.length > 0) {
    const subject = queue.shift()
    try {
      if (await download(subject.match.item, subject.id)) {
        for (const entry of subject.entries) entry.mediaId = subject.id
      } else {
        failed.push(subject.name)
      }
    } catch (error) {
      failed.push(`${subject.name}: ${error.message}`)
    }
  }
}))

for (const [name, file] of Object.entries(files)) {
  await writeFile(join(CONTENT_DIR, name), `${JSON.stringify(file, null, 2)}\n`)
}

const byKind = (kind) => linked.filter((item) => item.kind === kind).length
process.stdout.write(
  `linked ${linked.length - failed.length}: ${byKind('animal')} animals, ${byKind('landmark')} landmarks` +
  `${failed.length > 0 ? `, ${failed.length} failed to download` : ''}\n` +
  `no picture in the library yet: ${unmatched.filter((item) => item.kind === 'animal').length} animals, ` +
  `${unmatched.filter((item) => item.kind === 'landmark').length} landmarks — ` +
  'report-media-gaps.mjs lists them all\n'
)
for (const problem of failed.slice(0, 20)) process.stderr.write(`  ! ${problem}\n`)
