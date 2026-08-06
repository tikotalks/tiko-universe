import { describe, expect, it } from 'vitest'
import { tikoWebsiteAppUniverse, type TikoWebsiteAppMetadata } from './appUniverse'
import { faqs, trustPrinciples } from '../content'

// `as const satisfies` keeps the narrow literal type per entry, which drops the
// optional fields from members that omit them. Read through the interface instead.
const apps: readonly TikoWebsiteAppMetadata[] = tikoWebsiteAppUniverse

const allCopy = [
  ...apps.flatMap((app) => [
    app.appName,
    app.shortSummary,
    app.availability,
    app.platformNotes,
    ...app.useWhen
  ]),
  ...trustPrinciples,
  ...faqs.flatMap((item) => [item.question, item.answer])
].join(' ')

describe('TikoTalks website app universe metadata', () => {
  it('keeps one local static entry for each v1 app', () => {
    expect(tikoWebsiteAppUniverse.map((app) => app.slug)).toEqual(['yes-no', 'type', 'cards', 'sequence', 'timer', 'talk', 'say', 'sum', 'first'])
  })

  it('exposes the typed fields the website needs', () => {
    expect(tikoWebsiteAppUniverse.map((app) => ({
      appName: app.appName,
      route: app.route,
      availability: app.availability,
      hasPlatformNotes: app.platformNotes.length > 40
    }))).toEqual([
      { appName: 'Yes No', route: '/apps/yes-no', availability: 'available', hasPlatformNotes: true },
      { appName: 'Type', route: '/apps/type', availability: 'available', hasPlatformNotes: true },
      { appName: 'Cards', route: '/apps/cards', availability: 'planned', hasPlatformNotes: true },
      { appName: 'Sequence', route: '/apps/sequence', availability: 'planned', hasPlatformNotes: true },
      { appName: 'Timer', route: '/apps/timer', availability: 'planned', hasPlatformNotes: true },
      { appName: 'Talk', route: '/apps/talk', availability: 'available', hasPlatformNotes: true },
      { appName: 'Say', route: '/apps/say', availability: 'available', hasPlatformNotes: true },
      { appName: 'Sum', route: '/apps/sum', availability: 'available', hasPlatformNotes: true },
      { appName: 'First', route: '/apps/first', availability: 'available', hasPlatformNotes: true }
    ])
  })

  it('backs every screenshot with both a light and a dark capture', () => {
    const shots = apps.flatMap((app) => app.screenshots ?? [])
    expect(shots.length).toBeGreaterThan(0)
    for (const shot of shots) {
      expect(shot.light).toMatch(/^\/screenshots\/.+-light\.webp$/)
      expect(shot.dark).toBe(shot.light.replace('-light.webp', '-dark.webp'))
      expect(shot.caption.length).toBeGreaterThan(3)
    }
  })

  // Every Tiko app live under the App Store developer account, pinned by track
  // id. A shipped app missing from the metadata is a download button the site
  // silently never renders, which is how Yes No went months without one.
  const appStoreIds: Record<string, string> = {
    'yes-no': '6781237407',
    type: '6780917101',
    say: '6794481329',
    sum: '6794587838',
    first: '6794608348'
  }

  it('links every app that has shipped on the App Store', () => {
    for (const [slug, id] of Object.entries(appStoreIds)) {
      const app = apps.find((item) => item.slug === slug)
      expect(app, `${slug} must exist in the universe`).toBeDefined()
      expect(app?.appStoreUrl).toBe(`https://apps.apple.com/app/id${id}`)
      expect(app?.availability).toBe('available')
    }
  })

  it('never claims an App Store listing for an app that has not shipped there', () => {
    const shipped = Object.keys(appStoreIds)
    for (const app of apps) {
      if (shipped.includes(app.slug)) continue
      expect(app.appStoreUrl, `${app.slug} has no App Store listing`).toBeUndefined()
    }
  })

  it('only offers a web link for apps that actually run on the web', () => {
    // Say, Sum and First have shipped on iOS only — an appUrl would 404.
    for (const app of apps) {
      if (app.availability !== 'available') continue
      expect(Boolean(app.appUrl) || Boolean(app.appStoreUrl)).toBe(true)
    }
    for (const slug of ['say', 'sum', 'first'] as const) {
      const app = apps.find((item) => item.slug === slug)
      expect(app?.appUrl).toBeUndefined()
      expect(app?.appStoreUrl).toMatch(/^https:\/\/apps\.apple\.com\/app\/id\d+$/)
    }
  })

  it('keeps copy child-first without adult SaaS, login-wall, or medical framing', () => {
    expect(allCopy).not.toMatch(/free trial|book a demo|talk to sales|enterprise|dashboard|workspace|clinical outcome|patient/i)
    expect(allCopy).toContain('does not diagnose, treat, or promise outcomes')
    expect(allCopy).not.toMatch(/guarantee|guaranteed progress/i)
    expect(allCopy).not.toMatch(/create an account|sign in|log in|passwords are required/i)
    expect(allCopy).toContain('No login walls before use.')
    expect(allCopy).toContain('No passwords.')
  })
})
