/**
 * Shared secret resolution for Tiko Cloudflare Workers.
 *
 * Secrets Store bindings are async (`await env.BINDING.get()`), but most worker
 * code reads secrets synchronously (`env.OPENAI_API_KEY`). This helper resolves
 * all Secrets Store bindings once at the top of the request handler and merges
 * them into a plain env object so downstream code is unchanged.
 *
 * Usage in a worker's fetch handler:
 *
 *   async fetch(request, env) {
 *     env = await resolveSecrets(env)
 *     return handleRequest(request, env)
 *   }
 *
 * If a Secrets Store binding is absent, the original env var is kept for local
 * tests and workers that do not declare that binding. If a binding is present,
 * it must resolve successfully.
 */

export type SecretStoreBinding = { get(): Promise<string> }

type ResolverEnv = {
  PEPPER_SECRET?: SecretStoreBinding
  OPENAI_SECRET?: SecretStoreBinding
  ELEVENLABS_SECRET?: SecretStoreBinding
  ATLAS_SECRET?: SecretStoreBinding
  COMMUNICATION_SECRET?: SecretStoreBinding
}

const SECRET_MAPPINGS: Array<{ binding: keyof ResolverEnv; varName: string }> = [
  { binding: 'OPENAI_SECRET', varName: 'OPENAI_API_KEY' },
  { binding: 'ELEVENLABS_SECRET', varName: 'ELEVENLABS_API_KEY' },
  { binding: 'ATLAS_SECRET', varName: 'ATLAS_API_KEY' },
  { binding: 'COMMUNICATION_SECRET', varName: 'COMMUNICATION_API_KEY' },
]

let secretCache = new Map<string, { value: string; expiresAt: number }>()
const SECRET_CACHE_TTL_MS = 5 * 60 * 1000

export async function resolveSecrets<T extends ResolverEnv>(env: T): Promise<T> {
  const now = Date.now()
  const resolved: Record<string, string> = {}

  for (const { binding, varName } of SECRET_MAPPINGS) {
    const storeBinding = env[binding]
    if (!storeBinding) continue

    const cached = secretCache.get(varName)
    if (cached && cached.expiresAt > now) {
      resolved[varName] = cached.value
      continue
    }

    const value = await storeBinding.get()
    if (!value) throw new Error(`secret_store_empty:${String(binding)}`)
    resolved[varName] = value
    secretCache.set(varName, { value, expiresAt: now + SECRET_CACHE_TTL_MS })
  }

  if (Object.keys(resolved).length === 0) return env
  return { ...env, ...resolved }
}
