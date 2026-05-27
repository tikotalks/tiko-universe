export type TikoWebsiteAppSlug = 'yes-no' | 'type' | 'cards' | 'sequence' | 'timer'

export type TikoWebsiteAppStatus = 'available' | 'planned'
export type AppStatus = TikoWebsiteAppStatus
export type StableRoute = '/' | '/tools' | '/how-it-works' | '/caregivers' | '/faq'

export const stableRoutes: StableRoute[] = ['/', '/tools', '/how-it-works', '/caregivers', '/faq']

export interface TikoWebsiteAppMetadata {
  slug: TikoWebsiteAppSlug
  appName: string
  shortSummary: string
  route: `/apps/${TikoWebsiteAppSlug}`
  status: TikoWebsiteAppStatus
  availability: TikoWebsiteAppStatus
  platformNotes: string
  color: string
  useWhen: readonly string[]
}

export const tikoWebsiteAppUniverse = [
  {
    slug: 'yes-no',
    appName: 'Yes No',
    shortSummary: 'Big yes and no choices for quick, clear answers.',
    route: '/apps/yes-no',
    status: 'available',
    availability: 'available',
    platformNotes: 'Open on the web now. Native iOS and Android paths should keep the same simple two-choice shape.',
    color: '#9b3fbd',
    useWhen: [
      'a child needs to answer quickly',
      'a caregiver wants a simple prompt',
      'speech or tapping should happen without a complicated screen'
    ]
  },
  {
    slug: 'type',
    appName: 'Type',
    shortSummary: 'A quiet place to type a message and speak it aloud.',
    route: '/apps/type',
    status: 'planned',
    availability: 'planned',
    platformNotes: 'Coming to the web first, then native paths from the same child-first text and speech contract.',
    color: '#2488ff',
    useWhen: [
      'a child wants to type a message',
      'saved phrases may help later',
      'spoken output should stay simple and accessible'
    ]
  },
  {
    slug: 'cards',
    appName: 'Cards',
    shortSummary: 'Visual choices and familiar items that stay easy to tap.',
    route: '/apps/cards',
    status: 'planned',
    availability: 'planned',
    platformNotes: 'Coming as a small card experience before any caregiver sync or transfer layer is added.',
    color: '#ff8a1f',
    useWhen: [
      'images or symbols help more than text alone',
      'choices should be visible and tappable',
      'a small library is enough'
    ]
  },
  {
    slug: 'sequence',
    appName: 'Sequence',
    shortSummary: 'Ordered steps for routines that need calm structure.',
    route: '/apps/sequence',
    status: 'planned',
    availability: 'planned',
    platformNotes: 'Coming for web and native with the next step always visible and without heavy system framing.',
    color: '#16b8a6',
    useWhen: [
      'a routine needs a simple order',
      'the next step should be visible',
      'predictability matters'
    ]
  },
  {
    slug: 'timer',
    appName: 'Timer',
    shortSummary: 'A readable timer for seeing time pass.',
    route: '/apps/timer',
    status: 'planned',
    availability: 'planned',
    platformNotes: 'Coming as a focused screen that does one thing on web, iOS, and Android.',
    color: '#f8c22e',
    useWhen: [
      'transitions need a visible end',
      'waiting should feel less abstract',
      'the screen should do one thing only'
    ]
  }
] as const satisfies readonly TikoWebsiteAppMetadata[]

export const tikoApps = tikoWebsiteAppUniverse.map((app) => ({
  id: app.slug,
  name: app.appName,
  path: app.route,
  color: app.color,
  status: app.status,
  statusLabel: app.status === 'available' ? 'Web available' : 'Planned',
  summary: app.shortSummary,
  platformNotes: app.platformNotes,
  useWhen: [...app.useWhen]
}))

export type TikoAppInfo = (typeof tikoApps)[number]

export const appUniverse = tikoApps

export function getTikoWebsiteAppMetadata(slug: TikoWebsiteAppSlug): TikoWebsiteAppMetadata {
  const app = tikoWebsiteAppUniverse.find((item) => item.slug === slug)
  if (!app) throw new Error(`Unknown Tiko website app metadata slug: ${slug}`)
  return app
}
