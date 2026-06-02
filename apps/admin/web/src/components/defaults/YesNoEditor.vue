<script setup lang="ts">
import { computed } from 'vue'
import { useBemm } from 'bemm'
import { Button, InputText } from '@sil/ui'

interface YesNoOption {
  id: string
  label: string
}

interface YesNoState {
  prompt: string
  options: YesNoOption[]
}

const bemm = useBemm('yes-no-editor', { return: 'string', includeBaseClass: true })

const props = defineProps<{ modelValue: Record<string, unknown> }>()
const emit = defineEmits<{ 'update:modelValue': [value: Record<string, unknown>] }>()

const state = computed<YesNoState>(() => {
  const value = props.modelValue as Partial<YesNoState>
  return {
    prompt: typeof value?.prompt === 'string' ? value.prompt : '',
    options: Array.isArray(value?.options) ? value.options : [],
  }
})

function update(next: Partial<YesNoState>) {
  emit('update:modelValue', { ...props.modelValue, ...next })
}

function makeId(prefix: string) {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`
}

function setPrompt(value: string) {
  update({ prompt: value })
}

function addOption() {
  update({ options: [...state.value.options, { id: makeId('option'), label: 'New option' }] })
}

function updateOption(index: number, patch: Partial<YesNoOption>) {
  const options = state.value.options.map((o, i) => (i === index ? { ...o, ...patch } : o))
  update({ options })
}

function removeOption(index: number) {
  update({ options: state.value.options.filter((_, i) => i !== index) })
}
</script>

<template>
  <div :class="bemm('')">
    <InputText
      :model-value="state.prompt"
      label="Prompt"
      placeholder="e.g. Yes or no?"
      @update:model-value="setPrompt"
    />

    <section :class="bemm('options')">
      <header :class="bemm('options-head')">
        <h3 :class="bemm('title')">Options</h3>
        <Button variant="outline" size="small" @click="addOption">Add option</Button>
      </header>

      <div v-if="state.options.length === 0" :class="bemm('empty')">No options yet.</div>

      <div v-else :class="bemm('list')">
        <div v-for="(option, i) in state.options" :key="option.id" :class="bemm('item')">
          <InputText
            :model-value="option.id"
            label="ID"
            placeholder="kebab-case-id"
            @update:model-value="(v: string) => updateOption(i, { id: v })"
          />
          <InputText
            :model-value="option.label"
            label="Label"
            placeholder="Yes"
            @update:model-value="(v: string) => updateOption(i, { label: v })"
          />
          <Button variant="ghost" size="small" @click="removeOption(i)">Remove</Button>
        </div>
      </div>
    </section>
  </div>
</template>

<style lang="scss">
.yes-no-editor {
  display: flex;
  flex-direction: column;
  gap: var(--space-m);

  &__options {
    display: flex;
    flex-direction: column;
    gap: var(--space-s);
  }

  &__options-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
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
    grid-template-columns: 1fr 2fr auto;
    gap: var(--space-s);
    align-items: end;
    padding: var(--space-s);
    background: var(--admin-page-bg);
    border: 1px solid var(--admin-border);
    border-radius: var(--border-radius-s);
  }
}
</style>
