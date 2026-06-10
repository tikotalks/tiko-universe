<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useBemm } from 'bemm'
import { tikoColors } from '@tiko/ui'

const bemm = useBemm('color-dot-picker', { return: 'string', includeBaseClass: true })

defineProps<{ modelValue: string }>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const open = ref(false)
const wrapRef = ref<HTMLElement | null>(null)

function select(hex: string) {
  emit('update:modelValue', hex)
  open.value = false
}

function onDocClick(e: MouseEvent) {
  if (open.value && wrapRef.value && !wrapRef.value.contains(e.target as Node)) {
    open.value = false
  }
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') open.value = false
}

onMounted(() => {
  document.addEventListener('click', onDocClick)
  document.addEventListener('keydown', onKeydown)
})
onBeforeUnmount(() => {
  document.removeEventListener('click', onDocClick)
  document.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <div ref="wrapRef" :class="bemm('')">
    <button
      type="button"
      :class="bemm('dot')"
      :style="{ '--c': modelValue || '#aaa' }"
      :title="modelValue || 'Pick color'"
      @click="open = !open"
      @contextmenu.prevent="open = !open"
    />
    <div v-if="open" :class="bemm('popup')">
      <button
        v-for="color in tikoColors"
        :key="color.hex"
        type="button"
        :class="bemm('swatch', { active: modelValue === color.hex })"
        :style="{ '--c': color.hex }"
        :title="color.name"
        @click="select(color.hex)"
      />
    </div>
  </div>
</template>

<style lang="scss">
.color-dot-picker {
  position: relative;
  display: inline-block;

  &__dot {
    width: calc(var(--space) * 2);
    height: calc(var(--space) * 2);
    border-radius: var(--border-radius-round);
    background: var(--c);
    border: 2px solid color-mix(in srgb, var(--c), var(--color-foreground) 25%);
    cursor: pointer;
    padding: 0;
    flex-shrink: 0;
    transition: transform 0.1s ease;

    &:hover {
      transform: scale(1.15);
    }
  }

  &__popup {
    position: absolute;
    top: calc(100% + var(--space-xs));
    left: 0;
    z-index: 200;
    background: var(--admin-surface);
    border: 1px solid var(--admin-border-strong);
    border-radius: var(--border-radius-m);
    padding: var(--space-s);
    box-shadow: 0 8px 24px color-mix(in srgb, var(--color-dark), transparent 60%);
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: var(--space-xs);
    width: max-content;
  }

  &__swatch {
    width: calc(var(--space) * 1.75);
    height: calc(var(--space) * 1.75);
    border-radius: var(--border-radius-round);
    background: var(--c);
    border: 2px solid transparent;
    cursor: pointer;
    padding: 0;
    transition: transform 0.1s ease, border-color 0.1s ease;
    outline: 2px solid transparent;
    outline-offset: 2px;

    &:hover {
      transform: scale(1.2);
    }

    &--active {
      outline-color: var(--admin-text);
      transform: scale(1.2);
    }
  }
}
</style>
