#!/usr/bin/env node
// Validates the authored content — the files a person or another agent edits by
// hand — before anything is compiled from them.
//
//   node tools/geography/check-content-sources.mjs
//
// Structure, identity and references only. Whether a chameleon really lives in
// Malta is an editorial question, which is what the review state is for.

import { readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const CONTENT_DIR = join(HERE, '..', '..', 'packages', 'geography', 'content')
const GENERATED_DIR = join(HERE, '..', '..', 'packages', 'geography', 'generated')

const read = async (name, dir = CONTENT_DIR) => JSON.parse(await readFile(join(dir, name), 'utf8'))

const countries = (await read('countries.json', GENERATED_DIR)).countries
const countryIds = new Set(countries.map((country) => country.id))
const districts = await read('districts.json')
const districtIds = new Set(districts.items.map((district) => district.id))
const ranges = await read('animal-districts.json')
const animalSource = await read('country-animals.json')
const landmarkSource = await read('country-landmarks.json')

const problems = []
const REVIEW_STATES = ['draft', 'reviewed', 'verified']
const SLUG = /^[a-z0-9-]+$/

/**
 * Identity is the id, and a translation key is built from it, so an id that is
 * not a slug cannot be either. The English name beside it is a label.
 */
function checkIdentity(where, entry, namespace) {
  if (!entry?.id) {
    problems.push(`${where} has no id`)
    return null
  }
  if (!SLUG.test(entry.id)) problems.push(`${where} has id "${entry.id}", which is not a lowercase slug`)
  if (!entry.names?.en) problems.push(`${where} has no English name`)
  if (entry.i18nKey && entry.i18nKey !== `${namespace}.${entry.id}`) {
    problems.push(`${where} says its key is ${entry.i18nKey}, which is not ${namespace}.${entry.id}`)
  }
  return entry.id
}

function checkPosition(where, entry) {
  const { lat, lon } = entry
  if (!(lat >= -90 && lat <= 90) || !(lon >= -180 && lon <= 180)) {
    problems.push(`${where} has coordinates outside the world`)
  }
}

function checkImportance(where, value, required = true) {
  if (value === undefined || value === null) {
    if (required) problems.push(`${where} has no importance`)
    return
  }
  if (!(value >= 1 && value <= 10)) {
    problems.push(`${where} has importance ${value}, expected 1 (shows from space) to 10 (closest zoom)`)
  }
}

function checkReview(where, review) {
  if (!review || !REVIEW_STATES.includes(review.state)) {
    problems.push(`${where} has no review state (one of ${REVIEW_STATES.join(', ')})`)
    return
  }
  if (review.state !== 'draft' && (!review.by || !review.at)) {
    problems.push(`${where} is marked ${review.state} without who checked it and when`)
  }
}

// The world-scale ranges.
const rangeIds = new Set()
for (const item of ranges.items) {
  const where = `animal-districts.json ${item.id ?? '(no id)'}`
  const id = checkIdentity(where, item, 'geography.animals')
  if (id) {
    if (rangeIds.has(id)) problems.push(`${where} is listed twice`)
    rangeIds.add(id)
  }
  checkImportance(where, item.importance)
  if (!Array.isArray(item.districtIds) || item.districtIds.length === 0) {
    problems.push(`${where} belongs to no district`)
  }
  for (const districtId of item.districtIds ?? []) {
    if (!districtIds.has(districtId)) problems.push(`${where} references unknown district ${districtId}`)
  }
  for (const marker of item.markers ?? []) {
    checkPosition(`${where} marker`, marker)
    if (marker.districtId && !districtIds.has(marker.districtId)) {
      problems.push(`${where} has a marker in unknown district ${marker.districtId}`)
    }
  }
}

// Animals by country.
for (const id of countryIds) {
  if (!animalSource.countries[id]) problems.push(`country-animals.json has no entry for ${id}`)
}
let reviewedCountries = 0
let countryAnimals = 0
for (const [id, entry] of Object.entries(animalSource.countries)) {
  if (!countryIds.has(id)) {
    problems.push(`country-animals.json has ${id}, which is not a country in this build`)
    continue
  }
  checkReview(`country-animals.json ${id}`, entry.review)
  if (entry.review?.state !== 'draft') reviewedCountries += 1
  if (!Array.isArray(entry.animals) || entry.animals.length === 0) {
    problems.push(`country-animals.json ${id} lists no animals`)
  }
  const seen = new Set()
  for (const animal of entry.animals ?? []) {
    const where = `country-animals.json ${id} ${animal?.id ?? '(no id)'}`
    const key = checkIdentity(where, animal, 'geography.animals')
    if (key && seen.has(key)) problems.push(`${where} is listed twice`)
    if (key) seen.add(key)
    checkImportance(where, animal.importance)
    checkPosition(where, animal)
    countryAnimals += 1
  }
}

// Landmarks by country.
for (const id of countryIds) {
  if (!landmarkSource.countries[id]) problems.push(`country-landmarks.json has no entry for ${id}`)
}
let landmarkCount = 0
for (const [id, entry] of Object.entries(landmarkSource.countries)) {
  if (!countryIds.has(id)) {
    problems.push(`country-landmarks.json has ${id}, which is not a country in this build`)
    continue
  }
  checkReview(`country-landmarks.json ${id}`, entry.review)
  if (!Array.isArray(entry.landmarks) || entry.landmarks.length === 0) {
    problems.push(`country-landmarks.json ${id} lists no landmarks — every country needs at least one`)
  }
  const seen = new Set()
  for (const landmark of entry.landmarks ?? []) {
    const where = `country-landmarks.json ${id} ${landmark?.id ?? '(no id)'}`
    const key = checkIdentity(where, landmark, 'geography.landmarks')
    if (key && seen.has(key)) problems.push(`${where} is listed twice`)
    if (key) seen.add(key)
    checkImportance(where, landmark.importance)
    checkPosition(where, landmark)
    if (!landmark.glyph) problems.push(`${where} has no glyph`)
    landmarkCount += 1
  }
}

if (problems.length > 0) {
  process.stderr.write(`${problems.length} problem(s) in the authored content:\n`)
  for (const problem of problems.slice(0, 40)) process.stderr.write(`  - ${problem}\n`)
  if (problems.length > 40) process.stderr.write(`  … and ${problems.length - 40} more\n`)
  process.exit(1)
}

process.stdout.write(
  `content sources ok: ${Object.keys(animalSource.countries).length} countries of animals ` +
  `(${reviewedCountries} reviewed, ${countryAnimals} placements), ${landmarkCount} landmarks, ` +
  `${ranges.items.length} animals with a world range\n`
)
