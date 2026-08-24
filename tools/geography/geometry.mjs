// The geometry every builder needs: simplifying an outline without losing its
// shape, rounding its corners, and cutting it into triangles. Shared so the
// countries and the states inside them are drawn by exactly the same code —
// a state that simplified differently would not sit flush against its border.

import { createRequire } from 'node:module'

/** How much detail an outline keeps. Small enough that a coast still wanders. */
export const SIMPLIFY_TOLERANCE_DEG = 0.012
/**
 * One pass of corner-rounding. Chaikin pulls each corner in towards the middle
 * of its line — the algorithm only cuts at vertices — so the jagged corners
 * simplification leaves behind soften into something that looks drawn rather
 * than surveyed. Purely cosmetic, and recorded in meta.json as such.
 */
export const SMOOTH_PASSES = 1
/**
 * How far corner-rounding may move a point, in degrees — about three
 * kilometres. Chaikin cuts every corner by a quarter of the segment either
 * side of it, which is what a wandering coastline wants and is a disaster on a
 * long straight border: Algeria and Libya share one, each rounds its own copy
 * of it, and the two versions part company far enough to see the sea through
 * the gap. Capped, the rounding still shapes a coast and leaves a ruled border
 * where it was.
 */
export const MAX_SMOOTH_SHIFT_DEG = 0.03
/** Rings smaller than this are dropped. Vatican City is ~3.6e-5, so it stays. */
export const MIN_RING_AREA_DEG2 = 2e-5
/**
 * Longest triangle edge on the fill mesh before it is split, degrees. A long
 * flat triangle laid on a sphere cuts through it; splitting keeps the fill on
 * the surface it belongs to.
 */
export const MAX_MESH_EDGE_DEG = 3

/** Shoelace area of a ring in square degrees; sign tells winding. */
export function ringArea(points) {
  let sum = 0
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    sum += (points[j][0] - points[i][0]) * (points[j][1] + points[i][1])
  }
  return sum / 2
}

export function perpendicularDistance(point, start, end) {
  const [x, y] = point
  const [x1, y1] = start
  const [x2, y2] = end
  const dx = x2 - x1
  const dy = y2 - y1
  if (dx === 0 && dy === 0) return Math.hypot(x - x1, y - y1)
  const t = Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy)))
  return Math.hypot(x - (x1 + t * dx), y - (y1 + t * dy))
}

/** Iterative Douglas–Peucker; recursion would blow the stack on Antarctica. */
export function simplify(points, tolerance) {
  if (points.length <= 3) return points
  const keep = new Uint8Array(points.length)
  keep[0] = 1
  keep[points.length - 1] = 1
  const stack = [[0, points.length - 1]]
  while (stack.length > 0) {
    const [first, last] = stack.pop()
    let index = -1
    let maxDistance = tolerance
    for (let i = first + 1; i < last; i++) {
      const distance = perpendicularDistance(points[i], points[first], points[last])
      if (distance > maxDistance) {
        maxDistance = distance
        index = i
      }
    }
    if (index === -1) continue
    keep[index] = 1
    stack.push([first, index], [index, last])
  }
  return points.filter((_, i) => keep[i] === 1)
}

/** One Chaikin pass over a closed ring: every corner becomes two softer ones. */
export function smoothRing(points) {
  if (points.length < 4) return points
  const smoothed = []
  for (let i = 0; i < points.length; i++) {
    const [ax, ay] = points[i]
    const [bx, by] = points[(i + 1) % points.length]
    const dx = bx - ax
    const dy = by - ay
    const length = Math.hypot(dx, dy)
    const cut = length > 0 ? Math.min(0.25, MAX_SMOOTH_SHIFT_DEG / length) : 0.25
    smoothed.push([ax + dx * cut, ay + dy * cut])
    smoothed.push([bx - dx * cut, by - dy * cut])
  }
  return smoothed
}

