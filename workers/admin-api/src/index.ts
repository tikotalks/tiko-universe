import { loadIdentityRoles, requireSession, resolvePepper, type AuthEnv } from '../../shared/auth'
import { DEFAULT_ATLAS_SPEECH_CONFIG, DEFAULT_NARAKEET_VOICE_BY_LOCALE, normalizeSpeechServiceConfig, type AtlasSpeechServiceConfig } from '../../shared/atlas-speech-config'
import { resolveSecrets, type SecretStoreBinding } from '../../shared/secrets'

type D1Value = string | number | boolean | null

type TikoAppId = 'yes-no' | 'type' | 'cards' | 'sequence' | 'timer' | 'radio' | 'media' | 'admin' | 'tiko' | 'todo' | 'talk'
interface TikoAppConfigPayload {
  id: TikoAppId
  title: string
  appColor: TikoAppId
  appIcon: string
  appIconMediaCategory?: string
  appIconImageUrl?: string
  themeColor?: string
  supportedLanguagesMode?: 'tiko-defaults' | 'custom'
  supportedLanguages?: string[]
}
interface AppConfigRow {
  app: string
  title: string
  app_color: string
  app_icon: string
  app_icon_media_category: string | null
  app_icon_image_url: string | null
  theme_color: string | null
  supported_languages_mode: string | null
  supported_languages_json: string | null
  updated_at: string
  version: number
}

interface AppDefaultsRow {
  data_json: string
  updated_at: string
  version: number
}

interface ServiceConfigRow {
  data_json: string
  updated_at: string
  version: number
}

interface D1PreparedStatement {
  bind(...values: D1Value[]): D1PreparedStatement
  first<T = unknown>(): Promise<T | null>
  all<T = unknown>(): Promise<{ results: T[] }>
  run(): Promise<unknown>
}

interface D1Database {
  prepare(sql: string): D1PreparedStatement
}

export interface Env extends AuthEnv {
  AUTH_DB: D1Database
  APP_DB?: D1Database
  TOKEN_PEPPER: string
  ALLOWED_ORIGINS?: string
  ADMIN_EMAIL?: string
  APP_API_URL?: string
  GENERATION_API_URL?: string
  MEDIA_API_URL?: string
  COMMUNICATION_API_URL?: string
  COMMUNICATION_API_KEY?: string
  COMMUNICATION_SECRET?: SecretStoreBinding
  TRANSLATIONS_API_URL?: string
  TRANSLATIONS_API_KEY?: string
}

interface AdminSession {
  userId: string
  emailHash: string
  email: string
  roles: string[]
}

interface AdminUserListItem {
  id: string
  kind: string
  email: string | null
  roles: string[]
  createdAt: string
  updatedAt: string
  lastSeenAt: string | null
  hasData: boolean
  displayName: string | null
  avatarUrl: string | null
  color: string | null
}

const ADMIN_EMAIL = 'me@sil.mt'
const PRODUCT = 'tiko'
const ADMIN_ROLE = 'admin'
const VALID_ROLES = new Set(['guest', 'user', 'child', 'profile_manager', 'content_editor', 'admin'])
const APPS = ['yes-no', 'type', 'cards', 'sequence', 'timer', 'radio', 'media', 'admin', 'tiko', 'todo', 'talk'] as const
const DEFAULT_SUPPORTED_LANGUAGES = ['en', 'de', 'es', 'fr', 'nl', 'pt', 'ja', 'zh', 'ko', 'mt', 'it', 'ar', 'hy']
const DEFAULT_APP_CONFIGS: Record<TikoAppId, TikoAppConfigPayload> = {
  'yes-no': { id: 'yes-no', title: 'Yes No', appColor: 'yes-no', appIcon: 'ui/check-fat', appIconMediaCategory: 'emotions', themeColor: '#9b3fbd' },
  type: { id: 'type', title: 'Type', appColor: 'type', appIcon: 'ui/type', appIconMediaCategory: 'letters', themeColor: '#2488ff' },
  cards: { id: 'cards', title: 'Cards', appColor: 'cards', appIcon: 'education/book-2', appIconMediaCategory: 'animals', themeColor: '#ff8a1f' },
  sequence: { id: 'sequence', title: 'Sequence', appColor: 'sequence', appIcon: 'ui/list', appIconMediaCategory: 'routines', themeColor: '#16b8a6' },
  timer: { id: 'timer', title: 'Timer', appColor: 'timer', appIcon: 'ui/timer', appIconMediaCategory: 'transport', themeColor: '#f8c22e' },
  radio: { id: 'radio', title: 'Radio', appColor: 'radio', appIcon: 'media/headphones', appIconMediaCategory: 'music', themeColor: '#e84057' },
  media: { id: 'media', title: 'Media', appColor: 'media', appIcon: 'media/image', appIconMediaCategory: 'art', themeColor: '#2dd4bf' },
  admin: { id: 'admin', title: 'Admin', appColor: 'admin', appIcon: 'ui/settings', appIconMediaCategory: 'tools', themeColor: '#8b5cf6' },
  tiko: { id: 'tiko', title: 'Tiko', appColor: 'tiko', appIcon: 'ui/heart', appIconMediaCategory: 'tiko', themeColor: '#ef4f8f' },
  todo: { id: 'todo', title: 'Todo', appColor: 'todo', appIcon: 'ui/check-list', appIconMediaCategory: 'routines', themeColor: '#2488ff' },
  talk: { id: 'talk', title: 'Talk', appColor: 'talk', appIcon: 'ui/talk', appIconMediaCategory: 'communication', themeColor: '#17131c' }
}

