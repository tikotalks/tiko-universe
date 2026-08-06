<script setup lang="ts">
import { RouterView } from 'vue-router'
import { SiteHeader, SiteFooter, type SiteFooterColumn, type SiteNavLink } from '@tiko/site'

// Chrome comes from @tiko/site — the same header and footer tikotalks.com renders.
// This file owns only the media surface's own navigation content.
const navLinks: SiteNavLink[] = [
  { label: 'Library', path: '/' },
  { label: 'Browse', path: '/#browse' },
  { label: 'TikoTalks', path: 'https://tikotalks.com', external: true },
]

const footerColumns: SiteFooterColumn[] = [
  {
    label: 'Library',
    links: [
      { label: 'All media', path: '/' },
      { label: 'Browse and search', path: '/#browse' },
    ],
  },
  {
    label: 'TikoTalks',
    links: [
      { label: 'The apps', path: 'https://tikotalks.com/apps', external: true },
      { label: 'How it works', path: 'https://tikotalks.com/how-it-works', external: true },
      { label: 'Documentation', path: 'https://tikotalks.com/docs', external: true },
      { label: 'Support', path: 'https://tikotalks.com/support', external: true },
    ],
  },
]
</script>

<template>
  <div class="site">
    <SiteHeader :links="navLinks" wordmark="Media" home-label="Tiko Media home" />
    <main class="site__main">
      <RouterView />
    </main>
    <SiteFooter
      :columns="footerColumns"
      home-label="Tiko Media home"
      tagline="Every image and sound behind the Tiko apps, in one place."
      copyright="© 2026 TikoTalks"
    />
  </div>
</template>
