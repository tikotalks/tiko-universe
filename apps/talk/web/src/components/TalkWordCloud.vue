<script setup lang="ts">
import { computed } from 'vue'
import { useBemm } from 'bemm'
import { motion, AnimatePresence } from 'motion-v'
import { SilIcon as Icon } from '@tiko/ui'
import { useWordCloudLayout, type VisualWordNode, type PositionedWordNode } from '../composables/useTalkPresentation'

const bemm = useBemm('word-cloud', { return: 'string', includeBaseClass: true })

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
  <div ref="cloudEl" :class="bemm('')" aria-label="Word cloud">
    <motion.div :class="bemm('canvas')" drag :drag-elastic="0" :drag-momentum="true">
      <AnimatePresence>
        <motion.button
          v-for="node in positionedNodes"
          :key="node.id"
          :class="bemm('bubble', { [node.weight]: true, [node.color]: true })"
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
          <Icon v-if="node.icon && node.weight !== 'low'" :class="bemm('bubble-icon')" :name="node.icon" aria-hidden="true" />
          <span :class="bemm('bubble-label')">{{ node.label }}</span>
        </motion.button>
      </AnimatePresence>
    </motion.div>
  </div>
</template>

<style lang="scss">
.word-cloud {
  flex: 1;
  position: relative;
  min-height: 0;
  overflow: hidden;

  &__canvas {
    position: absolute;
    inset: 0;
    cursor: grab;

    &:active { cursor: grabbing; }
  }

  &__bubble {
    border: 0;
    padding: 0.4rem;
    border-radius: 50%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.08em;
    color: var(--talk-ink);
    box-shadow:
      inset 0 0.3em 0 color-mix(in srgb, var(--color-background) 45%, transparent),
      0 0.25em 0 color-mix(in srgb, var(--color-foreground) 8%, transparent),
      0 0.6em 1.2em var(--talk-shadow-soft);
    font-weight: 1000;
    cursor: pointer;
    will-change: transform;
    font-size: calc(var(--bubble-size, 60px) * 0.16);

    &--yellow { background: #ffe38b; }
    &--mint { background: #94e2da; }
    &--lavender { background: #d6c0f3; }
    &--peach { background: #ffaaa5; }
    &--blue { background: #b8ddf6; }
    &--green { background: #d4eeb9; }
    &--pink { background: #ffb8c3; }

    &--low { .word-cloud__bubble-icon { display: none; } }
  }

  &__bubble-icon {
    font-size: 2.2em;
    line-height: 1;
    filter: drop-shadow(0 0.12em 0.1em rgba(30, 24, 18, 0.14));
    pointer-events: none;
  }

  &__bubble-label {
    font-size: 0.95em;
    line-height: 1.1;
    text-align: center;
    word-break: break-word;
    max-width: 90%;
    pointer-events: none;
  }
}
</style>
