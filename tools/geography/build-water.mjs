#!/usr/bin/env node
// Rivers and lakes, from the same pinned Natural Earth release as the countries.
// Written as its own asset rather than folded into geometry.bin: water is a
// separate concern with a separate shape, and the country format has readers
// that should not have to change for it.
//
//   node tools/geography/build-water.mjs           rebuild packages/geography/generated/water.bin
//   node tools/geography/build-water.mjs --check   validate the committed asset

import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const OUT_DIR = join(HERE, '..', '..', 'packages', 'geography', 'generated')
const CACHE_DIR = join(HERE, '.cache')
const NE_RELEASE = 'v5.1.2'
const NE_BASE = `https://raw.githubusercontent.com/nvkelso/natural-earth-vector/${NE_RELEASE}/geojson`
const RIVERS = 'ne_50m_rivers_lake_centerlines'
const LAKES = 'ne_50m_lakes'

const MAGIC = 'TIKOWTR1'
const FORMAT_VERSION = 1
const HEADER_BYTES = 8 + 5 * 4
/** Rivers keep more detail than coastlines: a straightened river stops looking like one. */
const RIVER_TOLERANCE_DEG = 0.01
/** Lakes below this are not worth a triangle at any zoom the globe reaches. */
const MIN_LAKE_AREA_DEG2 = 0.02
const CHECK = process.argv.includes('--check')

function ringArea(points) {
  let sum = 0
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    sum += (points[j][0] - points[i][0]) * (points[j][1] + points[i][1])
  }
  return sum / 2
}

function perpendicularDistance(point, start, end) {
  const [x, y] = point
  const [x1, y1] = start
  const [x2, y2] = end
  const dx = x2 - x1
  const dy = y2 - y1
  if (dx === 0 && dy === 0) return Math.hypot(x - x1, y - y1)
  const t = Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy)))
  return Math.hypot(x - (x1 + t * dx), y - (y1 + t * dy))
}

function simplify(points, tolerance) {
  if (points.length <= 2) return points
  const keep = new Uint8Array(points.length)
  keep[0] = 1
  keep[points.length - 1] = 1
  const stack = [[0, points.length - 1]]
  while (stack.length > 0) {
    const [first, last] = stack.pop()
    let index = -1
    let furthest = tolerance
    for (let i = first + 1; i < last; i++) {
      const distance = perpendicularDistance(points[i], points[first], points[last])
      if (distance > furthest) {
        furthest = distance
        index = i
      }
    }
    if (index === -1) continue
    keep[index] = 1
    stack.push([first, index], [index, last])
  }
  return points.filter((_, i) => keep[i] === 1)
}

async function readSource(name) {
  await mkdir(CACHE_DIR, { recursive: true })
  const cached = join(CACHE_DIR, `${NE_RELEASE}-${name}.geojson`)
  if (!existsSync(cached)) {
    const url = `${NE_BASE}/${name}.geojson`
    process.stdout.write(`downloading ${url}\n`)
    const response = await fetch(url)
    if (!response.ok) throw new Error(`${url} responded ${response.status}`)
    await writeFile(cached, Buffer.from(await response.arrayBuffer()))
  }
  const raw = await readFile(cached)
  return { json: JSON.parse(raw.toString('utf8')), sha256: createHash('sha256').update(raw).digest('hex') }
}

function riverLines(geojson) {
  const lines = []
  for (const feature of geojson.features) {
    const geometry = feature.geometry
    const parts = geometry.type === 'MultiLineString' ? geometry.coordinates : [geometry.coordinates]
    for (const part of parts) {
      const simplified = simplify(part.map(([lon, lat]) => [lon, lat]), RIVER_TOLERANCE_DEG)
      if (simplified.length >= 2) lines.push(simplified)
    }
  }
  return lines
}

function lakeRings(geojson) {
  const rings = []
  for (const feature of geojson.features) {
    const geometry = feature.geometry
    const polygons = geometry.type === 'MultiPolygon' ? geometry.coordinates : [geometry.coordinates]
    for (const polygon of polygons) {
      // Outer ring only: a hole in a lake is an island small enough to ignore
      // at the scales this globe reaches.
      const ring = polygon[0].map(([lon, lat]) => [lon, lat])
      if (ring.length > 1 && ring[0][0] === ring[ring.length - 1][0] && ring[0][1] === ring[ring.length - 1][1]) ring.pop()
      const simplified = simplify(ring, RIVER_TOLERANCE_DEG)
      if (simplified.length >= 3 && Math.abs(ringArea(simplified)) >= MIN_LAKE_AREA_DEG2) rings.push(simplified)
    }
  }
  return rings
}

