<script setup lang="ts">
import {
  TikoSegmentedControl,
  TikoSettingsPanel,
  TikoSheet,
  TikoToggleRow,
  type TikoColorMode,
} from '@tiko/ui'
import type { TikoLanguage } from '@tiko/i18n'

defineProps<{
  language: TikoLanguage
  colorMode: TikoColorMode
  hideDefaultCollections: boolean
  showAnimations: boolean
  cardSizeIndex: number
  labelSizeIndex: number
}>()

const emit = defineEmits<{
  'update:language': [value: TikoLanguage]
  'update:colorMode': [value: TikoColorMode]
  'update:hideDefaultCollections': [value: boolean]
  'update:showAnimations': [value: boolean]
  'update:cardSizeIndex': [value: number]
  'update:labelSizeIndex': [value: number]
}>()
</script>

<template>
  <TikoSheet title="Settings" icon="settings">
    <TikoSettingsPanel
      :language="language"
      :color-mode="colorMode"
      @update:language="emit('update:language', $event as TikoLanguage)"
      @update:color-mode="emit('update:colorMode', $event as TikoColorMode)"
    />
    <TikoToggleRow
      :model-value="hideDefaultCollections"
      label="Hide Default Sets"
      @update:model-value="emit('update:hideDefaultCollections', $event)"
    />
    <TikoToggleRow
      :model-value="showAnimations"
      label="Show Animations"
      @update:model-value="emit('update:showAnimations', $event)"
    />
    <TikoSegmentedControl
      :model-value="cardSizeIndex"
      label="Card Size"
      :options="['Small', 'Medium', 'Large']"
      @update:model-value="emit('update:cardSizeIndex', $event)"
    />
    <TikoSegmentedControl
      :model-value="labelSizeIndex"
      label="Label Size"
      :options="['Small', 'Medium', 'Large']"
      @update:model-value="emit('update:labelSizeIndex', $event)"
    />
  </TikoSheet>
</template>
