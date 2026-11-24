#!/usr/bin/env node
/**
 * Generate everything that carries the Tiko Cards default vocabulary.
 *
 * The vocabulary is authored once, in packages/cards-vocabulary/source:
 *   vocabulary.json          — collections, cards, and the picture each card is pinned to
 *   translations/<locale>.json — titles and spoken text in other languages
 *
 * and emitted twice:
 *   workers/content-api/migrations/0014_cards_default_vocabulary.sql
 *       what the content API serves
 *   apps/cards/ios/Sources/CardsDefaultVocabulary.json
 *       the same vocabulary bundled in the app, shown when the API cannot be reached
 *
 * Generated rather than kept by hand because there were three hand-kept copies
 * of the defaults (the iOS fallback, the dev database, a legacy seed) and no two
 * of them agreed. `--check` is wired into `generated:check` so a drift fails CI.
 *
 * Every card names its picture by media id. Nothing is matched by title at run
 * time: a card either has the picture someone chose for it, or has `"picture": null`
 * on purpose (a colour card, whose tile colour *is* the picture).
 *
 * Usage:
 *   node tools/generate-cards-vocabulary.mjs                 # write both files
 *   node tools/generate-cards-vocabulary.mjs --check         # exit 1 if either is stale
 *   node tools/generate-cards-vocabulary.mjs --verify-media  # ask the live media API
 *                                                            # that every pinned picture exists
 */

import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const SOURCE_DIR = join(ROOT, 'packages/cards-vocabulary/source')
const TRANSLATIONS_DIR = join(SOURCE_DIR, 'translations')
const MIGRATION = join(ROOT, 'workers/content-api/migrations/0014_cards_default_vocabulary.sql')
const IOS_BUNDLE = join(ROOT, 'apps/cards/ios/Sources/CardsDefaultVocabulary.json')
const COLORS_SWIFT = join(ROOT, 'packages/tikokit-ios/Sources/TikoKit/TikoColors.swift')
const MEDIA_API = (process.env.TIKO_MEDIA_API_URL ?? 'https://media.tikoapi.org').replace(/\/$/, '')

const CHECK_MODE = process.argv.includes('--check')
const VERIFY_MEDIA = process.argv.includes('--verify-media')

const FITZGERALD = new Set(['person', 'action', 'thing', 'describing', 'social', 'miscellaneous'])
const MEDIA_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

const problems = []
function problem(message) {
  problems.push(message)
}

function sqlString(value) {
  return `'${String(value).replace(/'/g, "''")}'`
}

function sqlStringOrNull(value) {
  return value === undefined || value === null ? 'NULL' : sqlString(value)
}

// ---------------------------------------------------------------------------
// Read
// ---------------------------------------------------------------------------

