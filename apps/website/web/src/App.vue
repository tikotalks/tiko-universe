<script setup lang="ts">
import { RouterView, useRoute } from 'vue-router'
import { watchEffect } from 'vue'
import SiteHeader from './components/SiteHeader.vue'
import SiteFooter from './components/SiteFooter.vue'
import { getAppBySlug } from './content/appUniverse'

const route = useRoute()

watchEffect(() => {
  if (typeof document === 'undefined') return
  const titles: Record<string, string> = {
    '/': 'TikoTalks — Beautiful free education and communication apps for every child',
    '/why-tiko': 'Why Tiko exists — TikoTalks',
    '/apps': 'Apps — TikoTalks',
    '/how-it-works': 'How it works — TikoTalks',
    '/caregivers': 'For caregivers — TikoTalks',
    '/educators': 'For educators — TikoTalks',
    '/faq': 'FAQ — TikoTalks',
    '/support': 'Support — TikoTalks',
    '/privacy-policy': 'Privacy policy — TikoTalks',
    '/docs': 'Docs — TikoTalks',
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
