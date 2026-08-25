import type { SiteCopyOverride } from '../..'
import { ptPages } from './pages'
import { ptAudiencePages } from './pages-audience'
import { ptHome } from './home'
import { ptApps, ptAppsPage, ptAppDetail, ptNotFound } from './apps'
import { ptDocs } from './docs'
import { ptPrivacy } from './privacy'

/** Portuguese website copy — the whole site. */
export const pt: SiteCopyOverride = {
  ...({
  "common": {
    "skipToContent": "Ir para o conteúdo",
    "languageLabel": "Idioma",
    "chooseLanguage": "Escolher idioma",
    "themeLabel": "Mudar tema",
    "exploreApps": "Ver as apps",
    "openOnWeb": "Abrir no navegador",
    "downloadAppStore": "Descarregar na App Store",
    "downloadOnCaption": "Transferir na",
    "learnMore": "Saber mais",
    "backToApps": "Todas as apps",
    "available": "Disponível",
    "planned": "Planeado",
    "web": "Web",
    "appStore": "App Store",
    "partiallyTranslated": "Este idioma ainda não está totalmente traduzido — o texto não traduzido permanece em inglês."
  },
  "nav": {
    "apps": "Apps",
    "whyTiko": "Porquê o Tiko",
    "howItWorks": "Como funciona",
    "educators": "Educadores",
    "caregivers": "Cuidadores",
    "docs": "Docs",
    "faq": "Perguntas frequentes",
    "support": "Apoio",
    "privacy": "Privacidade",
    "home": "Início"
  },
  "footer": {
    "tagline": "Apps pequenas. Todos os idiomas. Sem anúncios. Nunca.",
    "columnApps": "Apps",
    "columnPlatform": "Plataforma",
    "columnCaregivers": "Cuidadores",
    "documentation": "Documentação",
    "architecture": "Arquitetura",
    "apiContracts": "Contratos de API",
    "trustPrinciples": "Os nossos princípios",
    "philosophy": "Filosofia"
  }
} as SiteCopyOverride),
  meta: {
    home: 'TikoTalks — Aplicações bonitas e gratuitas de educação e comunicação para todas as crianças',
    apps: 'Aplicações',
    docs: 'Docs',
    notFound: 'Página não encontrada',
  },
  home: ptHome,
  appsPage: ptAppsPage,
  appDetail: ptAppDetail,
  notFound: ptNotFound,
  apps: ptApps,
  docs: ptDocs,
  privacy: ptPrivacy,
  pages: { ...ptPages, ...ptAudiencePages },
}
