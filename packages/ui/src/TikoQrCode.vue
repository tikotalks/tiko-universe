<script setup lang="ts">
import { computed } from 'vue'
import qrcode from 'qrcode-generator'

/**
 * A QR code as inline SVG.
 *
 * Inline rather than an image so it inherits `currentColor`, prints crisply at
 * any size, and needs no network round trip — a family holding up a phone to
 * share a collection should not wait for one.
 */
interface Props {
  /** What the code carries; usually a share link. */
  value: string
  /** Rendered size in CSS pixels. */
  size?: number
  /** Quiet zone in modules. The spec asks for 4; below that scanners struggle. */
  margin?: number
  /** Accessible label for the code. */
  label?: string
}

const props = withDefaults(defineProps<Props>(), {
  size: 200,
  margin: 4,
  label: 'QR code',
})

/**
 * Medium error correction: a code that still scans with a thumb over a corner,
 * without the density of the higher levels.
 */
const modules = computed<boolean[][]>(() => {
  if (!props.value) return []
  const code = qrcode(0, 'M')
  code.addData(props.value)
  code.make()
  const count = code.getModuleCount()
  return Array.from({ length: count }, (_, row) =>
    Array.from({ length: count }, (_, column) => code.isDark(row, column)))
})

const moduleCount = computed(() => modules.value.length)

const viewBoxSize = computed(() => moduleCount.value + props.margin * 2)

/** One path for the whole code — every dark module as a 1×1 square. */
const path = computed(() => {
  const parts: string[] = []
  modules.value.forEach((row, rowIndex) => {
    row.forEach((dark, columnIndex) => {
      if (!dark) return
      parts.push(`M${columnIndex + props.margin} ${rowIndex + props.margin}h1v1h-1z`)
    })
  })
  return parts.join('')
})
</script>

<template>
  <svg
    v-if="moduleCount"
    class="tiko-qr-code"
    xmlns="http://www.w3.org/2000/svg"
    :viewBox="`0 0 ${viewBoxSize} ${viewBoxSize}`"
    :width="size"
    :height="size"
    role="img"
    :aria-label="label"
    shape-rendering="crispEdges"
  >
    <rect :width="viewBoxSize" :height="viewBoxSize" fill="var(--tiko-qr-background, #fff)" />
    <path :d="path" fill="var(--tiko-qr-foreground, #000)" />
  </svg>
</template>
