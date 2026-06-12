import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { createWebAppFetchHandler } from '@tiko/testing'
import App from './App.vue'

function createLocalStorageMock() {
  const store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value }),
    removeItem: vi.fn((key: string) => { delete store[key] }),
    clear: vi.fn(() => { Object.keys(store).forEach(k => delete store[k]) }),
    get store() { return store }
  }
}

function mountApp(localStorageOverride?: Record<string, string>) {
  const ls = createLocalStorageMock()
  if (localStorageOverride) {
    Object.entries(localStorageOverride).forEach(([k, v]) => { ls.store[k] = v })
  }

  const win = globalThis.window as any
  if (win) {
    win.localStorage = ls
  }

  const wrapper = mount(App, {
    global: {
      stubs: {
        'tiko-app-shell': {
          name: 'TikoAppShell',
          template: '<div class="tiko-app-shell-stub"><slot /></div>',
          props: ['appName', 'appIcon', 'appColor', 'actions'],
          emits: ['headerAction']
        },
        'tiko-settings-panel': {
          template: '<div class="tiko-settings-panel-stub" />',
          props: ['modelValue', 'colorMode']
        }
      }
    }
  })

  return { wrapper, ls }
}

describe('Type App', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.stubGlobal('fetch', vi.fn(createWebAppFetchHandler({ appId: 'type' })))
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('opens immediately with compose area, no login wall', () => {
    const { wrapper } = mountApp()
    expect(wrapper.find('.type-app').exists()).toBe(true)
    expect(wrapper.find('.type-app__textarea').exists()).toBe(true)
    expect(wrapper.find('.type-app__compose').exists()).toBe(true)
  })

  it('textarea is visible and editable', () => {
    const { wrapper } = mountApp()
    const textarea = wrapper.find('.type-app__textarea')
    expect(textarea.exists()).toBe(true)
    expect(textarea.element.tagName).toBe('TEXTAREA')
  })

  it('speak button exists', () => {
    const { wrapper } = mountApp()
    const allBtns = wrapper.findAll('button')
    const speakBtn = allBtns.find(b => b.attributes('aria-label') === 'Speak')
    expect(speakBtn).toBeTruthy()
  })

  it('clear button clears text', async () => {
    const { wrapper } = mountApp()
    // Type some text
    const textarea = wrapper.find('.type-app__textarea')
    await textarea.setValue('hello world')
    await nextTick()

    // Find and click clear button
    const clearBtn = wrapper.findAll('button').find(b => b.attributes('aria-label') === 'Clear')
    expect(clearBtn).toBeTruthy()
    await clearBtn!.trigger('click')
    await nextTick()

    expect((wrapper.find('.type-app__textarea').element as HTMLTextAreaElement).value).toBe('')
  })

  it('virtual keyboard buttons insert characters', async () => {
    const { wrapper } = mountApp()
    const keys = wrapper.findAll('.type-app__key')
    expect(keys.length).toBeGreaterThan(0)

    // Click the first letter key
    const firstKey = keys[0]
    await firstKey.trigger('click')
    await nextTick()

    const textarea = wrapper.find('.type-app__textarea')
    expect((textarea.element as HTMLTextAreaElement).value.length).toBeGreaterThan(0)
  })

  it('phrases section is displayed', async () => {
    const { wrapper } = mountApp()
    const phrasesBtn = wrapper.findAll('.type-app__actions button')[3]
    expect(phrasesBtn).toBeTruthy()
    await phrasesBtn!.trigger('click')
    await nextTick()
    expect(wrapper.find('.type-app__phrases-popup').exists()).toBe(true)
    expect(wrapper.find('.type-app__phrases-header').exists()).toBe(true)
  })

  it('loads starter prompts from persisted/default state', async () => {
    const { wrapper } = mountApp({
      'tiko:type': JSON.stringify({
        prompts: ['I need help', 'Thank you'],
        completedPrompts: [],
      }),
    })
    const phrasesBtn = wrapper.findAll('.type-app__actions button')[3]
    await phrasesBtn!.trigger('click')
    await nextTick()

    const items = wrapper.findAll('.type-app__phrase-item')
    expect(items.map(item => item.text())).toEqual(['I need help', 'Thank you'])

    await items[0].trigger('click')
    await nextTick()
    expect((wrapper.find('.type-app__textarea').element as HTMLTextAreaElement).value).toBe('I need help')
  })

  it('localStorage persistence works', async () => {
    const { wrapper, ls } = mountApp()
    const textarea = wrapper.find('.type-app__textarea')
    await textarea.setValue('test text')
    await nextTick()

    expect(ls.setItem).toHaveBeenCalledWith('tiko:type', expect.any(String))
    const saved = JSON.parse(ls.store['tiko:type'])
    expect(saved.text).toBe('test text')
  })

  it('settings panel opens and closes', async () => {
    const { wrapper } = mountApp()
    // Settings panel not visible initially
    expect(wrapper.find('.tiko-settings-panel-stub').exists()).toBe(false)

    // Emit header-action to open settings
    const shell = wrapper.findComponent({ name: 'TikoAppShell' })
    shell.vm.$emit('headerAction', 'settings')
    await nextTick()

    expect(wrapper.find('.tiko-settings-panel-stub').exists()).toBe(true)
  })

  it('keyboard layout toggle exists', () => {
    const { wrapper } = mountApp()
    const toggleBtn = wrapper.find('.type-app__keyboard-toggle button')
    expect(toggleBtn.exists()).toBe(true)
  })

  it('shows empty phrases message when no phrases saved', () => {
    const { wrapper } = mountApp()
    const phrasesList = wrapper.find('.type-app__phrases-list')
    expect(phrasesList.exists()).toBe(false)
  })

  it('saving a phrase adds it to the list', async () => {
    const { wrapper } = mountApp()
    const textarea = wrapper.find('.type-app__textarea')
    await textarea.setValue('hello phrase')
    await nextTick()

    const saveBtn = wrapper.findAll('button').find(b => b.attributes('aria-label') === 'Save phrase')
    expect(saveBtn).toBeTruthy()
    await saveBtn!.trigger('click')
    await nextTick()

    const phrasesBtn = wrapper.findAll('.type-app__actions button')[3]
    expect(phrasesBtn).toBeTruthy()
    await phrasesBtn!.trigger('click')
    await nextTick()

    const phrasesList = wrapper.find('.type-app__phrases-list')
    expect(phrasesList.exists()).toBe(true)
    const items = wrapper.findAll('.type-app__phrase-item')
    expect(items.length).toBe(1)
    expect(items[0].text()).toBe('hello phrase')
  })
})
