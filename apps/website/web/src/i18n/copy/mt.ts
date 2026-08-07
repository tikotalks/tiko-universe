import type { SiteCopyOverride } from '..'

/**
 * Maltese website copy.
 *
 * Only the chrome is translated so far; the long-form page copy still falls
 * back to English leaf by leaf, which is what `overlayCopy` is for.
 */
//
// NOTE: the chrome strings below are a best effort and have NOT been reviewed
// by a native Maltese speaker. Maltese is a small language with little reliable
// reference material, and this is a product for children who struggle to be
// understood — a clumsy translation is worse here than an honest English
// fallback. Please have these checked before relying on them.
export const mt: SiteCopyOverride = {
  "common": {
    "skipToContent": "Mur għall-kontenut",
    "languageLabel": "Lingwa",
    "chooseLanguage": "Agħżel lingwa",
    "themeLabel": "Ibdel it-tema",
    "exploreApps": "Ara l-apps",
    "openOnWeb": "Iftaħ fuq il-web",
    "downloadAppStore": "Niżżel mill-App Store",
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
}
