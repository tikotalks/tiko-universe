import { onMounted, onUnmounted, watch, type Ref } from 'vue'
import type { TikoColorMode } from './index'

export type TikoRuntimeEnv = Record<string, string | undefined>

function getTikoRuntimeEnv(): TikoRuntimeEnv {
  return ((import.meta as ImportMeta & { env?: TikoRuntimeEnv }).env ?? {}) as TikoRuntimeEnv
}

function normalizeBaseUrl(value: string): string {
  return value.replace(/\/$/, '')
}

function resolveTikoBaseUrl(keys: string[], fallback: string, env: TikoRuntimeEnv = getTikoRuntimeEnv()): string {
  for (const key of keys) {
    const value = env[key]
    if (typeof value === 'string' && value.trim()) return normalizeBaseUrl(value.trim())
  }
  return normalizeBaseUrl(fallback)
}

export function resolveTikoAppApiBaseUrl(env?: TikoRuntimeEnv): string {
  return resolveTikoBaseUrl(['VITE_TIKO_API_BASE_URL', 'VITE_APP_API_URL'], 'https://app.tikoapi.org/v1', env)
}

export function resolveTikoIdentityBaseUrl(env?: TikoRuntimeEnv): string {
  return resolveTikoBaseUrl(['VITE_IDENTITY_API_URL', 'VITE_TIKO_IDENTITY_BASE_URL'], 'https://id.tikoapps.org/v1', env)
}

export function resolveTikoContentApiBaseUrl(env?: TikoRuntimeEnv): string {
  return resolveTikoBaseUrl(['VITE_TIKO_CONTENT_BASE_URL', 'VITE_CONTENT_API_URL'], 'https://content.tikoapi.org/v1', env)
}

export function resolveTikoGenerationApiBaseUrl(env?: TikoRuntimeEnv): string {
  return resolveTikoBaseUrl(['VITE_GENERATION_API_URL'], 'https://generation.tikoapi.org/v1/generation', env)
}

export function resolveTikoMediaApiBaseUrl(env?: TikoRuntimeEnv): string {
  return resolveTikoBaseUrl(['VITE_MEDIA_API_URL'], 'https://media.tikoapi.org/v1', env)
}

export function readTikoLocalJson<T>(key: string, fallback: T, storage: Storage | undefined = typeof window === 'undefined' ? undefined : window.localStorage): T {
  if (!storage) return fallback
  try {
    return JSON.parse(storage.getItem(key) ?? 'null') ?? fallback
  } catch {
    return fallback
  }
}

export function writeTikoLocalJson(key: string, value: unknown, storage: Storage | undefined = typeof window === 'undefined' ? undefined : window.localStorage) {
  if (!storage) return
  storage.setItem(key, JSON.stringify(value))
}

export function normalizeTikoColorMode(value: string | null | undefined): TikoColorMode {
  return value === 'light' || value === 'dark' || value === 'system' ? value : 'system'
}

export function resolveTikoColorMode(mode: TikoColorMode, mediaMatcher: Pick<Window, 'matchMedia'> | undefined = typeof window === 'undefined' ? undefined : window): 'light' | 'dark' {
  if (mode !== 'system') return mode
  if (!mediaMatcher) return 'light'
  return mediaMatcher.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export interface TikoColorModeDocument {
  documentElement: { dataset: { colorMode?: string; theme?: string } }
}

export interface TikoColorModeMediaQuery {
  matches: boolean
  addEventListener?: (type: 'change', listener: () => void) => void
  removeEventListener?: (type: 'change', listener: () => void) => void
  addListener?: (listener: () => void) => void
  removeListener?: (listener: () => void) => void
}

export interface TikoColorModeWindow {
  matchMedia?: (query: string) => TikoColorModeMediaQuery
}

export function applyTikoColorMode(mode: TikoColorMode, documentTarget: TikoColorModeDocument | undefined = typeof document === 'undefined' ? undefined : document, windowTarget: TikoColorModeWindow | undefined = typeof window === 'undefined' ? undefined : window): 'light' | 'dark' {
  const effective = mode === 'system'
    ? (windowTarget?.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    : mode
  if (documentTarget) {
    documentTarget.documentElement.dataset.colorMode = effective
    documentTarget.documentElement.dataset.theme = effective
  }
  return effective
}

export function useTikoColorModeEffect(mode: Ref<TikoColorMode>, documentTarget: TikoColorModeDocument | undefined = typeof document === 'undefined' ? undefined : document, windowTarget: TikoColorModeWindow | undefined = typeof window === 'undefined' ? undefined : window) {
  const query = windowTarget?.matchMedia?.('(prefers-color-scheme: dark)')
  const apply = () => applyTikoColorMode(mode.value, documentTarget, windowTarget)
  const stopWatch = watch(mode, apply, { immediate: true })

  onMounted(() => {
    if (query?.addEventListener) query.addEventListener('change', apply)
    else query?.addListener?.(apply)
  })

  onUnmounted(() => {
    if (query?.removeEventListener) query.removeEventListener('change', apply)
    else query?.removeListener?.(apply)
    stopWatch()
  })

  return { apply, stop: stopWatch }
}
