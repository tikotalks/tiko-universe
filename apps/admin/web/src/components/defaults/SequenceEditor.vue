<script setup lang="ts">
import { computed } from 'vue'
import { useBemm } from 'bemm'
import { Button, InputText } from '@sil/ui'

interface Sequence {
  id: string
  title: string
  steps: string[]
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
  return { sequences }
})

function update(next: SequenceState) {
  emit('update:modelValue', { ...props.modelValue, ...next })
}

function makeId(prefix: string) {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`
}

function addSequence() {
  update({
    sequences: [
      ...state.value.sequences,
      { id: makeId('sequence'), title: 'New sequence', steps: [] },
    ],
  })
}

function updateSequence(index: number, patch: Partial<Sequence>) {
  const sequences = state.value.sequences.map((s, i) => (i === index ? { ...s, ...patch } : s))
  update({ sequences })
}

function removeSequence(index: number) {
  update({ sequences: state.value.sequences.filter((_, i) => i !== index) })
}

function addStep(sequenceIndex: number) {
  const sequences = state.value.sequences.map((s, i) =>
    i === sequenceIndex ? { ...s, steps: [...s.steps, 'New step'] } : s,
  )
  update({ sequences })
}

function updateStep(sequenceIndex: number, stepIndex: number, value: string) {
  const sequences = state.value.sequences.map((s, i) => {
    if (i !== sequenceIndex) return s
    const steps = s.steps.map((step, si) => (si === stepIndex ? value : step))
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
        </div>
        <Button variant="ghost" size="small" @click="removeSequence(si)">Remove</Button>
      </header>

      <div :class="bemm('steps')">
        <header :class="bemm('steps-head')">
          <h4 :class="bemm('steps-title')">Steps</h4>
          <Button variant="outline" size="small" @click="addStep(si)">Add step</Button>
        </header>

        <div v-for="(step, stepIdx) in sequence.steps" :key="stepIdx" :class="bemm('step')">
          <InputText
            :model-value="step"
            :label="`Step ${stepIdx + 1}`"
            @update:model-value="(v: string) => updateStep(si, stepIdx, v)"
          />
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
    grid-template-columns: 2fr 1fr;
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
    align-items: end;
  }
}
</style>
