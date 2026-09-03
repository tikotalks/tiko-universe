<script setup lang="ts">
import { inject, onMounted, ref } from 'vue'
import type { PopupService } from '@sil/ui'
import { TikoQrCode } from '@tiko/ui'
import type { RadioCategory, RadioTrack } from '@tiko/data'
import { useSharedCollections, type SharedCollection } from '../composables/useSharedCollections'

export interface ShareCollectionLabels {
  title: string
  subtitle: string
  publishing: string
  codeLabel: string
  copyLink: string
  copied: string
  skipped: string
  failed: string
  close: string
}

interface Props {
  collection: RadioCategory
  tracks: RadioTrack[]
  sessionToken: string
  labels: ShareCollectionLabels
}

const props = defineProps<Props>()

const popup = inject<PopupService>('popupService')
const shared = useSharedCollections()

const published = ref<SharedCollection | null>(null)
const skipped = ref(0)
const copied = ref(false)

onMounted(async () => {
  const result = await shared.publish(props.collection, props.tracks, props.sessionToken)
  if (!result) return
  published.value = result.collection
  skipped.value = result.skippedSongs
})

/** The code is shown in two halves; eight characters read aloud in one go slip. */
function formatCode(code: string): string {
  return `${code.slice(0, 4)} ${code.slice(4)}`
}

async function copyLink() {
  if (!published.value) return
  try {
    await navigator.clipboard.writeText(published.value.shareUrl)
    copied.value = true
  } catch {
    // Clipboard access can be refused; the link is on screen to copy by hand.
  }
}

function close() {
  popup?.closeAllPopups()
}
</script>

<template>
  <div class="share-collection" data-test="radio-share-collection">
    <div class="share-collection__header">
      <h2 class="share-collection__title">{{ labels.title }}</h2>
      <button class="share-collection__close" :aria-label="labels.close" @click="close">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M18 6L6 18" /><path d="M6 6l12 12" />
        </svg>
      </button>
    </div>

    <p v-if="shared.loading.value" class="share-collection__status">{{ labels.publishing }}</p>

    <template v-else-if="published">
      <p class="share-collection__subtitle">{{ labels.subtitle }}</p>

      <div class="share-collection__qr">
        <TikoQrCode :value="published.shareUrl" :size="220" :label="collection.name" />
      </div>

      <div class="share-collection__code">
        <span class="share-collection__code-label">{{ labels.codeLabel }}</span>
        <span class="share-collection__code-value" data-test="radio-share-code">{{ formatCode(published.code) }}</span>
      </div>

      <button class="share-collection__copy" data-test="radio-share-copy" @click="copyLink">
        {{ copied ? labels.copied : labels.copyLink }}
      </button>

      <p v-if="skipped > 0" class="share-collection__note">
        {{ labels.skipped.replace('{count}', String(skipped)) }}
      </p>
    </template>

    <p v-else class="share-collection__note" data-test="radio-share-error">
      {{ shared.error.value ?? labels.failed }}
    </p>
  </div>
</template>
