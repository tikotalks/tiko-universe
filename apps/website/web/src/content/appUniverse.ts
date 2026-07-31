import { type MediaImageName } from './mediaImages'

export type TikoWebsiteAppSlug = 'yes-no' | 'type' | 'cards' | 'sequence' | 'timer' | 'talk' | 'say' | 'sum' | 'first'

export type TikoWebsiteAppStatus = 'available' | 'planned'
export type AppStatus = TikoWebsiteAppStatus
export type StableRoute = '/' | '/tools' | '/why-tiko' | '/how-it-works' | '/caregivers' | '/educators' | '/faq' | '/docs' | '/docs/philosophy' | '/docs/architecture' | '/docs/apis'

export const stableRoutes: StableRoute[] = ['/', '/tools', '/why-tiko', '/how-it-works', '/caregivers', '/educators', '/faq', '/docs', '/docs/philosophy', '/docs/architecture', '/docs/apis']

export interface AppFeature {
  title: string
  body: string
}

/** A real device screenshot, as produced by the app's `release/ios.json` capture run. */
export interface AppScreenshot {
  /** Path under /public, light and dark variants of the same screen. */
  light: string
  dark: string
  caption: string
}

export interface TikoWebsiteAppMetadata {
  slug: TikoWebsiteAppSlug
  appName: string
  shortSummary: string
  headline: string
  description: string
  route: `/apps/${TikoWebsiteAppSlug}`
  appUrl?: string
  appStoreUrl?: string
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
  screenshots?: readonly AppScreenshot[]
  /** Artwork for the "human moment" section — see `content/mediaImages.ts`. */
  momentImage: MediaImageName
}

