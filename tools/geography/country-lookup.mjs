// Which countries lie within a radius of a point, read straight from the
// generated geometry. Used by the content builders so a district's country list
// comes from the same shapes the globe draws.

import { readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const OUT_DIR = join(HERE, '..', '..', 'packages', 'geography', 'generated')
const HEADER_BYTES = 32
const COUNTRY_RECORD_BYTES = 52
const RING_RECORD_BYTES = 12

const buffer = await readFile(join(OUT_DIR, 'geometry.bin'))
const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength)
const countryCount = view.getUint32(12, true)
const ringCount = view.getUint32(16, true)

const countries = []
for (let index = 0; index < countryCount; index++) {
  const base = HEADER_BYTES + index * COUNTRY_RECORD_BYTES
  countries.push({
    id: String.fromCharCode(view.getUint8(base), view.getUint8(base + 1), view.getUint8(base + 2)),
    labelLon: view.getFloat32(base + 4, true),
    labelLat: view.getFloat32(base + 8, true),
    minLon: view.getFloat32(base + 12, true),
    minLat: view.getFloat32(base + 16, true),
    maxLon: view.getFloat32(base + 20, true),
    maxLat: view.getFloat32(base + 24, true),
    ringOffset: view.getUint32(base + 28, true),
    ringCount: view.getUint32(base + 32, true)
  })
}

const ringsOffset = HEADER_BYTES + countryCount * COUNTRY_RECORD_BYTES
const pointsOffset = ringsOffset + ringCount * RING_RECORD_BYTES
const rings = []
for (let index = 0; index < ringCount; index++) {
  const base = ringsOffset + index * RING_RECORD_BYTES
  rings.push({
    pointOffset: view.getUint32(base, true),
    pointCount: view.getUint32(base + 4, true)
  })
}

const lonAt = (index) => view.getFloat32(pointsOffset + index * 8, true)
const latAt = (index) => view.getFloat32(pointsOffset + index * 8 + 4, true)

function longitudeDelta(a, b) {
  let delta = a - b
  while (delta > 180) delta -= 360
  while (delta < -180) delta += 360
  return delta
}

/**
 * Every country with land inside `radius` degrees of `point`. Vertex sampling
 * rather than a true distance-to-polygon: the districts are tens of degrees
 * wide, so a coastline vertex inside the circle is the same answer.
 */
/** Country records, for callers that need a shape rather than a lookup. */
export const countryRecords = countries.map((country) => ({ ...country }))

function ringContains(ring, point) {
  let inside = false
  let previousLon = longitudeDelta(lonAt(ring.pointOffset + ring.pointCount - 1), point.lon)
  let previousLat = latAt(ring.pointOffset + ring.pointCount - 1)
  for (let i = 0; i < ring.pointCount; i++) {
    const currentLon = longitudeDelta(lonAt(ring.pointOffset + i), point.lon)
    const currentLat = latAt(ring.pointOffset + i)
    if ((currentLat > point.lat) !== (previousLat > point.lat)) {
      const t = (point.lat - currentLat) / (previousLat - currentLat)
      if (currentLon + t * (previousLon - currentLon) > 0) inside = !inside
    }
    previousLon = currentLon
    previousLat = currentLat
  }
  return inside
}

/** True when the point is inside the country's own outline. */
export function isInsideCountry(id, point) {
  const country = countries.find((candidate) => candidate.id === id)
  if (!country) return false
  if (point.lat < country.minLat || point.lat > country.maxLat) return false
  let inside = false
  for (let r = country.ringOffset; r < country.ringOffset + country.ringCount; r++) {
    if (ringContains(rings[r], point)) inside = !inside
  }
  return inside
}

/**
 * A handful of points inside a country, spread around its label point. Used to
 * stand animals inside a country so zooming into one always finds something.
 */
export function pointsInsideCountry(id, wanted, labelPoint, seed) {
  return pointsForCountry(id, wanted, labelPoint, seed, true)
}

/** Points just off a country's coast, for the animals that live in the water. */
export function pointsOffCountry(id, wanted, labelPoint, seed) {
  return pointsForCountry(id, wanted, labelPoint, seed, false)
}

/**
 * Walks outward from the country's label point rather than sampling its
 * bounding box: the Netherlands' box reaches the Caribbean and Malta's is
 * mostly sea, so uniform sampling found one point and gave up.
 */
