<script setup lang="ts">
import { computed } from 'vue'
import { useBemm } from 'bemm'
import { Button, InputText } from '@sil/ui'

interface TypeState {
  prompts: string[]
  completedPrompts: string[]
}

const bemm = useBemm('type-editor', { return: 'string', includeBaseClass: true })

const props = defineProps<{ modelValue: Record<string, unknown> }>()
const emit = defineEmits<{ 'update:modelValue': [value: Record<string, unknown>] }>()

const state = computed<TypeState>(() => {
  const value = props.modelValue as Partial<TypeState>
  return {
    prompts: Array.isArray(value?.prompts) ? value.prompts : [],
    completedPrompts: Array.isArray(value?.completedPrompts) ? value.completedPrompts : [],
  }
})

function update(next: Partial<TypeState>) {
  emit('update:modelValue', { ...props.modelValue, ...next })
}

function addPrompt() {
  update({ prompts: [...state.value.prompts, 'New prompt'] })
}

function updatePrompt(index: number, value: string) {
  update({ prompts: state.value.prompts.map((p, i) => (i === index ? value : p)) })
}

function removePrompt(index: number) {
  update({ prompts: state.value.prompts.filter((_, i) => i !== index) })
}
</script>

<template>
  <div :class="bemm('')">
    <header :class="bemm('header')">
      <h3 :class="bemm('title')">Typing prompts</h3>
      <Button variant="outline" size="small" @click="addPrompt">Add prompt</Button>
    </header>

    <div v-if="state.prompts.length === 0" :class="bemm('empty')">No prompts yet.</div>

    <div v-else :class="bemm('list')">
      <div v-for="(prompt, i) in state.prompts" :key="i" :class="bemm('item')">
        <InputText
          :model-value="prompt"
          :label="`Prompt ${i + 1}`"
          @update:model-value="(v: string) => updatePrompt(i, v)"
        />
        <Button variant="ghost" size="small" @click="removePrompt(i)">Remove</Button>
      </div>
    </div>
  </div>
</template>

<style lang="scss">
.type-editor {
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
    grid-template-columns: 1fr auto;
    gap: var(--space-s);
    align-items: end;
  }
}
</style>
