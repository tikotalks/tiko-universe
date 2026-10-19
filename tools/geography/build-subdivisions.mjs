#!/usr/bin/env node
// The states and provinces inside a country, for the two countries big enough
// that one colour across the whole thing says nothing: the United States and
// Canada. Alaska is not Arizona, and a child looking at North America should
// be able to see that.
//
// Written as its own file beside water.bin rather than folded into the country
// format: a subdivision has a longer id and a parent, and the country format
// has readers that should not have to change for it.
//
//   node tools/geography/build-subdivisions.mjs           rebuild subdivisions.bin
//   node tools/geography/build-subdivisions.mjs --check   validate the committed asset

import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadEarcut, polygonsOf, prepareRing, triangulatePolygon } from './geometry.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const OUT_DIR = join(HERE, '..', '..', 'packages', 'geography', 'generated')
const CACHE_DIR = join(HERE, '.cache')
const NE_RELEASE = 'v5.1.2'
const NE_BASE = `https://raw.githubusercontent.com/nvkelso/natural-earth-vector/${NE_RELEASE}/geojson`
const SOURCE = 'ne_50m_admin_1_states_provinces_lakes'
const MAGIC = 'TIKOSUB1'
const FORMAT_VERSION = 1
const HEADER_BYTES = 8 + 5 * 4
const RECORD_BYTES = 8 + 4 + 4 + 6 * 4 + 6 * 4
const CHECK = process.argv.includes('--check')

/** The countries drawn state by state. Both are continent-sized. */
const SPLIT = ['USA', 'CAN']

/**
 * A state's climate, by hand. Latitude alone puts Seattle and Boston in the
 * same band as Nevada, and the whole point of colouring these is that the west
 * is dry, the south-east is warm and the north is forest. Sources are the
 * ordinary Köppen picture of North America, simplified to the eight bands the
 * globe draws.
 */
const CLIMATE = {
  // The United States
  'US-AK': 'boreal', 'US-HI': 'tropical',
  'US-WA': 'temperate', 'US-OR': 'temperate', 'US-CA': 'mediterranean',
  'US-NV': 'desert', 'US-AZ': 'desert', 'US-NM': 'desert', 'US-UT': 'desert',
  'US-ID': 'steppe', 'US-MT': 'steppe', 'US-WY': 'steppe', 'US-CO': 'steppe',
  'US-ND': 'steppe', 'US-SD': 'steppe', 'US-NE': 'steppe', 'US-KS': 'steppe',
  'US-OK': 'steppe', 'US-TX': 'steppe',
  'US-MN': 'boreal', 'US-WI': 'boreal', 'US-MI': 'boreal', 'US-ME': 'boreal',
  'US-VT': 'boreal', 'US-NH': 'boreal',
  'US-IA': 'temperate', 'US-MO': 'temperate', 'US-IL': 'temperate',
  'US-IN': 'temperate', 'US-OH': 'temperate', 'US-PA': 'temperate',
  'US-NY': 'temperate', 'US-NJ': 'temperate', 'US-CT': 'temperate',
  'US-RI': 'temperate', 'US-MA': 'temperate', 'US-DE': 'temperate',
  'US-MD': 'temperate', 'US-DC': 'temperate', 'US-VA': 'temperate',
  'US-WV': 'temperate', 'US-KY': 'temperate',
  'US-NC': 'subtropical', 'US-SC': 'subtropical', 'US-GA': 'subtropical',
  'US-AL': 'subtropical', 'US-MS': 'subtropical', 'US-TN': 'subtropical',
  'US-AR': 'subtropical', 'US-LA': 'subtropical', 'US-FL': 'subtropical',
  // Canada
  'CA-YT': 'polar', 'CA-NT': 'polar', 'CA-NU': 'polar',
  'CA-BC': 'temperate',
  'CA-AB': 'steppe', 'CA-SK': 'steppe',
  'CA-MB': 'boreal', 'CA-ON': 'boreal', 'CA-QC': 'boreal', 'CA-NL': 'boreal',
  'CA-NB': 'temperate', 'CA-NS': 'temperate', 'CA-PE': 'temperate',
}

const slug = (value) => value.toLowerCase()
  .normalize('NFKD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

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

await loadEarcut()

const collection = await geojson(SOURCE)
const subdivisions = []
const problems = []

for (const feature of collection.features) {
  const p = feature.properties
  if (!SPLIT.includes(p.adm0_a3)) continue
  const name = p.name ?? p.name_en
  const code = p.iso_3166_2
  if (!name || !code) continue

  const polygons = polygonsOf(feature.geometry)
    .map((polygon) => polygon.map(prepareRing).filter(Boolean))
    .filter((polygon) => polygon.length > 0)
  if (polygons.length === 0) continue

  let minLon = 180
  let minLat = 90
  let maxLon = -180
  let maxLat = -90
  let largest = 0
  let labelPoint = { lon: p.longitude, lat: p.latitude }
  for (const polygon of polygons) {
    let area = 0
    const ring = polygon[0]
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      area += (ring[j][0] - ring[i][0]) * (ring[j][1] + ring[i][1])
      minLon = Math.min(minLon, ring[i][0]); maxLon = Math.max(maxLon, ring[i][0])
      minLat = Math.min(minLat, ring[i][1]); maxLat = Math.max(maxLat, ring[i][1])
    }
    largest = Math.max(largest, Math.abs(area / 2))
  }
  if (!(labelPoint.lat >= -90 && labelPoint.lat <= 90)) {
    labelPoint = { lon: (minLon + maxLon) / 2, lat: (minLat + maxLat) / 2 }
  }

  const climate = CLIMATE[code]
  if (!climate) problems.push(`${name} (${code}) has no climate`)

  subdivisions.push({
    id: code,
    name,
    parent: p.adm0_a3,
    climate: climate ?? 'temperate',
    polygons,
    labelPoint,
    // How wide it is, so a name shows when there is room for it.
    labelSpanDegrees: Math.sqrt(largest),
    bbox: [minLon, minLat, maxLon, maxLat],
  })
}