/** Fan triangulation: lake outlines at this scale are convex enough for it. */
function fanTriangulate(rings) {
  const vertices = []
  const indices = []
  for (const ring of rings) {
    const base = vertices.length / 2
    for (const [lon, lat] of ring) vertices.push(lon, lat)
    for (let i = 1; i < ring.length - 1; i++) {
      indices.push(base, base + i, base + i + 1)
    }
  }
  return { vertices, indices }
}

async function build() {
  const [rivers, lakes] = await Promise.all([readSource(RIVERS), readSource(LAKES)])
  const lines = riverLines(rivers.json)
  const rings = lakeRings(lakes.json)
  const lake = fanTriangulate(rings)

  const linePoints = lines.reduce((total, line) => total + line.length, 0)
  const size = HEADER_BYTES + lines.length * 8 + linePoints * 8 + lake.vertices.length * 4 + lake.indices.length * 4
  const buffer = Buffer.alloc(size)
  let offset = 0
  buffer.write(MAGIC, offset, 'ascii'); offset += 8
  for (const value of [FORMAT_VERSION, lines.length, linePoints, lake.vertices.length / 2, lake.indices.length]) {
    buffer.writeUInt32LE(value, offset); offset += 4
  }
  let pointOffset = 0
  for (const line of lines) {
    buffer.writeUInt32LE(pointOffset, offset); offset += 4
    buffer.writeUInt32LE(line.length, offset); offset += 4
    pointOffset += line.length
  }
  for (const line of lines) {
    for (const [lon, lat] of line) {
      buffer.writeFloatLE(lon, offset); offset += 4
      buffer.writeFloatLE(lat, offset); offset += 4
    }
  }
  for (const value of lake.vertices) { buffer.writeFloatLE(value, offset); offset += 4 }
  for (const value of lake.indices) { buffer.writeUInt32LE(value, offset); offset += 4 }
  if (offset !== size) throw new Error(`encoder wrote ${offset} of ${size} bytes`)

  await mkdir(OUT_DIR, { recursive: true })
  await writeFile(join(OUT_DIR, 'water.bin'), buffer)

  const metaPath = join(OUT_DIR, 'meta.json')
  const meta = JSON.parse(await readFile(metaPath, 'utf8'))
  meta.water = {
    formatVersion: FORMAT_VERSION,
    files: [
      { name: `${RIVERS}.geojson`, sha256: rivers.sha256 },
      { name: `${LAKES}.geojson`, sha256: lakes.sha256 }
    ],
    transform: { simplifyToleranceDegrees: RIVER_TOLERANCE_DEG, minLakeAreaSquareDegrees: MIN_LAKE_AREA_DEG2 },
    counts: { rivers: lines.length, riverPoints: linePoints, lakes: rings.length, lakeTriangles: lake.indices.length / 3 },
    bytes: buffer.length
  }
  await writeFile(metaPath, `${JSON.stringify(meta, null, 2)}\n`)

  process.stdout.write(`${lines.length} rivers (${linePoints} points), ${rings.length} lakes, ${(buffer.length / 1e6).toFixed(2)} MB\n`)
}

async function check() {
  const buffer = await readFile(join(OUT_DIR, 'water.bin'))
  const problems = []
  if (buffer.toString('ascii', 0, 8) !== MAGIC) problems.push('water.bin has the wrong magic')
  const version = buffer.readUInt32LE(8)
  if (version !== FORMAT_VERSION) problems.push(`water.bin is format ${version}, the reader expects ${FORMAT_VERSION}`)
  const lineCount = buffer.readUInt32LE(12)
  const pointCount = buffer.readUInt32LE(16)
  const vertexCount = buffer.readUInt32LE(20)
  const indexCount = buffer.readUInt32LE(24)
  const expected = HEADER_BYTES + lineCount * 8 + pointCount * 8 + vertexCount * 8 + indexCount * 4
  if (expected !== buffer.length) problems.push(`water.bin is ${buffer.length} bytes, its table of contents describes ${expected}`)
  if (lineCount === 0) problems.push('water.bin has no rivers')
  if (indexCount === 0) problems.push('water.bin has no lakes')

  if (problems.length > 0) {
    for (const problem of problems) process.stderr.write(`  - ${problem}\n`)
    process.exitCode = 1
    return
  }
  process.stdout.write(`water ok: ${lineCount} rivers, ${indexCount / 3} lake triangles, ${(buffer.length / 1e6).toFixed(2)} MB\n`)
}

await (CHECK ? check() : build())
