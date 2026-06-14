import { describe, expect, it } from 'vitest'
import { tikoWebsiteAppUniverse } from './appUniverse'
import { faqs, trustPrinciples } from '../content'

const allCopy = [
  ...tikoWebsiteAppUniverse.flatMap((app) => [
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
    expect(tikoWebsiteAppUniverse.map((app) => app.slug)).toEqual(['yes-no', 'type', 'cards', 'sequence', 'timer', 'talk'])
  })

  it('exposes the typed fields the website needs', () => {
    expect(tikoWebsiteAppUniverse.map((app) => ({
      appName: app.appName,
      route: app.route,
      availability: app.availability,
      hasPlatformNotes: app.platformNotes.length > 40
    }))).toEqual([
      { appName: 'Yes No', route: '/apps/yes-no', availability: 'available', hasPlatformNotes: true },
      { appName: 'Type', route: '/apps/type', availability: 'planned', hasPlatformNotes: true },
      { appName: 'Cards', route: '/apps/cards', availability: 'planned', hasPlatformNotes: true },
      { appName: 'Sequence', route: '/apps/sequence', availability: 'planned', hasPlatformNotes: true },
      { appName: 'Timer', route: '/apps/timer', availability: 'planned', hasPlatformNotes: true },
      { appName: 'Talk', route: '/apps/talk', availability: 'available', hasPlatformNotes: true }
    ])
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
