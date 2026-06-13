import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import CardsBoard from './components/CardsBoard.vue'

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
    expect(typesSource).toContain('color: TikoColorName')
    expect(typesSource).toContain('parentID?: string | null')
    expect(typesSource).toContain('cards: CommunicationCard[]')
    expect(typesSource).not.toContain('imageURL')
    expect(typesSource).not.toContain('tiles:')
  })

  it('keeps reusable layout and flow primitives in Tiko UI', () => {
    const boardSource = readSource('apps/cards/web/src/components/CardsBoard.vue')
    const uiSource = readSource('packages/ui/src/index.ts')

    expect(boardSource).toContain('TikoTileBoard')
    expect(uiSource).toContain('TikoTileBoard')
    expect(uiSource).toContain('TikoPagedTileGrid')
    expect(uiSource).toContain('TikoSquareTile')
    expect(uiSource).toContain('TikoSelectionBadge')
    expect(uiSource).toContain('TikoEditBadge')
    expect(uiSource).toContain('TikoSheet')
  })

  it('styles Cards popups through sil/ui popup custom properties', () => {
    const stylesSource = readSource('apps/cards/web/src/styles.scss')

    expect(stylesSource).toContain('.popup--stack-cards-add-card')
    expect(stylesSource).toContain('--popup-border-radius')
    expect(stylesSource).toContain('--popup-container-background')
  })

  it('renders tile colors and images through the shared Tiko square tile', () => {
    const wrapper = mount(CardsBoard, {
      props: {
        items: [
          {
            id: 'collection-food',
            kind: 'collection',
            collection: {
              id: '__default_food',
              title: 'Food',
              color: 'orange',
              order: 0,
              mediaCategories: [],
              imageRef: 'media-food',
              cards: []
            }
          }
        ],
        columns: 3,
        itemsPerPage: 6,
        page: 0,
        reduceMotion: false,
        editing: false,
        isAdmin: false,
        labelSize: 'medium',
        selectedCollectionIds: new Set<string>(),
        selectedCardIds: new Set<string>(),
        collectionThumbnails: {},
        cardImages: {},
        contentBaseUrl: 'https://content.tikoapi.org/v1',
        labels: {
          deselect: 'Deselect translated',
          edit: 'Edit translated',
          select: 'Select translated',
        },
      },
      global: {
        stubs: {
          TikoPagedTileGrid: {
            props: ['items'],
            template: '<div><slot v-for="item in items" name="item" :item="item" /></div>'
          }
        }
      }
    })

    const tile = wrapper.get('.tiko-square-tile')
    expect(tile.attributes('style')).toContain('background-color: rgb(247, 103, 7)')
    expect(tile.get('img').attributes('src')).toBe('https://content.tikoapi.org/v1/content/images/media-food')
  })

  it('passes translated edit-mode labels to shared tile badges', () => {
    const wrapper = mount(CardsBoard, {
      props: {
        items: [
          {
            id: 'card-hello',
            kind: 'card',
            collectionID: 'collection-1',
            card: {
              id: 'user_card_hello',
              title: 'Hello',
              speech: 'Hello',
              color: 'green',
              order: 0,
            }
          }
        ],
        columns: 3,
        itemsPerPage: 6,
        page: 0,
        reduceMotion: false,
        editing: true,
        isAdmin: false,
        labelSize: 'medium',
        selectedCollectionIds: new Set<string>(),
        selectedCardIds: new Set<string>(),
        collectionThumbnails: {},
        cardImages: {},
        contentBaseUrl: 'https://content.tikoapi.org/v1',
        labels: {
          deselect: 'Deselect translated',
          edit: 'Edit translated',
          select: 'Select translated',
        },
      },
      global: {
        stubs: {
          TikoPagedTileGrid: {
            props: ['items'],
            template: '<div><slot v-for="item in items" name="item" :item="item" /></div>'
          }
        }
      }
    })

    expect(wrapper.get('.tiko-selection-badge').attributes('aria-label')).toBe('Select translated')
    expect(wrapper.get('.tiko-edit-badge').attributes('aria-label')).toBe('Edit translated')
  })
})
