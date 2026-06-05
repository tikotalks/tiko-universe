<script setup lang="ts">
import { computed } from 'vue'
import { motion, AnimatePresence } from 'motion-v'
import { SilIcon as Icon } from '@tiko/ui'
import { useWordCloudLayout, type VisualWordNode, type PositionedWordNode } from '../composables/useTalkPresentation'

const props = defineProps<{
  words: VisualWordNode[]
}>()

const emit = defineEmits<{
  selectWord: [node: VisualWordNode]
}>()

const sourceWords = computed(() => props.words)
const { cloudEl, positionedNodes } = useWordCloudLayout(sourceWords)

const spring = { type: 'spring' as const, stiffness: 260, damping: 26, mass: 0.85 }
const exitSpring = { type: 'spring' as const, stiffness: 420, damping: 32 }

function nodeAnimate(node: PositionedWordNode) {
  return {
    x: node.x,
    y: node.y,
    scale: 1,
    opacity: node.weight === 'low' ? 0.72 : 1,
  }
}

function nodeStyle(node: PositionedWordNode) {
  return {
    position: 'absolute' as const,
    left: 0,
    top: 0,
    width: `${node.size}px`,
    height: `${node.size}px`,
    marginLeft: `${-node.size / 2}px`,
    marginTop: `${-node.size / 2}px`,
    zIndex: node.zIndex,
    '--bubble-size': `${node.size}px`,
  }
}
</script>

<template>
  <div ref="cloudEl" class="word-cloud" aria-label="Word cloud">
    <AnimatePresence>
      <motion.button
        v-for="node in positionedNodes"
        :key="node.id"
        class="word-bubble"
        :class="[`word-bubble--${node.weight}`, `word-bubble--${node.color}`]"
        :style="nodeStyle(node)"
        :initial="{ x: node.x, y: node.y, scale: 0.3, opacity: 0 }"
        :animate="nodeAnimate(node)"
        :exit="{ scale: 0.2, opacity: 0, transition: exitSpring }"
        :transition="spring"
        :while-hover="{ scale: 1.1 }"
        :while-tap="{ scale: 0.88 }"
        type="button"
        :aria-label="node.label"
        @click="emit('selectWord', node)"
      >
        <Icon v-if="node.icon && node.weight !== 'low'" class="word-bubble__icon" :name="node.icon" aria-hidden="true" />
        <span class="word-bubble__label">{{ node.label }}</span>
      </motion.button>
    </AnimatePresence>
  </div>
</template>
