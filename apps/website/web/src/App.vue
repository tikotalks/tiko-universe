<script setup lang="ts">
import { RouterView, useRoute } from 'vue-router'
import { watchEffect } from 'vue'
import SiteHeader from './components/SiteHeader.vue'
import SiteFooter from './components/SiteFooter.vue'
import { getAppBySlug } from './content/appUniverse'
import { useCopy, useLocaleDocumentEffect } from './i18n'

const route = useRoute()
const copy = useCopy()

// Keeps <html lang> and <html dir> in step with the chosen language.
useLocaleDocumentEffect()

watchEffect(() => {
  if (typeof document === 'undefined') return
  const pages = copy.value.pages
  // Titles come from the same copy the page renders, so a translated page gets
  // a translated title rather than an English one.
  const titles: Record<string, string> = {
    '/': 'TikoTalks — Beautiful free education and communication apps for every child',
    '/why-tiko': `${pages.whyTiko.documentTitle} — TikoTalks`,
    '/apps': `${copy.value.nav.apps} — TikoTalks`,
    '/how-it-works': `${pages.howItWorks.documentTitle} — TikoTalks`,
    '/caregivers': `${pages.caregivers.documentTitle} — TikoTalks`,
    '/educators': `${pages.educators.documentTitle} — TikoTalks`,
    '/faq': `${pages.faq.documentTitle} — TikoTalks`,
    '/support': `${pages.support.documentTitle} — TikoTalks`,
    '/privacy-policy': `${copy.value.nav.privacy} — TikoTalks`,
    '/docs': `${copy.value.nav.docs} — TikoTalks`,
  }

  const known = titles[route.path]
  if (known) {
    document.title = known
    return
  }

  // App detail pages carry the app's own name rather than the bare site name.
  const slug = route.params.slug
  const app = typeof slug === 'string' ? getAppBySlug(slug) : undefined
  document.title = app ? `${app.name} — ${app.headline} — TikoTalks` : 'TikoTalks'
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
