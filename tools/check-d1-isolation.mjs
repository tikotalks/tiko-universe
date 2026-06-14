import { existsSync, readFileSync } from 'node:fs'
import { basename, join } from 'node:path'

const root = process.cwd()
const workerArgIndex = process.argv.indexOf('--worker')
const workerFilter = workerArgIndex >= 0 ? process.argv[workerArgIndex + 1] : ''
const workers = workerFilter
  ? [workerFilter]
  : [
      'admin-api',
      'app-api',
      'atlas-api',
      'communication-api',
      'content-api',
      'generation-api',
      'identity-api',
      'media-api',
      'sentence-api',
      'tts-api',
    ]

function parseD1Bindings(toml) {
  const topLevel = new Map()
  const production = new Map()
  let current = null

  for (const rawLine of toml.split('\n')) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue

    if (line === '[[d1_databases]]') {
      current = { target: topLevel, binding: '', databaseId: '' }
      continue
    }

    if (line === '[[env.production.d1_databases]]') {
      current = { target: production, binding: '', databaseId: '' }
      continue
    }

    if (line.startsWith('[')) {
      current = null
      continue
    }

    if (!current) continue

    const match = line.match(/^([a-zA-Z_]+)\s*=\s*"([^"]*)"$/)
    if (!match) continue

    const [, key, value] = match
    if (key === 'binding') current.binding = value
    if (key === 'database_id') current.databaseId = value

    if (current.binding && current.databaseId) {
      current.target.set(current.binding, current.databaseId)
    }
  }

  return { topLevel, production }
}

const failures = []

for (const worker of workers) {
  const wranglerPath = join(root, 'workers', worker, 'wrangler.toml')
  if (!existsSync(wranglerPath)) {
    failures.push(`${worker}: missing ${wranglerPath}`)
    continue
  }

  const { topLevel, production } = parseD1Bindings(readFileSync(wranglerPath, 'utf8'))
  for (const [binding, devDatabaseId] of topLevel.entries()) {
    const productionDatabaseId = production.get(binding)
    if (!productionDatabaseId) continue
    if (devDatabaseId === productionDatabaseId) {
      failures.push(`${worker}: ${binding} uses ${devDatabaseId} for both development and production`)
    }
  }
}

if (failures.length) {
  console.error('D1 isolation check failed.')
  console.error('Development and production must not share mutable D1 database IDs.')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

const subject = workerFilter ? basename(workerFilter) : 'all workers'
console.log(`D1 isolation check passed for ${subject}.`)
