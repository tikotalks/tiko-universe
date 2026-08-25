<script setup lang="ts">
import { computed } from 'vue'
import { SiteHeader, type SiteNavLink } from '@tiko/site'
import { useCopy } from '../i18n'
import LanguageSwitcher from './LanguageSwitcher.vue'

// The chrome itself lives in @tiko/site so media.tikoapps.org renders the same header.
// This wrapper owns only the website's navigation content and its language picker.
const copy = useCopy()

const navLinks = computed<SiteNavLink[]>(() => [
  { label: copy.value.nav.apps, path: '/apps' },
  { label: copy.value.nav.whyTiko, path: '/why-tiko' },
  { label: copy.value.nav.howItWorks, path: '/how-it-works' },
  { label: copy.value.nav.educators, path: '/educators' },
  { label: copy.value.nav.caregivers, path: '/caregivers' },
  { label: copy.value.nav.docs, path: '/docs' },
])
</script>

<template>
  <SiteHeader :links="navLinks">
    <template #actions>
      <LanguageSwitcher />
    </template>
  </SiteHeader>
</template>