const DEFAULT_ALLOWED_ORIGINS = 'https://admin.tikoapps.org,https://admin-dev.tikoapps.org,https://dev.admin.tikoapps.org,http://localhost:5173,http://localhost:4173'

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') return adminCorsPreflight(request, env)
    const resolvedEnv = await resolveSecrets(env)
    return withAdminCors(request, resolvedEnv, await handleAdminRequest(request, resolvedEnv))
  },

  async scheduled(_event: { cron: string }, env: Env): Promise<void> {
    await cleanupAnonymousSubjects(env)
  },
}

async function handleAdminRequest(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)
    const path = url.pathname.replace(/\/$/, '')

    if (path === '/v1/admin/health' && request.method === 'GET') {
      return json({ data: { ok: true, service: 'admin-api' } })
    }

    const admin = await requireAdmin(request, env)
    if (admin instanceof Response) return admin

    if (path === '/v1/admin/me' && request.method === 'GET') {
      return json({ data: { userId: admin.userId, email: admin.email, role: 'admin', roles: admin.roles } })
    }

    if (path === '/v1/admin/config' && request.method === 'GET') {
      return json({
        data: {
          appApiUrl: (env.APP_API_URL ?? 'https://dev.api.tikotalks.com/v1/apps').replace(/\/$/, ''),
          generationApiUrl: (env.GENERATION_API_URL ?? 'https://dev-api.tikotalks.com/v1/generation').replace(/\/$/, ''),
          mediaApiUrl: (env.MEDIA_API_URL ?? 'https://media.tikoapi.org/v1').replace(/\/$/, ''),
          communicationApiUrl: (env.COMMUNICATION_API_URL ?? 'https://dev.api.tikotalks.com/v1/communication').replace(/\/$/, ''),
        },
      })
    }

    if (path === '/v1/admin/apps/config' && request.method === 'GET') {
      const appDb = requireAppDb(env)
      return listAppConfigs(appDb)
    }

    if (path === '/v1/admin/tiko/settings' && request.method === 'GET') {
      const appDb = requireAppDb(env)
      return readTikoSettings(appDb)
    }

    if (path === '/v1/admin/tiko/settings' && request.method === 'PUT') {
      const appDb = requireAppDb(env)
      return writeTikoSettings(request, appDb, env)
    }

    if (path === '/v1/admin/services/speech' && request.method === 'GET') {
      const appDb = requireAppDb(env)
      return readSpeechServiceConfig(appDb)
    }

    if (path === '/v1/admin/services/speech' && request.method === 'PUT') {
      const appDb = requireAppDb(env)
      return writeSpeechServiceConfig(request, appDb)
    }

    const appConfigMatch = path.match(/^\/v1\/admin\/apps\/config\/([^/]+)$/)
    if (appConfigMatch && request.method === 'PUT') {
      const appDb = requireAppDb(env)
      return writeAppConfig(request, appDb, env, decodeURIComponent(appConfigMatch[1]))
    }

    if (path === '/v1/admin/users' && request.method === 'GET') {
      const query = url.searchParams.get('q') ?? ''
      const page = parsePositiveInt(url.searchParams.get('page'), 1)
      const limit = Math.min(parsePositiveInt(url.searchParams.get('limit'), 25), 100)
      const listed = await listUsers(env.AUTH_DB, env.APP_DB, query, page, limit)
      const users = page === 1
        ? await ensureAdminInUsers(env.AUTH_DB, env.APP_DB, listed.users, admin, query)
        : listed.users
      const total = listed.total + Math.max(users.length - listed.users.length, 0)
      return json({ data: { users, meta: { total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) } } })
    }

    const assignRoleMatch = path.match(/^\/v1\/admin\/users\/([^/]+)\/roles$/)
    if (assignRoleMatch && request.method === 'PUT') {
      return setUserRoles(request, env.AUTH_DB, admin, decodeURIComponent(assignRoleMatch[1]))
    }

    if (assignRoleMatch && request.method === 'POST') {
      return assignUserRole(request, env.AUTH_DB, admin, decodeURIComponent(assignRoleMatch[1]))
    }

    const revokeRoleMatch = path.match(/^\/v1\/admin\/users\/([^/]+)\/roles\/([^/]+)$/)
    if (revokeRoleMatch && request.method === 'DELETE') {
      return revokeUserRole(env.AUTH_DB, decodeURIComponent(revokeRoleMatch[1]), decodeURIComponent(revokeRoleMatch[2]))
    }

    if (path === '/v1/admin/communication/inbox' && request.method === 'GET') {
      return proxyCommunicationInbox(request, env)
    }

    return apiError('not_found', 'Route not found.', 404)
}


async function listAppConfigs(db: D1Database): Promise<Response> {
  const { results } = await db.prepare('SELECT app, title, app_color, app_icon, app_icon_media_category, app_icon_image_url, theme_color, supported_languages_mode, supported_languages_json, updated_at, version FROM app_config').all<AppConfigRow>()
  const rows = new Map((results ?? []).map((row) => [row.app, row]))
  const configs = Object.fromEntries(APPS.map((app) => [app, rowToConfig(app, rows.get(app) ?? null)]))
  return json({ data: { configs } })
}

async function writeAppConfig(request: Request, db: D1Database, env: Env, rawApp: string): Promise<Response> {
  let app: TikoAppId
  try {
    app = parseApp(rawApp)
  } catch {
    return apiError('unknown_app', 'App is not registered for shared config.', 404)
  }
  const body = await readJson<{ config?: Partial<TikoAppConfigPayload>, version?: number }>(request)
  const next = normalizeAppConfig(app, body.config ?? {})
  const now = new Date().toISOString()
  const row = await atomicWriteAppConfig(db, app, next, now, optionalAdminVersion(body.version))
  if (!row) {
    return apiError('version_conflict', 'Stored app config version does not match requested version.', 409)
  }
  await syncLezuLanguages(db, env)
  return json({ data: { config: next, updatedAt: row.updated_at, version: Number(row.version) } })
}

