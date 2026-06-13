<script setup lang="ts">
import { useBemm } from 'bemm'
import { Button } from '@sil/ui'
import type { ImageGenerationResult } from '../../types/admin'
import type { QueueItem } from './imageGenerationQueueTypes'

defineProps<{
  queue: QueueItem[]
  imageSrc: (item: ImageGenerationResult) => string
}>()

const emit = defineEmits<{
  clear: []
  retry: [item: QueueItem]
}>()

const page = useBemm('image-page', { return: 'string', includeBaseClass: true })
</script>

<template>
  <aside :class="page('queue')">
    <header :class="page('queue-head')">
      <h3 :class="page('panel-title')">
        Queue <span :class="page('tab-count')">{{ queue.length }}</span>
      </h3>
      <Button
        v-if="queue.some(i => i.status === 'done' || i.status === 'error')"
        variant="ghost"
        size="small"
        @click="emit('clear')"
      >
        Clear done
      </Button>
    </header>

    <div v-if="queue.length === 0" :class="page('queue-empty')">
      No items queued. Add a prompt and click "Add to queue".
    </div>

    <ul v-else :class="page('queue-list')">
      <li
        v-for="item in queue"
        :key="item.id"
        :class="page('queue-item', { [item.status]: true })"
      >
        <div :class="page('queue-status')">
          <span v-if="item.status === 'pending'">...</span>
          <span v-else-if="item.status === 'generating'" :class="page('queue-spinner')">...</span>
          <span v-else-if="item.status === 'done'">Done</span>
          <span v-else>Error</span>
        </div>
        <div :class="page('queue-info')">
          <strong :class="page('queue-label')">{{ item.label }}</strong>
          <span v-if="item.status === 'generating'" :class="page('queue-sub')">Generating...</span>
          <span
            v-else-if="item.status === 'error'"
            :class="page('queue-error')"
            :title="item.error ?? undefined"
          >
            {{ item.error }}
          </span>
          <span v-else-if="item.status === 'done'" :class="page('queue-sub')">
            {{ item.input.type === 'enrich' ? 'Enriched' : Array.isArray(item.result) ? `${item.result.length} images - check Drafts` : 'Done - check Drafts' }}
          </span>
        </div>
        <img
          v-if="item.result && !Array.isArray(item.result)"
          :class="page('queue-thumb')"
          :src="imageSrc(item.result)"
          :alt="item.label"
        />
        <div v-else-if="Array.isArray(item.result)" :class="page('queue-thumbs')">
          <img
            v-for="result in item.result.slice(0, 4)"
            :key="result.id"
            :class="page('queue-thumb')"
            :src="imageSrc(result)"
            :alt="item.label"
          />
        </div>
        <button
          v-if="item.status === 'error'"
          type="button"
          :class="page('queue-retry')"
          @click="emit('retry', item)"
        >
          Retry
        </button>
      </li>
    </ul>
  </aside>
</template>
