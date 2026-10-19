import type { SiteCopyOverride } from '../..'
import { itPages } from './pages'
import { itAudiencePages } from './pages-audience'
import { itHome } from './home'
import { itApps, itAppsPage, itAppDetail, itNotFound } from './apps'
import { itDocs } from './docs'
import { itPrivacy } from './privacy'

/** Italian website copy — the whole site. */
export const it: SiteCopyOverride = {
  ...({
  "common": {
    "skipToContent": "Vai al contenuto",
    "languageLabel": "Lingua",
    "chooseLanguage": "Scegli una lingua",
    "themeLabel": "Cambia tema",
    "exploreApps": "Scopri le app",
    "openOnWeb": "Apri nel browser",
    "downloadAppStore": "Scarica sull'App Store",
    "downloadOnCaption": "Scaricala su",
    "learnMore": "Scopri di più",
    "backToApps": "Tutte le app",
    "available": "Disponibile",
    "planned": "In arrivo",
    "web": "Web",
    "appStore": "App Store",
    "partiallyTranslated": "Questa lingua non è ancora tradotta del tutto — il testo non tradotto resta in inglese."
  },
  "nav": {
    "apps": "App",
    "whyTiko": "Perché Tiko",
    "howItWorks": "Come funziona",
    "educators": "Insegnanti",
    "caregivers": "Chi assiste",
    "docs": "Docs",
    "faq": "Domande frequenti",
    "support": "Assistenza",
    "privacy": "Privacy",
    "home": "Home"
  },
  "footer": {
    "tagline": "App piccole. Ogni lingua. Nessuna pubblicità. Mai.",
    "columnApps": "App",
    "columnPlatform": "Piattaforma",
    "columnCaregivers": "Chi assiste",
    "documentation": "Documentazione",
    "architecture": "Architettura",
    "apiContracts": "Contratti API",
    "trustPrinciples": "I nostri principi",
    "philosophy": "Filosofia"
  }
} as SiteCopyOverride),
  meta: {
    home: 'TikoTalks — Belle app gratuite di educazione e comunicazione per ogni bambino',
    apps: 'App',
    docs: 'Docs',
    notFound: 'Pagina non trovata',
  },
  home: itHome,
  appsPage: itAppsPage,
  appDetail: itAppDetail,
  notFound: itNotFound,
  apps: itApps,
  docs: itDocs,
  privacy: itPrivacy,
  pages: { ...itPages, ...itAudiencePages },
}
