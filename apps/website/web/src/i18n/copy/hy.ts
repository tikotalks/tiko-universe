import type { SiteCopyOverride } from '..'

/**
 * Armenian website copy.
 *
 * Only the chrome is translated so far; the long-form page copy still falls
 * back to English leaf by leaf, which is what `overlayCopy` is for.
 */
//
// NOTE: these strings have NOT been reviewed by a native Armenian speaker.
// Armenian has its own script and grammar that machine translation handles
// unevenly, and this is a product for children who already struggle to be
// understood — a clumsy translation is worse here than an honest English
// fallback. Please have these checked before relying on them.
//
export const hy: SiteCopyOverride = {
  common: {
    skipToContent: 'Անցնել բովանդակությանը',
    languageLabel: 'Լեզու',
    chooseLanguage: 'Ընտրեք լեզուն',
    themeLabel: 'Փոխել տեսքը',
    exploreApps: 'Դիտել հավելվածները',
    openOnWeb: 'Բացել վեբում',
    downloadAppStore: 'Ներբեռնել App Store-ից',
    learnMore: 'Իմանալ ավելին',
    backToApps: 'Բոլոր հավելվածները',
    available: 'Հասանելի է',
    planned: 'Ծրագրված է',
    web: 'Վեբ',
    appStore: 'App Store',
    partiallyTranslated:
      'Այս լեզուն դեռ ամբողջությամբ թարգմանված չէ — չթարգմանված տեքստը մնում է անգլերեն։',
  },
  nav: {
    apps: 'Հավելվածներ',
    whyTiko: 'Ինչու Tiko',
    howItWorks: 'Ինչպես է աշխատում',
    educators: 'Մանկավարժներ',
    caregivers: 'Խնամողներ',
    docs: 'Փաստաթղթեր',
    faq: 'Հաճախակի հարցեր',
    support: 'Աջակցություն',
    privacy: 'Գաղտնիության քաղաքականություն',
    home: 'Գլխավոր',
  },
  footer: {
    tagline: 'Փոքր հավելվածներ։ Ամեն լեզվով։ Առանց գովազդի։ Երբեք։',
    columnApps: 'Հավելվածներ',
    columnPlatform: 'Հարթակ',
    columnCaregivers: 'Խնամողներ',
    documentation: 'Փաստաթղթեր',
    architecture: 'Ճարտարապետություն',
    apiContracts: 'API պայմանագրեր',
    trustPrinciples: 'Մեր սկզբունքները',
    philosophy: 'Փիլիսոփայություն',
  },
}
