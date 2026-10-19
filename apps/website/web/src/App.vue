<script setup lang="ts">
import { RouterView, useRoute } from 'vue-router'
import { watchEffect } from 'vue'
import SiteHeader from './components/SiteHeader.vue'
import SiteFooter from './components/SiteFooter.vue'
import { docsPages } from './docsContent'
import { tikoApps, type TikoWebsiteAppSlug } from './content/appUniverse'
import { useCopy, useLocaleDocumentEffect } from './i18n'

const SITE_NAME = 'TikoTalks'

const route = useRoute()
const copy = useCopy()

// Keeps <html lang> and <html dir> in step with the chosen language.
useLocaleDocumentEffect()

watchEffect(() => {
  if (typeof document === 'undefined') return
  const c = copy.value
  // Titles come from the same copy the page renders, so a translated page gets
  // a translated title rather than an English one.
  const titles: Record<string, string> = {
    '/': c.meta.home,
    '/why-tiko': `${c.pages.whyTiko.documentTitle} — ${SITE_NAME}`,
    '/apps': `${c.meta.apps} — ${SITE_NAME}`,
    '/how-it-works': `${c.pages.howItWorks.documentTitle} — ${SITE_NAME}`,
    '/caregivers': `${c.pages.caregivers.documentTitle} — ${SITE_NAME}`,
    '/educators': `${c.pages.educators.documentTitle} — ${SITE_NAME}`,
    '/faq': `${c.pages.faq.documentTitle} — ${SITE_NAME}`,
    '/support': `${c.pages.support.documentTitle} — ${SITE_NAME}`,
    '/privacy-policy': `${c.privacy.documentTitle} — ${SITE_NAME}`,
  }
  for (const page of docsPages) {
    titles[page.path] = `${c.docs.pages[page.id].title} — ${SITE_NAME}`
  }

  const descriptions: Record<string, string> = {
    '/why-tiko': c.pages.whyTiko.description,
    '/how-it-works': c.pages.howItWorks.description,
    '/caregivers': c.pages.caregivers.description,
    '/educators': c.pages.educators.description,
    '/faq': c.pages.faq.description,
    '/support': c.pages.support.description,
    '/privacy-policy': c.privacy.description,
    '/': c.home.hero.lede,
    '/apps': c.appsPage.intro.lede,
  }
  for (const page of docsPages) {
    descriptions[page.path] = c.docs.pages[page.id].summary
  }

  // App detail pages carry the app's own name rather than the bare site name.
  const slug = route.params.slug
  const app = typeof slug === 'string' ? tikoApps.find((item) => item.id === slug) : undefined
  const appCopy = app ? c.apps[app.id as TikoWebsiteAppSlug] : undefined

  const known = titles[route.path]
  document.title = known
    ? known
    : app
      ? `${app.name} — ${appCopy?.headline ?? app.headline} — ${SITE_NAME}`
      : SITE_NAME

  // `index.html` ships the English description for the first paint; from here
  // on it follows the language the visitor picked, like the page it describes.
  const description = descriptions[route.path] ?? appCopy?.description ?? app?.description
  if (description) {
    let meta = document.querySelector('meta[name="description"]')
    if (!meta) {
      meta = document.createElement('meta')
      meta.setAttribute('name', 'description')
      document.head.appendChild(meta)
    }
    meta.setAttribute('content', description)
  }
})
</script>

<template>
  <div class="site">
    <SiteHeader />
    <main class="site__main">
      <RouterView />
    </main>
    <SiteFooter />
  </div>
</template>
