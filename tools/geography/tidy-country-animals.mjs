#!/usr/bin/env node
// Removes the near-duplicates a merge leaves behind: a country listing both
// "Tiger" and "Bengal tiger" shows a child two animals where there is one.
//
//   node tools/geography/tidy-country-animals.mjs [--write]
//
// Only the pairs named here are touched. A blanket rule would eat the leopard
// standing beside the snow leopard, the crab beside the hermit crab and the
// hippopotamus beside the pygmy hippopotamus — all of which are two animals.

import { readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const CONTENT_DIR = join(HERE, '..', '..', 'packages', 'geography', 'content')
const WRITE = process.argv.includes('--write')

/** Generic name → the subspecies and races of the same animal that replace it. */
const SAME_ANIMAL = {
  tiger: ['bengal tiger', 'sumatran tiger', 'siberian tiger', 'indochinese tiger', 'malayan tiger'],
  chimpanzee: ['eastern chimpanzee', 'western chimpanzee', 'nigeria-cameroon chimpanzee'],
  gorilla: ['mountain gorilla', 'western lowland gorilla', 'eastern lowland gorilla', 'cross river gorilla'],
  orangutan: ['bornean orangutan', 'sumatran orangutan'],
  giraffe: ['masai giraffe', 'rothschild’s giraffe', "rothschild's giraffe", 'west african giraffe',
    'kordofan giraffe', 'thornicroft’s giraffe', "thornicroft's giraffe"],
  rhinoceros: ['white rhinoceros', 'black rhinoceros', 'indian rhinoceros', 'javan rhinoceros'],
  baboon: ['hamadryas baboon', 'olive baboon', 'chacma baboon'],
  kookaburra: ['laughing kookaburra'],
  beaver: ['american beaver', 'european beaver'],
  reindeer: ['wild forest reindeer'],
  swan: ['whooper swan'],
  lemur: ['ring-tailed lemur'],
  'brown bear': ['marsican brown bear', 'ezo brown bear', 'himalayan brown bear'],
  'asian elephant': ['indian elephant', 'sri lankan elephant', 'sumatran elephant'],
  elephant: ['african savanna elephant', 'african forest elephant', 'indian elephant',
    'asian elephant', 'sri lankan elephant', 'sumatran elephant'],
}

const source = JSON.parse(await readFile(join(CONTENT_DIR, 'country-animals.json'), 'utf8'))
const dropped = []

for (const [countryId, entry] of Object.entries(source.countries)) {
  const present = new Map(entry.animals.map((animal) => [animal.names?.en?.toLowerCase() ?? '', animal]))
  const remove = new Set()
  for (const [generic, specifics] of Object.entries(SAME_ANIMAL)) {
    if (!present.has(generic)) continue
    const found = specifics.find((specific) => present.has(specific))
    if (!found) continue
    remove.add(present.get(generic).id)
    dropped.push(`${countryId}: ${generic} — ${found} is already there`)
  }
  if (remove.size > 0) {
    entry.animals = entry.animals.filter((animal) => !remove.has(animal.id))
  }
}

if (WRITE) {
  await writeFile(join(CONTENT_DIR, 'country-animals.json'), `${JSON.stringify(source, null, 2)}\n`)
}

const counts = Object.values(source.countries).map((entry) => entry.animals.length)
const total = counts.reduce((sum, count) => sum + count, 0)
process.stdout.write(`${dropped.length} duplicates removed — ${total} placements left\n`)
for (const line of dropped.slice(0, 12)) process.stdout.write(`  ${line}\n`)
