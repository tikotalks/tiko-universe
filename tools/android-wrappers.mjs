#!/usr/bin/env node
import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')

const wrappers = [
  { app: 'yes-no', label: 'Tiko Yes No' },
  { app: 'cards', label: 'Tiko Cards' },
  { app: 'type', label: 'Tiko Type' },
  { app: 'sequence', label: 'Tiko Sequence' },
  { app: 'timer', label: 'Tiko Timer' },
  { app: 'todo', label: 'Tiko Todo' },
  { app: 'radio', label: 'Tiko Radio' },
  { app: 'talk', label: 'Tiko Talk' }
].map((entry) => ({
  ...entry,
  wrapperDir: resolve(repoRoot, 'apps', entry.app, 'android')
}))

const command = process.argv[2] ?? 'sync'
const selected = process.argv.slice(3)
const validCommands = new Set(['list', 'build-web', 'sync', 'build-android'])

if (!validCommands.has(command)) {
  console.error(`Unknown command: ${command}`)
  console.error('Usage: node tools/android-wrappers.mjs <list|build-web|sync|build-android> [app ...]')
  process.exit(1)
}

const targets = selected.length > 0
  ? wrappers.filter((wrapper) => selected.includes(wrapper.app))
  : wrappers

const missing = selected.filter((app) => !wrappers.some((wrapper) => wrapper.app === app))
if (missing.length > 0) {
  console.error(`Unknown Android wrapper app(s): ${missing.join(', ')}`)
  process.exit(1)
}

if (command === 'list') {
  for (const wrapper of wrappers) {
    console.log(`${wrapper.app}\t${wrapper.label}\t${wrapper.wrapperDir}`)
  }
  process.exit(0)
}

const scriptByCommand = {
  'build-web': 'build:web',
  sync: 'sync',
  'build-android': 'build:android'
}

for (const target of targets) {
  if (!existsSync(target.wrapperDir)) {
    console.error(`Missing wrapper directory: ${target.wrapperDir}`)
    process.exit(1)
  }

  const script = scriptByCommand[command]
  console.log(`\n== ${target.app}: npm --prefix ${target.wrapperDir} run ${script} ==`)
  const result = spawnSync('npm', ['--prefix', target.wrapperDir, 'run', script], {
    cwd: repoRoot,
    stdio: 'inherit',
    env: process.env
  })

  if (result.status !== 0) {
    process.exit(result.status ?? 1)
  }
}
