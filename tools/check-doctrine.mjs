import { readFileSync } from 'node:fs'

const doctrine = readFileSync('docs/doctrine/DOCTRINE.md', 'utf8')
const requiredPhrases = [
  'No passwords',
  'No login walls',
  'API first',
  'device-first identity',
  'Lezu',
  'Cloudflare'
]

const missing = requiredPhrases.filter((phrase) => !doctrine.includes(phrase))
if (missing.length) {
  console.error(`Doctrine missing required phrases: ${missing.join(', ')}`)
  process.exit(1)
}
console.log('doctrine checks passed')
