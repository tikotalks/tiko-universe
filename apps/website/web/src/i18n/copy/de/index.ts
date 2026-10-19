import type { SiteCopyOverride } from '../..'
import { dePages } from './pages'
import { deAudiencePages } from './pages-audience'
import { deHome } from './home'
import { deApps, deAppsPage, deAppDetail, deNotFound } from './apps'
import { deDocs } from './docs'
import { dePrivacy } from './privacy'

/** German website copy — the whole site. */
export const de: SiteCopyOverride = {
  ...({
  "common": {
    "skipToContent": "Zum Inhalt springen",
    "languageLabel": "Sprache",
    "chooseLanguage": "Sprache wählen",
    "themeLabel": "Design wechseln",
    "exploreApps": "Apps entdecken",
    "openOnWeb": "Im Browser öffnen",
    "downloadAppStore": "Im App Store laden",
    "downloadOnCaption": "Laden im",
    "learnMore": "Mehr erfahren",
    "backToApps": "Alle Apps",
    "available": "Verfügbar",
    "planned": "Geplant",
    "web": "Web",
    "appStore": "App Store",
    "partiallyTranslated": "Diese Sprache ist noch nicht vollständig übersetzt — nicht übersetzte Texte bleiben auf Englisch."
  },
  "nav": {
    "apps": "Apps",
    "whyTiko": "Warum Tiko",
    "howItWorks": "So funktioniert es",
    "educators": "Für Lehrkräfte",
    "caregivers": "Für Betreuende",
    "docs": "Docs",
    "faq": "Häufige Fragen",
    "support": "Support",
    "privacy": "Datenschutz",
    "home": "Start"
  },
  "footer": {
    "tagline": "Kleine Apps. Jede Sprache. Keine Werbung. Nie.",
    "columnApps": "Apps",
    "columnPlatform": "Plattform",
    "columnCaregivers": "Betreuende",
    "documentation": "Dokumentation",
    "architecture": "Architektur",
    "apiContracts": "API-Verträge",
    "trustPrinciples": "Grundsätze",
    "philosophy": "Philosophie"
  }
} as SiteCopyOverride),
  meta: {
    home: 'TikoTalks — Schöne, kostenlose Apps für Bildung und Kommunikation, für jedes Kind',
    apps: 'Apps',
    docs: 'Docs',
    notFound: 'Seite nicht gefunden',
  },
  home: deHome,
  appsPage: deAppsPage,
  appDetail: deAppDetail,
  notFound: deNotFound,
  apps: deApps,
  docs: deDocs,
  privacy: dePrivacy,
  pages: { ...dePages, ...deAudiencePages },
}
