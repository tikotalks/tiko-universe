// ─────────────────────────────────────────────────────────────────────────────
// translations-api
//
// Cloudflare Worker: thin caching proxy between Tiko clients and Lezu.
//
// Public endpoints (no auth):
//   GET  /v1/:app/:language        — fetch translations for one app + language
//
// Protected endpoints (ApiKey auth):
//   POST /v1/sync                  — purge all cached locales
//   POST /v1/sync/:language        — purge one cached locale
//   POST /v1/import                — seed Lezu with source strings
//
// Environment (set via wrangler secret put):
//   LEZU_API_KEY      — lez_user_... key
//   LEZU_PROJECT_ID   — project_... UUID
//   WEBHOOK_SECRET    — optional, verifies Lezu webhook calls to /v1/sync
//
// KV namespace:
//   TRANSLATIONS_KV   — caches full locale bundles for 4 hours
// ─────────────────────────────────────────────────────────────────────────────

interface Env {
  TRANSLATIONS_KV: KVNamespace
  LEZU_API_KEY: string
  LEZU_PROJECT_ID: string
  WEBHOOK_SECRET?: string
}

interface KVNamespace {
  get(key: string, type: 'json'): Promise<Record<string, string> | null>
  get(key: string): Promise<string | null>
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>
  delete(key: string): Promise<void>
  list(options?: { prefix?: string }): Promise<{ keys: Array<{ name: string }> }>
}

// ── Constants ────────────────────────────────────────────────────────────────

const LEZU_BASE = 'https://api.lezu.app'
const KV_TTL = 4 * 60 * 60 // 4 hours

// Maps TikoAppKey values to their i18n key prefixes (always include 'common.')
const APP_PREFIXES: Record<string, string[]> = {
  'yes-no':   ['yesNo.',    'common.'],
  'type':     ['type.',     'common.'],
  'timer':    ['timer.',    'common.'],
  'radio':    ['radio.',    'common.'],
  'cards':    ['cards.',    'common.'],
  'sequence': ['sequence.', 'common.'],
  'todo':     ['todo.',     'common.'],
  'website':  ['website.',  'common.'],
  'admin':    ['admin.',    'common.'],
}

const CORS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  })
}

function corsPrelight(): Response {
  return new Response(null, { status: 204, headers: CORS })
}

function isAuthorized(request: Request, env: Env): boolean {
  const auth = request.headers.get('Authorization')
  return auth === `ApiKey ${env.LEZU_API_KEY}` || auth === `ApiKey ${env.WEBHOOK_SECRET ?? ''}`
}

// ── Lezu API calls ────────────────────────────────────────────────────────────

async function exportFromLezu(language: string, env: Env): Promise<Record<string, string>> {
  const response = await fetch(`${LEZU_BASE}/v1/i18n/projects/${env.LEZU_PROJECT_ID}/export`, {
    method: 'POST',
    headers: {
      'Authorization': `ApiKey ${env.LEZU_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ format: 'flat-json', locale: language }),
  })

  if (!response.ok) return {}

  const raw = await response.json() as unknown
  if (raw && typeof raw === 'object') {
    // Handle both direct flat-JSON and { data: {...} } wrappers
    const obj = raw as Record<string, unknown>
    if (obj['data'] && typeof obj['data'] === 'object') {
      return obj['data'] as Record<string, string>
    }
    return raw as Record<string, string>
  }
  return {}
}

async function importToLezu(
  locale: string,
  content: Record<string, string>,
  translateMissing: boolean,
  env: Env
): Promise<Response> {
  const response = await fetch(`${LEZU_BASE}/v1/i18n/projects/${env.LEZU_PROJECT_ID}/import`, {
    method: 'POST',
    headers: {
      'Authorization': `ApiKey ${env.LEZU_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ locale, content, translateMissing }),
  })

  if (!response.ok) {
    const err = await response.text()
    return json({ error: `Lezu import failed (${response.status}): ${err}` }, 502)
  }

  const result = await response.json()
  return json({ success: true, lezu: result })
}

