export type TikoWebsiteAppSlug = 'yes-no' | 'type' | 'cards' | 'sequence' | 'timer' | 'talk'

export type TikoWebsiteAppStatus = 'available' | 'planned'
export type AppStatus = TikoWebsiteAppStatus
export type StableRoute = '/' | '/tools' | '/why-tiko' | '/how-it-works' | '/caregivers' | '/educators' | '/faq' | '/docs' | '/docs/philosophy' | '/docs/architecture' | '/docs/apis'

export const stableRoutes: StableRoute[] = ['/', '/tools', '/why-tiko', '/how-it-works', '/caregivers', '/educators', '/faq', '/docs', '/docs/philosophy', '/docs/architecture', '/docs/apis']

export interface AppFeature {
  title: string
  body: string
}

export interface TikoWebsiteAppMetadata {
  slug: TikoWebsiteAppSlug
  appName: string
  shortSummary: string
  headline: string
  description: string
  route: `/apps/${TikoWebsiteAppSlug}`
  appUrl?: string
  status: TikoWebsiteAppStatus
  availability: TikoWebsiteAppStatus
  platformNotes: string
  color: string
  colorLight: string
  appIcon: string
  iconUrl: string
  useWhen: readonly string[]
  moment: string
  whySmall: string
  calmDetail: string
  features: readonly AppFeature[]
}

