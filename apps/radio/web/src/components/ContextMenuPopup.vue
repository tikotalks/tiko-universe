<script setup lang="ts">
import { inject } from 'vue'
import { Icon as SilIcon } from '@sil/ui'
import type { PopupService } from '@sil/ui'

export interface ContextMenuItem {
  id: string
  label: string
  icon: string
  /** Destructive items are tinted and sit last, like a delete row. */
  destructive?: boolean
}

interface Props {
  title?: string
  subtitle?: string
  items: ContextMenuItem[]
}

defineProps<Props>()

const emit = defineEmits<{ (e: 'select', id: string): void }>()

const popup = inject<PopupService>('popupService')

function choose(id: string) {
  emit('select', id)
  popup?.closeAllPopups()
}
</script>

<template>
  <div class="radio-menu" data-test="radio-context-menu">
    <div v-if="title" class="radio-menu__header">
      <h2 class="radio-menu__title">{{ title }}</h2>
      <p v-if="subtitle" class="radio-menu__subtitle">{{ subtitle }}</p>
    </div>
    <button
      v-for="item in items"
      :key="item.id"
      class="radio-menu__item"
      :class="{ 'radio-menu__item--destructive': item.destructive }"
      :data-test="`radio-context-menu-${item.id}`"
      @click="choose(item.id)"
    >
      <span class="radio-menu__item-icon">
        <SilIcon :name="item.icon" size="small" />
      </span>
      <span class="radio-menu__item-label">{{ item.label }}</span>
    </button>
  </div>
</template>
