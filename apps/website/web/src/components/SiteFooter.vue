<script setup lang="ts">
import { computed } from 'vue'
import { SiteFooter, type SiteFooterColumn, type SiteFooterLink } from '@tiko/site'
import { tikoApps } from '../content/appUniverse'
import { useCopy } from '../i18n'

// The chrome itself lives in @tiko/site. This wrapper owns only the website's
// footer content, and takes its labels from the active locale.
const copy = useCopy()

const columns = computed<SiteFooterColumn[]>(() => [
  {
    label: copy.value.footer.columnApps,
    links: tikoApps.map((app) => ({
      // App names are product names — not translated.
      label: app.name,
      path: app.path,
      available: app.status === 'available',
    })),
  },
  {
    label: copy.value.footer.columnPlatform,
    links: [
      { label: copy.value.nav.whyTiko, path: '/why-tiko' },
      { label: copy.value.nav.howItWorks, path: '/how-it-works' },
      { label: copy.value.footer.documentation, path: '/docs' },
      { label: copy.value.footer.architecture, path: '/docs/architecture' },
      { label: copy.value.footer.apiContracts, path: '/docs/apis' },
    ],
  },
  {
    label: copy.value.footer.columnCaregivers,
    ariaLabel: copy.value.footer.columnCaregivers,
    links: [
      { label: copy.value.nav.educators, path: '/educators' },
      { label: copy.value.footer.trustPrinciples, path: '/caregivers' },
      { label: copy.value.nav.faq, path: '/faq' },
      { label: copy.value.nav.support, path: '/support' },
      { label: copy.value.footer.philosophy, path: '/docs/philosophy' },
    ],
  },
])

const legalLinks = computed<SiteFooterLink[]>(() => [
  { label: copy.value.nav.privacy, path: '/privacy-policy' },
  { label: copy.value.nav.support, path: '/support' },
])
</script>

<template>
  <SiteFooter
    :columns="columns"
    :legal-links="legalLinks"
    :tagline="copy.footer.tagline"
    copyright="© 2026 TikoTalks"
  />
</template>
