<script setup lang="ts">
import { computed } from 'vue'
import { useBemm } from 'bemm'
import { Button, InputNumber, InputText } from '@sil/ui'

interface TimerPreset {
  id: string
  label: string
  seconds: number
}

interface TimerState {
  presets: TimerPreset[]
}

const bemm = useBemm('timer-editor', { return: 'string', includeBaseClass: true })

const props = defineProps<{ modelValue: Record<string, unknown> }>()
const emit = defineEmits<{ 'update:modelValue': [value: Record<string, unknown>] }>()

const state = computed<TimerState>(() => {
  const value = props.modelValue as Partial<TimerState>
  return { presets: Array.isArray(value?.presets) ? value.presets : [] }
})

function update(next: TimerState) {
  emit('update:modelValue', { ...props.modelValue, ...next })
}

function makeId(prefix: string) {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`
}

function addPreset() {
  update({
    presets: [
      ...state.value.presets,
      { id: makeId('preset'), label: 'New preset', seconds: 60 },
    ],
  })
}

function updatePreset(index: number, patch: Partial<TimerPreset>) {
  update({
    presets: state.value.presets.map((p, i) => (i === index ? { ...p, ...patch } : p)),
  })
}

function removePreset(index: number) {
  update({ presets: state.value.presets.filter((_, i) => i !== index) })
}
</script>

<template>
  <div :class="bemm('')">
    <header :class="bemm('header')">
      <h3 :class="bemm('title')">Timer presets</h3>
      <Button variant="outline" size="small" @click="addPreset">Add preset</Button>
    </header>

    <div v-if="state.presets.length === 0" :class="bemm('empty')">No presets yet.</div>

    <div v-else :class="bemm('list')">
      <div v-for="(preset, i) in state.presets" :key="preset.id" :class="bemm('item')">
        <InputText
          :model-value="preset.id"
          label="ID"
          @update:model-value="(v: string) => updatePreset(i, { id: v })"
        />
        <InputText
          :model-value="preset.label"
          label="Label"
          @update:model-value="(v: string) => updatePreset(i, { label: v })"
        />
        <InputNumber
          :model-value="preset.seconds"
          label="Seconds"
          :min="1"
          :max="86400"
          @update:model-value="(v: number) => updatePreset(i, { seconds: v })"
        />
        <Button variant="ghost" size="small" @click="removePreset(i)">Remove</Button>
      </div>
    </div>
  </div>
</template>

<style lang="scss">
.timer-editor {
  display: flex;
  flex-direction: column;
  gap: var(--space-m);

  &__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: var(--space-s);
  }

  &__title {
    font-size: var(--font-size-m);
    font-weight: 600;
    color: var(--admin-text);
  }

  &__empty {
    background: var(--admin-page-bg);
    border: 1px dashed var(--admin-border-strong);
    border-radius: var(--border-radius-s);
    padding: var(--space-m);
    text-align: center;
    color: var(--admin-text-muted);
    font-size: var(--font-size-s);
  }

  &__list {
    display: flex;
    flex-direction: column;
    gap: var(--space-s);
  }

  &__item {
    display: grid;
    grid-template-columns: 1fr 2fr 1fr auto;
    gap: var(--space-s);
    align-items: end;
  }
}
</style>
