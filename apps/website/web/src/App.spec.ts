import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import App from './App.vue'
import { appUniverse, stableRoutes } from './content/appUniverse'

function mountAt(path: string) {
  window.history.pushState({}, '', path)
  return mount(App)
}

afterEach(() => {
  window.history.pushState({}, '', '/')
})

describe('TikoTalks website', () => {
  it('renders the homepage with child-first copy and no account CTA', () => {
    const wrapper = mountAt('/')

    expect(wrapper.text()).toContain('Small tools for big moments.')
    expect(wrapper.text()).toContain('Open a tiny app')
    expect(wrapper.text()).toContain('No passwords.')
    expect(wrapper.text()).not.toContain('Start free trial')
    expect(wrapper.text()).not.toContain('Talk to sales')
    expect(wrapper.text()).not.toContain('Sign in')
  })

  it('has stable navigation for the implemented static pages', () => {
    const wrapper = mountAt('/')

    for (const path of stableRoutes) {
      expect(wrapper.find(`a[href="${path}"]`).exists()).toBe(true)
    }
    expect(wrapper.find('a[href="/login"]').exists()).toBe(false)
  })

  it('shows the app universe on the tools route without overclaiming native availability', () => {
    const wrapper = mountAt('/tools')

    expect(wrapper.text()).toContain('Tiny apps, each with one clear job.')
    for (const app of appUniverse) {
      expect(wrapper.text()).toContain(app.name)
      expect(wrapper.text()).toContain(app.statusLabel)
    }
    expect(wrapper.text()).toContain('Planned')
    expect(wrapper.text()).not.toContain('Native app available')
  })

  it('renders the stable placeholder route pages', () => {
    expect(mountAt('/how-it-works').text()).toContain('How Tiko works')
    expect(mountAt('/caregivers').text()).toContain('For caregivers')
    expect(mountAt('/faq').text()).toContain('Plain answers')
  })

  it('maps app detail paths to the tools content', () => {
    const wrapper = mountAt('/apps/yes-no')

    expect(wrapper.text()).toContain('Tiny apps, each with one clear job.')
    expect(wrapper.text()).toContain('Yes No')
  })
})
