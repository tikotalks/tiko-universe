import type { SiteCopyOverride } from '../..'
import { hyPages } from './pages'
import { hyAudiencePages } from './pages-audience'
import { hyHome } from './home'
import { hyApps, hyAppsPage, hyAppDetail, hyNotFound } from './apps'
import { hyDocs } from './docs'
import { hyPrivacy } from './privacy'

/**
 * Armenian website copy — the whole site.
 *
 * NOTE: these strings have NOT been reviewed by a native Armenian speaker.
 * Armenian has its own script and grammar that machine translation handles
 * unevenly, and this is a product for children who already struggle to be
 * understood — a clumsy translation is worse here than an honest English
 * fallback. Please have them checked before treating them as done.
 *
 * `downloadOnCaption` deliberately stays English: Apple does not publish an
 * Armenian App Store badge, and inventing one would misuse their lockup.
 */
export const hy: SiteCopyOverride = {
  ...({
  common: {
    skipToContent: 'Անցնել բովանդակությանը',
    languageLabel: 'Լեզու',
    chooseLanguage: 'Ընտրեք լեզուն',
    themeLabel: 'Փոխել տեսքը',
    exploreApps: 'Դիտել հավելվածները',
    openOnWeb: 'Բացել վեբում',
    downloadAppStore: 'Ներբեռնել App Store-ից',
    downloadOnCaption: 'Download on the',
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
} as SiteCopyOverride),
  meta: {
    home: 'TikoTalks — Գեղեցիկ, անվճար կրթական և հաղորդակցման հավելվածներ ամեն երեխայի համար',
    apps: 'Հավելվածներ',
    docs: 'Docs',
    notFound: 'Էջը չի գտնվել',
  },
  home: hyHome,
  appsPage: hyAppsPage,
  appDetail: hyAppDetail,
  notFound: hyNotFound,
  apps: hyApps,
  docs: hyDocs,
  privacy: hyPrivacy,
  pages: { ...hyPages, ...hyAudiencePages },
}
