import { existsSync } from 'node:fs'

const required = [
  'docs/doctrine/DOCTRINE.md',
  'docs/architecture/api-first-platform.md',
  'docs/apps/yes-no.md',
  'docs/apps/type.md',
  'docs/apps/cards.md',
  'docs/apps/sequence.md',
  'docs/apps/timer.md',
  'docs/api/openapi.yaml'
]

const missing = required.filter((path) => !existsSync(path))
if (missing.length) {
  console.error(`Missing required scaffold files:\n${missing.map((p) => `- ${p}`).join('\n')}`)
  process.exit(1)
}

console.log('tiko-universe scaffold checks passed')
