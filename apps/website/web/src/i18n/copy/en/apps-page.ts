/**
 * The app surfaces: the `/apps` index, an app's own detail page, and the 404
 * that offers the apps as a way out.
 *
 * Only the frame lives here. Each app's own prose is in `apps.ts`, keyed by
 * slug, so a locale can translate one app without touching the others.
 */
export const appsPageEn = {
  intro: {
    eyebrow: 'The app universe',
    title: 'Tiny apps. One clear job each.',
    lede: 'Tiko is not one giant app. It is a set of small, focused tools that open immediately and do one thing well. Pick the one that fits the moment.',
  },

  media: {
    eyebrow: 'From the Tiko library',
    title: 'Thousands of clear, colourful images.',
  },

  onTheWay: {
    eyebrow: 'On the way',
    title: 'More tiny apps are coming.',
    lede: 'Cards, Sequence, and Timer are built around the same child-first contracts as the apps above. Each one opens fast and does one thing only.',
    ctaTitle: 'Built on the same contracts.',
    ctaBody: 'Every Tiko app follows the same child-first promises — open fast, do one thing, speak any language.',
    ctaLabel: 'Read the architecture docs',
  },
} as const

export const appDetailEn = {
  notFound: {
    eyebrow: 'Not found',
    title: 'App not found.',
    body: 'There is no Tiko app with that name.',
    backLabel: 'Back to all apps',
  },

  hero: {
    /** Rendered as "Tiko · Available". */
    brandPrefix: 'Tiko',
    /** `{app}` is replaced with the app's name, which is never translated. */
    openLabel: 'Open {app}',
    comingSoon: 'Coming soon',
    iconAlt: '{app} app icon',
  },

  features: {
    eyebrow: 'What it does',
    title: 'Built for one clear job.',
  },

  screenshots: {
    eyebrow: 'On the device',
    title: '{app}, on a real screen.',
    lede: 'Captured on an iPhone, in both light and dark mode. Nothing here is a mockup.',
  },

  moment: {
    eyebrow: 'The human moment',
    imageAlt: 'A calm {app} moment',
    whySmallTitle: 'Why it stays small',
    calmTitle: 'How it stays calm',
  },

  useWhen: {
    eyebrow: 'Use cases',
    title: 'When to reach for {app}',
  },

  cta: {
    openWeb: 'Open now on the web.',
    onAppStore: 'On the App Store now.',
    comingSoon: 'Coming soon.',
    allAppsLabel: 'All apps',
  },

  /** Only Cards has a media library section today. */
  mediaLibrary: {
    eyebrow: 'Built-in image library',
    title: 'Tiko Media images, ready for Cards.',
    lede: 'Cards can start with clear, recognizable images from Tiko Media. Browse the public library or use them directly inside card sets.',
    browseLabel: 'Browse Tiko Media',
    fallbackImageTitle: 'Tiko Media image',
  },

  /** Screen-reader label on an App Store badge. */
  downloadLabel: 'Download {app} on the App Store',
} as const

export const notFoundEn = {
  eyebrow: 'Page not found',
  title: 'That page isn’t here.',
  lede: 'The link may be old, or the page may have moved. Every Tiko app is one tap away below.',
  primaryLabel: 'Explore the apps',
  secondaryLabel: 'Back to the homepage',
  appsEyebrow: 'Open now',
  appsTitle: 'Apps you can use today.',
} as const
