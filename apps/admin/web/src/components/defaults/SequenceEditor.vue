<script setup lang="ts">
import { computed } from 'vue'
import { useBemm } from 'bemm'
import { Button, InputText, InputTextArea } from '@sil/ui'

interface SequenceStep {
  id: string
  label: string
  text: string
  imageRef?: string
  imageRefs?: string[]
  imagePrompt?: string
}

interface Sequence {
  id: string
  title: string
  name?: string
  category?: string
  color?: string
  imageRef?: string
  order?: number
  steps: SequenceStep[]
}

interface SequenceState {
  sequences: Sequence[]
}

const bemm = useBemm('sequence-editor', { return: 'string', includeBaseClass: true })

const props = defineProps<{ modelValue: Record<string, unknown> }>()
const emit = defineEmits<{ 'update:modelValue': [value: Record<string, unknown>] }>()

const state = computed<SequenceState>(() => {
  const value = props.modelValue as Partial<SequenceState>
  const sequences = Array.isArray(value?.sequences) ? value.sequences : []
  return { sequences: sequences.map(normalizeSequence) }
})

function update(next: SequenceState) {
  emit('update:modelValue', { ...props.modelValue, ...next })
}

function makeId(prefix: string) {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`
}

function normalizeStep(step: unknown, index: number): SequenceStep {
  if (typeof step === 'string') {
    return { id: makeId('step'), label: step, text: step }
  }
  const value = step && typeof step === 'object' ? step as Partial<SequenceStep> : {}
  const label = typeof value.label === 'string' && value.label.trim() ? value.label : `Step ${index + 1}`
  return {
    id: typeof value.id === 'string' && value.id.trim() ? value.id : makeId('step'),
    label,
    text: typeof value.text === 'string' && value.text.trim() ? value.text : label,
    ...(typeof value.imageRef === 'string' && value.imageRef.trim() ? { imageRef: value.imageRef } : {}),
    ...(Array.isArray(value.imageRefs) ? { imageRefs: value.imageRefs.filter((ref): ref is string => typeof ref === 'string' && ref.trim().length > 0) } : {}),
    ...(typeof value.imagePrompt === 'string' && value.imagePrompt.trim() ? { imagePrompt: value.imagePrompt } : {}),
  }
}

function normalizeSequence(sequence: unknown, index: number): Sequence {
  const value = sequence && typeof sequence === 'object' ? sequence as Partial<Sequence> : {}
  const title = typeof value.title === 'string' && value.title.trim()
    ? value.title
    : typeof value.name === 'string' && value.name.trim()
      ? value.name
      : `Sequence ${index + 1}`
  return {
    id: typeof value.id === 'string' && value.id.trim() ? value.id : makeId('sequence'),
    title,
    name: title,
    ...(typeof value.category === 'string' && value.category.trim() ? { category: value.category } : {}),
    ...(typeof value.color === 'string' && value.color.trim() ? { color: value.color } : {}),
    ...(typeof value.imageRef === 'string' && value.imageRef.trim() ? { imageRef: value.imageRef } : {}),
    order: typeof value.order === 'number' ? value.order : index,
    steps: Array.isArray(value.steps) ? value.steps.map(normalizeStep) : [],
  }
}

function splitMediaRefs(value: string): string[] {
  return value
    .split(/[\n,]/)
    .map(ref => ref.trim())
    .filter(Boolean)
}

function addSequence() {
  update({
    sequences: [
      ...state.value.sequences,
      { id: makeId('sequence'), title: 'New sequence', name: 'New sequence', category: '', order: state.value.sequences.length, steps: [] },
    ],
  })
}

function updateSequence(index: number, patch: Partial<Sequence>) {
  const sequences = state.value.sequences.map((s, i) => {
    if (i !== index) return s
    const updated = { ...s, ...patch }
    return patch.title ? { ...updated, name: patch.title } : updated
  })
  update({ sequences })
}

function removeSequence(index: number) {
  update({ sequences: state.value.sequences.filter((_, i) => i !== index) })
}

function addStep(sequenceIndex: number) {
  const sequences = state.value.sequences.map((s, i) =>
    i === sequenceIndex ? { ...s, steps: [...s.steps, { id: makeId('step'), label: 'New step', text: 'New step' }] } : s,
  )
  update({ sequences })
}

function updateStep(sequenceIndex: number, stepIndex: number, patch: Partial<SequenceStep>) {
  const sequences = state.value.sequences.map((s, i) => {
    if (i !== sequenceIndex) return s
    const steps = s.steps.map((step, si) => (si === stepIndex ? { ...step, ...patch } : step))
    return { ...s, steps }
  })
  update({ sequences })
}

function removeStep(sequenceIndex: number, stepIndex: number) {
  const sequences = state.value.sequences.map((s, i) => {
    if (i !== sequenceIndex) return s
    return { ...s, steps: s.steps.filter((_, si) => si !== stepIndex) }
  })
  update({ sequences })
}
</script>

<template>
  <div :class="bemm('')">
    <header :class="bemm('header')">
      <h3 :class="bemm('title')">Sequences</h3>
      <Button variant="outline" size="small" @click="addSequence">Add sequence</Button>
    </header>

    <div v-if="state.sequences.length === 0" :class="bemm('empty')">No sequences yet.</div>

    <article v-for="(sequence, si) in state.sequences" :key="sequence.id" :class="bemm('sequence')">
      <header :class="bemm('sequence-head')">
        <div :class="bemm('sequence-fields')">
          <InputText
            :model-value="sequence.title"
            label="Title"
            @update:model-value="(v: string) => updateSequence(si, { title: v })"
          />
          <InputText
            :model-value="sequence.id"
            label="ID"
            @update:model-value="(v: string) => updateSequence(si, { id: v })"
          />
          <InputText
            :model-value="sequence.category ?? ''"
            label="Category"
            @update:model-value="(v: string) => updateSequence(si, { category: v })"
          />
          <InputText
            :model-value="sequence.color ?? ''"
            label="Color token"
            placeholder="blue, green, orange"
            @update:model-value="(v: string) => updateSequence(si, { color: v })"
          />
          <InputText
            :model-value="sequence.imageRef ?? ''"
            label="Cover media ID"
            @update:model-value="(v: string) => updateSequence(si, { imageRef: v })"
          />
        </div>
        <Button variant="ghost" size="small" @click="removeSequence(si)">Remove</Button>
      </header>

      <div :class="bemm('steps')">
        <header :class="bemm('steps-head')">
          <h4 :class="bemm('steps-title')">Steps</h4>
          <Button variant="outline" size="small" @click="addStep(si)">Add step</Button>
        </header>

        <div v-for="(step, stepIdx) in sequence.steps" :key="step.id" :class="bemm('step')">
          <div :class="bemm('step-fields')">
            <InputText
              :model-value="step.label"
              :label="`Step ${stepIdx + 1} label`"
              @update:model-value="(v: string) => updateStep(si, stepIdx, { label: v, text: step.text || v })"
            />
            <InputText
              :model-value="step.id"
              label="Step ID"
              @update:model-value="(v: string) => updateStep(si, stepIdx, { id: v })"
            />
            <InputText
              :model-value="step.text"
              label="Speech text"
              @update:model-value="(v: string) => updateStep(si, stepIdx, { text: v })"
            />
            <InputText
              :model-value="step.imageRef ?? ''"
              label="Image media ID"
              @update:model-value="(v: string) => updateStep(si, stepIdx, { imageRef: v })"
            />
            <InputTextArea
              :model-value="(step.imageRefs ?? []).join('\n')"
              label="Multiple image media IDs"
              :rows="3"
              @update:model-value="(v: unknown) => updateStep(si, stepIdx, { imageRefs: splitMediaRefs(String(v)) })"
            />
            <InputTextArea
              :model-value="step.imagePrompt ?? ''"
              label="Fallback image prompt"
              :rows="2"
              @update:model-value="(v: unknown) => updateStep(si, stepIdx, { imagePrompt: String(v) })"
            />
          </div>
          <Button variant="ghost" size="small" @click="removeStep(si, stepIdx)">Remove</Button>
        </div>
      </div>
    </article>
  </div>
</template>

<style lang="scss">
.sequence-editor {
  display: flex;
  flex-direction: column;
  gap: var(--space-m);

  &__header,
  &__steps-head {
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

  &__steps-title {
    font-size: var(--font-size-s);
    font-weight: 600;
    color: var(--admin-text);
    text-transform: uppercase;
    letter-spacing: 0.04em;
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

  &__sequence {
    background: var(--admin-page-bg);
    border: 1px solid var(--admin-border);
    border-radius: var(--border-radius-s);
    padding: var(--space-m);
    display: flex;
    flex-direction: column;
    gap: var(--space-s);
  }

  &__sequence-head {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: var(--space-m);
    align-items: end;
  }

  &__sequence-fields {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--space-s);
  }

  &__steps {
    display: flex;
    flex-direction: column;
    gap: var(--space-s);
  }

  &__step {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: var(--space-s);
    align-items: start;
    padding: var(--space-s);
    border: 1px solid var(--admin-border);
    border-radius: var(--border-radius-s);
    background: var(--admin-surface);
  }

  &__step-fields {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--space-s);
  }

  @media (max-width: 760px) {
    &__sequence-head,
    &__step {
      grid-template-columns: 1fr;
    }

    &__sequence-fields,
    &__step-fields {
      grid-template-columns: 1fr;
    }
  }
}
</style>