export const tikoWebsiteAppUniverse = [
  {
    slug: 'yes-no',
    appName: 'Yes No',
    shortSummary: 'Two giant buttons. One clear answer. Instantly.',
    headline: 'One clear question. One clear answer.',
    description: 'Yes No gives children two giant, unmissable choices on a single screen. No clutter, no scrolling, no account. Open it, see the question, tap the answer.',
    route: '/apps/yes-no',
    appUrl: 'https://yesno.tikoapps.org',
    status: 'available',
    availability: 'available',
    platformNotes: 'Open on the web now. iOS and Android keep the same simple two-choice shape.',
    color: '#16b8a6',
    colorLight: '#ccfbf1',
    appIcon: 'ui/check-fat',
    iconUrl: 'https://media.tikoapi.org/v1/media/c8bfb9e8-0427-4cd9-89e2-74e09d20b8ec/download',
    useWhen: [
      'a child needs to answer quickly',
      'a caregiver wants a simple prompt',
      'speech or tapping should happen without a complicated screen'
    ],
    moment: 'The simplest possible moment — one question, two giant choices, and nothing between the child and the answer.',
    whySmall: 'Yes No stays tiny because two choices are the whole point. It should not become a survey, control panel, or behaviour tracker.',
    calmDetail: 'Large targets, strong contrast, speech output, and no account step keep the answer moment focused on the child.',
    features: [
      { title: 'Two giant buttons', body: 'Yes and No fill the screen. Impossible to miss, easy to tap.' },
      { title: 'Speech output', body: 'Each answer is spoken aloud so everyone in the room hears it.' },
      { title: 'Answer history', body: 'Caregivers can review recent answers without disturbing the child.' },
      { title: 'Works offline', body: 'No network required for basic use. Just open and tap.' }
    ]
  },
  {
    slug: 'type',
    appName: 'Type',
    shortSummary: 'Type a thought and hear it spoken aloud — instantly.',
    headline: 'Type a thought. Hear it spoken.',
    description: 'Type is a distraction-free text input for moments when a child wants to communicate in writing. Every message can be spoken aloud at the tap of a button.',
    route: '/apps/type',
    appUrl: 'https://type.tikoapps.org',
    status: 'planned',
    availability: 'planned',
    platformNotes: 'Coming to the web first, then native iOS and Android.',
    color: '#ff8a1f',
    colorLight: '#fff3e0',
    appIcon: 'ui/type',
    iconUrl: 'https://media.tikoapi.org/v1/media/eecf2917-a885-4025-a762-9c7a8783f5af/download',
    useWhen: [
      'a child wants to type a message',
      'saved phrases would help',
      'spoken output should stay simple and easy to reach'
    ],
    moment: 'Some thoughts are easier typed than spoken — and some typed thoughts deserve a voice in the room.',
    whySmall: 'Type keeps writing and speaking in one quiet place instead of becoming a document editor or messaging product.',
    calmDetail: 'The app should make text entry obvious, keep speech one tap away, and avoid controls that compete with the sentence.',
    features: [
      { title: 'Clean text input', body: 'One field, one button. Type a message and speak it without menus.' },
      { title: 'Phrase library', body: 'Save phrases that come up often so they are one tap away.' },
      { title: 'Voice selection', body: 'Choose a voice that feels right for the child and the moment.' },
      { title: 'Keyboard friendly', body: 'Works with on-screen keyboards and external hardware alike.' }
    ]
  },
  {
    slug: 'cards',
    appName: 'Cards',
    shortSummary: 'Beautiful picture cards. Tap one and hear it speak.',
    headline: 'Pictures that speak for themselves.',
    description: 'Cards shows familiar images in a simple grid. Tap a card to hear its name spoken. Choose from built-in categories or build a custom set for any routine or context.',
    route: '/apps/cards',
    appUrl: 'https://cards.tikoapps.org',
    status: 'planned',
    availability: 'planned',
    platformNotes: 'Coming as a focused card experience — beautiful images, one tap to speak.',
    color: '#82B1FF',
    colorLight: '#e8f0ff',
    appIcon: 'education/book-2',
    iconUrl: 'https://media.tikoapi.org/v1/media/e37943b4-582c-40ee-be3a-c47be7c6e658/download',
    useWhen: [
      'pictures communicate faster than text',
      'choices should be visible and easy to tap',
      'a ready-made image library saves setup time'
    ],
    moment: 'A familiar picture makes a choice feel easy. Tap it, hear it, move on.',
    whySmall: 'Cards focuses on visible choices, not a complex content-management system in front of the child.',
    calmDetail: 'Square cards, clear labels, and recognizable images make scanning and tapping feel predictable.',
    features: [
      { title: 'Image cards', body: 'Tap a card to hear its name. Images make choices faster to recognise.' },
      { title: 'Built-in categories', body: 'Animals, food, emotions, body, shapes, colours, transport, numbers, and letters ready to use.' },
      { title: 'Custom cards', body: 'Add cards with a name, image, and custom speech for any word or phrase.' },
      { title: 'Offline first', body: 'Cards and images load from local storage so the app stays usable without network.' }
    ]
  },
  {
    slug: 'sequence',
    appName: 'Sequence',
    shortSummary: 'Step-by-step routines. Always clear, always moving forward.',
    headline: 'One step at a time, always clear.',
    description: 'Sequence turns any routine into a clear list of steps. The current step is always large and central. Tap to move forward. No guessing what comes next.',
    route: '/apps/sequence',
    appUrl: 'https://sequence.tikoapps.org',
    status: 'planned',
    availability: 'planned',
    platformNotes: 'Coming for web and native — the next step always visible, always one tap forward.',
    color: '#ef4f8f',
    colorLight: '#fce7f3',
    appIcon: 'ui/list',
    iconUrl: 'https://media.tikoapi.org/v1/media/c2e7188c-1ac4-41d6-a29c-2b122ec812e8/download',
    useWhen: [
      'a routine needs a clear order',
      'the next step should always be visible',
      'predictability makes transitions easier'
    ],
    moment: 'Every routine is easier when the next step is already visible instead of held in someone else\'s head.',
    whySmall: 'Sequence is not a project planner. It shows the current step, the next movement, and enough progress to feel oriented.',
    calmDetail: 'One step stays central, progress stays simple, and images can make the routine easier to recognize.',
    features: [
      { title: 'One step, full screen', body: 'The current step is always the largest thing on the screen.' },
      { title: 'Progress bar', body: 'A simple visual shows how far along the routine has gone.' },
      { title: 'Custom routines', body: 'Build any sequence: morning routine, class transition, getting dressed.' },
      { title: 'Images per step', body: 'Each step can have an image to make it immediately recognisable.' }
    ]
  },
  {
    slug: 'timer',
    appName: 'Timer',
    shortSummary: 'A big, clear countdown. See exactly how much time is left.',
    headline: 'Time you can actually see.',
    description: 'Timer makes the passage of time visible and calm. A large countdown shows exactly how much is left. No anxiety-inducing beeps, just a quiet visual end.',
    route: '/apps/timer',
    appUrl: 'https://timer.tikoapps.org',
    status: 'planned',
    availability: 'planned',
    platformNotes: 'Coming as a focused screen — one thing, done beautifully, on web, iOS, and Android.',
    color: '#e84057',
    colorLight: '#ffe4e6',
    appIcon: 'ui/timer',
    iconUrl: 'https://media.tikoapi.org/v1/media/ec6bad5e-8cbe-4934-b1c8-d66d80098f95/download',
    useWhen: [
      'transitions need a visible end point',
      'waiting feels less abstract when time is on screen',
      'the screen should do one thing only'
    ],
    moment: 'Time feels real when you can see it shrinking.',
    whySmall: 'Timer stays focused on the countdown instead of becoming a calendar, alarm suite, or productivity app.',
    calmDetail: 'A large number, visible progress, and a gentle ending keep time concrete without adding anxiety.',
    features: [
      { title: 'Large countdown', body: 'Time fills the screen. No small numbers, no hidden clocks.' },
      { title: 'Visual progress', body: 'A ring or bar shrinks as time passes, making time feel concrete.' },
      { title: 'Gentle end signal', body: 'A calm visual and optional soft sound signals when time is up.' },
      { title: 'Quick presets', body: 'Set common intervals like 5, 10, or 15 minutes in one tap.' }
    ]
  },
  {
    slug: 'talk',
    appName: 'Talk',
    shortSummary: 'Tap words, build a sentence, and hear it spoken.',
    headline: 'Build sentences. Find your voice.',
    description: 'Talk is a gentle, word-by-word communication app. Tap words to build a sentence on a clear strip, then speak it aloud. Built for children who are finding their voice — one word at a time.',
    route: '/apps/talk',
    appUrl: 'https://talk.tikoapps.org',
    status: 'available',
    availability: 'available',
    platformNotes: 'Open on the web now. iOS and Android will follow the same calm, focused experience.',
    color: '#FF6B6B',
    colorLight: '#ffe4e1',
    appIcon: 'ui/talk',
    iconUrl: 'https://media.tikoapi.org/v1/media/da85b30b-6865-41ef-9b75-71e46999de22/download',
    useWhen: [
      'a child is building language, one word at a time',
      'speaking a full sentence should take a few taps, not a keyboard',
      'a calm, predictable word grid helps more than a busy screen'
    ],
    moment: 'Every word a child chooses is a small act of saying who they are. Talk keeps the path from thought to voice as short and gentle as it can be.',
    whySmall: 'Talk stays focused on building and speaking one sentence. It is not a chat app, a content feed, or a general-purpose tablet.',
    calmDetail: 'A predictable word grid, a clear sentence strip, and a single speak button keep the focus on the child\'s voice — not on the interface.',
    features: [
      { title: 'Word grid', body: 'Tap words to add them to the sentence strip. Categories keep related words close.' },
      { title: 'Sentence strip', body: 'See the sentence build up, word by word, before speaking it.' },
      { title: 'Speak aloud', body: 'One button speaks the whole sentence in a clear voice.' },
      { title: 'Works offline', body: 'Core word packs load from local storage so Talk works without a network.' }
    ]
  }
] as const satisfies readonly TikoWebsiteAppMetadata[]

export const tikoApps = tikoWebsiteAppUniverse.map((app) => ({
  id: app.slug,
  name: app.appName,
  headline: app.headline,
  description: app.description,
  path: app.route,
  appUrl: app.appUrl,
  color: app.color,
  colorLight: app.colorLight,
  appIcon: app.appIcon,
  iconUrl: app.iconUrl,
  status: app.status,
  statusLabel: app.status === 'available' ? 'Web available' : 'Planned',
  summary: app.shortSummary,
  platformNotes: app.platformNotes,
  useWhen: [...app.useWhen],
  moment: app.moment,
  whySmall: app.whySmall,
  calmDetail: app.calmDetail,
  features: [...app.features]
}))

export type TikoAppInfo = (typeof tikoApps)[number]

export const appUniverse = tikoApps

export function getTikoWebsiteAppMetadata(slug: TikoWebsiteAppSlug): TikoWebsiteAppMetadata {
  const app = tikoWebsiteAppUniverse.find((item) => item.slug === slug)
  if (!app) throw new Error(`Unknown Tiko website app metadata slug: ${slug}`)
  return app
}

export function getAppBySlug(slug: string): TikoAppInfo | undefined {
  return tikoApps.find((app) => app.id === slug)
}
