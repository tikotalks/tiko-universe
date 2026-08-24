#!/usr/bin/env node
// The pictures Globe's own chrome is made of: the four mode icons, and the
// Earth its app icon is cut from. Fetched by title from the Tiko media library
// and committed, because the app has to open on a working globe in airplane
// mode and its own buttons are no exception.
//
//   node tools/geography/fetch-app-media.mjs

import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const MEDIA_DIR = join(HERE, '..', '..', 'apps', 'globe', 'ios', 'Media')
const ICON_DIR = join(HERE, '..', '..', 'apps', 'globe', 'ios', 'Sources', 'Assets.xcassets', 'AppIcon.appiconset')
const MEDIA_API = 'https://media.tikoapi.org/v1/media'
const CDN = 'https://data.tikocdn.org/cdn-cgi/image'

/** Mode → the media title that says what it is at a glance. */
const MODE_ICONS = [
  ['countries', 'Globe'],
  ['capitals', 'Empire State Building'],
  ['animals', 'Giraffe'],
  ['landmarks', 'Eiffel Tower'],
]

/** The app icon's artwork: a clay Earth, which is what the globe now looks like. */
const APP_ICON_ASSET = '3c0865fe-663b-4777-8be1-c0f26b351ea9'

async function byTitle(title) {
  const response = await fetch(`${MEDIA_API}?search=${encodeURIComponent(title)}&type=image&limit=25`)
  if (!response.ok) throw new Error(`${title}: media api responded ${response.status}`)
  const data = (await response.json()).data ?? []
  const hit = data.find((item) => (item.title ?? '').toLowerCase() === title.toLowerCase())
  if (!hit) throw new Error(`the media library has no "${title}"`)
  return hit
}

async function download(item, width, path) {
  const source = new URL(item.original_url ?? `https://data.tikocdn.org/${item.file_name}`).pathname
  const response = await fetch(`${CDN}/width=${width},quality=95,f=png${source}`)
  if (!response.ok) throw new Error(`${path}: image responded ${response.status}`)
  await writeFile(path, Buffer.from(await response.arrayBuffer()))
}

await mkdir(MEDIA_DIR, { recursive: true })
for (const [mode, title] of MODE_ICONS) {
  const item = await byTitle(title)
  // Three times the 32-point icon, so it stays crisp on every screen.
  await download(item, 192, join(MEDIA_DIR, `mode-${mode}.png`))
  process.stdout.write(`mode-${mode}.png ← ${title}\n`)
}

const icon = await fetch(`${MEDIA_API}/${APP_ICON_ASSET}`)
if (!icon.ok) throw new Error(`app icon: media api responded ${icon.status}`)
const artwork = (await icon.json()).data
await mkdir(ICON_DIR, { recursive: true })
await download({ original_url: `https://data.tikocdn.org/${artwork.file_name}` }, 1024, join(ICON_DIR, 'AppIcon.png'))
process.stdout.write(`AppIcon.png ← ${artwork.title} (${artwork.file_name})\n`)
