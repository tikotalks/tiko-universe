<script setup lang="ts">
import { computed, h, inject, markRaw } from 'vue'
import { useBemm } from 'bemm'
import { Button, Icon, type PopupService } from '@sil/ui'
import { TikoSheet, tikoContentImageRefUrl } from '@tiko/ui'
import type { AnswerSet, AnswerSetInput, AnswerTile } from '../types'
import { colorValue, isUserOwned } from '../composables/useYesNoStore'
import YesNoAnswerSetSheet from './YesNoAnswerSetSheet.vue'

const props = defineProps<{
  answerSets: AnswerSet[]
  selectedSetId: string | null
  contentBaseUrl: string
  labels: {
    title: string
    subtitle: string
    empty: string
    addSet: string
    newSet: string
    editSet: string
    setName: string
    setNamePlaceholder: string
    description: string
    descriptionPlaceholder: string
    color: string
    image: string
    changeImage: string
    addImage: string
    pickImage: string
    search: string
    searching: string
    searchImages: string
    typeToSearch: string
    cancel: string
    save: string
    tiles: string
    tilesEmpty: string
    addTile: string
    newTile: string
    editTile: string
    name: string
    namePlaceholder: string
    spokenText: string
    whatShouldBeSpoken: string
    delete: string
    readonlySet: string
    select: string
    tileCount: string
  }
}>()

const emit = defineEmits<{
  close: []
  select: [id: string]
  createSet: [value: AnswerSetInput & { answers: AnswerTile[] }]
  updateSet: [id: string, value: AnswerSetInput & { answers: AnswerTile[] }]
  deleteSet: [id: string]
}>()

const popup = inject<PopupService>('popupService')!
const bemm = useBemm('yes-no-tiles-sheet', { return: 'string', includeBaseClass: true })

const sortedSets = computed(() => [...props.answerSets].sort((a, b) => a.order - b.order))

function setThumbStyle(set: AnswerSet) {
  const hex = colorValue(set.color)
  return hex ? { backgroundColor: hex } : {}
}

function setThumbImage(set: AnswerSet) {
  return set.imageRef ? tikoContentImageRefUrl(set.imageRef, props.contentBaseUrl) : ''
}

function openSetEditor(mode: 'add' | 'edit', set?: AnswerSet) {
  popup.showPopup({
    id: `yes-no-set-${mode}`,
    closePopups: true,
    title: '',
    component: markRaw({
      setup() {
        return () => h(YesNoAnswerSetSheet, {
          mode,
          ...(set ? { set } : {}),
          contentBaseUrl: props.contentBaseUrl,
          labels: props.labels,
          onSubmit: (value: AnswerSetInput & { answers: AnswerTile[] }) => {
            if (mode === 'add') emit('createSet', value)
            else if (set) emit('updateSet', set.id, value)
            popup.closeAllPopups()
          },
          onCancel: () => popup.closeAllPopups(),
        })
      },
    }),
    config: {
      position: 'center',
      canClose: true,
      background: true,
      width: '28rem',
    },
  })
}
</script>

<template>
  <TikoSheet :title="labels.title" icon="grid">
    <p :class="bemm('subtitle')">{{ labels.subtitle }}</p>

    <p v-if="!sortedSets.length" :class="bemm('empty')">{{ labels.empty }}</p>
    <ul v-else :class="bemm('list')">
      <li
        v-for="set in sortedSets"
        :key="set.id"
        :class="bemm('row', { selected: set.id === selectedSetId })"
      >
        <span :class="bemm('thumb')" :style="setThumbStyle(set)">
          <img v-if="setThumbImage(set)" :src="setThumbImage(set)" alt="" loading="lazy">
        </span>
        <span :class="bemm('info')">
          <strong>{{ set.title }}</strong>
          <small>{{ set.answers.length }} {{ labels.tileCount }}</small>
        </span>
        <button
          type="button"
          :class="bemm('action', { active: set.id === selectedSetId })"
          :aria-label="labels.select"
          :aria-pressed="set.id === selectedSetId ? 'true' : 'false'"
          @click="emit('select', set.id)"
        >
          <Icon :name="set.id === selectedSetId ? 'ui/check-fat' : 'ui/circled'" size="medium" aria-hidden="true" />
        </button>
        <button type="button" :class="bemm('action')" :aria-label="labels.editSet" @click="openSetEditor('edit', set)">
          <Icon name="ui/edit-fat" size="small" aria-hidden="true" />
        </button>
        <button
          v-if="isUserOwned(set.id)"
          type="button"
          :class="bemm('action', { danger: true })"
          :aria-label="labels.delete"
          @click="emit('deleteSet', set.id)"
        >
          <Icon name="wayfinding/cross" size="small" aria-hidden="true" />
        </button>
      </li>
    </ul>

    <Button type="button" variant="ghost" :class="bemm('add')" @click="openSetEditor('add')">
      <Icon name="ui/add-fat" size="small" aria-hidden="true" />
      {{ labels.addSet }}
    </Button>

    <template #footer>
      <Button type="button" variant="primary" @click="emit('close')">{{ labels.save }}</Button>
    </template>
  </TikoSheet>
</template>