function rowToConfig(app: TikoAppId, row: AppConfigRow | null): TikoAppConfigPayload & { updatedAt: string | null, version: number } {
  const fallback = DEFAULT_APP_CONFIGS[app]
  if (!row) return { ...fallback, updatedAt: null, version: 0 }
  return {
    id: app,
    title: row.title || fallback.title,
    appColor: parseAppColor(row.app_color, fallback.appColor),
    appIcon: row.app_icon || fallback.appIcon,
    ...(row.app_icon_media_category ? { appIconMediaCategory: row.app_icon_media_category } : fallback.appIconMediaCategory ? { appIconMediaCategory: fallback.appIconMediaCategory } : {}),
    ...(row.app_icon_image_url ? { appIconImageUrl: row.app_icon_image_url } : fallback.appIconImageUrl ? { appIconImageUrl: fallback.appIconImageUrl } : {}),
    ...(row.theme_color ? { themeColor: row.theme_color } : fallback.themeColor ? { themeColor: fallback.themeColor } : {}),
    supportedLanguagesMode: row.supported_languages_mode === 'custom' ? 'custom' : 'tiko-defaults',
    supportedLanguages: parseLanguageList(row.supported_languages_json),
    updatedAt: row.updated_at,
    version: Number(row.version)
  }
}

function normalizeAppConfig(app: TikoAppId, value: Partial<TikoAppConfigPayload>): TikoAppConfigPayload {
  const fallback = DEFAULT_APP_CONFIGS[app]
  return {
    id: app,
    title: cleanString(value.title, fallback.title),
    appColor: parseAppColor(value.appColor, fallback.appColor),
    appIcon: cleanString(value.appIcon, fallback.appIcon),
    ...(cleanOptionalString(value.appIconMediaCategory) ? { appIconMediaCategory: cleanOptionalString(value.appIconMediaCategory) } : {}),
    ...(cleanOptionalString(value.appIconImageUrl) ? { appIconImageUrl: cleanOptionalString(value.appIconImageUrl) } : {}),
    ...(cleanOptionalString(value.themeColor) ? { themeColor: cleanOptionalString(value.themeColor) } : {}),
    supportedLanguagesMode: value.supportedLanguagesMode === 'custom' ? 'custom' : 'tiko-defaults',
    supportedLanguages: normalizeLanguageList(value.supportedLanguages)
  }
}

async function readTikoSettings(db: D1Database): Promise<Response> {
  const row = await db.prepare('SELECT data_json, updated_at, version FROM app_defaults WHERE app = ? AND resource = ?').bind('tiko', 'settings').first<AppDefaultsRow>()
  const settings = tikoSettingsFromRow(row)
  return json({ data: { settings, updatedAt: row?.updated_at ?? null, version: row ? Number(row.version) : 0 } })
}

async function writeTikoSettings(request: Request, db: D1Database, env: Env): Promise<Response> {
  const body = await readJson<{ settings?: Record<string, unknown>, version?: number }>(request)
  const next = normalizeTikoSettings(body.settings ?? {})
  const now = new Date().toISOString()
  const row = await atomicWriteTikoSettings(db, next, now, optionalAdminVersion(body.version))
  if (!row) {
    return apiError('version_conflict', 'Stored Tiko settings version does not match requested version.', 409)
  }
  await syncLezuLanguages(db, env)
  return json({ data: { settings: next, updatedAt: row.updated_at, version: Number(row.version) } })
}

async function readSpeechServiceConfig(db: D1Database): Promise<Response> {
  const row = await db.prepare('SELECT data_json, updated_at, version FROM atlas_service_config WHERE service = ? LIMIT 1').bind('speech').first<ServiceConfigRow>()
  const settings = speechConfigFromRow(row)
  return json({
    data: {
      settings,
      defaults: {
        narakeetVoices: DEFAULT_NARAKEET_VOICE_BY_LOCALE,
        models: DEFAULT_ATLAS_SPEECH_CONFIG.models,
      },
      updatedAt: row?.updated_at ?? null,
      version: row ? Number(row.version) : 0,
    },
  })
}

async function writeSpeechServiceConfig(request: Request, db: D1Database): Promise<Response> {
  const body = await readJson<{ settings?: AtlasSpeechServiceConfig, version?: number }>(request)
  const next = normalizeSpeechServiceConfig(body.settings ?? {})
  const now = new Date().toISOString()
  const row = await atomicWriteSpeechServiceConfig(db, next, now, optionalAdminVersion(body.version))
  if (!row) {
    return apiError('version_conflict', 'Stored speech service version does not match requested version.', 409)
  }
  return json({ data: { settings: next, updatedAt: row.updated_at, version: Number(row.version) } })
}

function optionalAdminVersion(value: unknown): number | null {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : null
}

