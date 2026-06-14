<script setup lang="ts">
import { computed, nextTick } from 'vue'
import { useBemm } from 'bemm'
import { Button, InputText } from '@sil/ui'
import { TikoOpenIconPicker, tikoColors, tikoNormalizeOpenIcon } from '@tiko/ui'
import ColorSwatchPicker from '../ColorSwatchPicker.vue'
import MediaPicker from '../MediaPicker.vue'

interface YesNoAnswerTile {
  id: string
  label: string
  speech: string
  labelTranslations?: Record<string, string>
  speechTranslations?: Record<string, string>
  color?: string
  imageRef?: string
  icon?: string
}

interface YesNoAnswerSet {
  id: string
  title: string
  description?: string
  color?: string
  imageRef?: string
  order?: number
  answers: YesNoAnswerTile[]
}

interface YesNoState {
  prompt: string
  answerSets: YesNoAnswerSet[]
  selectedSetId?: string
}

const bemm = useBemm('yes-no-editor', { return: 'string', includeBaseClass: true })

const props = defineProps<{ modelValue: Record<string, unknown> }>()
const emit = defineEmits<{ 'update:modelValue': [value: Record<string, unknown>] }>()
const setElements = new Map<string, HTMLElement>()

const answerTranslations: Record<string, Record<string, string>> = {
  yes: { nl: 'Ja', fr: 'Oui', es: 'Sí', mt: 'Iva', de: 'Ja' },
  no: { nl: 'Nee', fr: 'Non', es: 'No', mt: 'Le', de: 'Nein' },
  maybe: { nl: 'Misschien', fr: 'Peut-être', es: 'Quizás', mt: 'Forsi', de: 'Vielleicht' },
  help: { nl: 'Help', fr: 'Aide', es: 'Ayuda', mt: 'Għajnuna', de: 'Hilfe' },
  stop: { nl: 'Stop', fr: 'Arrêter', es: 'Parar', mt: 'Waqqaf', de: 'Stopp' },
  more: { nl: 'Meer', fr: 'Encore', es: 'Más', mt: 'Iktar', de: 'Mehr' },
  finished: { nl: 'Klaar', fr: 'Terminé', es: 'Terminado', mt: 'Lest', de: 'Fertig' },
  later: { nl: 'Later', fr: 'Plus tard', es: 'Más tarde', mt: 'Aktar tard', de: 'Später' },
}

function presetAnswer(id: string, label: string, color: string, icon: string): Omit<YesNoAnswerTile, 'id'> {
  const translations = answerTranslations[id]
  return {
    label,
    speech: label,
    ...(translations ? { labelTranslations: translations, speechTranslations: translations } : {}),
    color,
    icon,
  }
}

const answerPresets: Array<Omit<YesNoAnswerTile, 'id'>> = [
  presetAnswer('yes', 'Yes', 'green', 'ui/check-fat'),
  presetAnswer('no', 'No', 'red', 'wayfinding/cross'),
  presetAnswer('maybe', 'Maybe', 'yellow', 'ui/question-mark-fat'),
  presetAnswer('help', 'Help', 'blue', 'ui/pointer-hand'),
  presetAnswer('stop', 'Stop', 'orange', 'ui/pointer-cross'),
  presetAnswer('more', 'More', 'teal', 'ui/add-fat'),
  presetAnswer('finished', 'Finished', 'purple', 'ui/check-fat'),
]

const state = computed<YesNoState>(() => {
  const value = props.modelValue as Partial<YesNoState>
  const answerSets = Array.isArray(value?.answerSets) ? (value.answerSets as YesNoAnswerSet[]) : []
  return {
    prompt: typeof value?.prompt === 'string' ? value.prompt : '',
    answerSets,
    selectedSetId: typeof value?.selectedSetId === 'string' ? value.selectedSetId : answerSets[0]?.id,
  }
})

