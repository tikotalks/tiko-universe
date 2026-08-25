#!/usr/bin/env node
// Maps every animal and landmark in packages/geography/content to an image in
// the Tiko media library, and downloads a bundled copy so Globe still works in
// airplane mode.
//
//   node tools/geography/map-media.mjs           report what matches and what does not
//   node tools/geography/map-media.mjs --write   write the mapping and fetch the images
//
// Matching is by title and tags, scored, with a floor: a weak match is reported
// as missing rather than quietly attached to the wrong animal.

import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const CONTENT_DIR = join(HERE, '..', '..', 'packages', 'geography', 'content')
const IMAGE_DIR = join(CONTENT_DIR, 'images')
const MEDIA_API = 'https://media.tikoapi.org/v1/media'
/** Bundled at 512 so a card can show it large without carrying a 1 MB PNG each. */
const IMAGE_WIDTH = 320
const WRITE = process.argv.includes('--write')

/** Words that say nothing about which animal or landmark this is. */
const NOISE = new Set(['the', 'of', 'a', 'an', 'and', 'mount', 'great', 'giant', 'sea'])

function tokens(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/[\s-]+/)
    .filter((word) => word.length > 2 && !NOISE.has(word))
}

async function fetchCategory(category) {
  const items = []
  for (let page = 1; page <= 20; page++) {
    const response = await fetch(`${MEDIA_API}?category=${encodeURIComponent(category)}&type=image&limit=100&page=${page}`)
    if (!response.ok) throw new Error(`media api responded ${response.status}`)
    const body = await response.json()
    items.push(...(body.data ?? []))
    if (page >= (body.meta?.totalPages ?? 1)) break
  }
  return items
}

/**
 * How well one media item answers to a name. Title matches count for more than
 * tag matches, and an exact title is worth more than any pile of partials.
 */
function score(item, name) {
  const wanted = tokens(name)
  if (wanted.length === 0) return 0
  const title = (item.title ?? '').toLowerCase()
  const titleWords = new Set(tokens(title))
  const tagWords = new Set((item.tags ?? []).flatMap(tokens))

  if (title === name.toLowerCase()) return 100
  let points = 0
  for (const word of wanted) {
    if (titleWords.has(word)) points += 10
    else if (tagWords.has(word)) points += 4
  }
  // A title carrying words the name does not is usually a different subject
  // wearing the same tag: "Teddy Bear with Book" against "Brown bear".
  points -= Math.max(0, titleWords.size - wanted.length) * 1.5
  return points
}

/**
 * The floor is a title hit on the distinctive word, not a tag brush: at ten
 * points "Polar bear" matched "Bear Face" and "Great Wall of China" matched
 * "Flag of China". A wrong picture on a child's card is worse than none.
 */
const MATCH_FLOOR = 20

function bestMatch(items, name) {
  let best = null
  for (const item of items) {
    const points = score(item, name)
    if (!best || points > best.points) best = { item, points }
  }
  return best && best.points >= MATCH_FLOOR ? best : null
}

/** Anything the category listing missed — the library is searched by name too. */
async function searchLibrary(name) {
  const terms = tokens(name)
  const query = terms[terms.length - 1] ?? name
  const response = await fetch(`${MEDIA_API}?search=${encodeURIComponent(query)}&type=image&limit=100`)
  if (!response.ok) return []
  return (await response.json()).data ?? []
}

function imageURL(item) {
  const base = item.original_url ?? ''
  if (!base.includes('data.tikocdn.org')) return base
  const path = new URL(base).pathname
  return `https://data.tikocdn.org/cdn-cgi/image/width=${IMAGE_WIDTH},quality=82,f=auto${path}`
}

async function download(item, id) {
  await mkdir(IMAGE_DIR, { recursive: true })
  const file = join(IMAGE_DIR, `${id}.png`)
  if (existsSync(file)) return `images/${id}.png`
  const response = await fetch(imageURL(item))
  if (!response.ok) throw new Error(`${id}: image responded ${response.status}`)
  await writeFile(file, Buffer.from(await response.arrayBuffer()))
  return `images/${id}.png`
}

async function mapFile(name, categories) {
  const path = join(CONTENT_DIR, name)
  const file = JSON.parse(await readFile(path, 'utf8'))
  const library = (await Promise.all(categories.map(fetchCategory))).flat()
  const matched = []
  const missing = []

  for (const item of file.items) {
    let match = bestMatch(library, item.name)
    if (!match) match = bestMatch(await searchLibrary(item.name), item.name)
    if (!match) {
      missing.push(item.name)
      delete item.mediaId
      delete item.image
      continue
    }
    matched.push({ name: item.name, title: match.item.title, points: match.points })
    if (WRITE) {
      item.mediaId = match.item.id
      item.image = await download(match.item, item.id.split('.')[1])
    }
  }

  if (WRITE) await writeFile(path, `${JSON.stringify(file, null, 2)}\n`)
  return { name, library: library.length, matched, missing }
}

// Animals are built and mapped by build-animals.mjs, which places them by
// district; this tool now only covers the hand-authored landmark pack.
const results = [await mapFile('landmarks.json', ['places', 'buildings', 'nature'])]

for (const result of results) {
  process.stdout.write(`\n${result.name} — ${result.library} images in the library\n`)
  for (const match of result.matched) {
    process.stdout.write(`  ok      ${match.name} → "${match.title}" (${match.points})\n`)
  }
  for (const name of result.missing) {
    process.stdout.write(`  MISSING ${name}\n`)
  }
  process.stdout.write(`  ${result.matched.length} matched, ${result.missing.length} missing\n`)
}
