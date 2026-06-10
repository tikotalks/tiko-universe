import { describe, expect, it } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const appPath = [
  resolve(process.cwd(), 'apps/cards/web/src/App.vue'),
  resolve(process.cwd(), 'src/App.vue'),
].find((candidate) => existsSync(candidate))

if (!appPath) throw new Error('Could not locate Cards App.vue')

const appSource = readFileSync(appPath, 'utf8')

function readSource(relativePath: string) {
  const candidates = [
    resolve(process.cwd(), relativePath),
    resolve(process.cwd(), '../../..', relativePath),
    resolve(process.cwd(), relativePath.replace(/^apps\/cards\/web\//, '')),
  ]
  const path = candidates.find((candidate) => existsSync(candidate))
  if (!path) throw new Error(`Could not locate ${relativePath}`)
  return readFileSync(path, 'utf8')
}

describe('Cards identity runtime', () => {
  it('uses identity runtime composable instead of legacy parent code metadata', () => {
    // Must import and call the shared identity runtime composable
    expect(appSource).toContain('useIdentityRuntime')
    expect(appSource).toContain('runtime.handleAvatarClick')

    // Must NOT store pinHash locally
    expect(appSource).not.toContain('parentCodeHash')
    expect(appSource).not.toContain('identityClient.updateProfile(sessionToken.value, { parentCodeHash')
  })
})

describe('Cards web iOS parity architecture', () => {
  it('uses the content API cards contract instead of the legacy app-default tiles contract', () => {
    const apiSource = readSource('apps/cards/web/src/composables/cardsApi.ts')
    const typesSource = readSource('apps/cards/web/src/types.ts')

    expect(apiSource).toContain('/cards/collections')
    expect(apiSource).not.toContain('getAppDefaults')
    expect(apiSource).not.toContain('/v1/apps/defaults/cards/state')
    expect(typesSource).toContain('colorHex: number')
    expect(typesSource).toContain('parentID?: string | null')
    expect(typesSource).toContain('cards: CommunicationCard[]')
    expect(typesSource).not.toContain('tiles:')
  })

  it('keeps reusable layout and flow primitives in Tiko UI', () => {
    const boardSource = readSource('apps/cards/web/src/components/CardsBoard.vue')
    const uiSource = readSource('packages/ui/src/index.ts')

    expect(boardSource).toContain('TikoPagedTileGrid')
    expect(boardSource).toContain('TikoSquareTile')
    expect(boardSource).toContain('TikoSelectionBadge')
    expect(boardSource).toContain('TikoEditBadge')
    expect(uiSource).toContain('TikoPagedTileGrid')
    expect(uiSource).toContain('TikoSquareTile')
    expect(uiSource).toContain('TikoSheet')
  })

  it('styles Cards popups through sil/ui popup custom properties', () => {
    const stylesSource = readSource('apps/cards/web/src/styles.scss')

    expect(stylesSource).toContain('.popup--stack-cards-add-card')
    expect(stylesSource).toContain('--popup-border-radius')
    expect(stylesSource).toContain('--popup-container-background')
  })
})
