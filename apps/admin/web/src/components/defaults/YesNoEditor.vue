<script setup lang="ts">
import { computed } from 'vue'
import { useBemm } from 'bemm'
import { Button, InputText } from '@sil/ui'
import ColorSwatchPicker from '../ColorSwatchPicker.vue'

interface YesNoAnswerTile {
  id: string
  label: string
  speech: string
  color?: string
  imageURL?: string
  icon?: string
}

interface YesNoState {
  prompt: string
  answers: YesNoAnswerTile[]
}

const bemm = useBemm('yes-no-editor', { return: 'string', includeBaseClass: true })

const props = defineProps<{ modelValue: Record<string, unknown> }>()
const emit = defineEmits<{ 'update:modelValue': [value: Record<string, unknown>] }>()

const state = computed<YesNoState>(() => {
  const value = props.modelValue as Partial<YesNoState>
  return {
    prompt: typeof value?.prompt === 'string' ? value.prompt : '',
    answers: Array.isArray(value?.answers) ? (value.answers as YesNoAnswerTile[]) : [],
  }
})

function update(next: Partial<YesNoState>) {
  emit('update:modelValue', { ...props.modelValue, ...next })
}

function makeId(prefix: string) {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`
}

function addAnswer() {
  update({
    answers: [
      ...state.value.answers,
      { id: makeId('answer'), label: 'New answer', speech: 'New answer', color: '#4ECDC4' },
    ],
  })
}

function updateAnswer(index: number, patch: Partial<YesNoAnswerTile>) {
  const answers = state.value.answers.map((a, i) => (i === index ? { ...a, ...patch } : a))
  update({ answers })
}

function removeAnswer(index: number) {
  update({ answers: state.value.answers.filter((_, i) => i !== index) })
}

function moveAnswer(index: number, delta: number) {
  const target = index + delta
  if (target < 0 || target >= state.value.answers.length) return
  const answers = [...state.value.answers]
  ;[answers[index], answers[target]] = [answers[target], answers[index]]
  update({ answers })
}
</script>

<template>
  <div :class="bemm('')">
    <InputText
      :model-value="state.prompt"
      label="Default prompt"
      placeholder="e.g. Yes or no?"
      @update:model-value="(v: string) => update({ prompt: v })"
    />

    <section :class="bemm('answers')">
      <header :class="bemm('answers-head')">
        <h3 :class="bemm('title')">Default answers</h3>
        <Button variant="outline" size="small" @click="addAnswer">Add answer</Button>
      </header>

      <div v-if="state.answers.length === 0" :class="bemm('empty')">
        No default answers yet. Add one or leave empty for the built-in Yes / No tiles.
      </div>

      <div v-else :class="bemm('list')">
        <div v-for="(answer, i) in state.answers" :key="answer.id" :class="bemm('item')">
          <div :class="bemm('item-fields')">
            <InputText
              :model-value="answer.label"
              label="Label"
              placeholder="Yes"
              @update:model-value="(v: string) => updateAnswer(i, { label: v })"
            />
            <InputText
              :model-value="answer.speech"
              label="Spoken text"
              placeholder="What to say when tapped"
              @update:model-value="(v: string) => updateAnswer(i, { speech: v })"
            />
            <InputText
              :model-value="answer.icon ?? ''"
              label="Icon (SF symbol)"
              placeholder="checkmark"
              @update:model-value="(v: string) => updateAnswer(i, { icon: v || undefined })"
            />
            <InputText
              :model-value="answer.imageURL ?? ''"
              label="Image URL"
              placeholder="https://…"
              @update:model-value="(v: string) => updateAnswer(i, { imageURL: v || undefined })"
            />
            <div :class="bemm('color-field')">
              <span :class="bemm('color-label')">Color</span>
              <ColorSwatchPicker
                :model-value="answer.color ?? ''"
                @update:model-value="(v: string) => updateAnswer(i, { color: v || undefined })"
              />
            </div>
          </div>
          <div :class="bemm('item-actions')">
            <Button variant="ghost" size="small" :disabled="i === 0" @click="moveAnswer(i, -1)">↑</Button>
            <Button variant="ghost" size="small" :disabled="i === state.answers.length - 1" @click="moveAnswer(i, 1)">↓</Button>
            <Button variant="ghost" size="small" @click="removeAnswer(i)">Remove</Button>
          </div>
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

  &__answers {
    display: flex;
    flex-direction: column;
    gap: var(--space-s);
  }

  &__answers-head {
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
    grid-template-columns: 1fr auto;
    gap: var(--space-s);
    align-items: start;
    padding: var(--space-s);
    background: var(--admin-page-bg);
    border: 1px solid var(--admin-border);
    border-radius: var(--border-radius-s);
  }

  &__item-fields {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr 2fr 1fr;
    gap: var(--space-s);
    align-items: end;
  }

  &__item-actions {
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
  }

  &__color-field {
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
  }

  &__color-label {
    font-size: var(--font-size-xs);
    font-weight: 600;
    color: var(--admin-text-muted);
  }
}
</style>
