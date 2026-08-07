<script setup lang="ts">
import { computed } from 'vue'
import { useCopy } from '../i18n'
import ContentArticle from '../components/sections/ContentArticle.vue'

/**
 * The page is now entirely content-driven: everything it says lives in
 * `i18n/copy/<locale>` and is rendered by `ContentArticle`, so adding a
 * language never means touching a page component.
 */
const copy = useCopy()
const page = computed(() => copy.value.pages.support)
</script>

<template>
  <ContentArticle :page="page" />
</template>
