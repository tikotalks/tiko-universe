<script setup lang="ts">
import { RouterView, useRoute } from 'vue-router'
import { watchEffect } from 'vue'
import SiteHeader from './components/SiteHeader.vue'
import SiteFooter from './components/SiteFooter.vue'

const route = useRoute()

watchEffect(() => {
  if (typeof document === 'undefined') return
  const titles: Record<string, string> = {
    '/': 'TikoTalks — Beautiful free communication apps for every child',
    '/why-tiko': 'Why Tiko exists — TikoTalks',
    '/apps': 'Apps — TikoTalks',
    '/how-it-works': 'How it works — TikoTalks',
    '/caregivers': 'For caregivers — TikoTalks',
    '/educators': 'For educators — TikoTalks',
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