function update(next: Partial<YesNoState>) {
  const merged = { ...props.modelValue, ...next }
  emit('update:modelValue', merged)
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
    ...(answer.labelTranslations ? { labelTranslations: answer.labelTranslations } : {}),
    ...(answer.speechTranslations ? { speechTranslations: answer.speechTranslations } : {}),
    ...(answer.color ? { color: answer.color } : {}),
    ...(answer.imageRef ? { imageRef: answer.imageRef } : {}),
    ...(answer.icon && !answer.imageRef ? { icon: tikoNormalizeOpenIcon(answer.icon) } : {}),
  }
}

function normalizeSet(set: YesNoAnswerSet, order: number): YesNoAnswerSet {
  return {
    id: set.id,
    title: set.title,
    ...(set.description ? { description: set.description } : {}),
    ...(set.color ? { color: set.color } : {}),
    ...(set.imageRef ? { imageRef: set.imageRef } : {}),
    order,
    answers: set.answers.map(normalizeAnswer),
  }
}

function updateSets(sets: YesNoAnswerSet[], selectedSetId = state.value.selectedSetId) {
  const normalized = sets.map(normalizeSet)
  const selected = normalized.some(set => set.id === selectedSetId) ? selectedSetId : normalized[0]?.id
  update({ answerSets: normalized, selectedSetId: selected })
}

function addSet() {
  const sets = state.value.answerSets
  const id = makeId('set')
  updateSets([
    ...sets,
    {
      id,
      title: 'New set',
      color: 'teal',
      order: sets.length,
      answers: [],
    },
  ])
  void focusSetTitle(id)
}

function setSetElement(id: string, element: unknown) {
  if (element instanceof HTMLElement) {
    setElements.set(id, element)
    return
  }
  setElements.delete(id)
}

async function focusSetTitle(id: string) {
  await nextTick()
  const element = setElements.get(id)
  const input = element?.querySelector<HTMLInputElement>('input')
  element?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  input?.focus()
  input?.select()
}

function updateSet(index: number, patch: Partial<YesNoAnswerSet>) {
  updateSets(state.value.answerSets.map((set, i) => (i === index ? { ...set, ...patch } : set)))
}

function removeSet(index: number) {
  updateSets(state.value.answerSets.filter((_, i) => i !== index))
}

function moveSet(index: number, delta: number) {
  const target = index + delta
  if (target < 0 || target >= state.value.answerSets.length) return
  const sets = [...state.value.answerSets]
  ;[sets[index], sets[target]] = [sets[target], sets[index]]
  updateSets(sets)
}

function addAnswer(setIndex: number, preset?: Omit<YesNoAnswerTile, 'id'>) {
  const answer = preset
    ? { id: makeId('answer'), ...preset }
    : { id: makeId('answer'), label: 'New answer', speech: 'New answer', color: 'teal' }
  const sets = state.value.answerSets.map((set, i) => i === setIndex ? { ...set, answers: [...set.answers, normalizeAnswer(answer)] } : set)
  updateSets(sets)
}

function updateAnswer(setIndex: number, answerIndex: number, patch: Partial<YesNoAnswerTile>) {
  const sets = state.value.answerSets.map((set, i) => {
    if (i !== setIndex) return set
    const answers = set.answers.map((a, ai) => (ai === answerIndex ? normalizeAnswer({ ...a, ...patch }) : normalizeAnswer(a)))
    return { ...set, answers }
  })
  updateSets(sets)
}

function updateAnswerIcon(setIndex: number, answerIndex: number, icon: string) {
  updateAnswer(setIndex, answerIndex, { icon: icon || undefined, imageRef: undefined })
}

function updateAnswerImage(setIndex: number, answerIndex: number, imageRef: string) {
  updateAnswer(setIndex, answerIndex, { imageRef: imageRef || undefined, icon: undefined })
}

function useAnswerIcon(setIndex: number, answerIndex: number, answer: YesNoAnswerTile) {
  updateAnswer(setIndex, answerIndex, { icon: answer.icon || 'ui/question-mark-fat', imageRef: undefined })
}

