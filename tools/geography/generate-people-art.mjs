#!/usr/bin/env node
// Draws the people pack: one full-figure portrait each, in Tiko's own style.
//
//   node tools/geography/generate-people-art.mjs                 what it would draw
//   node tools/geography/generate-people-art.mjs --write         draw the missing ones
//   node tools/geography/generate-people-art.mjs --write --redraw  draw all of them again
//   node tools/geography/generate-people-art.mjs --only viking,dogon
//
// Needs TIKO_API_KEY in the environment: the generation worker takes a service
// key or a signed-in Tiko token, and will not draw for an anonymous caller.
//
// Two things this asks for that the library's older people art does not have:
// the **whole person**, head to feet, rather than a bust; and the plain, soft
// look of the Viking and the Roman rather than a rendered face. The globe shows
// these at about a centimetre across, where an eyelash is noise and a silhouette
// is everything.

import { readFile, writeFile } from 'node:fs/promises'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const CONTENT_DIR = join(HERE, '..', '..', 'packages', 'geography', 'content')
const IMAGE_DIR = join(CONTENT_DIR, 'images')
// The repo's own .env, which is gitignored — so the key lives in one place
// rather than in a shell history. Anything already in the environment wins.
const ENV_FILE = join(HERE, '..', '..', '.env')
if (existsSync(ENV_FILE)) {
  for (const line of readFileSync(ENV_FILE, 'utf8').split('\n')) {
    const match = /^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/.exec(line)
    if (!match) continue
    const value = match[2].replace(/^['"]|['"]$/g, '')
    if (value && process.env[match[1]] === undefined) process.env[match[1]] = value
  }
}

const API = process.env.TIKO_GENERATION_API ?? 'https://generation.tikoapi.org/v1/generation'
const KEY = process.env.TIKO_API_KEY
const WRITE = process.argv.includes('--write')
const REDRAW = process.argv.includes('--redraw')
const ONLY = (() => {
  const flag = process.argv.indexOf('--only')
  if (flag === -1) return null
  return new Set((process.argv[flag + 1] ?? '').split(',').map((value) => value.trim()).filter(Boolean))
})()

/** How many to have in flight at once. The worker calls a provider per image. */
const CONCURRENCY = 3
/** How long to wait for one image before giving up on it. */
const TIMEOUT_MS = 180_000

/**
 * What every one of them is asked for, on top of what makes each one itself.
 * Written as instructions rather than adjectives: "standing, both feet visible"
 * is a thing a drawing either does or does not do, where "full body" is a hope.
 */
const HOUSE_STYLE = [
  'A single standing figure, shown head to feet — the whole person, both feet visible,',
  'not a bust and not cropped at the waist. Facing the viewer, arms relaxed, feet apart,',
  'a calm friendly expression.',
  'Soft matte clay, the way a small moulded toy looks: chunky rounded forms, smooth curves,',
  'no seams, no fabric weave, no hair strands, no skin texture, no glossy highlights.',
  'Simple face: two small dark eyes, a soft mouth, nothing else — no eyelashes, no teeth,',
  'no wrinkles, no drawn-in nose shadow.',
  'Even, gentle studio light and one soft shadow under the feet. Nothing photographic.',
  'Plain transparent background. No ground, no scenery, no props held out to the side,',
  'no text, no letters, no numbers, no flags, no borders.',
].join(' ')

/** Turn one entry into the picture it wants. */
function promptFor(person) {
  const era = person.era === 'historical'
    ? 'A figure from history, dressed as they were in their own time.'
    : 'Dressed in the clothes this people actually wear, today.'
  return [
    `${person.name}.`,
    person.note ? `${person.note}` : '',
    era,
    'Show them by their clothing and what they carry, so a five-year-old could tell them',
    'from anybody else on the map at a glance.',
    HOUSE_STYLE,
  ].filter(Boolean).join(' ')
}

const source = JSON.parse(await readFile(join(CONTENT_DIR, 'people.json'), 'utf8'))
const wanted = source.items.filter((person) => {
  const id = person.mediaId ?? person.id.replace(/^person\./, '')
  if (ONLY) return ONLY.has(id)
  if (REDRAW) return true
  return !existsSync(join(IMAGE_DIR, `${id}.png`))
})

if (!WRITE) {
  for (const person of wanted.slice(0, 3)) {
    process.stdout.write(`\n— ${person.name}\n${promptFor(person)}\n`)
  }
  process.stdout.write(
    `\n${wanted.length} of ${source.items.length} people would be drawn` +
    `${wanted.length > 3 ? ' (three prompts shown)' : ''}. Add --write to draw them.\n`
  )
  process.exit(0)
}

if (!KEY) {
  process.stderr.write(
    'TIKO_API_KEY is not set. The generation worker will not draw for an anonymous caller.\n' +
    'Copy .env.example to .env, put the key in it, and run this again — .env is gitignored.\n'
  )
  process.exit(1)
}

/** One image, start to finish: ask, wait, fetch the bytes, write the file. */
async function draw(person) {
  const id = person.mediaId ?? person.id.replace(/^person\./, '')
  const response = await fetch(`${API}/image`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt: promptFor(person),
      mode: 'icon',
      tikoStyle: 'tiko-v3',
      // Taller than it is wide, because a standing person is: asked for a
      // square, the model crops to a bust to fill it, which is the whole
      // problem this is here to fix.
      size: '1024x1792',
      quality: 'hd',
      transparent: true,
      count: 1,
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  })
  if (!response.ok) {
    const detail = await response.text().catch(() => '')
    throw new Error(`${response.status} ${detail.slice(0, 200)}`)
  }
  const body = await response.json()
  const image = body.data?.images?.[0] ?? body.data
  const path = image?.imageUrl ?? image?.image_url
  if (!path) throw new Error('the worker returned no image')

  const binary = await fetch(path.startsWith('http') ? path : `${API.replace(/\/v1\/generation$/, '')}${path}`, {
    headers: { Authorization: `Bearer ${KEY}` },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  })
  if (!binary.ok) throw new Error(`could not fetch the bytes: ${binary.status}`)
  await writeFile(join(IMAGE_DIR, `${id}.png`), Buffer.from(await binary.arrayBuffer()))
  return { id, generationID: image?.id ?? null }
}

const drawn = []
const failed = []
const queue = [...wanted]

await Promise.all(Array.from({ length: CONCURRENCY }, async () => {
  while (queue.length > 0) {
    const person = queue.shift()
    try {
      const result = await draw(person)
      drawn.push(result)
      process.stdout.write(`  ✓ ${person.name}\n`)
    } catch (error) {
      failed.push(`${person.name}: ${error.message}`)
      process.stdout.write(`  ✗ ${person.name} — ${error.message}\n`)
    }
  }
}))

for (const problem of failed) process.stderr.write(`  ! ${problem}\n`)
process.stdout.write(
  `people art: ${drawn.length} drawn, ${failed.length} failed. ` +
  'Run build-people.mjs --write to link them, then report-media-gaps.mjs --write.\n'
)
if (failed.length > 0) process.exitCode = 1