export const tikoWebsiteAppUniverse = [
  {
    slug: 'yes-no',
    momentImage: 'childSayingHi',
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
    iconUrl: 'https://media.tikoapi.org/v1/media/c8bfb9e8-0427-4cd9-89e2-74e09d20b8ec/image/medium',
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
    momentImage: 'penAndNotebook',
    appName: 'Type',
    shortSummary: 'Type a thought and hear it spoken aloud — instantly.',
    headline: 'Type a thought. Hear it spoken.',
    description: 'Type is a distraction-free text input for moments when a child wants to communicate in writing. Every message can be spoken aloud at the tap of a button.',
    route: '/apps/type',
    appUrl: 'https://type.tikoapps.org',
    appStoreUrl: 'https://apps.apple.com/app/id6780917101',
    status: 'available',
    availability: 'available',
    platformNotes: 'Open on the web now, and on the App Store for iOS. Android will follow the same calm, focused experience.',
    color: '#ff8a1f',
    colorLight: '#fff3e0',
    appIcon: 'ui/type',
    iconUrl: 'https://media.tikoapi.org/v1/media/eecf2917-a885-4025-a762-9c7a8783f5af/image/medium',
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
    momentImage: 'alphabetBlocks',
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
    iconUrl: 'https://media.tikoapi.org/v1/media/e37943b4-582c-40ee-be3a-c47be7c6e658/image/medium',
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
    momentImage: 'todoList',
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
    iconUrl: 'https://media.tikoapi.org/v1/media/c2e7188c-1ac4-41d6-a29c-2b122ec812e8/image/medium',
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
    momentImage: 'alarmClock',
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
    iconUrl: 'https://media.tikoapi.org/v1/media/ec6bad5e-8cbe-4934-b1c8-d66d80098f95/image/medium',
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
    momentImage: 'adultAndChildTalking',
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
    iconUrl: 'https://media.tikoapi.org/v1/media/da85b30b-6865-41ef-9b75-71e46999de22/image/medium',
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
  },
  {
    slug: 'say',
    momentImage: 'adultAndGirlPractising',
    appName: 'Say',
    shortSummary: 'See a card, hear the word, say it back, celebrate.',
    headline: 'Calm speech practice, one word at a time.',
    description: 'Say is a speech-practice app for children. Pick a category, see one big friendly card, hear its word, and say it back. A correct word triggers a joyful celebration and the next card appears by itself.',
    route: '/apps/say',
    appStoreUrl: 'https://apps.apple.com/app/id6794481329',
    status: 'available',
    availability: 'available',
    platformNotes: 'On the App Store for iPhone and iPad now. Android and web will follow the same calm, focused experience.',
    color: '#8b5cf6',
    colorLight: '#ede9fe',
    appIcon: 'ui/microphone',
    iconUrl: 'https://data.tikocdn.org/uploads/1781443432968-speech-balloon.png',
    useWhen: [
      'a child is practising their first words',
      'a missed word should mean another calm try, not a buzzer',
      'a familiar picture makes the word easier to reach for'
    ],
    moment: 'Practising a word should feel like being cheered on, never like being tested.',
    whySmall: 'Say practises words. It is not a therapy programme, a progress dashboard, or a scoring system — there is no wrong-buzzer, no red cross, and no score anywhere in it.',
    calmDetail: 'One big card at a time, the word spoken in a friendly voice, and Skip always within reach so no child ever gets stuck.',
    features: [
      { title: 'Six picture categories', body: 'Animals, Food, Vehicles, Body, Colors and Numbers, ready to practise.' },
      { title: 'Every card editable', body: 'What is shown, what is said, and which words count as correct are all yours to change.' },
      { title: 'On-device listening', body: 'Speech recognition runs on the device where supported. Recordings are never stored or uploaded.' },
      { title: 'Six spoken languages', body: 'Speaks and listens in English, Dutch, French, Spanish, German and Maltese.' }
    ],
    screenshots: [
      { light: '/screenshots/say-home-light.webp', dark: '/screenshots/say-home-dark.webp', caption: 'Pick a category' },
      { light: '/screenshots/say-practice-light.webp', dark: '/screenshots/say-practice-dark.webp', caption: 'One card, one word' }
    ]
  },
  {
    slug: 'sum',
    momentImage: 'calculator',
    appName: 'Sum',
    shortSummary: 'Math that talks — and never says "wrong".',
    headline: 'Every number spoken. Every answer a choice.',
    description: 'Sum is a talking math app for children, and it is not a calculator: it never shows the result. Every key is spoken aloud, and the answer is always a choice between three big tiles.',
    route: '/apps/sum',
    appStoreUrl: 'https://apps.apple.com/app/id6794587838',
    status: 'available',
    availability: 'available',
    platformNotes: 'On the App Store for iPhone and iPad now. Android and web will follow the same calm, focused experience.',
    color: '#dd8966',
    colorLight: '#fbeae1',
    appIcon: 'ui/calculator',
    iconUrl: 'https://data.tikocdn.org/uploads/1755105954065-calculator.png',
    useWhen: [
      'counting and sums should be heard, not just seen',
      'a wrong tap should mean hearing the sum again, not a buzzer',
      'a parent wants to cap how big the numbers get'
    ],
    moment: 'A sum is easier to hold on to when you can hear it — "three… plus… five…" — instead of reading it off a screen.',
    whySmall: 'Sum teaches one sum at a time. It is not a curriculum, a streak tracker, or a report card.',
    calmDetail: 'Pick the right tile and the screen celebrates; pick another and Sum simply says the formula again. No buzzer, no red cross, no pressure.',
    features: [
      { title: 'A speaking keypad', body: 'Every number and symbol is read aloud in the child\'s language.' },
      { title: 'The answer is a choice', body: 'Three tiles — one right, two clever look-alikes. Never a blank box to fail at.' },
      { title: 'All four operators', body: 'Plus, minus, times and divide, with a maximum number a parent can cap.' },
      { title: 'Three ways to answer', body: 'Pick a tile, type the number, or say it aloud. Only the last one ever uses the microphone.' }
    ],
    screenshots: [
      { light: '/screenshots/sum-home-light.webp', dark: '/screenshots/sum-home-dark.webp', caption: 'Choose a difficulty' },
      { light: '/screenshots/sum-practice-light.webp', dark: '/screenshots/sum-practice-dark.webp', caption: 'Three tiles, one right' },
      { light: '/screenshots/sum-keypad-light.webp', dark: '/screenshots/sum-keypad-dark.webp', caption: 'The speaking keypad' }
    ]
  },
  {
    slug: 'first',
    momentImage: 'childReading',
    appName: 'First',
    shortSummary: 'First, then, done. A picture routine that talks.',
    headline: 'One step at a time, spoken aloud.',
    description: 'First turns a routine into pictures a child can follow on their own. You build the steps; your child sees one big picture at a time, hears it spoken aloud, and taps to cross it off.',
    route: '/apps/first',
    appStoreUrl: 'https://apps.apple.com/app/id6794608348',
    status: 'available',
    availability: 'available',
    platformNotes: 'On the App Store for iPhone and iPad now. Android and web will follow the same calm, focused experience.',
    color: '#06b6d4',
    colorLight: '#cffafe',
    appIcon: 'ui/check-list',
    iconUrl: 'https://data.tikocdn.org/uploads/1754413862502-todo.png',
    useWhen: [
      'a routine needs to be followed without an adult narrating it',
      'a child should see what happens now and what comes next',
      'no microphone, camera, or permission prompt is wanted at all'
    ],
    moment: 'A routine stops being a negotiation when the next step is already on the screen instead of in someone else\'s head.',
    whySmall: 'First shows the step a child is on. It is not a planner, a clock, or a behaviour chart — there are no timers and no scores.',
    calmDetail: 'Steps are crossed off in order, tapping ahead only speaks that step aloud, and the last tick can always be undone.',
    features: [
      { title: 'One big step at a time', body: 'A picture, a short title, spoken in the child\'s language as it becomes current.' },
      { title: 'Eight ready routines', body: 'Morning, bedtime, going out, mealtime, bath time, tidy up, school day, and a first/then board.' },
      { title: 'Your words, your pictures', body: 'Every routine and step is editable — including photos of the child\'s own shoes or bag.' },
      { title: 'No permissions at all', body: 'No microphone, no camera, no ads, no accounts. Works offline after first use.' }
    ],
    screenshots: [
      { light: '/screenshots/first-home-light.webp', dark: '/screenshots/first-home-dark.webp', caption: 'Pick a routine' },
      { light: '/screenshots/first-routine-light.webp', dark: '/screenshots/first-routine-dark.webp', caption: 'One step, full screen' },
      { light: '/screenshots/first-celebrate-light.webp', dark: '/screenshots/first-celebrate-dark.webp', caption: 'Finishing the routine' }
    ]
  }
] as const satisfies readonly TikoWebsiteAppMetadata[]

export const tikoApps = tikoWebsiteAppUniverse.map((app: TikoWebsiteAppMetadata) => ({
  id: app.slug,
  name: app.appName,
  headline: app.headline,
  description: app.description,
  path: app.route,
  appUrl: app.appUrl,
  appStoreUrl: app.appStoreUrl,
  // Use the canonical Tiko app colors generated by @sil/ui (--color-{slug} +
  // auto readable -text), not divergent local hex. Light tint aliased in styles.
  color: `var(--color-${app.slug})`,
  colorLight: `var(--app-${app.slug}-light)`,
  colorText: `var(--color-${app.slug}-text)`,
  appIcon: app.appIcon,
  iconUrl: app.iconUrl,
  status: app.status,
  statusLabel: app.status === 'available' ? 'Available' : 'Planned',
  summary: app.shortSummary,
  platformNotes: app.platformNotes,
  useWhen: [...app.useWhen],
  moment: app.moment,
  whySmall: app.whySmall,
  calmDetail: app.calmDetail,
  features: [...app.features],
  screenshots: app.screenshots ? [...app.screenshots] : [],
  momentImage: app.momentImage
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