/** GeoJSON rings repeat the first point; the runtime closes them itself. */
export function openRing(ring) {
  const points = ring.map(([lon, lat]) => [lon, lat])
  const first = points[0]
  const last = points[points.length - 1]
  if (points.length > 1 && first[0] === last[0] && first[1] === last[1]) points.pop()
  return points
}

export function prepareRing(ring) {
  const opened = openRing(ring)
  if (opened.length < 3) return null
  // Relative, not absolute: one tolerance for the whole world either leaves
  // Russia's coast noisy or erases Malta. A ring is simplified against its own
  // size, so every shape loses roughly the same proportion of its detail.
  const size = Math.sqrt(Math.abs(ringArea(opened)))
  const tolerance = Math.min(SIMPLIFY_TOLERANCE_DEG, Math.max(size / 60, 0.0015))
  const simplified = simplify(opened, tolerance)
  if (simplified.length < 3) return null
  if (Math.abs(ringArea(simplified)) < MIN_RING_AREA_DEG2) return null
  let rounded = simplified
  for (let pass = 0; pass < SMOOTH_PASSES; pass++) rounded = smoothRing(rounded)
  return rounded
}

/** MultiPolygon and Polygon, normalized to a list of [outer, ...holes]. */
export function polygonsOf(geometry) {
  if (geometry.type === 'Polygon') return [geometry.coordinates]
  if (geometry.type === 'MultiPolygon') return geometry.coordinates
  throw new Error(`unsupported geometry ${geometry.type}`)
}

/**
 * Triangulates one polygon in lon/lat, then splits any triangle edge longer
 * than MAX_MESH_EDGE_DEG. Splitting stays inside the original triangle, so the
 * mesh keeps the same footprint while bending onto the sphere instead of
 * cutting a chord through it. Both triangles sharing a long edge split it at
 * the same midpoint, so no T-junction cracks appear.
 */
/** Loaded lazily so `--check` runs without this folder's node_modules. */
let earcut = null
export async function loadEarcut() {
  if (earcut === null) ({ default: earcut } = await import('earcut'))
  return earcut
}

export function triangulatePolygon(rings) {
  const flat = []
  const holeIndices = []
  rings.forEach((ring, index) => {
    if (index > 0) holeIndices.push(flat.length / 2)
    for (const [lon, lat] of ring) flat.push(lon, lat)
  })
  const indices = earcut(flat, holeIndices.length > 0 ? holeIndices : null, 2)
  if (indices.length === 0) return { vertices: [], indices: [] }

  const vertices = flat.slice()
  const midpoints = new Map()
  const midpointOf = (a, b) => {
    const key = a < b ? `${a}:${b}` : `${b}:${a}`
    const existing = midpoints.get(key)
    if (existing !== undefined) return existing
    const index = vertices.length / 2
    vertices.push((vertices[a * 2] + vertices[b * 2]) / 2, (vertices[a * 2 + 1] + vertices[b * 2 + 1]) / 2)
    midpoints.set(key, index)
    return index
  }
  const edgeLength = (a, b) => Math.hypot(
    vertices[a * 2] - vertices[b * 2],
    vertices[a * 2 + 1] - vertices[b * 2 + 1]
  )

  const queue = []
  for (let i = 0; i < indices.length; i += 3) queue.push([indices[i], indices[i + 1], indices[i + 2]])
  const out = []
  while (queue.length > 0) {
    const [a, b, c] = queue.pop()
    const ab = edgeLength(a, b)
    const bc = edgeLength(b, c)
    const ca = edgeLength(c, a)
    const longest = Math.max(ab, bc, ca)
    if (longest <= MAX_MESH_EDGE_DEG) {
      out.push(a, b, c)
      continue
    }
    if (longest === ab) {
      const m = midpointOf(a, b)
      queue.push([a, m, c], [m, b, c])
    } else if (longest === bc) {
      const m = midpointOf(b, c)
      queue.push([b, m, a], [m, c, a])
    } else {
      const m = midpointOf(c, a)
      queue.push([c, m, b], [m, a, b])
    }
  }
  return { vertices, indices: out }
}

// ------------------------------------------------------------------ source --

