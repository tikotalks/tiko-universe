#!/usr/bin/env node
// The shape of the sea floor, from the same pinned Natural Earth release as
// everything else. Natural Earth ships bathymetry as nested contour polygons —
// everything deeper than 200 m, then 1000 m, and so on down to 10 000 m — so
// the depth of a place is the deepest contour that still contains it.
//
// Written out as a greyscale image rather than as geometry: the ocean is one
// sphere and this is what colours it, and an image is the one thing a fragment
// shader can ask about a point it is already standing on. No noise, no
// invention — every ridge in it is a ridge somebody surveyed.
//
//   node tools/geography/build-bathymetry.mjs           rebuild the image
//   node tools/geography/build-bathymetry.mjs --check   validate the committed one

import { createHash } from 'node:crypto'
import { deflateSync } from 'node:zlib'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const OUT_DIR = join(HERE, '..', '..', 'packages', 'geography', 'generated')
const CACHE_DIR = join(HERE, '.cache')
const NE_RELEASE = 'v5.1.2'
const NE_BASE = `https://raw.githubusercontent.com/nvkelso/natural-earth-vector/${NE_RELEASE}/geojson`
const CHECK = process.argv.includes('--check')

/** Shallowest first: a deeper contour drawn later wins the pixel. */
const CONTOURS = [
  ['ne_10m_bathymetry_L_0', 40],
  ['ne_10m_bathymetry_K_200', 200],
  ['ne_10m_bathymetry_J_1000', 1000],
  ['ne_10m_bathymetry_I_2000', 2000],
  ['ne_10m_bathymetry_H_3000', 3000],
  ['ne_10m_bathymetry_G_4000', 4000],
  ['ne_10m_bathymetry_F_5000', 5000],
  ['ne_10m_bathymetry_E_6000', 6000],
  ['ne_10m_bathymetry_D_7000', 7000],
  ['ne_10m_bathymetry_C_8000', 8000],
  ['ne_10m_bathymetry_B_9000', 9000],
  ['ne_10m_bathymetry_A_10000', 10000],
]

const WIDTH = 2048
const HEIGHT = 1024
/** The deepest trench, so the whole scale fits in one byte. */
const DEEPEST = 10000

async function geojson(name) {
  await mkdir(CACHE_DIR, { recursive: true })
  const file = join(CACHE_DIR, `${NE_RELEASE}-${name}.geojson`)
  if (!existsSync(file)) {
    const response = await fetch(`${NE_BASE}/${name}.geojson`)
    if (!response.ok) throw new Error(`${name}: ${response.status}`)
    await writeFile(file, Buffer.from(await response.arrayBuffer()))
  }
  return JSON.parse(await readFile(file, 'utf8'))
}

const x = (lon) => ((lon + 180) / 360) * WIDTH
const y = (lat) => ((90 - lat) / 180) * HEIGHT

/**
 * Even-odd scanline fill. Holes need no special handling: a ring inside another
 * ring crosses the same scanline twice more, which turns the fill back off.
 */
function fill(grid, polygon, value) {
  const edges = []
  let top = HEIGHT
  let bottom = 0
  for (const ring of polygon) {
    for (let index = 0; index < ring.length - 1; index++) {
      const ax = x(ring[index][0])
      const ay = y(ring[index][1])
      const bx = x(ring[index + 1][0])
      const by = y(ring[index + 1][1])
      if (ay === by) continue
      edges.push([ax, ay, bx, by])
      top = Math.min(top, ay, by)
      bottom = Math.max(bottom, ay, by)
    }
  }
  if (edges.length === 0) return

  const first = Math.max(0, Math.ceil(top - 0.5))
  const last = Math.min(HEIGHT - 1, Math.floor(bottom - 0.5))
  const crossings = []
  for (let row = first; row <= last; row++) {
    const scan = row + 0.5
    crossings.length = 0
    for (const [ax, ay, bx, by] of edges) {
      if ((ay <= scan && by > scan) || (by <= scan && ay > scan)) {
        crossings.push(ax + ((scan - ay) / (by - ay)) * (bx - ax))
      }
    }
    if (crossings.length < 2) continue
    crossings.sort((a, b) => a - b)
    const offset = row * WIDTH
    for (let pair = 0; pair + 1 < crossings.length; pair += 2) {
      const from = Math.max(0, Math.ceil(crossings[pair] - 0.5))
      const to = Math.min(WIDTH - 1, Math.floor(crossings[pair + 1] - 0.5))
      for (let column = from; column <= to; column++) {
        if (grid[offset + column] < value) grid[offset + column] = value
      }
    }
  }
}

