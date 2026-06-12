<script setup lang="ts">
import {
  TikoSegmentedControl,
  TikoSettingsPanel,
  TikoSheet,
  TikoToggleRow,
  type TikoColorMode,
} from '@tiko/ui'
import type { TikoLanguage, TikoLanguageOption } from '@tiko/i18n'

defineProps<{
  language: TikoLanguage
  languages: TikoLanguageOption[]
  colorMode: TikoColorMode
  hideDefaultCollections: boolean
  showAnimations: boolean
  cardSizeIndex: number
  labelSizeIndex: number
  labels: {
    settings: string
    hideDefaultSets: string
    showAnimations: string
    cardSize: string
    labelSize: string
    small: string
    medium: string
    large: string
    settingsPanel: {
      settings: string
      appearance: string
      appPreferences: string
      language: string
      colorMode: string
      light: string
      dark: string
      system: string
    }
  }
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
  <TikoSheet :title="labels.settings" icon="settings">
    <TikoSettingsPanel
      :language="language"
      :languages="languages"
      :color-mode="colorMode"
      :labels="labels.settingsPanel"
      @update:language="emit('update:language', $event as TikoLanguage)"
      @update:color-mode="emit('update:colorMode', $event as TikoColorMode)"
    />
    <TikoToggleRow
      :model-value="hideDefaultCollections"
      :label="labels.hideDefaultSets"
      @update:model-value="emit('update:hideDefaultCollections', $event)"
    />
    <TikoToggleRow
      :model-value="showAnimations"
      :label="labels.showAnimations"
      @update:model-value="emit('update:showAnimations', $event)"
    />
    <TikoSegmentedControl
      :model-value="cardSizeIndex"
      :label="labels.cardSize"
      :options="[labels.small, labels.medium, labels.large]"
      @update:model-value="emit('update:cardSizeIndex', $event)"
    />
    <TikoSegmentedControl
      :model-value="labelSizeIndex"
      :label="labels.labelSize"
      :options="[labels.small, labels.medium, labels.large]"
      @update:model-value="emit('update:labelSizeIndex', $event)"
    />
  </TikoSheet>
</template>
