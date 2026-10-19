import type { SiteCopyOverride } from '../..'
import { esPages } from './pages'
import { esAudiencePages } from './pages-audience'
import { esHome } from './home'
import { esApps, esAppsPage, esAppDetail, esNotFound } from './apps'
import { esDocs } from './docs'
import { esPrivacy } from './privacy'

/** Spanish website copy — the whole site. */
export const es: SiteCopyOverride = {
  ...({
  "common": {
    "skipToContent": "Ir al contenido",
    "languageLabel": "Idioma",
    "chooseLanguage": "Elegir idioma",
    "themeLabel": "Cambiar tema",
    "exploreApps": "Ver las apps",
    "openOnWeb": "Abrir en el navegador",
    "downloadAppStore": "Descargar en el App Store",
    "downloadOnCaption": "Consíguelo en el",
    "learnMore": "Saber más",
    "backToApps": "Todas las apps",
    "available": "Disponible",
    "planned": "Previsto",
    "web": "Web",
    "appStore": "App Store",
    "partiallyTranslated": "Este idioma aún no está traducido por completo — el texto sin traducir permanece en inglés."
  },
  "nav": {
    "apps": "Apps",
    "whyTiko": "Por qué Tiko",
    "howItWorks": "Cómo funciona",
    "educators": "Docentes",
    "caregivers": "Cuidadores",
    "docs": "Docs",
    "faq": "Preguntas frecuentes",
    "support": "Soporte",
    "privacy": "Privacidad",
    "home": "Inicio"
  },
  "footer": {
    "tagline": "Apps pequeñas. Todos los idiomas. Sin anuncios. Nunca.",
    "columnApps": "Apps",
    "columnPlatform": "Plataforma",
    "columnCaregivers": "Cuidadores",
    "documentation": "Documentación",
    "architecture": "Arquitectura",
    "apiContracts": "Contratos de API",
    "trustPrinciples": "Nuestros principios",
    "philosophy": "Filosofía"
  }
} as SiteCopyOverride),
  meta: {
    home: 'TikoTalks — Apps preciosas y gratuitas de educación y comunicación para cada niño',
    apps: 'Apps',
    docs: 'Docs',
    notFound: 'Página no encontrada',
  },
  home: esHome,
  appsPage: esAppsPage,
  appDetail: esAppDetail,
  notFound: esNotFound,
  apps: esApps,
  docs: esDocs,
  privacy: esPrivacy,
  pages: { ...esPages, ...esAudiencePages },
}
