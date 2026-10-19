import type { SiteCopyOverride } from '../..'
import { frPages } from './pages'
import { frAudiencePages } from './pages-audience'
import { frHome } from './home'
import { frApps, frAppsPage, frAppDetail, frNotFound } from './apps'
import { frDocs } from './docs'
import { frPrivacy } from './privacy'

/** French website copy — the whole site. */
export const fr: SiteCopyOverride = {
  ...({
  "common": {
    "skipToContent": "Aller au contenu",
    "languageLabel": "Langue",
    "chooseLanguage": "Choisir une langue",
    "themeLabel": "Changer de thème",
    "exploreApps": "Découvrir les applis",
    "openOnWeb": "Ouvrir dans le navigateur",
    "downloadAppStore": "Télécharger dans l'App Store",
    "downloadOnCaption": "Télécharger dans",
    "learnMore": "En savoir plus",
    "backToApps": "Toutes les applis",
    "available": "Disponible",
    "planned": "Prévu",
    "web": "Web",
    "appStore": "App Store",
    "partiallyTranslated": "Cette langue n'est pas encore entièrement traduite — le texte non traduit reste en anglais."
  },
  "nav": {
    "apps": "Applis",
    "whyTiko": "Pourquoi Tiko",
    "howItWorks": "Comment ça marche",
    "educators": "Enseignants",
    "caregivers": "Accompagnants",
    "docs": "Docs",
    "faq": "Questions fréquentes",
    "support": "Aide",
    "privacy": "Confidentialité",
    "home": "Accueil"
  },
  "footer": {
    "tagline": "De petites applis. Toutes les langues. Aucune publicité. Jamais.",
    "columnApps": "Applis",
    "columnPlatform": "Plateforme",
    "columnCaregivers": "Accompagnants",
    "documentation": "Documentation",
    "architecture": "Architecture",
    "apiContracts": "Contrats API",
    "trustPrinciples": "Nos engagements",
    "philosophy": "Philosophie"
  }
} as SiteCopyOverride),
  meta: {
    home: 'TikoTalks — De belles applis gratuites d’éducation et de communication pour chaque enfant',
    apps: 'Applis',
    docs: 'Docs',
    notFound: 'Page introuvable',
  },
  home: frHome,
  appsPage: frAppsPage,
  appDetail: frAppDetail,
  notFound: frNotFound,
  apps: frApps,
  docs: frDocs,
  privacy: frPrivacy,
  pages: { ...frPages, ...frAudiencePages },
}
