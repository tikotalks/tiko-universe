<script setup lang="ts">
import { computed, h, inject, markRaw, ref } from 'vue'
import { useBemm } from 'bemm'
import { Button, Icon, type PopupService } from '@sil/ui'
import { TikoColorPicker, TikoField, TikoSheet, tikoContentImageRefUrl } from '@tiko/ui'
import type { TikoColorName } from '@tiko/data'
import type { AnswerSet, AnswerSetInput, AnswerTile, AnswerTileInput } from '../types'
import { colorValue, isUserOwned } from '../composables/useYesNoStore'
import YesNoImageChooser from './YesNoImageChooser.vue'
import YesNoAnswerTileSheet from './YesNoAnswerTileSheet.vue'

const props = defineProps<{
  mode: 'add' | 'edit'
  set?: AnswerSet
  labels: {
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
    addSet: string
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
  }
  contentBaseUrl: string
}>()

const emit = defineEmits<{
  submit: [value: AnswerSetInput & { answers: AnswerTile[] }]
  cancel: []
}>()

const popup = inject<PopupService>('popupService')!
const bemm = useBemm('yes-no-set-sheet', { return: 'string', includeBaseClass: true })

const title = ref(props.set?.title ?? '')
const description = ref(props.set?.description ?? '')
const color = ref<TikoColorName>((props.set?.color as TikoColorName) ?? 'teal')
const imageRef = ref(props.set?.imageRef ?? '')
const tiles = ref<AnswerTile[]>(props.set?.answers ? [...props.set.answers] : [])

const readonly = computed(() => Boolean(props.set && !isUserOwned(props.set.id)))

function tileImage(tile: AnswerTile) {
  return tile.imageRef ? tikoContentImageRefUrl(tile.imageRef, props.contentBaseUrl) : ''
}

function tileStyle(tile: AnswerTile) {
  const hex = colorValue(tile.color as TikoColorName) ?? colorValue(color.value)
  return hex ? { backgroundColor: hex } : {}
}

function submit() {
  emit('submit', {
    title: title.value,
    color: color.value,
    ...(description.value.trim() ? { description: description.value.trim() } : {}),
    ...(imageRef.value ? { imageRef: imageRef.value } : {}),
    answers: tiles.value,
  })
}

function openTileEditor(mode: 'add' | 'edit', tile?: AnswerTile) {
  popup.showPopup({
    id: `yes-no-tile-${mode}`,
    closePopups: true,
    title: '',
    component: markRaw({
      setup() {
        return () => h(YesNoAnswerTileSheet, {
          mode,
          set: { id: props.set?.id ?? 'draft', title: title.value || 'Draft', color: color.value, order: 0, answers: tiles.value },
          ...(tile ? { tile } : {}),
          labels: props.labels,
          onSubmit: (value: AnswerTileInput) => {
            if (mode === 'add') {
              tiles.value = [...tiles.value, {
                id: `user_${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}_${Math.random().toString(36).slice(2)}`}`,
                label: value.label,
                speech: value.speech,
                color: value.color,
                order: tiles.value.length,
                ...(value.imageRef ? { imageRef: value.imageRef } : {}),
                ...(value.icon ? { icon: value.icon } : {}),
              }]
            } else if (tile) {
              tiles.value = tiles.value.map(item => item.id === tile.id ? { ...item, ...value } : item)
            }
            popup.closeAllPopups()
          },
          onCancel: popup.closeAllPopups,
        })
      },
    }),
    config: {
      position: 'center',
      canClose: true,
      background: true,
      width: '26rem',
    },
  })
}

function removeTile(tile: AnswerTile) {
  tiles.value = tiles.value.filter(item => item.id !== tile.id)
}
</script>

<template>
  <form @submit.prevent="submit">
    <TikoSheet :title="mode === 'add' ? labels.newSet : labels.editSet" icon="grid">
      <TikoField v-model="title" :label="labels.setName" :placeholder="labels.setNamePlaceholder" />
      <TikoField v-model="description" :label="labels.description" :placeholder="labels.descriptionPlaceholder" />
      <TikoColorPicker v-model="color" value-mode="name" :label="labels.color" />
      <YesNoImageChooser v-model="imageRef" :query="title" :labels="labels" />

      <div :class="bemm('tiles')">
        <span :class="bemm('tiles-label')">{{ labels.tiles }}</span>
        <p v-if="readonly" :class="bemm('readonly')">{{ labels.readonlySet }}</p>
        <p v-else-if="!tiles.length" :class="bemm('tiles-empty')">{{ labels.tilesEmpty }}</p>
        <ul v-else :class="bemm('tiles-list')">
          <li v-for="tile in tiles" :key="tile.id" :class="bemm('tile')">
            <span :class="bemm('tile-thumb')" :style="tileStyle(tile)">
              <img v-if="tileImage(tile)" :src="tileImage(tile)" alt="" loading="lazy">
              <Icon v-else-if="tile.icon" :name="tile.icon" size="medium" aria-hidden="true" />
            </span>
            <span :class="bemm('tile-info')">
              <strong>{{ tile.label }}</strong>
              <small v-if="tile.speech && tile.speech !== tile.label">{{ tile.speech }}</small>
            </span>
            <button v-if="!readonly" type="button" :class="bemm('tile-action')" :aria-label="labels.editTile" @click="openTileEditor('edit', tile)">
              <Icon name="ui/edit-fat" size="small" aria-hidden="true" />
            </button>
            <button v-if="!readonly" type="button" :class="bemm('tile-action')" :aria-label="labels.delete" @click="removeTile(tile)">
              <Icon name="wayfinding/cross" size="small" aria-hidden="true" />
            </button>
          </li>
        </ul>
        <Button v-if="!readonly" type="button" variant="ghost" :class="bemm('add-tile')" @click="openTileEditor('add')">
          <Icon name="ui/add-fat" size="small" aria-hidden="true" />
          {{ labels.addTile }}
        </Button>
      </div>

      <template #footer>
        <Button type="button" variant="ghost" @click="emit('cancel')">{{ labels.cancel }}</Button>
        <Button type="submit" variant="primary" :disabled="!title.trim()">
          {{ mode === 'add' ? labels.addSet : labels.save }}
        </Button>
      </template>
    </TikoSheet>
  </form>
</template>