if (problems.length > 0) {
  for (const problem of problems) process.stderr.write(`${problem}\n`)
  process.exit(1)
}
subdivisions.sort((a, b) => a.id.localeCompare(b.id))

const CLIMATES = ['polar', 'boreal', 'temperate', 'mediterranean', 'subtropical', 'tropical', 'desert', 'steppe']

function encode(items) {
  const rings = []
  const outlinePoints = []
  const meshVertices = []
  const meshIndices = []

  for (const item of items) {
    item.ringOffset = rings.length
    item.meshVertexOffset = meshVertices.length / 2
    item.meshIndexOffset = meshIndices.length
    let meshVertexCount = 0

    for (const polygon of item.polygons) {
      polygon.forEach((ring, index) => {
        rings.push({ pointOffset: outlinePoints.length / 2, pointCount: ring.length, isHole: index > 0 ? 1 : 0 })
        for (const [lon, lat] of ring) outlinePoints.push(lon, lat)
      })
      const mesh = triangulatePolygon(polygon)
      const base = meshVertexCount
      for (const value of mesh.vertices) meshVertices.push(value)
      for (const index of mesh.indices) meshIndices.push(base + index)
      meshVertexCount += mesh.vertices.length / 2
    }

    item.ringCount = rings.length - item.ringOffset
    item.meshVertexCount = meshVertexCount
    item.meshIndexCount = meshIndices.length - item.meshIndexOffset
  }

  const size = HEADER_BYTES + items.length * RECORD_BYTES + rings.length * 12
    + outlinePoints.length * 4 + meshVertices.length * 4 + meshIndices.length * 4
  const buffer = Buffer.alloc(size)
  let offset = 0
  buffer.write(MAGIC, offset, 'ascii'); offset += 8
  for (const value of [FORMAT_VERSION, items.length, rings.length, meshVertices.length / 2, meshIndices.length]) {
    buffer.writeUInt32LE(value, offset); offset += 4
  }
  for (const item of items) {
    buffer.write(item.id.padEnd(8, '\0').slice(0, 8), offset, 'ascii'); offset += 8
    buffer.write(item.parent.padEnd(4, '\0').slice(0, 4), offset, 'ascii'); offset += 4
    buffer.writeUInt32LE(CLIMATES.indexOf(item.climate), offset); offset += 4
    for (const value of [item.labelPoint.lon, item.labelPoint.lat, item.labelSpanDegrees, ...item.bbox.slice(0, 3)]) {
      buffer.writeFloatLE(value, offset); offset += 4
    }
    for (const value of [item.ringOffset, item.ringCount,
      item.meshVertexOffset, item.meshVertexCount, item.meshIndexOffset, item.meshIndexCount]) {
      buffer.writeUInt32LE(value, offset); offset += 4
    }
  }
  for (const ring of rings) {
    buffer.writeUInt32LE(ring.pointOffset, offset); offset += 4
    buffer.writeUInt32LE(ring.pointCount, offset); offset += 4
    buffer.writeUInt32LE(ring.isHole, offset); offset += 4
  }
  for (const value of outlinePoints) { buffer.writeFloatLE(value, offset); offset += 4 }
  for (const value of meshVertices) { buffer.writeFloatLE(value, offset); offset += 4 }
  for (const value of meshIndices) { buffer.writeUInt32LE(value, offset); offset += 4 }
  if (offset !== size) throw new Error(`encoder wrote ${offset} of ${size} bytes`)
  return buffer
}

const buffer = encode(subdivisions)
const digest = createHash('sha256').update(buffer).digest('hex').slice(0, 12)
const file = join(OUT_DIR, 'subdivisions.bin')

const manifest = `${JSON.stringify({
  schemaVersion: 1,
  note: `Built by tools/geography/build-subdivisions.mjs from Natural Earth ${NE_RELEASE} ${SOURCE}. Climate is authored, because latitude alone puts Seattle and Nevada in the same band.`,
  items: subdivisions.map((item) => ({
    id: item.id,
    name: item.name,
    parent: item.parent,
    climate: item.climate,
    labelSpanDegrees: Number(item.labelSpanDegrees.toFixed(4)),
    lat: Number(item.labelPoint.lat.toFixed(4)),
    lon: Number(item.labelPoint.lon.toFixed(4)),
  })),
}, null, 2)}\n`
const manifestFile = join(OUT_DIR, 'subdivisions.json')

if (CHECK) {
  if (!existsSync(file) || createHash('sha256').update(await readFile(file)).digest('hex').slice(0, 12) !== digest) {
    process.stderr.write(`subdivisions.bin does not match the source data (${digest} expected)\n`)
    process.exit(1)
  }
  if (!existsSync(manifestFile) || (await readFile(manifestFile, 'utf8')) !== manifest) {
    process.stderr.write('subdivisions.json does not match the source data\n')
    process.exit(1)
  }
} else {
  await mkdir(OUT_DIR, { recursive: true })
  await writeFile(file, buffer)
  await writeFile(manifestFile, manifest)
}

process.stdout.write(
  `subdivisions ok: ${subdivisions.length} states and provinces across ${SPLIT.join(' and ')}, ` +
  `${(buffer.length / 1e6).toFixed(2)} MB (${digest})\n`
)
