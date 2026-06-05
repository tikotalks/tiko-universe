import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const readJson = <T>(path: string): T => JSON.parse(readFileSync(path, 'utf8')) as T

describe('Talk development deploy wiring', () => {
  it('keeps talk web and sentence-api in the deploy change-detection matrices', () => {
    const workflow = readFileSync('.github/workflows/deploy.yml', 'utf8')

    expect(workflow).toContain('APPS="admin cards media radio sequence talk timer todo type website yes-no"')
    expect(workflow).toContain('WORKERS="admin-api app-api atlas-api content-api generation-api identity-api media-api sentence-api tts-api"')
    expect(workflow).toContain('"admin","cards","media","radio","sequence","talk","timer","todo","type","website","yes-no"')
    expect(workflow).toContain('"admin-api","app-api","atlas-api","content-api","generation-api","identity-api","media-api","sentence-api","tts-api"')
  })

  it('makes sentence-api deployable instead of scaffold-skipped in the workflow', () => {
    const rootPackage = readJson<{ scripts?: Record<string, string> }>('package.json')
    const sentencePackage = readJson<{ scripts?: Record<string, string> }>('workers/sentence-api/package.json')

    expect(rootPackage.scripts?.['deploy:dry-run:sentence']).toBe('npm --workspace @tiko-worker/sentence-api run deploy:dry-run')
    expect(sentencePackage.scripts?.['deploy:dry-run']).toContain('wrangler deploy --dry-run')
    expect(sentencePackage.scripts?.['deploy:dry-run']).not.toContain('scaffold-only')
  })

  it('documents Talk development domains in worker and app config', () => {
    const wrangler = readFileSync('workers/sentence-api/wrangler.toml', 'utf8')
    const viteConfig = readFileSync('apps/talk/web/vite.config.ts', 'utf8')

    expect(wrangler).toContain('dev.sentence.tikoapi.org')
    expect(wrangler).toContain('sentence.tikoapi.org')
    expect(wrangler).toContain('https://dev.talk.tikoapps.org')
    expect(viteConfig).toContain('dev.talk.tikoapps.org')
  })
})