async function atomicWriteAppConfig(
  db: D1Database,
  app: TikoAppId,
  next: TikoAppConfigPayload,
  updatedAt: string,
  expectedVersion: number | null,
): Promise<Pick<AppConfigRow, 'updated_at' | 'version'> | null> {
  const values: D1Value[] = [
    app,
    next.title,
    next.appColor,
    next.appIcon,
    next.appIconMediaCategory ?? null,
    next.appIconImageUrl ?? null,
    next.themeColor ?? null,
    next.supportedLanguagesMode ?? 'tiko-defaults',
    JSON.stringify(next.supportedLanguages ?? []),
    updatedAt,
  ]
  if (expectedVersion === 0) {
    return db.prepare(
      `INSERT INTO app_config (app, title, app_color, app_icon, app_icon_media_category, app_icon_image_url, theme_color, supported_languages_mode, supported_languages_json, updated_at, version)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
       ON CONFLICT(app) DO NOTHING
       RETURNING updated_at, version`
    ).bind(...values).first()
  }
  if (expectedVersion !== null) {
    return db.prepare(
      `UPDATE app_config
       SET title = ?,
           app_color = ?,
           app_icon = ?,
           app_icon_media_category = ?,
           app_icon_image_url = ?,
           theme_color = ?,
           supported_languages_mode = ?,
           supported_languages_json = ?,
           updated_at = ?,
           version = version + 1
       WHERE app = ? AND version = ?
       RETURNING updated_at, version`
    ).bind(...values.slice(1), app, expectedVersion).first()
  }
  return db.prepare(
    `INSERT INTO app_config (app, title, app_color, app_icon, app_icon_media_category, app_icon_image_url, theme_color, supported_languages_mode, supported_languages_json, updated_at, version)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
     ON CONFLICT(app) DO UPDATE SET
       title = excluded.title,
       app_color = excluded.app_color,
       app_icon = excluded.app_icon,
       app_icon_media_category = excluded.app_icon_media_category,
       app_icon_image_url = excluded.app_icon_image_url,
       theme_color = excluded.theme_color,
       supported_languages_mode = excluded.supported_languages_mode,
       supported_languages_json = excluded.supported_languages_json,
       updated_at = excluded.updated_at,
       version = app_config.version + 1
     RETURNING updated_at, version`
  ).bind(...values).first()
}

async function atomicWriteTikoSettings(
  db: D1Database,
  next: Record<string, unknown>,
  updatedAt: string,
  expectedVersion: number | null,
): Promise<AppDefaultsRow | null> {
  const dataJson = JSON.stringify(next)
  if (expectedVersion === 0) {
    return db.prepare(
      `INSERT INTO app_defaults (app, resource, data_json, updated_at, version)
       VALUES (?, ?, ?, ?, 1)
       ON CONFLICT(app, resource) DO NOTHING
       RETURNING data_json, updated_at, version`
    ).bind('tiko', 'settings', dataJson, updatedAt).first()
  }
  if (expectedVersion !== null) {
    return db.prepare(
      `UPDATE app_defaults
       SET data_json = ?, updated_at = ?, version = version + 1
       WHERE app = ? AND resource = ? AND version = ?
       RETURNING data_json, updated_at, version`
    ).bind(dataJson, updatedAt, 'tiko', 'settings', expectedVersion).first()
  }
  return db.prepare(
    `INSERT INTO app_defaults (app, resource, data_json, updated_at, version)
     VALUES (?, ?, ?, ?, 1)
     ON CONFLICT(app, resource) DO UPDATE SET
       data_json = excluded.data_json,
       updated_at = excluded.updated_at,
       version = app_defaults.version + 1
     RETURNING data_json, updated_at, version`
  ).bind('tiko', 'settings', dataJson, updatedAt).first()
}

async function atomicWriteSpeechServiceConfig(
  db: D1Database,
  next: AtlasSpeechServiceConfig,
  updatedAt: string,
  expectedVersion: number | null,
): Promise<ServiceConfigRow | null> {
  const dataJson = JSON.stringify(next)
  if (expectedVersion === 0) {
    return db.prepare(
      `INSERT INTO atlas_service_config (service, data_json, updated_at, version)
       VALUES (?, ?, ?, 1)
       ON CONFLICT(service) DO NOTHING
       RETURNING data_json, updated_at, version`
    ).bind('speech', dataJson, updatedAt).first()
  }
  if (expectedVersion !== null) {
    return db.prepare(
      `UPDATE atlas_service_config
       SET data_json = ?, updated_at = ?, version = version + 1
       WHERE service = ? AND version = ?
       RETURNING data_json, updated_at, version`
    ).bind(dataJson, updatedAt, 'speech', expectedVersion).first()
  }
  return db.prepare(
    `INSERT INTO atlas_service_config (service, data_json, updated_at, version)
     VALUES (?, ?, ?, 1)
     ON CONFLICT(service) DO UPDATE SET
       data_json = excluded.data_json,
       updated_at = excluded.updated_at,
       version = atlas_service_config.version + 1
     RETURNING data_json, updated_at, version`
  ).bind('speech', dataJson, updatedAt).first()
}

function speechConfigFromRow(row: ServiceConfigRow | null): AtlasSpeechServiceConfig {
  if (!row) return DEFAULT_ATLAS_SPEECH_CONFIG
  try {
    return normalizeSpeechServiceConfig(JSON.parse(row.data_json))
  } catch {
    return DEFAULT_ATLAS_SPEECH_CONFIG
  }
}

function tikoSettingsFromRow(row: AppDefaultsRow | null): Record<string, unknown> {
  if (!row) return { supportedLanguages: DEFAULT_SUPPORTED_LANGUAGES }
  const parsed = parseJson(row.data_json) ?? {}
  return normalizeTikoSettings(parsed)
}

function normalizeTikoSettings(value: Record<string, unknown>): Record<string, unknown> {
  return { ...value, supportedLanguages: normalizeLanguageList(value.supportedLanguages, DEFAULT_SUPPORTED_LANGUAGES) }
}

