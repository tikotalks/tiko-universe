#!/usr/bin/env node
/**
 * Generate the Talk language packs from one spine and one file per language.
 *
 * A pack used to be a standalone JSON file, which meant every concept's part of
 * speech, category, frequency and icon was written out 54 times with nothing
 * checking that the copies agreed. Adding a word was 54 consistent edits, and a
 * typo in the 41st was invisible.
 *
 * Now:
 *
 * - `source/spine.json` — the concepts themselves: id, part of speech, category,
 *   frequency, icon, and the templates' slots. Language-independent, written once.
 * - `source/<locale>.json` — what that language *calls* them, its template
 *   patterns, its grammar block, and whether a native speaker has read it.
 *
 * A word is one line per language rather than one object per language, so adding a
 * concept is reviewable — and a reviewer for, say, Welsh opens one file and sees
 * every word in it.
 *
 * The generated `data/<locale>-v1.json` files stay the shipped artefact: they are
 * what `@tiko/talk-packs` imports, what TikoKit bundles for iOS, and what the D1
 * seeds are built from.
 *
 * Usage:
 *   node tools/generate-talk-packs.mjs
 *   node tools/generate-talk-packs.mjs --check
 */
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const PACKAGE = join(ROOT, 'packages/talk-packs')
const SOURCE = join(PACKAGE, 'source')
const DATA = join(PACKAGE, 'data')
const CHECK = process.argv.includes('--check')

const spine = JSON.parse(readFileSync(join(SOURCE, 'spine.json'), 'utf8'))
const locales = readdirSync(SOURCE)
  .filter((name) => name.endsWith('.json') && name !== 'spine.json')
  .map((name) => name.replace(/\.json$/, ''))
  .sort()

const problems = []

/** A concept's entry in a pack: the shared facts, plus this language's word. */
function word(concept, text) {
  const entry = { id: concept.id, text, pos: concept.pos, category: concept.category, frequency: concept.frequency }
  if (concept.icon) entry.icon = concept.icon
  if (concept.image) entry.image = concept.image
  return entry
}

function pack(locale) {
  const source = JSON.parse(readFileSync(join(SOURCE, `${locale}.json`), 'utf8'))
  if (source.locale !== locale) problems.push(`${locale}.json declares locale "${source.locale}"`)

  const words = spine.words.map((concept) => {
    const text = source.words[concept.id]
    // A missing word is a hole in the board, not something to paper over with the
    // English one: the pack would look complete and read wrong.
    if (typeof text !== 'string' || !text.trim()) problems.push(`${locale}: no word for "${concept.id}"`)
    return word(concept, text ?? '')
  })
  const extraWords = Object.keys(source.words).filter((id) => !spine.words.some((c) => c.id === id))
  if (extraWords.length) problems.push(`${locale}: words not in the spine — ${extraWords.join(', ')}`)

  const templates = spine.templates.map((template) => {
    const pattern = source.templates[template.id]
    if (typeof pattern !== 'string' || !pattern.trim()) problems.push(`${locale}: no pattern for "${template.id}"`)
    const entry = { id: template.id, pattern: pattern ?? '', category: template.category }
    if (template.icon) entry.icon = template.icon
    entry.slots = template.slots
    return entry
  })

  const built = { locale, version: spine.version }
  if (source.source) built.source = source.source
  if (source.reviewStatus) built.reviewStatus = source.reviewStatus
  built.words = words
  built.templates = templates
  built.grammar = source.grammar
  return built
}

let written = 0
let stale = 0
for (const locale of locales) {
  const built = JSON.stringify(pack(locale), null, 2) + '\n'
  const target = join(DATA, `${locale}-v${spine.version}.json`)
  const previous = existsSync(target) ? readFileSync(target, 'utf8') : null
  if (previous === built) continue
  if (CHECK) {
    console.error(`STALE packages/talk-packs/data/${locale}-v${spine.version}.json`)
    stale += 1
    continue
  }
  writeFileSync(target, built)
  written += 1
}

// A pack file with no source file behind it would keep shipping after its language
// was removed.
const orphans = readdirSync(DATA)
  .filter((name) => /^[a-z]{2,3}-v\d+\.json$/.test(name))
  .filter((name) => !locales.includes(name.replace(/-v\d+\.json$/, '')))
if (orphans.length) problems.push(`data files with no source: ${orphans.join(', ')}`)

if (problems.length) {
  console.error(problems.join('\n'))
  process.exit(1)
}
if (stale) process.exit(1)
console.log(
  `${locales.length} packs, ${spine.words.length} words, ${spine.templates.length} templates`
  + (written ? ` — ${written} written` : ' — all up to date'),
)
