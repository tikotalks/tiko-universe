import type { SiteCopyOverride } from '../..'
import { nlPages } from './pages'
import { nlAudiencePages } from './pages-audience'
import { nlHome } from './home'
import { nlApps, nlAppsPage, nlAppDetail, nlNotFound } from './apps'
import { nlDocs } from './docs'
import { nlPrivacy } from './privacy'

/** Dutch website copy — the whole site. */
export const nl: SiteCopyOverride = {
  ...({
  "common": {
    "skipToContent": "Naar de inhoud",
    "languageLabel": "Taal",
    "chooseLanguage": "Kies een taal",
    "themeLabel": "Thema wisselen",
    "exploreApps": "Bekijk de apps",
    "openOnWeb": "Openen in de browser",
    "downloadAppStore": "Download in de App Store",
    "downloadOnCaption": "Download in de",
    "learnMore": "Meer lezen",
    "backToApps": "Alle apps",
    "available": "Beschikbaar",
    "planned": "Gepland",
    "web": "Web",
    "appStore": "App Store",
    "partiallyTranslated": "Deze taal is nog niet volledig vertaald — niet-vertaalde tekst blijft in het Engels."
  },
  "nav": {
    "apps": "Apps",
    "whyTiko": "Waarom Tiko",
    "howItWorks": "Hoe het werkt",
    "educators": "Onderwijs",
    "caregivers": "Verzorgers",
    "docs": "Docs",
    "faq": "Veelgestelde vragen",
    "support": "Support",
    "privacy": "Privacybeleid",
    "home": "Home"
  },
  "footer": {
    "tagline": "Kleine apps. Elke taal. Geen advertenties. Nooit.",
    "columnApps": "Apps",
    "columnPlatform": "Platform",
    "columnCaregivers": "Verzorgers",
    "documentation": "Documentatie",
    "architecture": "Architectuur",
    "apiContracts": "API-contracten",
    "trustPrinciples": "Uitgangspunten",
    "philosophy": "Filosofie"
  }
} as SiteCopyOverride),
  meta: {
    home: 'TikoTalks — Mooie, gratis apps voor onderwijs en communicatie, voor elk kind',
    apps: 'Apps',
    docs: 'Docs',
    notFound: 'Pagina niet gevonden',
  },
  home: nlHome,
  appsPage: nlAppsPage,
  appDetail: nlAppDetail,
  notFound: nlNotFound,
  apps: nlApps,
  docs: nlDocs,
  privacy: nlPrivacy,
  pages: { ...nlPages, ...nlAudiencePages },
}