async function syncLezuLanguages(db: D1Database, env: Env): Promise<void> {
  if (!env.TRANSLATIONS_API_KEY) return
  const languages = await collectLezuLanguages(db)
  const baseUrl = (env.TRANSLATIONS_API_URL ?? 'https://translations.tikoapi.org/v1').replace(/\/$/, '')
  const response = await fetch(`${baseUrl}/languages`, {
    method: 'PUT',
    headers: { authorization: `ApiKey ${env.TRANSLATIONS_API_KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify({ languages })
  })
  if (!response.ok) {
    const detail = await response.text().catch(() => '')
    throw new Error(`translations_language_sync_failed:${response.status}:${detail}`)
  }
}

async function collectLezuLanguages(db: D1Database): Promise<string[]> {
  const defaultsRow = await db.prepare('SELECT data_json, updated_at, version FROM app_defaults WHERE app = ? AND resource = ?').bind('tiko', 'settings').first<AppDefaultsRow>()
  const languages = new Set(normalizeLanguageList(tikoSettingsFromRow(defaultsRow).supportedLanguages, DEFAULT_SUPPORTED_LANGUAGES))
  const { results } = await db.prepare('SELECT supported_languages_mode, supported_languages_json FROM app_config').all<Pick<AppConfigRow, 'supported_languages_mode' | 'supported_languages_json'>>()
  for (const row of results ?? []) {
    if (row.supported_languages_mode === 'custom') {
      for (const language of parseLanguageList(row.supported_languages_json)) languages.add(language)
    }
  }
  return Array.from(languages).sort()
}

function parseLanguageList(raw: string | null | undefined): string[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw) as unknown
    return normalizeLanguageList(parsed)
  } catch {
    return []
  }
}

function normalizeLanguageList(value: unknown, fallback: string[] = []): string[] {
  const source = Array.isArray(value) ? value : fallback
  const values = source
    .map((item) => typeof item === 'string' ? normalizeLanguageTag(item) : '')
    .filter(Boolean)
  return Array.from(new Set(values))
}

function normalizeLanguageTag(value: string): string {
  const cleaned = value.trim().replace(/_/g, '-')
  if (!/^[a-zA-Z]{2,3}(?:-[a-zA-Z0-9]{2,8})*$/.test(cleaned)) return ''
  return cleaned.split('-').map((part, index) => index === 0 ? part.toLowerCase() : part.length === 2 ? part.toUpperCase() : part).join('-')
}

function parseApp(value: string): TikoAppId {
  if ((APPS as readonly string[]).includes(value)) return value as TikoAppId
  throw new Error('unknown_app')
}

function parseAppColor(value: unknown, fallback: TikoAppId): TikoAppId {
  return typeof value === 'string' && (APPS as readonly string[]).includes(value) ? value as TikoAppId : fallback
}

function cleanString(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim() ? value.trim().slice(0, 80) : fallback
}

function cleanOptionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim().slice(0, 240) : undefined
}

async function readJson<T>(request: Request): Promise<T> {
  if (!request.body) return {} as T
  try {
    return await request.json() as T
  } catch {
    return {} as T
  }
}

async function requireAdmin(request: Request, env: Env): Promise<AdminSession | Response> {
  const authed = await requireSession(request, env)
  if (authed instanceof Response) return authed
  if (!authed.userId) return apiError('admin_session_required', 'Admin access requires a user session.', 403)

  const row = await env.AUTH_DB.prepare('SELECT subject_id AS id, email_hash, email_plain FROM identity_accounts WHERE subject_id = ? AND disabled_at IS NULL LIMIT 1')
    .bind(authed.userId)
    .first<{ id: string; email_hash: string | null; email_plain: string | null }>()

  if (!row) {
    return apiError('forbidden', 'This dashboard is only available to Tiko admins.', 403)
  }

  const roles = await activeRoles(env.AUTH_DB, row.id)
  if (!roles.includes(ADMIN_ROLE) && await canBootstrapAdmin(env, row)) {
    await assignRole(env.AUTH_DB, row.id, ADMIN_ROLE, 'bootstrap', null)
    roles.push(ADMIN_ROLE)
  }

  if (!roles.includes(ADMIN_ROLE)) {
    return apiError('forbidden', 'This dashboard is only available to the configured Tiko admin.', 403)
  }

  return { userId: row.id, emailHash: row.email_hash ?? '', email: normalizeEmail(row.email_plain ?? env.ADMIN_EMAIL ?? ADMIN_EMAIL), roles }
}

async function activeRoles(db: D1Database, subjectId: string): Promise<string[]> {
  return loadIdentityRoles({ AUTH_DB: db }, subjectId, PRODUCT)
}

async function canBootstrapAdmin(env: Env, row: { email_hash: string | null }): Promise<boolean> {
  const adminEmail = normalizeEmail(env.ADMIN_EMAIL || ADMIN_EMAIL)
  const pepper = await resolvePepper(env)
  if (!pepper) return false
  const adminEmailHash = await hashToken(adminEmail, pepper)
  return row.email_hash === adminEmailHash
}

async function assignRole(db: D1Database, subjectId: string, role: string, source: string, actorSubjectId: string | null): Promise<void> {
  await db.prepare('INSERT INTO identity_role_assignments (id, subject_id, product, role, source, actor_subject_id, created_at, revoked_at, metadata_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .bind(`role_${crypto.randomUUID().replace(/-/g, '')}`, subjectId, PRODUCT, role, source, actorSubjectId, new Date().toISOString(), null, '{}')
    .run()
}

function parsePositiveInt(value: string | null, fallback: number): number {
  const parsed = Number.parseInt(value ?? '', 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

async function listUsers(authDb: D1Database, appDb: D1Database | undefined, query: string, page: number, limit: number): Promise<{ users: AdminUserListItem[]; total: number }> {
  const q = `%${query.trim().toLowerCase()}%`
  const offset = (page - 1) * limit
  const totalRow = await authDb.prepare(`
    SELECT COUNT(DISTINCT s.id) AS count
    FROM identity_subjects s
    INNER JOIN identity_accounts a ON a.subject_id = s.id AND a.disabled_at IS NULL AND a.email_hash IS NOT NULL
    WHERE s.product = ? AND s.disabled_at IS NULL
      AND (? = '%%' OR lower(s.id) LIKE ? OR lower(s.kind) LIKE ? OR lower(COALESCE(a.email_plain, '')) LIKE ? OR lower(COALESCE(json_extract(s.metadata_json, '$.displayName'), '')) LIKE ?)
  `)
    .bind(PRODUCT, q, q, q, q, q)
    .first<{ count: number }>()
  const { results } = await authDb.prepare(`
    SELECT s.id,
      CASE WHEN a.email_verified_at IS NOT NULL THEN 'account' ELSE s.kind END AS kind,
      a.email_plain AS email, s.created_at, s.updated_at,
      MAX(COALESCE(sess.last_seen_at, sess.created_at, d.last_seen_at)) AS last_seen_at,
      COALESCE(json_group_array(r.role) FILTER (WHERE r.role IS NOT NULL), '[]') AS roles,
      s.metadata_json
    FROM identity_subjects s
    INNER JOIN identity_accounts a ON a.subject_id = s.id AND a.disabled_at IS NULL AND a.email_hash IS NOT NULL
    LEFT JOIN identity_sessions sess ON sess.subject_id = s.id AND sess.revoked_at IS NULL
    LEFT JOIN identity_devices d ON d.subject_id = s.id AND d.revoked_at IS NULL
    LEFT JOIN identity_role_assignments r ON r.subject_id = s.id AND r.product = ? AND r.revoked_at IS NULL
    WHERE s.product = ? AND s.disabled_at IS NULL
      AND (? = '%%' OR lower(s.id) LIKE ? OR lower(s.kind) LIKE ? OR lower(COALESCE(a.email_plain, '')) LIKE ? OR lower(COALESCE(json_extract(s.metadata_json, '$.displayName'), '')) LIKE ?)
    GROUP BY s.id, s.kind, a.email_plain, a.email_verified_at, s.created_at, s.updated_at, s.metadata_json
    ORDER BY last_seen_at DESC, s.created_at DESC
    LIMIT ? OFFSET ?
  `)
    .bind(PRODUCT, PRODUCT, q, q, q, q, q, limit, offset)
    .all<{ id: string; kind: string; email: string | null; created_at: string; updated_at: string; last_seen_at: string | null; roles: string | null; metadata_json: string | null }>()

  const users = results.map(normalizeUserRow)
  const dataSet = await subjectsWithData(appDb, users.map((u) => u.id))
  return { users: users.map((u) => ({ ...u, hasData: dataSet.has(u.id) })), total: Number(totalRow?.count ?? 0) }
}

async function ensureAdminInUsers(authDb: D1Database, appDb: D1Database | undefined, users: AdminUserListItem[], admin: AdminSession, query: string): Promise<AdminUserListItem[]> {
  if (users.some((user) => user.id === admin.userId)) return users
  if (!matchesAdminQuery(admin, query)) return users

  const row = await authDb.prepare(`
    SELECT s.id, s.kind, a.email_plain AS email, s.created_at, s.updated_at,
      MAX(COALESCE(sess.last_seen_at, sess.created_at)) AS last_seen_at,
      COALESCE(json_group_array(r.role) FILTER (WHERE r.role IS NOT NULL), '[]') AS roles,
      s.metadata_json
    FROM identity_subjects s
    LEFT JOIN identity_accounts a ON a.subject_id = s.id AND a.disabled_at IS NULL
    LEFT JOIN identity_sessions sess ON sess.subject_id = s.id AND sess.revoked_at IS NULL
    LEFT JOIN identity_role_assignments r ON r.subject_id = s.id AND r.product = ? AND r.revoked_at IS NULL
    WHERE s.id = ? AND s.disabled_at IS NULL
    GROUP BY s.id, s.kind, a.email_plain, s.created_at, s.updated_at, s.metadata_json
    LIMIT 1
  `)
    .bind(PRODUCT, admin.userId)
    .first<{ id: string; kind: string; email: string | null; created_at: string; updated_at: string; last_seen_at: string | null; roles: string | null; metadata_json: string | null }>()

  const dataSet = row ? await subjectsWithData(appDb, [admin.userId]) : new Set<string>()
  const adminUser = row
    ? { ...normalizeUserRow(row), hasData: dataSet.has(admin.userId) }
    : { id: admin.userId, kind: 'account', email: admin.email, roles: admin.roles as AdminUserListItem['roles'], createdAt: '', updatedAt: '', lastSeenAt: null, hasData: false, displayName: null, avatarUrl: null, color: null }

  return [adminUser, ...users]
}

function matchesAdminQuery(admin: AdminSession, query: string): boolean {
  const normalized = query.trim().toLowerCase()
  if (!normalized) return true
  return [admin.userId, admin.email, ...admin.roles].some((value) => value.toLowerCase().includes(normalized))
}

function normalizeUserRow(row: { id: string; kind: string; email: string | null; created_at: string; updated_at: string; last_seen_at?: string | null; roles: string | null; metadata_json?: string | null }): AdminUserListItem {
  const metadata = parseJson(row.metadata_json) as Record<string, unknown> | null
  return {
    id: row.id,
    kind: row.kind,
    email: row.email,
    roles: parseRoles(row.roles),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastSeenAt: row.last_seen_at ?? null,
    hasData: false,
    displayName: typeof metadata?.displayName === 'string' ? metadata.displayName : null,
    avatarUrl: typeof metadata?.avatarUrl === 'string' ? metadata.avatarUrl : null,
    color: typeof metadata?.color === 'string' ? metadata.color : null,
  }
}

async function subjectsWithData(db: D1Database | undefined, subjectIds: string[]): Promise<Set<string>> {
  if (!db || subjectIds.length === 0) return new Set()
  const placeholders = subjectIds.map(() => '?').join(',')
  const { results } = await db.prepare(`
    SELECT DISTINCT user_id FROM app_settings WHERE user_id IN (${placeholders})
    UNION SELECT DISTINCT user_id FROM app_state WHERE user_id IN (${placeholders})
    UNION SELECT DISTINCT user_id FROM app_progress WHERE user_id IN (${placeholders})
  `).bind(...subjectIds, ...subjectIds, ...subjectIds).all<{ user_id: string }>()
  return new Set(results.map((r) => r.user_id))
}

async function cleanupAnonymousSubjects(env: Env): Promise<void> {
  if (!env.APP_DB) return
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  // Find unverified, unmanaged subjects old enough to be eligible; per-subject data decides the final threshold.
  const { results } = await env.AUTH_DB.prepare(`
    SELECT s.id, MAX(COALESCE(sess.last_seen_at, sess.created_at, s.created_at)) AS last_seen
    FROM identity_subjects s
    LEFT JOIN identity_accounts a ON a.subject_id = s.id AND a.disabled_at IS NULL
    LEFT JOIN identity_sessions sess ON sess.subject_id = s.id AND sess.revoked_at IS NULL
    WHERE s.product = ? AND s.disabled_at IS NULL
      AND NOT EXISTS (
        SELECT 1 FROM identity_accounts ia
        WHERE ia.subject_id = s.id AND ia.email_verified_at IS NOT NULL AND ia.disabled_at IS NULL
      )
      AND NOT EXISTS (
        SELECT 1 FROM identity_managed_credentials imc
        WHERE imc.product = s.product
          AND imc.revoked_at IS NULL
          AND (imc.subject_id = s.id OR imc.manager_subject_id = s.id)
      )
      AND NOT EXISTS (
        SELECT 1 FROM identity_role_assignments ira
        WHERE ira.subject_id = s.id
          AND ira.product = s.product
          AND ira.role = 'child'
          AND ira.revoked_at IS NULL
      )
    GROUP BY s.id
    HAVING MAX(COALESCE(sess.last_seen_at, sess.created_at, s.created_at)) < ? OR MAX(COALESCE(sess.last_seen_at, sess.created_at, s.created_at)) IS NULL
  `).bind(PRODUCT, oneDayAgo).all<{ id: string; last_seen: string | null }>()

  if (results.length === 0) return

  const dataSet = await subjectsWithData(env.APP_DB, results.map((r) => r.id))

  for (const { id, last_seen } of results) {
    const hasData = dataSet.has(id)
    const threshold = hasData ? thirtyDaysAgo : oneDayAgo
    if (!last_seen || last_seen < threshold) {
      try {
        await deleteSubjectData(env.APP_DB, id)
        await deleteSubjectIdentity(env.AUTH_DB, id)
      } catch (error) {
        console.error('cleanup_subject_failed', { subjectId: id, error: error instanceof Error ? error.message : String(error) })
      }
    }
  }
}

function requireAppDb(env: Env): D1Database {
  if (!env.APP_DB) throw new Error('app_db_not_configured')
  return env.APP_DB
}

async function deleteSubjectData(db: D1Database, subjectId: string): Promise<void> {
  await db.prepare('DELETE FROM app_settings WHERE user_id = ?').bind(subjectId).run()
  await db.prepare('DELETE FROM app_state WHERE user_id = ?').bind(subjectId).run()
  await db.prepare('DELETE FROM app_progress WHERE user_id = ?').bind(subjectId).run()
}

async function deleteSubjectIdentity(db: D1Database, subjectId: string): Promise<void> {
  await db.prepare('DELETE FROM identity_managed_credentials WHERE subject_id = ? OR manager_subject_id = ?').bind(subjectId, subjectId).run()
  await db.prepare('DELETE FROM identity_audit_events WHERE subject_id = ? OR actor_subject_id = ?').bind(subjectId, subjectId).run()
  await db.prepare('DELETE FROM identity_api_keys WHERE subject_id = ?').bind(subjectId).run()
  await db.prepare('DELETE FROM identity_entitlements WHERE subject_id = ?').bind(subjectId).run()
  await db.prepare('DELETE FROM identity_role_assignments WHERE subject_id = ?').bind(subjectId).run()
  await db.prepare('DELETE FROM identity_sessions WHERE subject_id = ?').bind(subjectId).run()
  await db.prepare('DELETE FROM identity_email_challenges WHERE subject_id = ?').bind(subjectId).run()
  await db.prepare('DELETE FROM identity_accounts WHERE subject_id = ?').bind(subjectId).run()
  await db.prepare('DELETE FROM identity_devices WHERE subject_id = ?').bind(subjectId).run()
  await db.prepare('DELETE FROM identity_subjects WHERE id = ?').bind(subjectId).run()
}

async function assignUserRole(request: Request, db: D1Database, admin: AdminSession, subjectId: string): Promise<Response> {
  let body: { role?: unknown }
  try {
    body = await request.json()
  } catch {
    return apiError('invalid_json', 'Request body must be valid JSON.', 400)
  }

  const role = typeof body.role === 'string' ? body.role : ''
  if (!VALID_ROLES.has(role)) return apiError('invalid_role', 'Role is not assignable.', 400)

  await assignRole(db, subjectId, role, 'manual', admin.userId)
  return json({ data: { subjectId, roles: await activeRoles(db, subjectId) } })
}

async function setUserRoles(request: Request, db: D1Database, admin: AdminSession, subjectId: string): Promise<Response> {
  let body: { role?: unknown; roles?: unknown }
  try {
    body = await request.json()
  } catch {
    return apiError('invalid_json', 'Request body must be valid JSON.', 400)
  }

  const requestedRoles = Array.isArray(body.roles) ? body.roles : body.role ? [body.role] : []
  const roles = Array.from(new Set(requestedRoles.map((role) => typeof role === 'string' ? role : '').filter(Boolean)))
  if (roles.length !== 1) return apiError('invalid_role_count', 'Exactly one role must be selected.', 400)

  const [role] = roles
  if (!VALID_ROLES.has(role)) return apiError('invalid_role', 'Role is not assignable.', 400)

  const currentRoles = await activeRoles(db, subjectId)
  if (currentRoles.includes(ADMIN_ROLE) && role !== ADMIN_ROLE) {
    const adminCount = await activeRoleCount(db, ADMIN_ROLE)
    if (adminCount <= 1) return apiError('last_admin_role', 'Cannot revoke the final active admin role.', 409)
  }

  const now = new Date().toISOString()
  const statements = [
    db.prepare('UPDATE identity_role_assignments SET revoked_at = ? WHERE subject_id = ? AND product = ? AND role <> ? AND revoked_at IS NULL')
      .bind(now, subjectId, PRODUCT, role),
  ]

  if (!currentRoles.includes(role)) {
    statements.push(
      db.prepare('INSERT INTO identity_role_assignments (id, subject_id, product, role, source, actor_subject_id, created_at, revoked_at, metadata_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
        .bind(`role_${crypto.randomUUID().replace(/-/g, '')}`, subjectId, PRODUCT, role, 'manual', admin.userId, now, null, '{}'),
    )
  }

  await (db as unknown as { batch(items: typeof statements): Promise<unknown> }).batch(statements)
  return json({ data: { subjectId, roles: await activeRoles(db, subjectId) } })
}

async function revokeUserRole(db: D1Database, subjectId: string, role: string): Promise<Response> {
  if (!VALID_ROLES.has(role)) return apiError('invalid_role', 'Role is not assignable.', 400)

  if (role === ADMIN_ROLE) {
    const adminCount = await activeRoleCount(db, ADMIN_ROLE)
    if (adminCount <= 1) return apiError('last_admin_role', 'Cannot revoke the final active admin role.', 409)
  }

  await db.prepare('UPDATE identity_role_assignments SET revoked_at = ? WHERE subject_id = ? AND product = ? AND role = ? AND revoked_at IS NULL')
    .bind(new Date().toISOString(), subjectId, PRODUCT, role)
    .run()
  return json({ data: { subjectId, roles: await activeRoles(db, subjectId) } })
}

async function activeRoleCount(db: D1Database, role: string): Promise<number> {
  const row = await db.prepare('SELECT COUNT(*) AS count FROM identity_role_assignments WHERE product = ? AND role = ? AND revoked_at IS NULL')
    .bind(PRODUCT, role)
    .first<{ count: number }>()
  return row?.count ?? 0
}

function parseJson(raw: string | null | undefined): Record<string, unknown> | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, unknown> : null
  } catch {
    return null
  }
}

function parseRoles(raw: string | null): string[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? Array.from(new Set(parsed.filter((role): role is string => typeof role === 'string' && role.length > 0))).sort() : []
  } catch {
    return []
  }
}

async function proxyCommunicationInbox(request: Request, env: Env): Promise<Response> {
  if (!env.COMMUNICATION_API_KEY) {
    return apiError('communication_not_configured', 'Communication service is not configured.', 503)
  }
  const incomingUrl = new URL(request.url)
  const baseUrl = (env.COMMUNICATION_API_URL ?? 'https://dev.api.tikotalks.com/v1/communication').replace(/\/$/, '')
  const url = new URL(`${baseUrl}/inbox`)
  const status = incomingUrl.searchParams.get('status')
  const limit = incomingUrl.searchParams.get('limit')
  if (status) url.searchParams.set('status', status)
  if (limit) url.searchParams.set('limit', limit)

  const response = await fetch(url, {
    headers: { authorization: `Bearer ${env.COMMUNICATION_API_KEY}` }
  })
  const body = await response.text()
  return new Response(body, {
    status: response.status,
    headers: { 'Content-Type': response.headers.get('content-type') ?? 'application/json' }
  })
}

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase()
}

async function hashToken(token: string, pepper: string): Promise<string> {
  const data = new TextEncoder().encode(`tiko:email:${pepper}:${token}`)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return `sha256:${Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('')}`
}

function apiError(code: string, message: string, status = 400): Response {
  return json({ error: { code, message } }, status)
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function adminCorsPreflight(request: Request, env: Env): Response {
  const origin = allowedAdminOrigin(request, env)
  if (!origin) return new Response(null, { status: 403 })
  return new Response(null, { status: 204, headers: adminCorsHeaders(origin) })
}

function withAdminCors(request: Request, env: Env, response: Response): Response {
  const origin = allowedAdminOrigin(request, env)
  if (!origin) return response
  const headers = new Headers(response.headers)
  adminCorsHeaders(origin).forEach((value, key) => headers.set(key, value))
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers })
}

function allowedAdminOrigin(request: Request, env: Env): string | null {
  const origin = request.headers.get('origin')
  if (!origin) return null
  const allowed = (env.ALLOWED_ORIGINS ?? DEFAULT_ALLOWED_ORIGINS).split(',').map(entry => entry.trim()).filter(Boolean)
  return allowed.includes(origin) ? origin : null
}

function adminCorsHeaders(origin: string): Headers {
  return new Headers({
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  })
}