const vocabulary = JSON.parse(readFileSync(join(SOURCE_DIR, 'vocabulary.json'), 'utf8'))
const colorNames = new Set(
  [...readFileSync(COLORS_SWIFT, 'utf8').matchAll(/TikoColor\(name: "([a-z]+)"/g)].map(match => match[1]),
)
if (colorNames.size === 0) problem(`no colour names found in ${COLORS_SWIFT}`)

const translationFiles = existsSync(TRANSLATIONS_DIR)
  ? readdirSync(TRANSLATIONS_DIR).filter(name => name.endsWith('.json')).sort()
  : []
const translations = translationFiles.map(file => JSON.parse(readFileSync(join(TRANSLATIONS_DIR, file), 'utf8')))

// ---------------------------------------------------------------------------
// Validate and normalise
// ---------------------------------------------------------------------------

const collectionsById = new Map()
const cardsById = new Map()
const seenIds = new Set()

function claimId(id, what) {
  if (!id || typeof id !== 'string') problem(`${what} has no id`)
  else if (seenIds.has(id)) problem(`duplicate id ${id}`)
  else seenIds.add(id)
}

vocabulary.collections.forEach((collection, index) => {
  claimId(collection.id, `collection #${index}`)
  collectionsById.set(collection.id, collection)
  if (!collection.title) problem(`${collection.id} has no title`)
  if (!colorNames.has(collection.color)) problem(`${collection.id}: unknown colour "${collection.color}"`)

  const titles = new Map()
  for (const card of collection.cards ?? []) {
    claimId(card.id, `a card in ${collection.id}`)
    cardsById.set(card.id, { card, collection })
    if (!card.title) problem(`${card.id} has no title`)
    if (!FITZGERALD.has(card.fitzgerald)) problem(`${card.id}: unknown Fitzgerald category "${card.fitzgerald}"`)
    if (card.color && !colorNames.has(card.color)) problem(`${card.id}: unknown colour "${card.color}"`)

    // Two cards with one word in the same collection cannot be told apart by
    // a child, and the app speaks the same audio for both.
    const key = card.title.toLowerCase()
    if (titles.has(key)) problem(`${collection.id}: "${card.title}" appears twice (${titles.get(key)}, ${card.id})`)
    titles.set(key, card.id)

    if (card.picture === null) continue
    if (!card.picture) {
      problem(`${card.id} has no picture; write "picture": null if that is on purpose`)
      continue
    }
    if (!MEDIA_ID.test(card.picture.media ?? '')) problem(`${card.id}: picture.media is not a media id`)
    if (!/^https:\/\//.test(card.picture.url ?? '')) problem(`${card.id}: picture.url is not an https URL`)
  }
})

for (const collection of vocabulary.collections) {
  if (collection.parent && !collectionsById.has(collection.parent)) {
    problem(`${collection.id}: parent ${collection.parent} does not exist`)
  }
  if (collection.picture) {
    if (!MEDIA_ID.test(collection.picture.media ?? '')) problem(`${collection.id}: picture.media is not a media id`)
    if (!/^https:\/\//.test(collection.picture.url ?? '')) problem(`${collection.id}: picture.url is not an https URL`)
  }
  if (collection.cover) {
    const entry = cardsById.get(collection.cover)
    if (!entry) problem(`${collection.id}: cover ${collection.cover} is not a card`)
    else if (!entry.card.picture) problem(`${collection.id}: cover ${collection.cover} has no picture`)
  }
}

function childrenOf(collectionId) {
  return vocabulary.collections.filter(collection => collection.parent === collectionId)
}

/** The card whose picture stands for a collection on its tile. */
function coverCard(collection, depth = 0) {
  if (collection.cover) return cardsById.get(collection.cover)?.card
  if (depth > 4) return undefined
  // A collection that only holds other collections borrows its first child's.
  for (const child of childrenOf(collection.id)) {
    const card = coverCard(child, depth + 1)
    if (card) return card
  }
  return undefined
}

/** Title and spoken text of an item in one locale; undefined where it stays English. */
function translate(locale, id, title, speech) {
  const override = locale.byId?.[id] ?? {}
  const translatedTitle = override.title ?? locale.strings?.[title]
  const translatedSpeech = override.speech ?? (speech ? locale.strings?.[speech] : undefined)
  if (!translatedTitle && !translatedSpeech) return undefined
  return {
    title: translatedTitle ?? title,
    // A card that speaks its own title speaks the translated title too.
    speech: translatedSpeech ?? (speech ? speech : translatedTitle ?? title),
  }
}

for (const locale of translations) {
  if (!locale.locale) problem('a translation file has no "locale"')
  if (locale.locale === vocabulary.locale) problem(`${locale.locale}.json translates into the source locale`)
  for (const id of Object.keys(locale.byId ?? {})) {
    if (!collectionsById.has(id) && !cardsById.has(id)) problem(`${locale.locale}: byId.${id} is not in the vocabulary`)
  }
  const used = new Set()
  for (const collection of vocabulary.collections) {
    used.add(collection.title)
    const titles = new Map()
    for (const card of collection.cards) {
      used.add(card.title)
      if (card.speech) used.add(card.speech)
      const translated = translate(locale, card.id, card.title, card.speech)?.title ?? card.title
      const key = translated.toLowerCase()
      if (titles.has(key)) {
        problem(`${locale.locale}: ${collection.id} says "${translated}" for both ${titles.get(key)} and ${card.id}`)
      }
      titles.set(key, card.id)
    }
  }
  for (const key of Object.keys(locale.strings ?? {})) {
    if (!used.has(key)) problem(`${locale.locale}: strings["${key}"] translates nothing in the vocabulary`)
  }
}

if (problems.length > 0) {
  for (const message of problems) console.error(`ERROR: ${message}`)
  process.exit(1)
}

// ---------------------------------------------------------------------------
// One resolved model both outputs are written from
// ---------------------------------------------------------------------------

const resolved = vocabulary.collections.map((collection, index) => {
  const cover = coverCard(collection)
  return {
    id: collection.id,
    title: collection.title,
    color: collection.color,
    order: index,
    parentID: collection.parent ?? null,
    // A collection may name a picture of its own; otherwise a card's stands for it.
    imageRef: collection.picture?.media ?? cover?.picture?.media ?? null,
    cards: collection.cards.map((card, cardIndex) => ({
      id: card.id,
      title: card.title,
      speech: card.speech ?? card.title,
      color: card.color ?? collection.color,
      order: cardIndex,
      imageRef: card.picture?.media ?? null,
      fitzgeraldCategory: card.fitzgerald,
    })),
  }
})

const pictureUrls = {}
for (const { card } of cardsById.values()) {
  if (card.picture) pictureUrls[card.picture.media] = card.picture.url
}
for (const collection of vocabulary.collections) {
  if (collection.picture) pictureUrls[collection.picture.media] = collection.picture.url
}

const localized = {}
for (const locale of translations) {
  const entries = {}
  for (const collection of vocabulary.collections) {
    const translatedCollection = translate(locale, collection.id, collection.title)
    if (translatedCollection) entries[collection.id] = { title: translatedCollection.title }
    for (const card of collection.cards) {
      const translatedCard = translate(locale, card.id, card.title, card.speech)
      if (translatedCard) entries[card.id] = translatedCard
    }
  }
  localized[locale.locale] = entries
}

const cardCount = resolved.reduce((sum, collection) => sum + collection.cards.length, 0)
const picturelessCount = [...cardsById.values()].filter(({ card }) => card.picture === null).length

// ---------------------------------------------------------------------------
// Live check of the pinned pictures (network; never part of --check)
// ---------------------------------------------------------------------------

if (VERIFY_MEDIA) {
  const wanted = Object.entries(pictureUrls)
  const failures = []
  let next = 0
  async function worker() {
    while (next < wanted.length) {
      const [mediaId, url] = wanted[next++]
      try {
        const response = await fetch(`${MEDIA_API}/v1/media/${mediaId}`)
        if (!response.ok) {
          failures.push(`${mediaId}: ${response.status}`)
          continue
        }
        const body = await response.json()
        const live = body?.data?.original_url ?? body?.original_url
        if (live !== url) failures.push(`${mediaId}: library says ${live}, vocabulary says ${url}`)
      } catch (error) {
        failures.push(`${mediaId}: ${error.message}`)
      }
    }
  }
  await Promise.all(Array.from({ length: 12 }, worker))
  if (failures.length > 0) {
    for (const failure of failures) console.error(`ERROR: ${failure}`)
    console.error(`${failures.length} of ${wanted.length} pinned pictures do not match the media library.`)
    process.exit(1)
  }
  console.log(`OK   ${wanted.length} pinned pictures exist in the media library.`)
  process.exit(0)
}

// ---------------------------------------------------------------------------
// Emit: content-api migration
// ---------------------------------------------------------------------------

const ITEM_COLUMNS = [
  'id', 'template_id', 'title', 'slug', 'status', 'language_code', 'tags', 'categories', 'data',
  'app_id', 'type', 'parent_id', 'source_locale', 'speech', 'color_token', 'image_ref',
  'sort_order', 'is_default', 'is_published', 'metadata_json',
]

function itemInsert(values) {
  return `INSERT INTO content_items (${ITEM_COLUMNS.join(', ')}) VALUES (${ITEM_COLUMNS.map(column => values[column]).join(', ')});`
}

const sql = []
sql.push('-- Replace the Tiko Cards default content with the curated vocabulary.')
sql.push('-- GENERATED by tools/generate-cards-vocabulary.mjs from packages/cards-vocabulary — do not edit.')
sql.push('-- A collection is a `collection` item (a sub-collection has its parent as parent_id);')
sql.push('-- a card is a `card` item whose image_ref is the media id of the picture it is pinned to.')
sql.push('-- Collections no longer list media categories: no picture is searched for at run time.')
sql.push('')
sql.push("DELETE FROM content_item_translations WHERE item_id IN (SELECT id FROM content_items WHERE app_id = 'cards' AND owner_user_id IS NULL);")
sql.push("DELETE FROM content_items WHERE app_id = 'cards' AND owner_user_id IS NULL;")
sql.push('')

for (const collection of resolved) {
  const collectionMeta = JSON.stringify({ mediaCategories: [] })
  sql.push(`-- ${collection.title}: ${collection.cards.length} cards`)
  sql.push(itemInsert({
    id: sqlString(collection.id),
    template_id: sqlString('cards.collection'),
    title: sqlString(collection.title),
    slug: sqlString(collection.id),
    status: sqlString('published'),
    language_code: sqlString('en'),
    tags: 'NULL',
    categories: sqlString('["cards"]'),
    data: sqlString(collectionMeta),
    app_id: sqlString('cards'),
    type: sqlString('collection'),
    parent_id: sqlStringOrNull(collection.parentID),
    source_locale: sqlString('en'),
    speech: sqlString(collection.title),
    color_token: sqlString(collection.color),
    image_ref: sqlStringOrNull(collection.imageRef),
    sort_order: String(collection.order),
    is_default: '1',
    is_published: '1',
    metadata_json: sqlString(collectionMeta),
  }))
  for (const card of collection.cards) {
    const cardMeta = JSON.stringify({ collectionId: collection.id, fitzgeraldCategory: card.fitzgeraldCategory })
    sql.push(itemInsert({
      id: sqlString(card.id),
      template_id: sqlString('cards.card'),
      title: sqlString(card.title),
      slug: sqlString(card.id),
      status: sqlString('published'),
      language_code: sqlString('en'),
      tags: 'NULL',
      categories: sqlString('["cards"]'),
      data: sqlString(cardMeta),
      app_id: sqlString('cards'),
      type: sqlString('card'),
      parent_id: sqlString(collection.id),
      source_locale: sqlString('en'),
      speech: sqlString(card.speech),
      color_token: sqlString(card.color),
      image_ref: sqlStringOrNull(card.imageRef),
      sort_order: String(card.order),
      is_default: '1',
      is_published: '1',
      metadata_json: sqlString(cardMeta),
    }))
  }
  sql.push('')
}

let translationRows = 0
for (const [locale, entries] of Object.entries(localized)) {
  sql.push(`-- ${locale}`)
  for (const [id, entry] of Object.entries(entries)) {
    sql.push(
      `INSERT INTO content_item_translations (item_id, locale, title, speech) VALUES (${sqlString(id)}, ${sqlString(locale)}, ${sqlString(entry.title)}, ${sqlStringOrNull(entry.speech)});`,
    )
    translationRows += 1
  }
  sql.push('')
}

const migrationText = `${sql.join('\n').trimEnd()}\n`

// ---------------------------------------------------------------------------
// Emit: the copy bundled in the iOS app
// ---------------------------------------------------------------------------

function withoutNulls(object) {
  return Object.fromEntries(Object.entries(object).filter(([, value]) => value !== null))
}

const bundle = {
  note: 'GENERATED by tools/generate-cards-vocabulary.mjs from packages/cards-vocabulary — do not edit.',
  collections: resolved.map(collection => ({
    ...withoutNulls(collection),
    mediaCategories: [],
    cards: collection.cards.map(withoutNulls),
  })),
  // Media id → the picture's address, so the app shows a pinned picture
  // without first asking a server where it lives.
  images: Object.fromEntries(Object.entries(pictureUrls).sort(([a], [b]) => a.localeCompare(b))),
  translations: localized,
}
const bundleText = `${JSON.stringify(bundle)}\n`

// ---------------------------------------------------------------------------
// Write or check
// ---------------------------------------------------------------------------

const outputs = [
  [MIGRATION, migrationText],
  [IOS_BUNDLE, bundleText],
]

let stale = 0
for (const [path, text] of outputs) {
  const relative = path.slice(ROOT.length + 1)
  const current = existsSync(path) ? readFileSync(path, 'utf8') : null
  if (CHECK_MODE) {
    if (current === text) console.log(`OK   ${relative}`)
    else {
      console.error(`STALE ${relative} — run: node tools/generate-cards-vocabulary.mjs`)
      stale += 1
    }
  } else {
    writeFileSync(path, text)
    console.log(`Wrote ${relative}`)
  }
}

console.log(
  `${resolved.length} collections, ${cardCount} cards (${picturelessCount} without a picture on purpose), `
  + `${Object.keys(pictureUrls).length} pictures, ${translationRows} translated rows in ${Object.keys(localized).length} locale(s).`,
)
if (stale > 0) process.exit(1)
