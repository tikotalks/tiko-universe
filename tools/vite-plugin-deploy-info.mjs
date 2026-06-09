import { existsSync, readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'

function findGitRoot(startDir) {
  let dir = startDir
  for (let i = 0; i < 20; i++) {
    if (existsSync(resolve(dir, '.git/HEAD'))) return dir
    const parent = dirname(dir)
    if (parent === dir) break
    dir = parent
  }
  return null
}

function getGitCommit(startDir) {
  try {
    const gitRoot = findGitRoot(startDir)
    if (!gitRoot) return 'unknown'
    const ref = readFileSync(resolve(gitRoot, '.git/HEAD'), 'utf8').trim()
    if (ref.startsWith('ref: ')) {
      return readFileSync(resolve(gitRoot, '.git', ref.slice(5)), 'utf8').trim().slice(0, 7)
    }
    return ref.slice(0, 7)
  } catch {
    return 'unknown'
  }
}

function getPackageVersion(startDir) {
  try {
    const pkg = JSON.parse(readFileSync(resolve(startDir, 'package.json'), 'utf8'))
    return pkg.version || '0.0.0'
  } catch {
    return '0.0.0'
  }
}

export function deployInfo() {
  const virtualModuleId = 'virtual:deploy-info'
  const resolvedVirtualModuleId = '\0' + virtualModuleId

  const startDir = process.cwd()
  const deployDate = new Date().toISOString()
  const version = getPackageVersion(startDir)
  const commit = getGitCommit(startDir)

  return {
    name: 'tiko-deploy-info',
    resolveId(id) {
      if (id === virtualModuleId) return resolvedVirtualModuleId
    },
    load(id) {
      if (id === resolvedVirtualModuleId) {
        return `export const deployDate = ${JSON.stringify(deployDate)}\nexport const version = ${JSON.stringify(version)}\nexport const commit = ${JSON.stringify(commit)}\n`
      }
    },
    transformIndexHtml(html) {
      return html.replace(
        '</head>',
        `  <meta name="deploy-date" content="${deployDate}" />\n  <meta name="deploy-version" content="${version}" />\n  <meta name="deploy-commit" content="${commit}" />\n</head>`,
      )
    },
  }
}
