<script setup lang="ts">
import { useBemm } from 'bemm'
import type { Template } from '@tiko/talk-types'

const bemm = useBemm('template-picker', { return: 'string', includeBaseClass: true })

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

<template>
  <section :class="bemm('')" aria-label="Templates">
    <h2>{{ title }}</h2>
    <div v-if="templates.length" :class="bemm('list')">
      <button
        v-for="template in templates"
        :key="template.id"
        :class="bemm('item')"
        type="button"
        @click="$emit('select', template)"
      >
        <span aria-hidden="true">{{ template.icon ?? 'template' }}</span>
        <strong>{{ template.pattern }}</strong>
      </button>
    </div>
    <p v-else :class="bemm('empty')">{{ emptyLabel }}</p>
  </section>
</template>
