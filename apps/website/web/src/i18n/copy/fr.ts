import type { SiteCopyOverride } from '..'

/**
 * French website copy.
 *
 * Only the chrome is translated so far; the long-form page copy still falls
 * back to English leaf by leaf, which is what `overlayCopy` is for.
 */
export const fr: SiteCopyOverride = {
  "common": {
    "skipToContent": "Aller au contenu",
    "languageLabel": "Langue",
    "chooseLanguage": "Choisir une langue",
    "themeLabel": "Changer de thème",
    "exploreApps": "Découvrir les applis",
    "openOnWeb": "Ouvrir dans le navigateur",
    "downloadAppStore": "Télécharger dans l'App Store",
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
}
