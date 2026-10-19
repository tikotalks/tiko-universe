#!/usr/bin/env node
// The flags, from the Tiko media library rather than from emoji. An emoji flag
// is whatever the device decides to draw and is missing entirely for a good few
// territories; these are the same modelled artwork the rest of the app is made
// of, and they ship with it so the globe still works in airplane mode.
//
//   node tools/geography/fetch-flags.mjs           report what is missing
//   node tools/geography/fetch-flags.mjs --write   fetch into content/flags

import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const CONTENT_DIR = join(HERE, '..', '..', 'packages', 'geography', 'content')
const GENERATED_DIR = join(HERE, '..', '..', 'packages', 'geography', 'generated')
const FLAG_DIR = join(CONTENT_DIR, 'flags')
const MEDIA_API = 'https://media.tikoapi.org/v1/media'
const CDN = 'https://data.tikocdn.org/cdn-cgi/image'
const WIDTH = 240
const WRITE = process.argv.includes('--write')

/**
 * Where the library files a flag under a different name than the map does.
 * Only ever the same country under another title — never a stand-in.
 */
const ALSO_KNOWN_AS = {
  'the bahamas': 'bahamas',
  'cape verde': 'cabo verde',
  "people s republic of china": 'china',
  'ivory coast': 'cote d ivoire',
  'federated states of micronesia': 'micronesia',
  'east timor': 'timor leste',
  'united states of america': 'united states',
  'republic of serbia': 'serbia',
  'republic of the congo': 'congo',
  'democratic republic of the congo': 'dr congo',
  'united republic of tanzania': 'tanzania',
  'south korea': 'korea south',
  'north korea': 'korea north',
}

const normalise = (value) => (value ?? '')
  .normalize('NFKD')
  .replace(/[̀-ͯ]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, ' ')
  .trim()

async function library() {
  const flags = new Map()
  for (let page = 1; page <= 10; page++) {
    const response = await fetch(`${MEDIA_API}?search=flag&type=image&limit=100&page=${page}`)
    if (!response.ok) throw new Error(`media api responded ${response.status}`)
    const body = await response.json()
    for (const item of body.data ?? []) {
      const title = normalise(item.title)
      if (title.startsWith('flag of ')) flags.set(title.slice('flag of '.length), item)
    }
    if (page >= (body.meta?.totalPages ?? 1)) break
  }
  return flags
}

async function download(item, path) {
  const source = new URL(item.original_url ?? `https://data.tikocdn.org/${item.file_name}`).pathname
  const response = await fetch(`${CDN}/width=${WIDTH},quality=92,f=png${source}`)
  if (!response.ok) throw new Error(`${path}: image responded ${response.status}`)
  await writeFile(path, Buffer.from(await response.arrayBuffer()))
}

const flags = await library()
const countries = JSON.parse(await readFile(join(GENERATED_DIR, 'countries.json'), 'utf8')).countries
if (WRITE) await mkdir(FLAG_DIR, { recursive: true })

const missing = []
let fetched = 0
let already = 0
for (const country of countries) {
  const name = normalise(country.name)
  const item = flags.get(name) ?? flags.get(ALSO_KNOWN_AS[name] ?? '')
  if (!item) {
    missing.push(country.name)
    continue
  }
  const path = join(FLAG_DIR, `${country.id}.png`)
  if (existsSync(path)) {
    already += 1
    continue
  }
  if (WRITE) {
    await download(item, path)
    fetched += 1
  }
}

process.stdout.write(
  `flags: ${countries.length - missing.length} of ${countries.length} countries have one ` +
  `(${fetched} fetched, ${already} already here)\n`
)
if (missing.length > 0) {
  process.stdout.write(`no flag in the media library: ${missing.join(', ')}\n`)
}
