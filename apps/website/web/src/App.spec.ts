import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import { createRouter, createMemoryHistory } from 'vue-router'
import App from './App.vue'
import SiteHeader from './components/SiteHeader.vue'
import { appUniverse } from './content/appUniverse'
import { docsPages } from './siteContent'

async function mountAt(path: string) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: () => import('./pages/HomePage.vue') },
      { path: '/tools', redirect: '/apps' },
      { path: '/why-tiko', component: () => import('./pages/WhyTikoPage.vue') },
      { path: '/apps', component: () => import('./pages/AppListPage.vue') },
      { path: '/apps/:slug', component: () => import('./pages/AppDetailPage.vue') },
      { path: '/how-it-works', component: () => import('./pages/HowItWorksPage.vue') },
      { path: '/caregivers', component: () => import('./pages/CaregiversPage.vue') },
      { path: '/faq', component: () => import('./pages/FaqPage.vue') },
      { path: '/docs', component: () => import('./pages/DocsPage.vue') },
      { path: '/docs/:section', component: () => import('./pages/DocsPage.vue') },
    ],
  })
  await router.push(path)
  const wrapper = mount(App, { global: { plugins: [router] } })
  await flushPromises()
  return wrapper
}

afterEach(() => {
  // nothing to clean up with memory history
})

describe('TikoTalks website', () => {
  it('renders the homepage with child-first copy and no account CTA', async () => {
    const wrapper = await mountAt('/')

    expect(wrapper.text()).toContain('Tiny apps for everyday moments')
    expect(wrapper.text()).toContain('No ads. Ever.')
    expect(wrapper.text()).toContain('Free, always.')
    expect(wrapper.text()).not.toContain('Start free trial')
    expect(wrapper.text()).not.toContain('Talk to sales')
    expect(wrapper.text()).not.toContain('Sign in')
  })

  it('shows the header navigation for site pages', async () => {
    const wrapper = await mountAt('/')
    const header = wrapper.findComponent(SiteHeader)

    expect(header.exists()).toBe(true)
    expect(header.find('a[href="/apps"]').exists()).toBe(true)
    expect(header.find('a[href="/why-tiko"]').exists()).toBe(true)
    expect(header.find('a[href="/how-it-works"]').exists()).toBe(true)
    expect(header.find('a[href="/caregivers"]').exists()).toBe(true)
    expect(header.find('a[href="/docs"]').exists()).toBe(true)
    expect(header.find('a[href="/login"]').exists()).toBe(false)
  })

  it('shows the app universe on the apps route without overclaiming native availability', async () => {
    const wrapper = await mountAt('/apps')

    expect(wrapper.text()).toContain('Tiny apps')
    for (const app of appUniverse) {
      expect(wrapper.text()).toContain(app.name)
      expect(wrapper.text()).toContain(app.statusLabel)
    }
    expect(wrapper.text()).toContain('Planned')
    expect(wrapper.text()).not.toContain('Native app available')
  })

  it('renders app detail pages for each app', async () => {
    for (const app of appUniverse) {
      const wrapper = await mountAt(app.path)
      expect(wrapper.text()).toContain(app.name)
    }
  })

  it('renders the stable placeholder route pages', async () => {
    expect((await mountAt('/why-tiko')).text()).toContain('No ads. Ever.')
    expect((await mountAt('/how-it-works')).text()).toContain('How Tiko works')
    expect((await mountAt('/caregivers')).text()).toContain('For caregivers')
    expect((await mountAt('/faq')).text()).toContain('Plain answers')
  })

  it('renders the public docs overview and subpages', async () => {
    for (const page of docsPages) {
      const wrapper = await mountAt(page.path)
      expect(wrapper.text()).toContain(page.title)
    }

    expect((await mountAt('/docs/philosophy')).text()).toContain('No passwords and no login walls before use.')
    expect((await mountAt('/docs/architecture')).text()).toContain('identity-api')
    expect((await mountAt('/docs/apis')).text()).toContain('POST /v1/identity/device')
  })

  it('shows app detail for yes-no without the Cards media library section', async () => {
    const wrapper = await mountAt('/apps/yes-no')
    expect(wrapper.text()).toContain('Yes No')
    expect(wrapper.text()).toContain('One clear question. One clear answer.')
    expect(wrapper.text()).not.toContain('Built-in image library')
    expect(wrapper.find('.app-detail__media').exists()).toBe(false)
  })

  it('shows the Cards media section with Tiko Media images and no emoji fallback', async () => {
    const wrapper = await mountAt('/apps/cards')

    expect(wrapper.text()).toContain('Built-in image library')
    expect(wrapper.text()).toContain('Tiko Media images, ready for Cards.')
    expect(wrapper.find('a[href="https://media.tikoapps.org"]').exists()).toBe(true)
    expect(wrapper.findAll('.app-detail__media-img').length).toBeGreaterThan(0)
    expect(wrapper.find('.app-detail__media-emoji').exists()).toBe(false)
    expect(wrapper.text()).not.toMatch(/[\u{1F300}-\u{1FAFF}]/u)
  })
})
