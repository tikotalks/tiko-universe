#!/usr/bin/env node
// Validates the authored content sources — the files a person or another agent
// edits by hand — before anything is built from them.
//
//   node tools/geography/check-content-sources.mjs
//
// Structure and references only: whether an animal really lives in a country is
// an editorial question, which is what the review state is for.

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
const animalSource = await read('country-animals.json')
const landmarkSource = await read('country-landmarks.json')
const districtSource = await read('animal-districts.json')

const problems = []
const REVIEW_STATES = ['draft', 'verified']

function checkReview(where, review) {
  if (!review || !REVIEW_STATES.includes(review.state)) {
    problems.push(`${where} has no review state (one of ${REVIEW_STATES.join(', ')})`)
    return
  }
  if (review.state === 'verified' && (!review.by || !review.at)) {
    problems.push(`${where} is marked verified without who checked it and when`)
  }
}

// Animals by country.
for (const id of countryIds) {
  if (!animalSource.countries[id]) problems.push(`country-animals.json has no entry for ${id}`)
}
for (const [id, entry] of Object.entries(animalSource.countries)) {
  if (!countryIds.has(id)) {
    problems.push(`country-animals.json has ${id}, which is not a country in this build`)
    continue
  }
  checkReview(`country-animals.json ${id}`, entry.review)
  if (!Array.isArray(entry.animals) || entry.animals.length === 0) {
    problems.push(`country-animals.json ${id} lists no animals`)
  }
  const seen = new Set()
  for (const animal of entry.animals ?? []) {
    if (!animal?.name) problems.push(`country-animals.json ${id} has an animal with no name`)
    else if (seen.has(animal.name)) problems.push(`country-animals.json ${id} lists ${animal.name} twice`)
    seen.add(animal?.name)
  }
}

// Landmarks by country.
for (const id of countryIds) {
  if (!landmarkSource.countries[id]) problems.push(`country-landmarks.json has no entry for ${id}`)
}
for (const [id, entry] of Object.entries(landmarkSource.countries)) {
  if (!countryIds.has(id)) {
    problems.push(`country-landmarks.json has ${id}, which is not a country in this build`)
    continue
  }
  checkReview(`country-landmarks.json ${id}`, entry.review)
  if (!Array.isArray(entry.landmarks) || entry.landmarks.length === 0) {
    problems.push(`country-landmarks.json ${id} lists no landmarks — every country needs at least one`)
  }
  for (const landmark of entry.landmarks ?? []) {
    const where = `country-landmarks.json ${id} ${landmark?.name ?? '(unnamed)'}`
    if (!landmark?.name) problems.push(`${where} has no name`)
    if (!landmark?.glyph) problems.push(`${where} has no glyph`)
    if (![1, 2, 3].includes(landmark?.tier)) problems.push(`${where} has tier ${landmark?.tier}, expected 1, 2 or 3`)
    if (!(landmark?.lat >= -90 && landmark?.lat <= 90) || !(landmark?.lon >= -180 && landmark?.lon <= 180)) {
      problems.push(`${where} has coordinates outside the world`)
    }
  }
}

// Districts each animal belongs to.
for (const [name, entry] of Object.entries(districtSource.animals)) {
  if (!Array.isArray(entry.districts) || entry.districts.length === 0) {
    problems.push(`animal-districts.json ${name} has no districts`)
    continue
  }
  for (const id of entry.districts) {
    if (!districtIds.has(id)) problems.push(`animal-districts.json ${name} references unknown district ${id}`)
  }
}

if (problems.length > 0) {
  process.stderr.write(`${problems.length} problem(s) in the authored content:\n`)
  for (const problem of problems.slice(0, 40)) process.stderr.write(`  - ${problem}\n`)
  process.exitCode = 1
} else {
  const verified = Object.values(animalSource.countries).filter((entry) => entry.review.state === 'verified').length
  process.stdout.write(`content sources ok: ${Object.keys(animalSource.countries).length} countries of animals (${verified} verified), ${Object.values(landmarkSource.countries).reduce((total, entry) => total + entry.landmarks.length, 0)} landmarks, ${Object.keys(districtSource.animals).length} animals placed in districts\n`)
}
