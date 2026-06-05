import type { Env } from './types'

export async function sha256Hex(value: unknown, length = 32): Promise<string> {
  const text = typeof value === 'string' ? value : stableJson(value)
  const bytes = new TextEncoder().encode(text)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('').slice(0, length)
}

export function stableJson(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`
  return `{${Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${stableJson(item)}`).join(',')}}`
}

export async function getCachedJson<T>(env: Env, key: string): Promise<T | null> {
  const raw = await env.ATLAS_CACHE?.get(key)
  if (!raw) return null
  try { return JSON.parse(raw) as T } catch { return null }
}

export async function putCachedJson(env: Env, key: string, value: unknown, ttlSeconds: number): Promise<void> {
  await env.ATLAS_CACHE?.put(key, JSON.stringify(value), { expirationTtl: ttlSeconds })
}

export function bytesBody(bytes: Uint8Array): ArrayBuffer {
  const body = new ArrayBuffer(bytes.byteLength)
  new Uint8Array(body).set(bytes)
  return body
}
