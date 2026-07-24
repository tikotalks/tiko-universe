#!/usr/bin/env node
// Bumps MARKETING_VERSION / CURRENT_PROJECT_VERSION in XcodeGen Project.yml for
// one or all Tiko iOS apps. These build settings are the single source of truth
// (Info.plist references them via $(MARKETING_VERSION) / $(CURRENT_PROJECT_VERSION)).
//
//   node tools/bump-ios-version.mjs --app yes-no --build 4
//   node tools/bump-ios-version.mjs --app all --version 1.1 --build 1
//
// --version updates the marketing (short) version; --build updates the build
// number. Either may be omitted to leave that field untouched.

import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'

const ROOT = resolve(import.meta.dirname, '..')
const APPS_DIR = join(ROOT, 'apps')

function parseArgs(argv) {
  const out = {}
  for (let i = 2; i < argv.length; i += 1) {
    const key = argv[i]
    const value = argv[i + 1]
    if (key === '--app') { out.app = value; i += 1 }
    else if (key === '--version') { out.version = value; i += 1 }
    else if (key === '--build') { out.build = value; i += 1 }
    else if (key === '--dry-run') { out.dryRun = true }
  }
  if (!out.app) { console.error('error: --app <slug|all> is required'); process.exit(1) }
  if (!out.version && !out.build) { console.error('error: provide --version and/or --build'); process.exit(1) }
  return out
}

function listIosApps() {
  return readdirSync(APPS_DIR).filter((slug) => {
    const yml = join(APPS_DIR, slug, 'ios', 'Project.yml')
    try { return statSync(yml).isFile() } catch { return false }
  })
}

function bumpFile(ymlPath, version, build) {
  let text = readFileSync(ymlPath, 'utf8')
  const changes = []
  if (version) {
    const next = text.replace(/(\n\s*)MARKETING_VERSION:\s*"?[^"\n]+"?/, `$1MARKETING_VERSION: "${version}"`)
    if (next === text) throw new Error(`MARKETING_VERSION not found in ${ymlPath}`)
    text = next
    changes.push(`MARKETING_VERSION=${version}`)
  }
  if (build) {
    const next = text.replace(/(\n\s*)CURRENT_PROJECT_VERSION:\s*"?[^"\n]+"?/, `$1CURRENT_PROJECT_VERSION: "${build}"`)
    if (next === text) throw new Error(`CURRENT_PROJECT_VERSION not found in ${ymlPath}`)
    text = next
    changes.push(`CURRENT_PROJECT_VERSION=${build}`)
  }
  return { text, changes }
}

const { app, version, build, dryRun } = parseArgs(process.argv)
const apps = app === 'all' ? listIosApps() : [app]

for (const slug of apps) {
  const yml = join(APPS_DIR, slug, 'ios', 'Project.yml')
  try {
    const { text, changes } = bumpFile(yml, version, build)
    if (dryRun) {
      console.log(`[dry-run] ${slug}: would set ${changes.join(', ')}`)
    } else {
      writeFileSync(yml, text, 'utf8')
      console.log(`✓ ${slug}: ${changes.join(', ')}`)
    }
  } catch (e) {
    console.error(`✗ ${slug}: ${e.message}`)
    process.exitCode = 1
  }
}
