import { describe, expect, it } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const appPath = [
  resolve(process.cwd(), 'apps/cards/web/src/App.vue'),
  resolve(process.cwd(), 'src/App.vue'),
].find((candidate) => existsSync(candidate))

if (!appPath) throw new Error('Could not locate Cards App.vue')

const appSource = readFileSync(appPath, 'utf8')

describe('Cards identity runtime', () => {
  it('uses identity runtime APIs instead of legacy parent code metadata', () => {
    expect(appSource).toContain('identityClient.setPin')
    expect(appSource).toContain('identityClient.enableChildMode')
    expect(appSource).toContain('identityClient.enterChildMode')
    expect(appSource).toContain('identityClient.enterParentMode')
    expect(appSource).not.toContain('parentCodeHash')
    expect(appSource).not.toContain('identityClient.updateProfile(sessionToken.value, { parentCodeHash')
  })
})
