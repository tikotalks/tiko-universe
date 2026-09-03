<script setup lang="ts">
import { computed } from 'vue'
import type { RadioServiceProvider, RadioSubscription } from '@tiko/data'
import { radioServices } from '../composables/useSubscriptions'

interface Props {
  subscriptions: RadioSubscription[]
  labels: {
    title: string
    subtitle: string
    link: string
    unlink: string
    linked: string
    spotifyHint: string
    appleMusicHint: string
  }
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'link', provider: RadioServiceProvider): void
  (e: 'unlink', provider: RadioServiceProvider): void
}>()

const linkedProviders = computed(() => new Set(props.subscriptions.map(subscription => subscription.provider)))

function hintFor(provider: RadioServiceProvider): string {
  return provider === 'spotify' ? props.labels.spotifyHint : props.labels.appleMusicHint
}
</script>

<template>
  <div class="radio-services" data-test="radio-services">
    <h2 class="radio-services__title">{{ labels.title }}</h2>
    <p class="radio-services__subtitle">{{ labels.subtitle }}</p>

    <div
      v-for="service in radioServices"
      :key="service.provider"
      class="radio-services__row"
      :class="`radio-services__row--${service.provider}`"
    >
      <div class="radio-services__info">
        <span class="radio-services__name">{{ service.name }}</span>
        <span class="radio-services__hint">{{ hintFor(service.provider) }}</span>
      </div>
      <button
        v-if="linkedProviders.has(service.provider)"
        class="radio-services__button"
        :data-test="`radio-services-unlink-${service.provider}`"
        @click="emit('unlink', service.provider)"
      >
        {{ labels.unlink }}
      </button>
      <button
        v-else
        class="radio-services__button radio-services__button--primary"
        :data-test="`radio-services-link-${service.provider}`"
        @click="emit('link', service.provider)"
      >
        {{ labels.link }}
      </button>
    </div>
  </div>
</template>
