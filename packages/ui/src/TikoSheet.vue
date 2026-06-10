<script setup lang="ts">
import { useBemm } from 'bemm'

withDefaults(defineProps<{
  title: string
  icon?: string
}>(), {
  icon: '',
})

const bemm = useBemm('tiko-sheet', { return: 'string', includeBaseClass: true })
</script>

<template>
  <section :class="bemm('')">
    <header :class="bemm('header')">
      <span v-if="icon" :class="bemm('icon')" aria-hidden="true">{{ icon }}</span>
      <h2 :class="bemm('title')">{{ title }}</h2>
    </header>
    <div :class="bemm('body')">
      <slot />
    </div>
    <footer v-if="$slots.footer" :class="bemm('footer')">
      <slot name="footer" />
    </footer>
  </section>
</template>
