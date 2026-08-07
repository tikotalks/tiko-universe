import type { Widen } from '../../resolve'
import { whyTikoEn } from './why-tiko'
import { howItWorksEn } from './how-it-works'
import { caregiversEn } from './caregivers'
import { educatorsEn } from './educators'
import { faqEn } from './faq'
import { supportEn } from './support'

/**
 * English is the source of truth for the website's copy: it defines the shape
 * every other locale overrides, so a missing translation is a typed gap rather
 * than a runtime surprise.
 */
export const en = {
  /** Chrome and repeated labels. */
  common: {
    skipToContent: 'Skip to content',
    languageLabel: 'Language',
    chooseLanguage: 'Choose a language',
    themeLabel: 'Toggle theme',
    exploreApps: 'Explore the apps',
    openOnWeb: 'Open on the web',
    downloadAppStore: 'Download on the App Store',
    learnMore: 'Learn more',
    backToApps: 'All apps',
    available: 'Available',
    planned: 'Planned',
    web: 'Web',
    appStore: 'App Store',
    /** Shown under a language that has no translated copy yet. */
    partiallyTranslated: 'This language is not fully translated yet — untranslated text stays in English.',
  },

  nav: {
    apps: 'Apps',
    whyTiko: 'Why Tiko',
    howItWorks: 'How it works',
    educators: 'Educators',
    caregivers: 'Caregivers',
    docs: 'Docs',
    faq: 'FAQ',
    support: 'Support',
    privacy: 'Privacy policy',
    home: 'Home',
  },

  footer: {
    tagline: 'Tiny apps. Every language. No ads. Ever.',
    columnApps: 'Apps',
    columnPlatform: 'Platform',
    columnCaregivers: 'Caregivers',
    documentation: 'Documentation',
    architecture: 'Architecture',
    apiContracts: 'API contracts',
    trustPrinciples: 'Trust principles',
    philosophy: 'Philosophy',
  },

  /** The content pages. */
  pages: {
    whyTiko: whyTikoEn,
    howItWorks: howItWorksEn,
    caregivers: caregiversEn,
    educators: educatorsEn,
    faq: faqEn,
    support: supportEn,
  },
} as const

/**
 * The copy contract. Keys are exactly English's; values are plain strings, so a
 * locale can supply its own text for any of them.
 */
export type SiteCopy = Widen<typeof en>
