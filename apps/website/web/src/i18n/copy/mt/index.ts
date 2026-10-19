import type { SiteCopyOverride } from '../..'
import { mtPages } from './pages'
import { mtAudiencePages } from './pages-audience'
import { mtHome } from './home'
import { mtApps, mtAppsPage, mtAppDetail, mtNotFound } from './apps'
import { mtDocs } from './docs'
import { mtPrivacy } from './privacy'

/**
 * Maltese website copy — the whole site.
 *
 * NOTE: this translation is a best effort and has NOT been reviewed by a native
 * Maltese speaker. Maltese is a small language with little reliable reference
 * material, and this is a product for children who already struggle to be
 * understood — a clumsy translation is worse here than an honest English
 * fallback. Please have it checked before treating it as done.
 *
 * `downloadOnCaption` deliberately stays English: Apple does not publish a
 * Maltese App Store badge, and inventing one would misuse their lockup.
 */
export const mt: SiteCopyOverride = {
  ...({
  "common": {
    "skipToContent": "Mur għall-kontenut",
    "languageLabel": "Lingwa",
    "chooseLanguage": "Agħżel lingwa",
    "themeLabel": "Ibdel it-tema",
    "exploreApps": "Ara l-apps",
    "openOnWeb": "Iftaħ fuq il-web",
    "downloadAppStore": "Niżżel mill-App Store",
    "downloadOnCaption": "Download on the",
    "learnMore": "Kun af aktar",
    "backToApps": "L-apps kollha",
    "available": "Disponibbli",
    "planned": "Ippjanat",
    "web": "Web",
    "appStore": "App Store",
    "partiallyTranslated": "Din il-lingwa għadha mhijiex tradotta kollha — it-test mhux tradott jibqa' bl-Ingliż."
  },
  "nav": {
    "apps": "Apps",
    "whyTiko": "Għaliex Tiko",
    "howItWorks": "Kif jaħdem",
    "educators": "Għalliema",
    "caregivers": "Min jieħu ħsieb",
    "docs": "Docs",
    "faq": "Mistoqsijiet frekwenti",
    "support": "Għajnuna",
    "privacy": "Privatezza",
    "home": "Home"
  },
  "footer": {
    "tagline": "Apps żgħar. Kull lingwa. Bla reklami. Qatt.",
    "columnApps": "Apps",
    "columnPlatform": "Pjattaforma",
    "columnCaregivers": "Min jieħu ħsieb",
    "documentation": "Dokumentazzjoni",
    "architecture": "Arkitettura",
    "apiContracts": "Kuntratti API",
    "trustPrinciples": "Il-prinċipji tagħna",
    "philosophy": "Filosofija"
  }
} as SiteCopyOverride),
  meta: {
    home: 'TikoTalks — Apps sbieħ u bla ħlas tal-edukazzjoni u l-komunikazzjoni għal kull tifel',
    apps: 'Apps',
    docs: 'Docs',
    notFound: 'Il-paġna ma nstabitx',
  },
  home: mtHome,
  appsPage: mtAppsPage,
  appDetail: mtAppDetail,
  notFound: mtNotFound,
  apps: mtApps,
  docs: mtDocs,
  privacy: mtPrivacy,
  pages: { ...mtPages, ...mtAudiencePages },
}
