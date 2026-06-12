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
//   PUT  /v1/languages             — ensure Tiko-managed locales exist in Lezu
//
// Environment (set via wrangler secret put):
//   LEZU_API_KEY      — lez_user_... key
//   LEZU_PROJECT_ID   — project_... UUID
//   WEBHOOK_SECRET    — verifies Lezu webhook calls to /v1/sync
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
  'talk':     ['talk.',     'common.'],
  'website':  ['website.',  'common.'],
  'admin':    ['admin.',    'common.'],
}

const CORS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...CORS },
  })
}

function corsPrelight(): Response {
  return new Response(null, { status: 204, headers: CORS })
}

function isAuthorized(request: Request, env: Env): boolean {
  const auth = request.headers.get('Authorization')
  return auth === `ApiKey ${env.LEZU_API_KEY}` || (Boolean(env.WEBHOOK_SECRET) && auth === `ApiKey ${env.WEBHOOK_SECRET}`)
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
    // Lezu export currently returns { data: { content: {...} }, meta: {...} }.
    // Keep support for older/direct flat-JSON shapes too.
    const obj = raw as Record<string, unknown>
    const data = obj['data']
    if (data && typeof data === 'object') {
      const dataObj = data as Record<string, unknown>
      if (dataObj['content'] && typeof dataObj['content'] === 'object') {
        return dataObj['content'] as Record<string, string>
      }
      return dataObj as Record<string, string>
    }
    return raw as Record<string, string>
  }
  return {}
}

async function importToLezu(
  locale: string,
  content: Record<string, string>,
  translateMissing: boolean,
  targetLocales: string[] | undefined,
  env: Env
): Promise<Response> {
  const response = await fetch(`${LEZU_BASE}/v1/i18n/projects/${env.LEZU_PROJECT_ID}/import`, {
    method: 'POST',
    headers: {
      'Authorization': `ApiKey ${env.LEZU_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ locale, content, translateMissing, targetLocales }),
  })

  if (!response.ok) {
    const err = await response.text()
    return json({ error: `Lezu import failed (${response.status}): ${err}` }, 502)
  }

  const result = await response.json()
  return json({ success: true, lezu: result })
}

async function addLocaleToLezu(language: string, env: Env): Promise<'created' | 'exists'> {
  const response = await fetch(`${LEZU_BASE}/v1/i18n/projects/${env.LEZU_PROJECT_ID}/locales`, {
    method: 'POST',
    headers: {
      'Authorization': `ApiKey ${env.LEZU_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ code: language, name: languageName(language) }),
  })

  if (response.status === 201) return 'created'
  if (response.status === 200 || response.status === 409) return 'exists'

  const err = await response.text()
  throw new Error(`Lezu locale ${language} failed (${response.status}): ${err}`)
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
  if (isAuthorized(request, env)) {
    if (language) {
      await purgeLocale(language, env)
      return json({ cleared: [localeCacheKey(language)] })
    }

    const cleared = await purgeAllLocales(env)
    return json({ cleared })
  }

  const webhookSecret = env.WEBHOOK_SECRET
  if (!webhookSecret) return json({ error: 'Webhook secret is not configured' }, 503)

  const sig = request.headers.get('X-Lezu-Webhook-Secret')
    || request.headers.get('Authorization')
  if (sig !== webhookSecret && sig !== `ApiKey ${webhookSecret}`) {
    return json({ error: 'Unauthorized' }, 401)
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

  let body: {
    locale: string
    content: Record<string, string>
    translateMissing?: boolean
    targetLocales?: string[]
  }
  try {
    body = await request.json() as typeof body
  } catch {
    return json({ error: 'Invalid JSON body' }, 400)
  }

  if (!body.locale || !body.content) {
    return json({ error: 'locale and content are required' }, 400)
  }

  const result = await importToLezu(
    body.locale,
    body.content,
    body.translateMissing ?? true,
    body.targetLocales,
    env
  )

  // Bust cache so next GET picks up the new translations
  await purgeLocale(body.locale, env)

  return result
}

async function handleLanguages(request: Request, env: Env): Promise<Response> {
  if (!isAuthorized(request, env)) return json({ error: 'Unauthorized' }, 401)

  let body: { languages?: unknown }
  try {
    body = await request.json() as typeof body
  } catch {
    return json({ error: 'Invalid JSON body' }, 400)
  }

  const languages = normalizeLanguageList(body.languages)
  if (languages.length === 0) return json({ error: 'languages must contain at least one locale' }, 400)

  const created: string[] = []
  const existing: string[] = []
  for (const language of languages) {
    const status = await addLocaleToLezu(language, env)
    if (status === 'created') created.push(language)
    else existing.push(language)
    await purgeLocale(language, env)
  }

  return json({ success: true, languages, created, existing })
}

function normalizeLanguageList(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  const normalized = value
    .map((item) => typeof item === 'string' ? normalizeLanguageTag(item) : '')
    .filter(Boolean)
  return Array.from(new Set(normalized))
}

function normalizeLanguageTag(value: string): string {
  const cleaned = value.trim().replace(/_/g, '-')
  if (!/^[a-zA-Z]{2,3}(?:-[a-zA-Z0-9]{2,8})*$/.test(cleaned)) return ''
  return cleaned.split('-').map((part, index) => index === 0 ? part.toLowerCase() : part.length === 2 ? part.toUpperCase() : part).join('-')
}

function languageName(language: string): string {
  try {
    return new Intl.DisplayNames(['en'], { type: 'language' }).of(language) ?? language
  } catch {
    return language
  }
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

    // PUT /v1/languages
    if (request.method === 'PUT' && parts[0] === 'v1' && parts[1] === 'languages') {
      return handleLanguages(request, env)
    }

    return json({ error: 'Not found' }, 404)
  },
}
