// Glyph packs for Tiko Write.
//
// Geometry only. A pack says where a stroke starts, which way it travels, and
// which order the strokes come in — the part of a letter a child cannot learn
// from looking at a finished one. Spoken names, phonics and example words are
// deliberately absent: they live in translations, so 54 languages do not
// multiply the geometry.
//
// These types mirror engines/stroke/schema/glyph-pack.v1.json. The schema is
// the contract (StrokeCore decodes against it and tools/check-glyph-packs.mjs
// gates it in CI); these types are the TypeScript view of the same shape, for
// the seed migration and the admin editor.

import shapes from '../source/shapes.json'
import numbersLatin from '../source/numbers-latin.json'
import printLatin from '../source/print-latin.json'

export const GLYPH_PACK_SCHEMA_VERSION = 1 as const

/** Which handwriting convention a pack follows. `shape` and `number` are not
 *  handwriting styles but share the format. */
export type GlyphPackStyle = 'print' | 'cursive' | 'shape' | 'number'

export interface GlyphStroke {
  /** SVG path data, exactly one subpath — one stroke is one continuous
   *  pen-down movement. The direction of the path is the direction the child
   *  is taught, so reversing it changes what is being taught. */
  d: string
  /** Hand-placed key points as normalized arc-length positions in [0,1],
   *  ascending. Omit to let StrokeCore derive them from curvature and spacing.
   *  0 and 1 are implicit. */
  keyPoints?: number[]
  /** Multiplies the tolerance corridor for this stroke. Above 1 for a stroke
   *  that is legitimately harder to be precise about, such as a long diagonal. */
  widthScale?: number
}

export interface Glyph {
  id: string
  /** The character or short label. Tile face, and the translation lookup key —
   *  never spoken directly. */
  char: string
  groupId: string
  sortOrder: number
  /** Ordered. Index 0 is drawn first; the order is pedagogical content. */
  strokes: GlyphStroke[]
  /** Defaults to true. */
  strokeOrderStrict?: boolean
  /** Reserved for schema version 2 (cursive join anchors). */
  joins?: null
}

export interface GlyphGroup {
  id: string
  sortOrder: number
}

/** Horizontal writing guides in viewBox y-coordinates. Absent for shape packs,
 *  which have no baseline. */
export interface GlyphGuides {
  ascender?: number
  capHeight?: number
  xHeight?: number
  baseline: number
  descender?: number
}

export interface GlyphPack {
  packId: string
  packSchemaVersion: typeof GLYPH_PACK_SCHEMA_VERSION
  /** Content revision. Bumped on any geometry change, and recorded in attempt
   *  records so a replay against a re-authored glyph is identifiable as such. */
  packVersion: number
  style: GlyphPackStyle
  /** [minX, minY, width, height]. Every glyph in a pack shares one viewBox, so
   *  glyphs are mutually consistent in size. */
  viewBox: [number, number, number, number]
  guides?: GlyphGuides
  groups?: GlyphGroup[]
  glyphs: Glyph[]
}

const packs = {
  shapes: shapes as unknown as GlyphPack,
  'numbers-latin': numbersLatin as unknown as GlyphPack,
  'print-latin': printLatin as unknown as GlyphPack,
} satisfies Record<string, GlyphPack>

export type GlyphPackId = keyof typeof packs

/** Every pack id that ships in this package. */
export const glyphPackIds = Object.keys(packs) as GlyphPackId[]

/** All packs, in declaration order. */
export const glyphPacks: GlyphPack[] = Object.values(packs)

export function glyphPack(id: GlyphPackId): GlyphPack {
  return packs[id]
}

/** Glyphs in presentation order: by group `sortOrder`, then glyph `sortOrder`.
 *  Glyphs whose `groupId` has no matching group sort last rather than being
 *  dropped, so a pack with a missing group still renders — the CI gate is what
 *  rejects that, not the runtime. */
export function orderedGlyphs(pack: GlyphPack): Glyph[] {
  const groupOrder = new Map((pack.groups ?? []).map((g) => [g.id, g.sortOrder]))
  return [...pack.glyphs].sort((a, b) => {
    const ga = groupOrder.get(a.groupId) ?? Number.MAX_SAFE_INTEGER
    const gb = groupOrder.get(b.groupId) ?? Number.MAX_SAFE_INTEGER
    return ga !== gb ? ga - gb : a.sortOrder - b.sortOrder
  })
}

/** True when strokes must be traced in the order they are listed. */
export function strokeOrderStrict(glyph: Glyph): boolean {
  return glyph.strokeOrderStrict ?? true
}
