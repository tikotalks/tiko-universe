<script setup lang="ts">
import { SiteHeader, type SiteNavLink } from '@tiko/site'

// The chrome itself lives in @tiko/site so media.tikoapps.org renders the same header.
// This wrapper owns only the website's navigation content.
const navLinks: SiteNavLink[] = [
  { label: 'Apps', path: '/apps' },
  { label: 'Why Tiko', path: '/why-tiko' },
  { label: 'How it works', path: '/how-it-works' },
  { label: 'Educators', path: '/educators' },
  { label: 'Caregivers', path: '/caregivers' },
  { label: 'Docs', path: '/docs' },
]
</script>

<template>
  <SiteHeader :links="navLinks" />
</template>
