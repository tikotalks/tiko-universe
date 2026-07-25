#!/usr/bin/env node
/**
 * Generate per-language interface bundles for every app, on both platforms.
 *
 * The English strings live where they always have — in the `*EN` dictionaries in
 * `packages/tikokit-ios/Sources/TikoKit/TikoI18n*.swift`, which are the source of
 * truth for *which* strings exist. This tool reads them, looks each English string
 * up in `tools/ui-translations/<locale>.json`, and writes the translated bundles.
 *
 * Translating by **English string** rather than by key is what makes this
 * tractable: "Cancel" appears under eleven different keys across the apps and is
 * translated once. 197 strings cover the whole interface.
 *
 * A missing translation is not an error — the string is simply left out of the
 * bundle, and `TikoI18n` falls back to English for that key. So a locale can be
 * filled in gradually and shipped at any point.
 *
 * Writes:
 * - `packages/tikokit-ios/Sources/TikoKit/TikoI18nGenerated.swift` — every locale
 *   for every app, plus the bundle lists the loader reads.
 * - `packages/i18n/src/bundles.generated.ts` — the same data for the web.
 * - `workers/translations-api/data/source-en.json` — the English source, ready to
 *   POST to Lezu so it can fill the locales this tool has no file for.
 *
 * Usage:
 *   node tools/generate-ui-translations.mjs
 *   node tools/generate-ui-translations.mjs --check
 *   node tools/generate-ui-translations.mjs --report   # coverage per locale
 */
import { readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { locales } from './locales.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const SWIFT_DIR = join(ROOT, 'packages/tikokit-ios/Sources/TikoKit')
const TRANSLATIONS = join(ROOT, 'tools/ui-translations')
const CHECK = process.argv.includes('--check')
const REPORT = process.argv.includes('--report')

/** The apps, and the Swift identifier prefix each one's dictionaries use. */
const APPS = [
  { key: 'radio', prefix: 'radio' },
  { key: 'yesNo', prefix: 'yesNo' },
  { key: 'cards', prefix: 'cards' },
  { key: 'timer', prefix: 'timer' },
  { key: 'type', prefix: 'type' },
  { key: 'sequence', prefix: 'sequence' },
  { key: 'todo', prefix: 'todo' },
  { key: 'say', prefix: 'say' },
  { key: 'sum', prefix: 'sum' },
  { key: 'first', prefix: 'first' },
]

/** Reads a `static let <name>: [String: String] = [ ... ]` dictionary from Swift. */
function readSwiftDictionary(source, name) {
  // The dictionaries are `private static let` in some files and `static let` in
  // others, so match on the part that is always the same.
  const declaration = `let ${name}: [String: String] = [`
  const start = source.indexOf(declaration)
  if (start === -1) return null
  // The opening bracket is the one after the `=`, not the one in the type.
  const open = start + declaration.length - 1
  let depth = 0
  let end = open
  for (let index = open; index < source.length; index += 1) {
    if (source[index] === '[') depth += 1
    if (source[index] === ']') {
      depth -= 1
      if (depth === 0) { end = index; break }
    }
  }
  const body = source.slice(open + 1, end)
  const entries = []
  const pattern = /"((?:[^"\\]|\\.)*)"\s*:\s*"((?:[^"\\]|\\.)*)"/g
  let match
  while ((match = pattern.exec(body)) !== null) {
    entries.push([unescapeSwift(match[1]), unescapeSwift(match[2])])
  }
  return entries
}

function unescapeSwift(value) {
  return value.replace(/\\"/g, '"').replace(/\\n/g, '\n').replace(/\\\\/g, '\\')
}

function swiftString(value) {
  return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n')}"`
}

// ---- Read the English source out of the Swift files ----

const swiftSources = readdirSync(SWIFT_DIR)
  .filter((file) => file.startsWith('TikoI18n') && file.endsWith('.swift') && !file.includes('Generated'))
  .map((file) => readFileSync(join(SWIFT_DIR, file), 'utf8'))
  .join('\n')

/** app key → [[key, english]] */
const english = new Map()
for (const app of APPS) {
  const entries = readSwiftDictionary(swiftSources, `${app.prefix}EN`)
  if (!entries) throw new Error(`no ${app.prefix}EN dictionary found`)
  english.set(app.key, entries)
}

/** Every distinct English string, which is what gets translated. */
const distinct = new Map()
for (const [app, entries] of english) {
  for (const [key, value] of entries) {
    if (!distinct.has(value)) distinct.set(value, [])
    distinct.get(value).push(`${app}.${key}`)
  }
}

// ---- Read the translations ----

/** locale → { english: translated } */
const tables = new Map()
if (existsSync(TRANSLATIONS)) {
  for (const file of readdirSync(TRANSLATIONS).filter((f) => f.endsWith('.json'))) {
    const code = file.replace(/\.json$/, '')
    const table = JSON.parse(readFileSync(join(TRANSLATIONS, file), 'utf8'))
    tables.set(code, table)
  }
}

if (REPORT) {
  console.log(`${distinct.size} distinct English strings across ${APPS.length} apps.`)
  console.log('')
  console.log('locale  translated  of  coverage')
  const rows = locales.map((locale) => {
    const table = tables.get(locale.code) ?? {}
    const done = [...distinct.keys()].filter((value) => typeof table[value] === 'string' && table[value].length > 0)
    return { code: locale.code, name: locale.name, done: done.length }
  })
  for (const row of rows.sort((a, b) => b.done - a.done)) {
    const percent = Math.round((row.done / distinct.size) * 100)
    console.log(
      `${row.code.padEnd(6)} ${String(row.done).padStart(10)}  ${String(distinct.size).padStart(3)}  ${String(percent).padStart(3)}%  ${row.name}`,
    )
  }
  process.exit(0)
}

// ---- Build the bundles ----

/** app → locale → { key: translated } */
const bundles = new Map()
for (const [app, entries] of english) {
  const perLocale = new Map()
  for (const locale of locales) {
    if (locale.code === 'en') continue
    const table = tables.get(locale.code)
    if (!table) continue
    const translated = {}
    for (const [key, value] of entries) {
      const text = table[value]
      if (typeof text === 'string' && text.length > 0) translated[key] = text
    }
    if (Object.keys(translated).length > 0) perLocale.set(locale.code, translated)
  }
  bundles.set(app, perLocale)
}

// ---- Swift ----

const swiftLines = [
  '// Generated by tools/generate-ui-translations.mjs — do not edit.',
  '//',
  '// Interface translations for every locale the app offers. The English strings',
  '// stay in TikoI18n.swift and friends; this file holds what they become in the',
  '// other languages, generated from tools/ui-translations/<locale>.json.',
  '//',
  '// A locale that has only some of the strings gets only those: TikoI18n falls',
  '// back to English per key, so a half-translated language still works.',
  '',
  'import Foundation',
  '',
  'extension TikoLocalTranslations {',
]
for (const [app, perLocale] of bundles) {
  for (const [code, translated] of perLocale) {
    const identifier = `${app}_${code.replace(/-/g, '_')}`
    swiftLines.push(`    static let ${identifier}: [String: String] = [`)
    for (const [key, value] of Object.entries(translated)) {
      swiftLines.push(`        ${swiftString(key)}: ${swiftString(value)},`)
    }
    swiftLines.push('    ]')
    swiftLines.push('')
  }
}
swiftLines.push('    /// The generated bundles for one app, in locale order.')
swiftLines.push('    static func generatedBundles(for app: TikoAppKey) -> [(String, [String: String])] {')
swiftLines.push('        switch app {')
const APP_CASES = {
  radio: '.radio', yesNo: '.yesNo', cards: '.cards', timer: '.timer', type: '.type',
  sequence: '.sequence', todo: '.todo', say: '.say', sum: '.sum', first: '.first',
}
for (const [app, perLocale] of bundles) {
  const pairs = [...perLocale.keys()].map((code) => `("${code}", ${app}_${code.replace(/-/g, '_')})`)
  swiftLines.push(`        case ${APP_CASES[app]}: return [${pairs.join(', ')}]`)
}
swiftLines.push('        }')
swiftLines.push('    }')
swiftLines.push('}')
swiftLines.push('')

// ---- Web ----

const webLines = [
  '// Generated by tools/generate-ui-translations.mjs — do not edit.',
  '',
  'export type GeneratedBundles = Record<string, Record<string, Record<string, string>>>',
  '',
  '/** app → locale → key → translated string. */',
  'export const generatedBundles: GeneratedBundles = {',
]
for (const [app, perLocale] of bundles) {
  webLines.push(`  ${JSON.stringify(app)}: {`)
  for (const [code, translated] of perLocale) {
    webLines.push(`    ${JSON.stringify(code)}: ${JSON.stringify(translated)},`)
  }
  webLines.push('  },')
}
webLines.push('}')
webLines.push('')

// ---- The English source, for Lezu ----

const source = {}
for (const [app, entries] of english) {
  source[app] = Object.fromEntries(entries)
}
const sourceJson = `${JSON.stringify({ locale: 'en', apps: source }, null, 2)}\n`

const outputs = [
  ['packages/tikokit-ios/Sources/TikoKit/TikoI18nGenerated.swift', swiftLines.join('\n')],
  ['packages/i18n/src/bundles.generated.ts', webLines.join('\n')],
  ['workers/translations-api/data/source-en.json', sourceJson],
]

mkdirSync(join(ROOT, 'workers/translations-api/data'), { recursive: true })

let stale = false
for (const [path, contents] of outputs) {
  const full = join(ROOT, path)
  const previous = existsSync(full) ? readFileSync(full, 'utf8') : null
  if (previous === contents) {
    console.log(`OK   ${path}`)
    continue
  }
  if (CHECK) {
    console.error(`STALE ${path}`)
    stale = true
    continue
  }
  writeFileSync(full, contents)
  console.log(`Wrote ${path}`)
}

const translatedLocales = new Set()
for (const perLocale of bundles.values()) for (const code of perLocale.keys()) translatedLocales.add(code)
console.log(
  `${distinct.size} distinct strings; ${translatedLocales.size + 1} locales with translations `
  + `(of ${locales.length} offered).`,
)
if (stale) process.exit(1)
