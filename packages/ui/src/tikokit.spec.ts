import { mount } from '@vue/test-utils'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineComponent, h, nextTick, ref } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import {
  TikoAnswerButton,
  TikoAppHeader,
  TikoAppShell,
  TikoChoiceGrid,
  TikoOpenIconPicker,
  TikoPagedTileGrid,
  TikoSettingsPanel,
  TikoTileBoard,
  createTikoChoice,
  createTikoTtsClient,
  applyTikoColorMode,
  normalizeTikoColorMode,
  resolveTikoAppApiBaseUrl,
  readTikoLocalJson,
  resolveTikoContentApiBaseUrl,
  resolveTikoColorMode,
  resolveTikoGenerationApiBaseUrl,
  resolveTikoIdentityBaseUrl,
  resolveTikoMediaApiBaseUrl,
  useTikoColorModeEffect,
  writeTikoLocalJson,
  tikoAppColors,
  tikoAppConfigs,
  tikoKitComponents
} from './index'
import TikoChildAccountsPanel from './TikoChildAccountsPanel.vue'

async function flushMountedWork() {
  await Promise.resolve()
  await Promise.resolve()
  await nextTick()
}

describe('TikoKit component contract', () => {
  it('exports the initial reusable Yes No building blocks including the reusable app header', () => {
    expect(tikoKitComponents).toEqual([
      'TikoAppHeader',
      'TikoAppShell',
      'TikoAnswerButton',
      'TikoChoiceGrid',
      'TikoSettingsPanel',
      'TikoOpenIconPicker',
      'TikoTileBoard',
      'tikoAppColors',
      'tikoAppConfigs'
    ])
  })

  it('normalizes a choice into a stable reusable button model', () => {
    expect(createTikoChoice({ id: 'yes', label: 'Yes' })).toEqual({
      id: 'yes',
      label: 'Yes',
      tone: 'primary',
      disabled: false
    })
  })

  it('keeps one canonical app-color palette with a different primary for each project', () => {
    const primaryColors = Object.values(tikoAppColors).map((color) => color.primary)

    expect(tikoAppColors['yes-no'].primary).toBe('var(--color-primary)')
    expect(new Set(primaryColors).size).toBe(primaryColors.length)
  })

  it('defines shared app metadata for shell icons across web and native apps', () => {
    expect(tikoAppConfigs['yes-no']).toMatchObject({
      title: 'Yes No',
      appColor: 'yes-no',
      appIcon: 'ui/check-fat',
      appIconMediaCategory: 'emotions'
    })
    expect(tikoAppConfigs.radio.appIconMediaCategory).toBe('music')
    expect(tikoAppConfigs.timer.appIconMediaCategory).toBe('transport')
  })

  it('resolves shared web runtime base URLs from the canonical env keys', () => {
    expect(resolveTikoAppApiBaseUrl()).toBe('https://app.tikoapi.org/v1')
    expect(resolveTikoAppApiBaseUrl({ VITE_TIKO_API_BASE_URL: 'https://app.test/v1/' })).toBe('https://app.test/v1')
    expect(resolveTikoIdentityBaseUrl({ VITE_IDENTITY_API_URL: 'https://identity.test/v1/' })).toBe('https://identity.test/v1')
    expect(resolveTikoIdentityBaseUrl({ VITE_TIKO_IDENTITY_BASE_URL: 'https://legacy-id.test/v1/' })).toBe('https://legacy-id.test/v1')
    expect(resolveTikoContentApiBaseUrl({ VITE_TIKO_CONTENT_BASE_URL: 'https://content.test/v1/' })).toBe('https://content.test/v1')
    expect(resolveTikoContentApiBaseUrl({ VITE_CONTENT_API_URL: 'https://legacy-content.test/v1/' })).toBe('https://legacy-content.test/v1')
    expect(resolveTikoGenerationApiBaseUrl({ VITE_GENERATION_API_URL: 'https://generation.test/v1/generation/' })).toBe('https://generation.test/v1/generation')
    expect(resolveTikoMediaApiBaseUrl({ VITE_MEDIA_API_URL: 'https://media.test/v1/' })).toBe('https://media.test/v1')
  })

  it('shares local JSON storage and color-mode runtime helpers', () => {
    const storage = new Map<string, string>()
    const localStorageLike = {
      get length() { return storage.size },
      clear: () => storage.clear(),
      getItem: (key: string) => storage.get(key) ?? null,
      key: (index: number) => Array.from(storage.keys())[index] ?? null,
      removeItem: (key: string) => storage.delete(key),
      setItem: (key: string, value: string) => { storage.set(key, value) },
    } satisfies Storage

    expect(readTikoLocalJson('missing', { ready: false }, localStorageLike)).toEqual({ ready: false })
    writeTikoLocalJson('state', { ready: true }, localStorageLike)
    expect(readTikoLocalJson('state', { ready: false }, localStorageLike)).toEqual({ ready: true })
    storage.set('broken', '{')
    expect(readTikoLocalJson('broken', { ready: false }, localStorageLike)).toEqual({ ready: false })
    expect(resolveTikoColorMode('light')).toBe('light')
    expect(resolveTikoColorMode('dark')).toBe('dark')
    expect(resolveTikoColorMode('system', { matchMedia: () => ({ matches: true }) as MediaQueryList })).toBe('dark')
    expect(normalizeTikoColorMode('dark')).toBe('dark')
    expect(normalizeTikoColorMode('bad')).toBe('system')
    expect(normalizeTikoColorMode(undefined)).toBe('system')
  })

  it('applies and reacts to shared system color mode changes', async () => {
    const listeners = new Set<() => void>()
    const query = {
      matches: false,
      addEventListener: (_type: 'change', listener: () => void) => { listeners.add(listener) },
      removeEventListener: (_type: 'change', listener: () => void) => { listeners.delete(listener) },
    }
    const documentTarget = { documentElement: { dataset: {} as Record<string, string> } }
    const windowTarget = { matchMedia: () => query }

    expect(applyTikoColorMode('dark', documentTarget, windowTarget)).toBe('dark')
    expect(documentTarget.documentElement.dataset).toMatchObject({ colorMode: 'dark', theme: 'dark' })

    const wrapper = mount(defineComponent({
      setup() {
        const mode = ref<'light' | 'dark' | 'system'>('system')
        useTikoColorModeEffect(mode, documentTarget, windowTarget)
        return { mode }
      },
      template: '<button @click="mode = mode === \'light\' ? \'system\' : \'light\'">toggle</button>',
    }))

    await flushMountedWork()
    expect(documentTarget.documentElement.dataset.colorMode).toBe('light')
    expect(listeners.size).toBe(1)

    query.matches = true
    listeners.forEach(listener => listener())
    expect(documentTarget.documentElement.dataset.colorMode).toBe('dark')

    await wrapper.get('button').trigger('click')
    expect(documentTarget.documentElement.dataset.colorMode).toBe('light')
    await wrapper.unmount()
    expect(listeners.size).toBe(0)
  })

  it('renders the design header with open-icon action names and app color token', async () => {
    const wrapper = mount(TikoAppHeader, {
      props: {
        appName: 'Yes No',
        appIcon: '👍',
        appColor: 'yes-no',
        actions: [
          { id: 'history', label: 'History', icon: 'ui/clock' },
          { id: 'settings', label: 'Settings', icon: 'ui/settings-dual' }
        ]
      }
    })

    expect(wrapper.get('[data-test="tiko-app-header"]').attributes('data-app-color')).toBe('yes-no')
    expect(wrapper.get('[data-test="tiko-app-header"]').text()).toContain('Yes No')
    await wrapper.get('[data-test="tiko-header-action-settings"]').trigger('click')
    expect(wrapper.emitted('action')).toEqual([['settings']])
  })

  it('renders app shell title and default slot', () => {
    const wrapper = mount(TikoAppShell, {
      props: { appName: 'Yes No', avatar: 'ui/avatar', showBack: true, labels: { account: 'Kont', back: 'Lura' } },
      slots: { default: '<p data-test="content">Ready</p>' }
    })

    expect(wrapper.get('.tiko-app-shell').attributes('data-app-color')).toBe('yes-no')
    expect(wrapper.get('[data-test="tiko-shell-title"]').text()).toBe('Yes No')
    expect(wrapper.get('.tiko-app-header__back-btn').attributes('aria-label')).toBe('Lura')
    expect(wrapper.get('.tiko-app-header__avatar').attributes('aria-label')).toBe('Kont')
    expect(wrapper.get('[data-test="content"]').text()).toBe('Ready')
  })

  it('renders translated settings copy and normalizes invalid color modes', () => {
    const wrapper = mount(TikoSettingsPanel, {
      props: {
        language: 'mt',
        colorMode: 'sepia' as never,
        labels: {
          settings: 'Impostazzjonijiet',
          appPreferences: 'Lingwa, dehra u preferenzi tal-app.',
          appearance: 'Dehra',
          language: 'Lingwa',
          colorMode: 'Mod tal-kulur',
          light: 'Car',
          dark: 'Skur',
          system: 'Sistema',
        },
        languages: [{ value: 'mt', nativeLabel: 'Malti' }],
      },
    })

    expect(wrapper.get('.tiko-settings-panel__title').text()).toBe('Impostazzjonijiet')
    expect(wrapper.get('.tiko-settings-panel__subtitle').text()).toBe('Lingwa, dehra u preferenzi tal-app.')
    expect(wrapper.get('[data-test="tiko-settings-language"]').text()).toContain('Malti')
    expect(wrapper.emitted('update:colorMode')).toEqual([['system']])
  })

  it('styles shared identity popups through sil/ui popup custom properties', () => {
    const root = resolve(__dirname, '../../..')
    const runtimeSource = readFileSync(resolve(root, 'packages/ui/src/identity-runtime.ts'), 'utf8')
    const stylesSource = readFileSync(resolve(root, 'packages/ui/src/styles.scss'), 'utf8')
    const profileSource = readFileSync(resolve(root, 'packages/ui/src/TikoProfileMenu.vue'), 'utf8')
    const childAccountsSource = readFileSync(resolve(root, 'packages/ui/src/TikoChildAccountsPanel.vue'), 'utf8')
    const pinSource = readFileSync(resolve(root, 'packages/ui/src/TikoPinPopup.vue'), 'utf8')
    const identityWrapperRule = stylesSource.match(/\.tiko-identity-popup\s*\{[^}]*\}/)?.[0] ?? ''
    const profileWrapperRule = profileSource.match(/\.tiko-profile-menu\s*\{[^}]*\}/)?.[0] ?? ''
    const childAccountsWrapperRule = childAccountsSource.match(/\.tiko-child-accounts\s*\{[^}]*\}/)?.[0] ?? ''

    for (const id of ['tiko-profile-menu', 'tiko-account', 'tiko-parent-code', 'tiko-set-parent-code', 'tiko-child-accounts']) {
      expect(runtimeSource).toContain(`id: '${id}'`)
      expect(stylesSource).toContain(`.popup--stack-${id}`)
    }

    expect(stylesSource).toContain('--popup-border-radius')
    expect(stylesSource).toContain('--popup-container-background')
    expect(identityWrapperRule).not.toContain('border-radius')
    expect(identityWrapperRule).not.toContain('background:')
    expect(identityWrapperRule).not.toContain('box-shadow')
    expect(profileSource).toContain("useBemm('tiko-profile-menu'")
    expect(childAccountsSource).toContain("useBemm('tiko-child-accounts'")
    expect(pinSource).toContain("useBemm('tiko-pin-popup'")
    expect(profileWrapperRule).not.toContain('border-radius')
    expect(profileWrapperRule).not.toContain('background:')
    expect(profileWrapperRule).not.toContain('box-shadow')
    expect(childAccountsWrapperRule).not.toContain('border-radius')
    expect(childAccountsWrapperRule).not.toContain('background:')
    expect(childAccountsWrapperRule).not.toContain('box-shadow')
  })

  it('emits answer when an answer button is tapped', async () => {
    const wrapper = mount(TikoAnswerButton, {
      props: { choice: createTikoChoice({ id: 'no', label: 'No', tone: 'secondary' }) }
    })

    await wrapper.get('button').trigger('click')

    expect(wrapper.emitted('answer')).toEqual([['no']])
  })

  it('loads and creates child accounts from injected handlers', async () => {
    const onLoad = vi.fn(async () => [])
    const onCreate = vi.fn(async (name: string, code: string) => ({ id: 'child-1', name, code }))
    const wrapper = mount(TikoChildAccountsPanel, {
      props: {
        onLoad,
        onCreate,
        onUpdate: vi.fn(),
        onResetCode: vi.fn(),
        onDelete: vi.fn(),
      },
    })

    await flushMountedWork()
    await wrapper.get('.tiko-child-accounts__item--add').trigger('click')
    const inputs = wrapper.findAll<HTMLInputElement>('.tiko-child-accounts__input')
    await inputs[0].setValue('Mia')
    await inputs[1].setValue('1234')
    await wrapper.get('.tiko-child-accounts__btn').trigger('click')
    await flushMountedWork()

    expect(onLoad).toHaveBeenCalledTimes(1)
    expect(onCreate).toHaveBeenCalledWith('Mia', '1234')
    expect(wrapper.text()).toContain('Mia')
  })

  it('pages tiles through dots and emits page changes', async () => {
    const wrapper = mount(TikoPagedTileGrid, {
      props: {
        items: [{ id: 'one' }, { id: 'two' }, { id: 'three' }],
        columns: 2,
        itemsPerPage: 2,
        page: 0,
      },
      slots: {
        item: ({ item }: { item: { id: string } }) => h('span', { class: 'tile' }, item.id),
      },
    })

    await flushMountedWork()
    expect(wrapper.findAll('.tile')).toHaveLength(3)
    expect(wrapper.findAll('.tiko-paged-tile-grid__dot')).toHaveLength(2)
    expect(wrapper.findAll('.tiko-paged-tile-grid__dot')[0].attributes('aria-current')).toBe('page')

    await wrapper.findAll('.tiko-paged-tile-grid__dot')[1].trigger('click')

    expect(wrapper.emitted('update:page')).toEqual([[1]])
    expect(wrapper.emitted('pageChange')).toEqual([[1]])
  })

  it('renders reusable editable square tile boards', async () => {
    const item = { id: 'Water' }
    const wrapper = mount(TikoTileBoard, {
      props: {
        items: [item],
        columns: 2,
        itemsPerPage: 4,
        page: 0,
        editing: true,
        getTitle: (value: typeof item) => value.id,
        getBackground: () => '#2488ff',
        isSelected: () => true,
        canEdit: () => true,
        isUserOwned: () => true,
        labels: { select: 'Select', deselect: 'Deselect', edit: 'Edit' },
      },
    })

    await flushMountedWork()
    expect(wrapper.find('.tiko-tile-board__item--selected').exists()).toBe(true)
    expect(wrapper.get('.tiko-square-tile').text()).toContain('Water')

    await wrapper.get('.tiko-square-tile').trigger('click')
    await wrapper.get('.tiko-selection-badge').trigger('click')
    await wrapper.get('.tiko-edit-badge').trigger('click')

    expect(wrapper.emitted('activate')).toEqual([[item]])
    expect(wrapper.emitted('select')).toEqual([[item]])
    expect(wrapper.emitted('edit')).toEqual([[item]])
  })

  it('toggles open-icon selections with accessible buttons', async () => {
    const wrapper = mount(TikoOpenIconPicker, {
      props: {
        modelValue: 'ui/check-fat',
        icons: [
          { name: 'ui/check-fat', label: 'Check' },
          { name: 'ui/star-fat', label: 'Star' },
        ],
        labels: { openIcons: 'Iftaħ l-ikoni' },
      },
    })

    expect(wrapper.get('.tiko-open-icon-picker').attributes('role')).toBe('listbox')
    expect(wrapper.get('.tiko-open-icon-picker').attributes('aria-label')).toBe('Iftaħ l-ikoni')
    expect(wrapper.get('button[aria-label="Check"]').attributes('role')).toBe('option')
    expect(wrapper.get('button[aria-label="Check"]').attributes('aria-pressed')).toBe('true')
    expect(wrapper.get('button[aria-label="Check"]').attributes('aria-selected')).toBe('true')

    await wrapper.get('button[aria-label="Check"]').trigger('click')
    await wrapper.get('button[aria-label="Star"]').trigger('click')

    expect(wrapper.emitted('update:modelValue')).toEqual([[''], ['ui/star-fat']])
  })

  it('keeps compact shared controls at accessible touch target sizes', () => {
    const root = resolve(__dirname, '../../..')
    const stylesSource = readFileSync(resolve(root, 'packages/ui/src/styles.scss'), 'utf8')
    const iconPickerRule = stylesSource.match(/\.tiko-open-icon-picker__item\s*\{[^}]*\}/)?.[0] ?? ''
    const pagerDotRule = stylesSource.match(/\.tiko-paged-tile-grid__dot\s*\{[^}]*\}/)?.[0] ?? ''
    const badgeRule = stylesSource.match(/\.tiko-selection-badge,\s*\n\.tiko-edit-badge\s*\{[^}]*\}/)?.[0] ?? ''

    expect(iconPickerRule).toContain('min-width: 44px')
    expect(iconPickerRule).toContain('min-height: 44px')
    expect(pagerDotRule).toContain('width: 44px')
    expect(pagerDotRule).toContain('height: 44px')
    expect(badgeRule).toContain('width: 44px')
    expect(badgeRule).toContain('height: 44px')
  })

  it('renders a two-choice grid and emits selected choice ids', async () => {
    const wrapper = mount(TikoChoiceGrid, {
      props: {
        choices: [
          createTikoChoice({ id: 'yes', label: 'Yes' }),
          createTikoChoice({ id: 'no', label: 'No', tone: 'secondary' })
        ]
      }
    })

    expect(wrapper.findAll('[data-test="tiko-answer-button"]')).toHaveLength(2)
    await wrapper.findAll('button')[1].trigger('click')
    expect(wrapper.emitted('answer')).toEqual([['no']])
  })


  it('posts speech text to Atlas and rewrites Atlas asset URLs to the configured API host', async () => {
    const play = vi.fn()
    const fetcher = vi.fn(async () => new Response(JSON.stringify({
      data: {
        id: 'asset-yes',
        audioUrl: '/v1/atlas/assets/asset-yes',
        contentType: 'audio/mpeg',
        cached: false,
        provider: { name: 'openai', model: 'tts-1', voice: 'nova' }
      },
      meta: { cached: false, schemaVersion: 1, requestId: 'atlas-req-1' }
    }), { status: 200 })) as unknown as typeof fetch
    const client = createTikoTtsClient({ fetcher, audioFactory: () => ({ play }) })

    const result = await client.speak({ text: 'Yes', language: 'en', provider: 'auto' })

    expect(fetcher).toHaveBeenCalledWith('https://api.tikotalks.com/v1/atlas/speech', expect.objectContaining({ method: 'POST' }))
    expect(JSON.parse((fetcher as any).mock.calls[0][1].body)).toMatchObject({ app: 'tiko-ui', purpose: 'speech-playback', text: 'Yes', language: 'en', provider: 'auto' })
    expect(result.audioUrl).toBe('https://api.tikotalks.com/v1/atlas/assets/asset-yes')
    expect(result.metadata).toMatchObject({ id: 'asset-yes', provider: 'openai', model: 'tts-1', voice: 'nova', requestId: 'atlas-req-1' })
    expect(play).toHaveBeenCalledTimes(1)
  })

  it('accepts the Atlas speech response envelope for browser playback', async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({
      data: {
        id: 'asset-1',
        audioUrl: '/v1/atlas/assets/asset-1',
        contentType: 'audio/mpeg',
        cached: true,
        provider: { name: 'elevenlabs', model: 'eleven_multilingual_v2', voice: '21m00Tcm4TlvDq8ikWAM' }
      },
      meta: { cached: true, schemaVersion: 1, requestId: 'atlas-req-2' }
    }), { status: 200 })) as unknown as typeof fetch
    const client = createTikoTtsClient({ fetcher, audioFactory: () => ({ play: vi.fn() }) })

    const result = await client.getAudio({ text: 'Yes', language: 'en' })

    expect(result.success).toBe(true)
    expect(result.audioUrl).toBe('https://api.tikotalks.com/v1/atlas/assets/asset-1')
    expect(result.cached).toBe(true)
    expect(result.metadata).toMatchObject({ id: 'asset-1', provider: 'elevenlabs', schemaVersion: 1, requestId: 'atlas-req-2' })
  })

  it('keeps a local audio response cache to avoid repeated TTS generation calls', async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({ success: true, audioUrl: 'https://tts.tikocdn.org/audio/no.mp3' }), { status: 200 })) as unknown as typeof fetch
    const client = createTikoTtsClient({ fetcher, audioFactory: () => ({ play: vi.fn() }) })

    await client.getAudio({ text: 'No', language: 'en' })
    const second = await client.getAudio({ text: 'No', language: 'en' })

    expect(fetcher).toHaveBeenCalledTimes(1)
    expect(second.cached).toBe(true)
  })
})