function useAnswerImage(setIndex: number, answerIndex: number) {
  updateAnswer(setIndex, answerIndex, { imageRef: '', icon: undefined })
}

function removeAnswer(setIndex: number, answerIndex: number) {
  const sets = state.value.answerSets.map((set, i) => i === setIndex ? { ...set, answers: set.answers.filter((_, ai) => ai !== answerIndex) } : set)
  updateSets(sets)
}

function moveAnswer(setIndex: number, answerIndex: number, delta: number) {
  const set = state.value.answerSets[setIndex]
  const target = answerIndex + delta
  if (!set || target < 0 || target >= set.answers.length) return
  const answers = [...set.answers]
  ;[answers[answerIndex], answers[target]] = [answers[target], answers[answerIndex]]
  updateSet(setIndex, { answers })
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
        <h3 :class="bemm('title')">Answer sets</h3>
        <Button variant="outline" size="small" @click="addSet">Add set</Button>
      </header>

      <div :class="bemm('presets')" aria-label="Preset answers">
        <button
          v-for="preset in answerPresets"
          :key="preset.label"
          type="button"
          :class="bemm('preset')"
          :style="{ '--yes-no-editor-preset-color': colorTokenToHex(preset.color) }"
          @click="addAnswer(0, preset)"
        >
          <span :class="bemm('preset-swatch')" aria-hidden="true" />
          <span>{{ preset.label }}</span>
        </button>
      </div>

      <div v-if="state.answerSets.length === 0" :class="bemm('empty')">
        Add a set to define the answer tiles shown in the app.
      </div>

      <div v-else :class="bemm('list')">
        <article
          v-for="(set, si) in state.answerSets"
          :key="set.id"
          :ref="(element) => setSetElement(set.id, element)"
          :class="bemm('set')"
        >
          <header :class="bemm('set-head')">
            <InputText
              :model-value="set.title"
              label="Set title"
              placeholder="Yes / No"
              @update:model-value="(v: string) => updateSet(si, { title: v })"
            />
            <InputText
              :model-value="set.id"
              label="ID"
              placeholder="kebab-case"
              @update:model-value="(v: string) => updateSet(si, { id: v })"
            />
            <InputText
              :model-value="set.description ?? ''"
              label="Description"
              placeholder="Short helper text"
              @update:model-value="(v: string) => updateSet(si, { description: v || undefined })"
            />
            <div :class="bemm('color-field')">
              <span :class="bemm('color-label')">Color</span>
              <ColorSwatchPicker
                :model-value="set.color ?? ''"
                mode="name"
                @update:model-value="(v: string) => updateSet(si, { color: v || undefined })"
              />
            </div>
            <div :class="bemm('image-field')">
              <span :class="bemm('color-label')">Set image</span>
              <MediaPicker
                :model-value="set.imageRef ?? ''"
                emit-id
                @update:model-value="(v: string) => updateSet(si, { imageRef: v || undefined })"
              />
            </div>
            <div :class="bemm('item-actions')">
              <Button variant="ghost" size="small" :disabled="si === 0" @click="moveSet(si, -1)">&#8593;</Button>
              <Button variant="ghost" size="small" :disabled="si === state.answerSets.length - 1" @click="moveSet(si, 1)">&#8595;</Button>
              <Button variant="ghost" size="small" @click="removeSet(si)">Remove</Button>
            </div>
          </header>

          <div :class="bemm('answers-head')">
            <h4 :class="bemm('subtitle')">Tiles ({{ set.answers.length }})</h4>
            <Button variant="outline" size="small" @click="addAnswer(si)">Add tile</Button>
          </div>

          <div v-if="set.answers.length === 0" :class="bemm('empty')">No tiles yet.</div>

          <div v-else :class="bemm('tile-list')">
            <div v-for="(answer, i) in set.answers" :key="answer.id" :class="bemm('item')">
              <div :class="bemm('item-fields')">
                <InputText
                  :model-value="answer.label"
                  label="Label"
                  placeholder="Yes"
                  @update:model-value="(v: string) => updateAnswer(si, i, { label: v })"
                />
                <InputText
                  :model-value="answer.speech"
                  label="Spoken text"
                  placeholder="What to say when tapped"
                  @update:model-value="(v: string) => updateAnswer(si, i, { speech: v })"
                />
                <div :class="bemm('visual-field')">
                  <span :class="bemm('color-label')">Visual</span>
                  <div :class="bemm('visual-toggle')" role="group" aria-label="Tile visual type">
                    <button
                      type="button"
                      :class="bemm('visual-option', { active: !answer.imageRef })"
                      @click="useAnswerIcon(si, i, answer)"
                    >
                      Icon
                    </button>
                    <button
                      type="button"
                      :class="bemm('visual-option', { active: Boolean(answer.imageRef) })"
                      @click="useAnswerImage(si, i)"
                    >
                      Image
                    </button>
                  </div>
                  <TikoOpenIconPicker
                    v-if="!answer.imageRef"
                    :model-value="answer.icon ?? ''"
                    @update:model-value="(v: string) => updateAnswerIcon(si, i, v)"
                  />
                  <MediaPicker
                    v-else
                    :model-value="answer.imageRef ?? ''"
                    emit-id
                    @update:model-value="(v: string) => updateAnswerImage(si, i, v)"
                  />
                </div>
                <div :class="bemm('color-field')">
                  <span :class="bemm('color-label')">Color</span>
                  <ColorSwatchPicker
                    :model-value="answer.color ?? ''"
                    mode="name"
                    @update:model-value="(v: string) => updateAnswer(si, i, { color: v || undefined })"
                  />
                </div>
              </div>
              <div :class="bemm('item-actions')">
                <Button variant="ghost" size="small" :disabled="i === 0" @click="moveAnswer(si, i, -1)">&#8593;</Button>
                <Button variant="ghost" size="small" :disabled="i === set.answers.length - 1" @click="moveAnswer(si, i, 1)">&#8595;</Button>
                <Button variant="ghost" size="small" @click="removeAnswer(si, i)">Remove</Button>
              </div>
            </div>
          </div>
        </article>
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

  &__subtitle {
    font-size: var(--font-size-s);
    font-weight: 700;
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

  &__set {
    display: flex;
    flex-direction: column;
    gap: var(--space-s);
    padding: var(--space-m);
    background: var(--admin-page-bg);
    border: 1px solid var(--admin-border);
    border-radius: var(--border-radius-s);
  }

  &__set-head {
    display: grid;
    grid-template-columns: 1fr 1fr 1.5fr 1fr 1.5fr auto;
    gap: var(--space-s);
    align-items: start;
  }

  &__tile-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-s);
  }

  &__item-fields {
    display: grid;
    grid-template-columns: 1fr 1fr minmax(18rem, 2fr) 1fr;
    gap: var(--space-s);
    align-items: start;
  }

  &__item-actions {
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
  }

  &__color-field,
  &__image-field,
  &__visual-field {
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
  }

  &__visual-toggle {
    display: inline-flex;
    align-self: flex-start;
    border: 1px solid var(--admin-border);
    border-radius: var(--border-radius-xs);
    overflow: hidden;
    background: var(--admin-surface);
  }

  &__visual-option {
    border: 0;
    background: transparent;
    color: var(--admin-text-muted);
    font: inherit;
    font-size: var(--font-size-xs);
    font-weight: 700;
    padding: 0.35rem 0.6rem;
    cursor: pointer;

    &--active {
      background: var(--color-primary);
      color: var(--color-primary-text, #fff);
    }
  }

  &__color-label {
    font-size: var(--font-size-xs);
    font-weight: 600;
    color: var(--admin-text-muted);
  }

  @media (max-width: 980px) {
    &__set-head,
    &__item,
    &__item-fields {
      grid-template-columns: 1fr;
    }

    &__item-actions {
      flex-direction: row;
      flex-wrap: wrap;
    }
  }
}
</style>