/**
 * Contours arrive as steps, and a step in the middle of an ocean reads as a
 * coastline — which makes the sea look see-through rather than deep. Blurred
 * until the staircase is a slope: the shelf, the basins and the ridges survive,
 * because they are hundreds of kilometres across and the blur is fifty.
 */
function soften(grid) {
  const out = new Uint8Array(grid.length)
  for (let row = 0; row < HEIGHT; row++) {
    for (let column = 0; column < WIDTH; column++) {
      let total = 0
      let count = 0
      for (let dy = -1; dy <= 1; dy++) {
        const sampleRow = row + dy
        if (sampleRow < 0 || sampleRow >= HEIGHT) continue
        for (let dx = -1; dx <= 1; dx++) {
          // Wraps at the date line, which is a place and not an edge.
          const sampleColumn = (column + dx + WIDTH) % WIDTH
          total += grid[sampleRow * WIDTH + sampleColumn]
          count += 1
        }
      }
      out[row * WIDTH + column] = Math.round(total / count)
    }
  }
  return out
}

// Minimal 8-bit greyscale PNG. A dependency for four chunks would be silly.
function crcTable() {
  const table = new Int32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c
  }
  return table
}
const CRC = crcTable()

function crc32(buffer) {
  let c = 0xffffffff
  for (const byte of buffer) c = CRC[(c ^ byte) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const check = Buffer.alloc(4)
  check.writeUInt32BE(crc32(body))
  return Buffer.concat([length, body, check])
}

function png(grid) {
  const header = Buffer.alloc(13)
  header.writeUInt32BE(WIDTH, 0)
  header.writeUInt32BE(HEIGHT, 4)
  header[8] = 8   // bit depth
  header[9] = 0   // greyscale
  const raw = Buffer.alloc((WIDTH + 1) * HEIGHT)
  for (let row = 0; row < HEIGHT; row++) {
    raw[row * (WIDTH + 1)] = 0 // no filter: the data is smooth already
    Buffer.from(grid.buffer, row * WIDTH, WIDTH).copy(raw, row * (WIDTH + 1) + 1)
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

const grid = new Uint8Array(WIDTH * HEIGHT)
let polygons = 0
for (const [name, metres] of CONTOURS) {
  const value = Math.max(1, Math.round((metres / DEEPEST) * 255))
  const collection = await geojson(name)
  for (const feature of collection.features) {
    const geometry = feature.geometry
    if (!geometry) continue
    const shapes = geometry.type === 'MultiPolygon' ? geometry.coordinates : [geometry.coordinates]
    for (const shape of shapes) {
      fill(grid, shape, value)
      polygons += 1
    }
  }
  process.stdout.write(`${name.replace('ne_10m_bathymetry_', '')}: ${metres} m\n`)
}

let softened = grid
for (let pass = 0; pass < 6; pass++) softened = soften(softened)
const image = png(softened)
const digest = createHash('sha256').update(image).digest('hex').slice(0, 12)

/** Places whose depth everybody agrees on, as a check that it is the right way up. */
const probe = (lat, lon) => softened[Math.round(y(lat)) * WIDTH + Math.round(x(lon))] / 255 * DEEPEST
const PROBES = [
  ['the Mariana Trench', 11.35, 142.2, 6000, DEEPEST],
  ['the middle of the Pacific', -10, -140, 3000, 6000],
  ['the North Sea', 55, 3, 1, 400],
  ['the shelf off Malta', 35.9, 14.5, 1, 3000],
]
const wrong = PROBES.filter(([, lat, lon, low, high]) => {
  const depth = probe(lat, lon)
  return !(depth >= low && depth <= high)
})

const file = join(OUT_DIR, 'bathymetry.png')
if (CHECK) {
  if (!existsSync(file)) {
    process.stderr.write('bathymetry.png is missing — run node tools/geography/build-bathymetry.mjs\n')
    process.exit(1)
  }
  const committed = await readFile(file)
  const same = createHash('sha256').update(committed).digest('hex').slice(0, 12) === digest
  if (!same) {
    process.stderr.write(`bathymetry.png does not match the source data (${digest} expected)\n`)
    process.exit(1)
  }
} else {
  await mkdir(OUT_DIR, { recursive: true })
  await writeFile(file, image)
}

if (wrong.length > 0) {
  for (const [where, lat, lon, low, high] of wrong) {
    process.stderr.write(`${where} came out at ${Math.round(probe(lat, lon))} m, expected ${low}–${high}\n`)
  }
  process.exit(1)
}

const wet = softened.reduce((count, value) => count + (value > 0 ? 1 : 0), 0)
process.stdout.write(
  `bathymetry ok: ${polygons} contour polygons, ${WIDTH}×${HEIGHT}, ` +
  `${(wet / softened.length * 100).toFixed(1)}% water, ${(image.length / 1024).toFixed(0)} KB (${digest})\n`
)
