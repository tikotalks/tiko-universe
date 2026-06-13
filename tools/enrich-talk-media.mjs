#!/usr/bin/env node
/**
 * Attach Tiko media images to Talk word packs.
 *
 * Words carry a stable, English-derived id ("bread", "apple", ...) that is the
 * same across every language pack. The Tiko media library is tagged/titled in
 * English, so a Dutch word ("brood") can't be searched directly — instead we
 * resolve the image once from the English concept (the en pack text) and write
 * the same image URL onto that id in every locale.
 *
 * Usage:
 *   node tools/enrich-talk-media.mjs            # resolve + write image URLs
 *   node tools/enrich-talk-media.mjs --dry-run  # report matches, write nothing
 */

import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const DATA_DIR = join(ROOT, 'workers/sentence-api/data')
const MEDIA_API = process.env.TIKO_MEDIA_API_URL?.replace(/\/$/, '') || 'https://media.tikoapi.org'
const DRY_RUN = process.argv.includes('--dry-run')
const CONCURRENCY = 8
// Accept only title-based matches; tag-only hits are too noisy (a "water" tag on
// a toilet photo, a "juice" tag on an apple) and produce wrong pictures.
const MIN_SCORE = 60
// Only content words get pictures; function words (a, my, from, is) don't have a
// meaningful image and only ever match incidentally.
const IMAGE_POS = new Set(['noun', 'verb', 'adjective', 'adverb', 'social'])

const enPack = JSON.parse(readFileSync(join(DATA_DIR, 'en-v1.json'), 'utf8'))

/** Score a media asset against a concept; 0 means "not a confident match". */
function scoreAsset(asset, concept) {
  const title = String(asset.title ?? '').toLowerCase().trim()
  const tags = Array.isArray(asset.tags) ? asset.tags.map((t) => String(t).toLowerCase()) : []
  const titleTokens = title.split(/[^a-z0-9]+/).filter(Boolean)
  if (title === concept) return 100
  if (titleTokens.includes(concept)) return 60 + (tags.includes(concept) ? 10 : 0)
  if (tags.includes(concept)) return 40
  return 0 // reject loose description-only matches (bread != sandwich)
}

async function resolveImage(concept) {
  const url = `${MEDIA_API}/v1/media?search=${encodeURIComponent(concept)}&limit=8`
  let assets = []
  try {
    const response = await fetch(url)
    if (!response.ok) return null
    const body = await response.json()
    assets = Array.isArray(body?.data) ? body.data : []
  } catch {
    return null
  }
  let best = null
  let bestScore = 0
  for (const asset of assets) {
    const score = scoreAsset(asset, concept)
    if (score > bestScore && score >= MIN_SCORE && asset.original_url) {
      best = asset
      bestScore = score
    }
  }
  return best ? { url: best.original_url, title: best.title, score: bestScore } : null
}

async function mapLimit(items, limit, fn) {
  const results = new Array(items.length)
  let index = 0
  async function worker() {
    while (index < items.length) {
      const current = index++
      results[current] = await fn(items[current], current)
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker))
  return results
}

async function main() {
  console.log(`Resolving images for ${enPack.words.length} concepts via ${MEDIA_API} ...`)
  const candidates = enPack.words.filter((word) => IMAGE_POS.has(word.pos))
  const resolved = await mapLimit(candidates, CONCURRENCY, async (word) => {
    const concept = String(word.text).toLowerCase().trim()
    const match = await resolveImage(concept)
    return { id: word.id, concept, match }
  })

  // A single concept -> image map (keyed by the shared word id). This is the
  // source of truth: editable in admin, applied to every language by id, and
  // turned into seed-media-map.sql by the seed generator.
  const matches = resolved.filter((r) => r.match).sort((a, b) => a.id.localeCompare(b.id))
  console.log(`Matched ${matches.length} / ${enPack.words.length} concepts to images.`)
  if (DRY_RUN) {
    for (const entry of matches.slice(0, 40)) {
      console.log(`  ${entry.id} -> ${entry.match.title} (${entry.match.score})`)
    }
    console.log('Dry run — no files written.')
    return
  }

  // Merge with any existing map so manual admin edits aren't clobbered by a
  // re-run: only fill in concepts that are missing.
  const mapPath = join(DATA_DIR, 'media-map.json')
  let existing = {}
  try { existing = JSON.parse(readFileSync(mapPath, 'utf8')) } catch { existing = {} }
  const map = { ...existing }
  let added = 0
  for (const entry of matches) {
    if (!map[entry.id]) { map[entry.id] = entry.match.url; added += 1 }
  }
  const ordered = Object.fromEntries(Object.keys(map).sort().map((k) => [k, map[k]]))
  writeFileSync(mapPath, JSON.stringify(ordered, null, 2) + '\n')
  console.log(`Wrote ${mapPath} (${Object.keys(ordered).length} concepts, +${added} new).`)
  console.log('Regenerate seeds with: npm run generate:talk-seeds')
}

main()
