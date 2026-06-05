<template>
  <section class="talk-template-picker" aria-label="Templates">
    <h2>{{ title }}</h2>
    <div v-if="templates.length" class="talk-template-picker__list">
      <button
        v-for="template in templates"
        :key="template.id"
        class="talk-template-picker__item"
        type="button"
        @click="$emit('select', template)"
      >
        <span aria-hidden="true">{{ template.icon ?? 'template' }}</span>
        <strong>{{ template.pattern }}</strong>
      </button>
    </div>
    <p v-else class="talk-template-picker__empty">{{ emptyLabel }}</p>
  </section>
</template>

<script setup lang="ts">
import type { Template } from '@tiko/talk-types'

withDefaults(defineProps<{
  title?: string
  emptyLabel?: string
  templates: Template[]
}>(), {
  title: 'Sentence starters',
  emptyLabel: 'No starters available yet.',
})

defineEmits<{
  select: [template: Template]
}>()
</script>
