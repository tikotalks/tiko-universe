<script setup lang="ts">
import { computed, inject, onMounted, ref, watch } from 'vue'
import { Icon as SilIcon } from '@sil/ui'
import type { PopupService } from '@sil/ui'
import { tikoColors, tikoImageUrl } from '@tiko/ui'
import type { TikoColorName } from '@tiko/data'
import { useMediaImages } from '../composables/useMediaImages'
import { colorNamesForNewCollections } from '../radioCollections'

export interface CollectionFormValue {
  name: string
  color: TikoColorName
  imageUrl?: string
}

interface Props {
  title: string
  submitLabel: string
  name?: string
  color?: TikoColorName
  imageUrl?: string
  labels: {
    name: string
    artwork: string
    artworkSearch: string
    artworkEmpty: string
    color: string
    cancel: string
  }
}

const props = withDefaults(defineProps<Props>(), {
  name: '',
  color: 'red',
  imageUrl: '',
})

const emit = defineEmits<{ (e: 'submit', value: CollectionFormValue): void }>()

const popup = inject<PopupService>('popupService')
const media = useMediaImages()

const name = ref(props.name)
const color = ref<TikoColorName>(props.color)
const imageUrl = ref(props.imageUrl)
const artworkQuery = ref('')

const colorHexByName = new Map(tikoColors.map(entry => [entry.name, entry.hex]))
const paletteColors = colorNamesForNewCollections

const canSubmit = computed(() => name.value.trim().length > 0)
const selectedColorHex = computed(() => colorHexByName.get(color.value) ?? '#e84057')

watch(artworkQuery, (query) => {
  media.searchDebounced(query)
})

onMounted(() => {
  // Seed the grid with recent Tiko pictures so there is something to pick
  // before the parent types anything.
  void media.search('')
})

function chooseImage(url: string) {
  imageUrl.value = imageUrl.value === url ? '' : url
}

function submit() {
  if (!canSubmit.value) return
  emit('submit', {
    name: name.value.trim(),
    color: color.value,
    imageUrl: imageUrl.value || undefined,
  })
  popup?.closeAllPopups()
}

function cancel() {
  popup?.closeAllPopups()
}
</script>

<template>
  <div class="collection-form" data-test="radio-collection-form">
    <h2 class="collection-form__title">{{ title }}</h2>

    <label class="collection-form__label" for="collection-name">{{ labels.name }}</label>
    <input
      id="collection-name"
      v-model="name"
      class="collection-form__input"
      data-test="radio-collection-name"
      type="text"
      @keyup.enter="submit"
    />

    <span class="collection-form__label">{{ labels.color }}</span>
    <div class="collection-form__colors">
      <button
        v-for="entry in paletteColors"
        :key="entry"
        class="collection-form__color"
        :class="{ 'collection-form__color--active': color === entry }"
        :style="{ background: colorHexByName.get(entry) }"
        :aria-label="entry"
        @click="color = entry as TikoColorName"
      />
    </div>

    <span class="collection-form__label">{{ labels.artwork }}</span>
    <div class="collection-form__preview" :style="{ background: selectedColorHex }">
      <img v-if="imageUrl" :src="tikoImageUrl(imageUrl, 'small')" :alt="name" />
      <SilIcon v-else name="media/music-note" size="large" />
    </div>

    <input
      v-model="artworkQuery"
      class="collection-form__input"
      type="search"
      :placeholder="labels.artworkSearch"
    />

    <div v-if="media.images.value.length" class="collection-form__artwork-grid">
      <button
        v-for="image in media.images.value"
        :key="image.id"
        class="collection-form__artwork"
        :class="{ 'collection-form__artwork--active': imageUrl === image.url }"
        :title="image.title"
        @click="chooseImage(image.url)"
      >
        <img :src="image.previewUrl" :alt="image.title" loading="lazy" />
      </button>
    </div>
    <p v-else-if="media.searched.value && !media.loading.value" class="collection-form__empty">
      {{ labels.artworkEmpty }}
    </p>

    <div class="collection-form__actions">
      <button class="collection-form__button" @click="cancel">{{ labels.cancel }}</button>
      <button
        class="collection-form__button collection-form__button--primary"
        data-test="radio-collection-submit"
        :disabled="!canSubmit"
        @click="submit"
      >
        {{ submitLabel }}
      </button>
    </div>
  </div>
</template>
