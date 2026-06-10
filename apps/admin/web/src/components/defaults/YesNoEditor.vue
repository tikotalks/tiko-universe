<script setup lang="ts">
import { computed } from 'vue'
import { useBemm } from 'bemm'
import { Button, InputText } from '@sil/ui'
import { tikoColors } from '@tiko/ui'
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

const answerPresets: Array<Omit<YesNoAnswerTile, 'id'>> = [
  { label: 'Yes', speech: 'Yes', color: 'green', icon: 'checkmark' },
  { label: 'No', speech: 'No', color: 'red', icon: 'xmark' },
  { label: 'Maybe', speech: 'Maybe', color: 'yellow', icon: 'questionmark' },
  { label: 'Help', speech: 'Help', color: 'blue', icon: 'hand.raised.fill' },
  { label: 'Stop', speech: 'Stop', color: 'orange', icon: 'hand.raised.slash.fill' },
  { label: 'More', speech: 'More', color: 'teal', icon: 'plus' },
  { label: 'Finished', speech: 'Finished', color: 'purple', icon: 'checkmark.circle.fill' },
]

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

function colorTokenToHex(color: string | undefined) {
  return tikoColors.find(item => item.name === color)?.hex ?? color ?? ''
}

function normalizeAnswer(answer: YesNoAnswerTile): YesNoAnswerTile {
  return {
    id: answer.id,
    label: answer.label,
    speech: answer.speech,
    ...(answer.color ? { color: answer.color } : {}),
    ...(answer.imageURL ? { imageURL: answer.imageURL } : {}),
    ...(answer.icon ? { icon: answer.icon } : {}),
  }
}

function addAnswer(preset?: Omit<YesNoAnswerTile, 'id'>) {
  const answer = preset
    ? { id: makeId('answer'), ...preset }
    : { id: makeId('answer'), label: 'New answer', speech: 'New answer', color: 'teal' }
  update({
    answers: [
      ...state.value.answers,
      normalizeAnswer(answer),
    ],
  })
}

function updateAnswer(index: number, patch: Partial<YesNoAnswerTile>) {
  const answers = state.value.answers.map((a, i) => (i === index ? normalizeAnswer({ ...a, ...patch }) : normalizeAnswer(a)))
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

      <div :class="bemm('presets')" aria-label="Preset answers">
        <button
          v-for="preset in answerPresets"
          :key="preset.label"
          type="button"
          :class="bemm('preset')"
          :style="{ '--yes-no-editor-preset-color': colorTokenToHex(preset.color) }"
          @click="addAnswer(preset)"
        >
          <span :class="bemm('preset-swatch')" aria-hidden="true" />
          <span>{{ preset.label }}</span>
        </button>
      </div>

      <div v-if="state.answers.length === 0" :class="bemm('empty')">
        Choose a preset, add a custom answer, or leave empty for the built-in Yes / No tiles.
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
                mode="name"
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

  &__presets {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-xs);
  }

  &__preset {
    display: inline-flex;
    align-items: center;
    gap: var(--space-xs);
    border: 1px solid var(--admin-border);
    border-radius: var(--border-radius-s);
    background: var(--admin-surface);
    color: var(--admin-text);
    padding: var(--space-xs) var(--space-s);
    font: inherit;
    font-size: var(--font-size-s);
    font-weight: 600;
    cursor: pointer;
  }

  &__preset:hover {
    border-color: var(--admin-border-strong);
  }

  &__preset-swatch {
    width: 0.85rem;
    height: 0.85rem;
    border-radius: 999px;
    background: var(--yes-no-editor-preset-color, var(--admin-border-strong));
    box-shadow: inset 0 0 0 1px color-mix(in srgb, #000, transparent 84%);
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
