#!/usr/bin/env node
// The pictures Globe's own chrome is made of: the four mode icons, and the
// Earth its app icon is cut from. Fetched by title from the Tiko media library
// and committed, because the app has to open on a working globe in airplane
// mode and its own buttons are no exception.
//
//   node tools/geography/fetch-app-media.mjs

import { deflateSync, inflateSync } from 'node:zlib'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
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
  ['people', 'Kids in Traditional Clothing'],
]

/** The app icon's artwork: a clay Earth, which is what the globe now looks like. */
const APP_ICON_ASSET = '3c0865fe-663b-4777-8be1-c0f26b351ea9'
/**
 * Globe's own colour, top and bottom. The artwork arrives with a transparent
 * background, and an app icon with a hole in it is drawn on white — every other
 * Tiko app wears its colour, and this one should too.
 */
const ICON_TOP = [0x38, 0xbd, 0xf8]
const ICON_BOTTOM = [0x07, 0x56, 0x79]

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

// ---------------------------------------------------------------- the icon --

/**
 * Lays the artwork over a gradient of the app's colour and flattens it. Written
 * here rather than reached for from a library: a PNG with no interlacing and
 * eight bits a channel is four chunks and five filters, and the alternative is
 * a dependency that does nothing else.
 */
function onColour(png) {
  const chunks = readChunks(png)
  const header = chunks.find((chunk) => chunk.type === 'IHDR').data
  const width = header.readUInt32BE(0)
  const height = header.readUInt32BE(4)
  if (header[8] !== 8 || header[9] !== 6 || header[12] !== 0) {
    throw new Error('the icon artwork is not an 8-bit RGBA PNG')
  }

  const raw = inflateSync(Buffer.concat(chunks.filter((chunk) => chunk.type === 'IDAT').map((chunk) => chunk.data)))
  const pixels = unfilter(raw, width, height, 4)

  const out = Buffer.alloc((width * 3 + 1) * height)
  for (let y = 0; y < height; y++) {
    const t = y / Math.max(1, height - 1)
    out[y * (width * 3 + 1)] = 0
    for (let x = 0; x < width; x++) {
      const from = (y * width + x) * 4
      const to = y * (width * 3 + 1) + 1 + x * 3
      const alpha = pixels[from + 3] / 255
      for (let channel = 0; channel < 3; channel++) {
        const behind = ICON_TOP[channel] + (ICON_BOTTOM[channel] - ICON_TOP[channel]) * t
        out[to + channel] = Math.round(pixels[from + channel] * alpha + behind * (1 - alpha))
      }
    }
  }

  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8
  ihdr[9] = 2 // truecolour, no alpha: an app icon is never see-through
  return Buffer.concat([
    png.subarray(0, 8),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(out, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

function readChunks(png) {
  const chunks = []
  let offset = 8
  while (offset < png.length) {
    const length = png.readUInt32BE(offset)
    chunks.push({ type: png.toString('ascii', offset + 4, offset + 8), data: png.subarray(offset + 8, offset + 8 + length) })
    offset += length + 12
  }
  return chunks
}

/** Undoes the five PNG row filters, which is all the decoding this needs. */
function unfilter(raw, width, height, channels) {
  const stride = width * channels
  const out = Buffer.alloc(stride * height)
  let offset = 0
  for (let y = 0; y < height; y++) {
    const filter = raw[offset++]
    for (let x = 0; x < stride; x++) {
      const value = raw[offset + x]
      const left = x >= channels ? out[y * stride + x - channels] : 0
      const up = y > 0 ? out[(y - 1) * stride + x] : 0
      const upLeft = x >= channels && y > 0 ? out[(y - 1) * stride + x - channels] : 0
      let result
      switch (filter) {
        case 0: result = value; break
        case 1: result = value + left; break
        case 2: result = value + up; break
        case 3: result = value + ((left + up) >> 1); break
        case 4: {
          const p = left + up - upLeft
          const dLeft = Math.abs(p - left)
          const dUp = Math.abs(p - up)
          const dUpLeft = Math.abs(p - upLeft)
          result = value + (dLeft <= dUp && dLeft <= dUpLeft ? left : dUp <= dUpLeft ? up : upLeft)
          break
        }
        default: throw new Error(`unknown PNG filter ${filter}`)
      }
      out[y * stride + x] = result & 0xff
    }
    offset += stride
  }
  return out
}

let crcTable
function crc() {
  if (crcTable) return crcTable
  crcTable = new Int32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    crcTable[n] = c
  }
  return crcTable
}

function chunk(type, data) {
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const table = crc()
  let c = 0xffffffff
  for (const byte of body) c = table[(c ^ byte) & 0xff] ^ (c >>> 8)
  const check = Buffer.alloc(4)
  check.writeUInt32BE((c ^ 0xffffffff) >>> 0)
  return Buffer.concat([length, body, check])
}

// ------------------------------------------------------------- the app icon --

const icon = await fetch(`${MEDIA_API}/${APP_ICON_ASSET}`)
if (!icon.ok) throw new Error(`app icon: media api responded ${icon.status}`)
const artwork = (await icon.json()).data
await mkdir(ICON_DIR, { recursive: true })
const iconPath = join(ICON_DIR, 'AppIcon.png')
await download({ original_url: `https://data.tikocdn.org/${artwork.file_name}` }, 1024, iconPath)
await writeFile(iconPath, onColour(await readFile(iconPath)))
process.stdout.write(`AppIcon.png ← ${artwork.title}, on Globe's own blue\n`)
