<script setup lang="ts">
import { RouterView, useRoute } from 'vue-router'
import { watchEffect } from 'vue'
import SiteHeader from './components/SiteHeader.vue'
import SiteFooter from './components/SiteFooter.vue'

const route = useRoute()

watchEffect(() => {
  if (typeof document === 'undefined') return
  const titles: Record<string, string> = {
    '/': 'TikoTalks — Free no-ad support apps',
    '/why-tiko': 'Why Tiko exists — TikoTalks',
    '/apps': 'Apps — TikoTalks',
    '/how-it-works': 'How it works — TikoTalks',
    '/caregivers': 'For caregivers — TikoTalks',
    '/faq': 'FAQ — TikoTalks',
    '/docs': 'Docs — TikoTalks',
  }
  document.title = titles[route.path] ?? 'TikoTalks'
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