// ── KV cache helpers ──────────────────────────────────────────────────────────

function localeCacheKey(language: string): string {
  return `locale:${language}`
}

async function getLocaleBundleFromCache(
  language: string,
  env: Env
): Promise<Record<string, string> | null> {
  return env.TRANSLATIONS_KV.get(localeCacheKey(language), 'json')
}

async function cacheLocaleBundle(
  language: string,
  bundle: Record<string, string>,
  env: Env
): Promise<void> {
  if (Object.keys(bundle).length === 0) return
  await env.TRANSLATIONS_KV.put(localeCacheKey(language), JSON.stringify(bundle), {
    expirationTtl: KV_TTL,
  })
}

async function purgeLocale(language: string, env: Env): Promise<void> {
  await env.TRANSLATIONS_KV.delete(localeCacheKey(language))
}

async function purgeAllLocales(env: Env): Promise<string[]> {
  const { keys } = await env.TRANSLATIONS_KV.list({ prefix: 'locale:' })
  await Promise.all(keys.map(k => env.TRANSLATIONS_KV.delete(k.name)))
  return keys.map(k => k.name)
}

// ── Request handlers ──────────────────────────────────────────────────────────

async function handleGetTranslations(app: string, language: string, env: Env): Promise<Response> {
  const prefixes = APP_PREFIXES[app]
  if (!prefixes) return json({ translations: {} })

  // Load from KV cache or fetch from Lezu
  let bundle = await getLocaleBundleFromCache(language, env)
  if (!bundle) {
    bundle = await exportFromLezu(language, env)
    await cacheLocaleBundle(language, bundle, env)
  }

  // Filter to keys belonging to this app (+ common.*)
  const translations = Object.fromEntries(
    Object.entries(bundle).filter(([key]) => prefixes.some(p => key.startsWith(p)))
  )

  return json({ translations })
}

async function handleSync(language: string | undefined, env: Env, request: Request): Promise<Response> {
  const webhookSecret = env.WEBHOOK_SECRET
  if (webhookSecret) {
    const sig = request.headers.get('X-Lezu-Webhook-Secret')
      || request.headers.get('Authorization')
    if (sig !== webhookSecret && sig !== `ApiKey ${webhookSecret}`) {
      return json({ error: 'Unauthorized' }, 401)
    }
  }

  if (language) {
    await purgeLocale(language, env)
    return json({ cleared: [localeCacheKey(language)] })
  }

  const cleared = await purgeAllLocales(env)
  return json({ cleared })
}

async function handleImport(request: Request, env: Env): Promise<Response> {
  if (!isAuthorized(request, env)) return json({ error: 'Unauthorized' }, 401)

  let body: { locale: string; content: Record<string, string>; translateMissing?: boolean }
  try {
    body = await request.json() as typeof body
  } catch {
    return json({ error: 'Invalid JSON body' }, 400)
  }

  if (!body.locale || !body.content) {
    return json({ error: 'locale and content are required' }, 400)
  }

  const result = await importToLezu(body.locale, body.content, body.translateMissing ?? true, env)

  // Bust cache so next GET picks up the new translations
  await purgeLocale(body.locale, env)

  return result
}

// ── Router ────────────────────────────────────────────────────────────────────

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') return corsPrelight()

    const { pathname } = new URL(request.url)
    const parts = pathname.split('/').filter(Boolean)

    // GET /v1/:app/:language
    if (request.method === 'GET' && parts[0] === 'v1' && parts.length === 3) {
      return handleGetTranslations(parts[1], parts[2], env)
    }

    // POST /v1/sync  or  POST /v1/sync/:language
    if (request.method === 'POST' && parts[0] === 'v1' && parts[1] === 'sync') {
      return handleSync(parts[2], env, request)
    }

    // POST /v1/import
    if (request.method === 'POST' && parts[0] === 'v1' && parts[1] === 'import') {
      return handleImport(request, env)
    }

    return json({ error: 'Not found' }, 404)
  },
}
