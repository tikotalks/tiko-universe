import { computed, ref, watch, type ComputedRef } from 'vue'
import { resolveTikoMediaApiBaseUrl } from '@tiko/ui'
import type { RadioServiceProvider, RadioSubscription, TrackSource } from '@tiko/data'

export interface RadioServiceDefinition {
  provider: RadioServiceProvider
  /** Track source songs from this service are stored under. */
  source: TrackSource
  name: string
  /** Where a parent finds the share link, shown as the input placeholder. */
  linkExample: string
  /** True when Radio itself can play the song; false means it opens in the service. */
  playsInApp: boolean
}

export const radioServices: RadioServiceDefinition[] = [
  {
    provider: 'spotify',
    source: 'spotify',
    name: 'Spotify',
    linkExample: 'https://open.spotify.com/track/…',
    playsInApp: true,
  },
  {
    provider: 'apple-music',
    source: 'apple-music',
    name: 'Apple Music',
    linkExample: 'https://music.apple.com/…?i=…',
    playsInApp: false,
  },
]

export function radioServiceFor(provider: RadioServiceProvider): RadioServiceDefinition {
  return radioServices.find(service => service.provider === provider) ?? radioServices[0]
}

function normalizeSubscription(value: Partial<RadioSubscription>): RadioSubscription | null {
  if (value.provider !== 'spotify' && value.provider !== 'apple-music') return null
  return {
    provider: value.provider,
    displayName: typeof value.displayName === 'string' && value.displayName.trim() ? value.displayName.trim() : undefined,
    linkedAt: typeof value.linkedAt === 'string' ? value.linkedAt : new Date().toISOString(),
  }
}

/** Streaming subscriptions the parent linked, local-first like the rest of Radio. */
export function useSubscriptions(storageKey: string = 'tiko:radio:subscriptions') {
  const subscriptions = ref<RadioSubscription[]>(loadSubscriptions())

  function loadSubscriptions(): RadioSubscription[] {
    if (typeof window === 'undefined') return []
    try {
      const raw = window.localStorage.getItem(storageKey)
      if (!raw) return []
      return (JSON.parse(raw) as Partial<RadioSubscription>[])
        .map(normalizeSubscription)
        .filter((entry): entry is RadioSubscription => entry !== null)
    } catch {
      return []
    }
  }

  function saveSubscriptions() {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(storageKey, JSON.stringify(subscriptions.value))
  }

  const linkedProviders: ComputedRef<RadioServiceProvider[]> = computed(
    () => subscriptions.value.map(subscription => subscription.provider),
  )

  function isLinked(provider: RadioServiceProvider): boolean {
    return subscriptions.value.some(subscription => subscription.provider === provider)
  }

  function link(provider: RadioServiceProvider, displayName?: string): RadioSubscription {
    const subscription: RadioSubscription = {
      provider,
      displayName: displayName?.trim() || undefined,
      linkedAt: new Date().toISOString(),
    }
    subscriptions.value = [
      ...subscriptions.value.filter(existing => existing.provider !== provider),
      subscription,
    ]
    return subscription
  }

  function unlink(provider: RadioServiceProvider) {
    subscriptions.value = subscriptions.value.filter(subscription => subscription.provider !== provider)
  }

  function replaceSubscriptions(next: Partial<RadioSubscription>[]) {
    subscriptions.value = next
      .map(normalizeSubscription)
      .filter((entry): entry is RadioSubscription => entry !== null)
  }

  watch(subscriptions, saveSubscriptions, { deep: true })

  return { subscriptions, linkedProviders, isLinked, link, unlink, replaceSubscriptions }
}

export interface ResolvedMusicLink {
  provider: RadioServiceProvider
  externalId: string
  externalUrl: string
  title: string
  artist?: string
  thumbnailUrl?: string
  durationSeconds?: number
}

/**
 * Resolve a Spotify or Apple Music share link through media-api, which reads the
 * services' public metadata endpoints server-side (no CORS, no credentials).
 */
export function useMusicLinks(baseUrl: string = resolveTikoMediaApiBaseUrl()) {
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function resolveLink(link: string): Promise<ResolvedMusicLink | null> {
    const value = link.trim()
    if (!value) return null
    loading.value = true
    error.value = null
    try {
      const url = `${baseUrl.replace(/\/$/, '')}/music/resolve?url=${encodeURIComponent(value)}`
      const response = await fetch(url)
      const body = await response.json() as { data?: ResolvedMusicLink; error?: { message?: string } }
      if (!response.ok || !body.data) {
        error.value = body.error?.message ?? 'That link could not be resolved.'
        return null
      }
      return body.data
    } catch {
      error.value = 'That link could not be resolved.'
      return null
    } finally {
      loading.value = false
    }
  }

  return { loading, error, resolveLink }
}
