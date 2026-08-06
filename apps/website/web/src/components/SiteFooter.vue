<script setup lang="ts">
import { computed } from 'vue'
import { SiteFooter, type SiteFooterColumn, type SiteFooterLink } from '@tiko/site'
import { tikoApps } from '../content/appUniverse'

// The chrome itself lives in @tiko/site. This wrapper owns only the website's
// footer content.
const columns = computed<SiteFooterColumn[]>(() => [
  {
    label: 'Apps',
    links: tikoApps.map((app) => ({
      label: app.name,
      path: app.path,
      available: app.status === 'available',
    })),
  },
  {
    label: 'Platform',
    links: [
      { label: 'Why Tiko', path: '/why-tiko' },
      { label: 'How it works', path: '/how-it-works' },
      { label: 'Documentation', path: '/docs' },
      { label: 'Architecture', path: '/docs/architecture' },
      { label: 'API contracts', path: '/docs/apis' },
    ],
  },
  {
    label: 'Caregivers',
    ariaLabel: 'For caregivers',
    links: [
      { label: 'For educators', path: '/educators' },
      { label: 'Trust principles', path: '/caregivers' },
      { label: 'FAQ', path: '/faq' },
      { label: 'Support', path: '/support' },
      { label: 'Philosophy', path: '/docs/philosophy' },
    ],
  },
])

const legalLinks: SiteFooterLink[] = [
  { label: 'Privacy policy', path: '/privacy-policy' },
  { label: 'Support', path: '/support' },
]
</script>

<template>
  <SiteFooter
    :columns="columns"
    :legal-links="legalLinks"
    tagline="Tiny apps. Every language. No ads. Ever."
    copyright="© 2026 TikoTalks"
  />
</template>
