<script setup lang="ts">
import { computed } from 'vue'
import { SilIcon as Icon } from '@tiko/ui'
import { useWordCloudLayout, type VisualWordNode } from '../composables/useTalkPresentation'

const props = defineProps<{
  words: VisualWordNode[]
}>()

const emit = defineEmits<{
  selectWord: [node: VisualWordNode]
}>()

const sourceWords = computed(() => props.words)
const { cloudEl, positionedNodes } = useWordCloudLayout(sourceWords)

function bubbleStyle(node: typeof positionedNodes.value[number]) {
  return {
    '--bubble-x': `${node.x}px`,
    '--bubble-y': `${node.y}px`,
    '--bubble-size': `${node.size}px`,
    '--bubble-z': String(node.zIndex),
  }
}
</script>

<template>
  <div ref="cloudEl" class="word-cloud">
    <button
      v-for="node in positionedNodes"
      :key="node.id"
      class="word-bubble"
      :class="[`word-bubble--${node.weight}`, `word-bubble--${node.color}`]"
      :style="bubbleStyle(node)"
      type="button"
      @click="emit('selectWord', node)"
    >
      <Icon v-if="node.icon" class="word-bubble__icon" :name="node.icon" size="large" aria-hidden="true" />
      <span class="word-bubble__label">{{ node.label }}</span>
    </button>
  </div>
</template>