function pointsForCountry(id, wanted, labelPoint, seed, wantsInside) {
  const country = countries.find((candidate) => candidate.id === id)
  if (!country) return []
  const span = Math.max(0.4, Math.min(country.maxLat - country.minLat, 12))

  // Spacing is a preference, not a requirement: Malta has room for nine animals
  // only if they are allowed to stand close together, and nine close together
  // beats three spread out.
  for (const spacing of [span / 14, span / 30, span / 80, 0]) {
    const found = gather(id, wanted, labelPoint, `${seed}:${spacing}`, wantsInside, span, spacing)
    if (found.length >= wanted) return found
    if (spacing === 0) {
      // Vatican City is smaller than the simplification tolerance and São Tomé's
      // label point sits offshore: nothing lands inside either. A vertex of the
      // country's own outline is the closest point the geometry can offer.
      if (found.length === 0 && wantsInside) return [outlinePointOf(id) ?? labelPoint]
      return found
    }
  }
  return []
}

function gather(id, wanted, labelPoint, seed, wantsInside, span, spacing) {
  const found = []
  // The label point of a tiny country can fall just outside its own outline,
  // which for the offshore case would put a seagull on Italian soil.
  const labelQualifies = isInsideCountry(id, labelPoint) === wantsInside
    && (wantsInside || !isLand(labelPoint))
  if (labelQualifies) found.push(labelPoint)

  let hash = 2166136261
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  // Rings of candidates around the label point, widening until there is room
  // for everything asked for.
  for (let ring = 1; ring <= 20 && found.length < wanted; ring++) {
    const radius = (span / 2) * (ring / 8)
    for (let step = 0; step < 16 && found.length < wanted; step++) {
      hash = Math.imul(hash ^ (ring * 31 + step), 16777619)
      const angle = (step / 16) * Math.PI * 2 + ((hash >>> 0) % 100) / 100
      const lat = Math.max(-85, Math.min(85, labelPoint.lat + Math.sin(angle) * radius))
      const lonScale = Math.max(0.2, Math.cos(lat * Math.PI / 180))
      const lon = ((labelPoint.lon + (Math.cos(angle) * radius) / lonScale + 540) % 360) - 180
      const candidate = { lat: Number(lat.toFixed(3)), lon: Number(lon.toFixed(3)) }
      if (isInsideCountry(id, candidate) !== wantsInside) continue
      if (!wantsInside && isLand(candidate)) continue
      if (spacing > 0 && found.some((point) => Math.hypot(point.lat - candidate.lat, point.lon - candidate.lon) < spacing)) continue
      found.push(candidate)
    }
  }
  return found
}

/** A vertex from the country's own outline — always on the shape itself. */
function outlinePointOf(id) {
  const country = countries.find((candidate) => candidate.id === id)
  if (!country || country.ringCount === 0) return null
  const ring = rings[country.ringOffset]
  if (!ring || ring.pointCount === 0) return null
  return {
    lat: Number(latAt(ring.pointOffset).toFixed(3)),
    lon: Number(lonAt(ring.pointOffset).toFixed(3))
  }
}

/** True when any country's outline contains the point — i.e. this is land. */
export function isLand(point) {
  for (const country of countries) {
    if (point.lat < country.minLat || point.lat > country.maxLat) continue
    if (point.lon < country.minLon || point.lon > country.maxLon) continue
    let inside = false
    for (let r = country.ringOffset; r < country.ringOffset + country.ringCount; r++) {
      if (ringContains(rings[r], point)) inside = !inside
    }
    if (inside) return true
  }
  return false
}

export function countriesCentredNear(point, radius) {
  const found = []
  for (const country of countries) {
    const dLat = country.labelLat - point.lat
    if (Math.abs(dLat) > radius) continue
    const scale = Math.max(0.2, Math.cos(((country.labelLat + point.lat) / 2) * Math.PI / 180))
    const dLon = longitudeDelta(country.labelLon, point.lon) * scale
    if (Math.hypot(dLon, dLat) <= radius) found.push(country.id)
  }
  return found
}

export function countriesNear(point, radius) {
  const found = []
  const scale = Math.max(0.2, Math.cos(point.lat * Math.PI / 180))
  for (const country of countries) {
    if (point.lat < country.minLat - radius || point.lat > country.maxLat + radius) continue
    let hit = false
    for (let r = country.ringOffset; r < country.ringOffset + country.ringCount && !hit; r++) {
      const ring = rings[r]
      for (let i = 0; i < ring.pointCount; i++) {
        const dLat = latAt(ring.pointOffset + i) - point.lat
        if (Math.abs(dLat) > radius) continue
        const dLon = longitudeDelta(lonAt(ring.pointOffset + i), point.lon) * scale
        if (dLon * dLon + dLat * dLat <= radius * radius) {
          hit = true
          break
        }
      }
    }
    if (hit) found.push(country.id)
  }
  return found
}
