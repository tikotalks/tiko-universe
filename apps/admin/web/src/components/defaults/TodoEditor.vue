<script setup lang="ts">
import { computed } from 'vue'
import { useBemm } from 'bemm'
import { Button, InputText } from '@sil/ui'

interface TodoStep {
  name: string
  done: boolean
}

interface TodoItem {
  id: string
  name: string
  done: boolean
  steps: TodoStep[]
}

interface TodoState {
  items: TodoItem[]
}

const bemm = useBemm('todo-editor', { return: 'string', includeBaseClass: true })

const props = defineProps<{ modelValue: Record<string, unknown> }>()
const emit = defineEmits<{ 'update:modelValue': [value: Record<string, unknown>] }>()

const state = computed<TodoState>(() => {
  const value = props.modelValue as Partial<TodoState>
  return {
    items: Array.isArray(value?.items) ? value.items.map(normalizeItem) : [],
  }
})

function update(next: Partial<TodoState>) {
  emit('update:modelValue', { ...props.modelValue, ...next })
}

function makeId(prefix: string) {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`
}

function normalizeStep(step: Partial<TodoStep>): TodoStep {
  return {
    name: typeof step.name === 'string' && step.name.trim() ? step.name.trim() : 'New step',
    done: step.done === true,
  }
}

function normalizeItem(item: Partial<TodoItem>): TodoItem {
  return {
    id: typeof item.id === 'string' && item.id.trim() ? item.id.trim() : makeId('todo'),
    name: typeof item.name === 'string' && item.name.trim() ? item.name.trim() : 'New item',
    done: item.done === true,
    steps: Array.isArray(item.steps) ? item.steps.map(normalizeStep) : [],
  }
}

function updateItems(items: TodoItem[]) {
  update({ items: items.map(normalizeItem) })
}

function addItem() {
  updateItems([...state.value.items, normalizeItem({ name: 'New item' })])
}

function updateItem(index: number, patch: Partial<TodoItem>) {
  updateItems(state.value.items.map((item, i) => i === index ? normalizeItem({ ...item, ...patch }) : item))
}

function removeItem(index: number) {
  updateItems(state.value.items.filter((_, i) => i !== index))
}

function addStep(itemIndex: number) {
  const item = state.value.items[itemIndex]
  if (!item) return
  updateItem(itemIndex, { steps: [...item.steps, normalizeStep({ name: 'New step' })] })
}

function updateStep(itemIndex: number, stepIndex: number, patch: Partial<TodoStep>) {
  const item = state.value.items[itemIndex]
  if (!item) return
  updateItem(itemIndex, {
    steps: item.steps.map((step, i) => i === stepIndex ? normalizeStep({ ...step, ...patch }) : step),
  })
}

function removeStep(itemIndex: number, stepIndex: number) {
  const item = state.value.items[itemIndex]
  if (!item) return
  updateItem(itemIndex, { steps: item.steps.filter((_, i) => i !== stepIndex) })
}
</script>

<template>
  <div :class="bemm('')">
    <header :class="bemm('header')">
      <h3 :class="bemm('title')">Todo items</h3>
      <Button variant="outline" size="small" @click="addItem">Add item</Button>
    </header>

    <div v-if="state.items.length === 0" :class="bemm('empty')">No items yet.</div>

    <div v-else :class="bemm('list')">
      <section v-for="(item, itemIndex) in state.items" :key="item.id" :class="bemm('item')">
        <div :class="bemm('item-row')">
          <InputText
            :model-value="item.name"
            label="Name"
            @update:model-value="(value: string) => updateItem(itemIndex, { name: value })"
          />
          <InputText
            :model-value="item.id"
            label="ID"
            @update:model-value="(value: string) => updateItem(itemIndex, { id: value })"
          />
          <Button variant="ghost" size="small" @click="removeItem(itemIndex)">Remove</Button>
        </div>

        <div :class="bemm('steps')">
          <header :class="bemm('steps-header')">
            <strong>Steps</strong>
            <Button variant="outline" size="small" @click="addStep(itemIndex)">Add step</Button>
          </header>
          <div v-if="item.steps.length === 0" :class="bemm('steps-empty')">No steps.</div>
          <div v-else :class="bemm('step-list')">
            <div v-for="(step, stepIndex) in item.steps" :key="stepIndex" :class="bemm('step')">
              <InputText
                :model-value="step.name"
                :label="`Step ${stepIndex + 1}`"
                @update:model-value="(value: string) => updateStep(itemIndex, stepIndex, { name: value })"
              />
              <Button variant="ghost" size="small" @click="removeStep(itemIndex, stepIndex)">Remove</Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<style lang="scss">
.todo-editor {
  display: flex;
  flex-direction: column;
  gap: var(--space-m);

  &__header,
  &__item-row,
  &__steps-header,
  &__step {
    display: flex;
    align-items: end;
    gap: var(--space-s);
  }

  &__header,
  &__steps-header {
    justify-content: space-between;
  }

  &__title {
    font-size: var(--font-size-m);
    font-weight: 600;
    color: var(--admin-text);
  }

  &__empty,
  &__steps-empty {
    background: var(--admin-page-bg);
    border: 1px dashed var(--admin-border-strong);
    border-radius: var(--border-radius-s);
    padding: var(--space-m);
    text-align: center;
    color: var(--admin-text-muted);
    font-size: var(--font-size-s);
  }

  &__list,
  &__steps,
  &__step-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-s);
  }

  &__item {
    border: 1px solid var(--admin-border);
    border-radius: var(--border-radius-s);
    padding: var(--space-m);
    background: var(--admin-surface);
  }

  &__item-row {
    display: grid;
    grid-template-columns: 1fr 1fr auto;
  }

  &__steps {
    margin-top: var(--space-m);
  }

  &__step {
    display: grid;
    grid-template-columns: 1fr auto;
  }
}
</style>
