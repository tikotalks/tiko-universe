export type JsonPrimitive = string | number | boolean | null
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue | undefined }
export type JsonObject = { [key: string]: JsonValue | undefined }

export interface DeviceSessionFixture {
  user: {
    id: string
    kind: 'device' | 'recoverable'
    recoverable: boolean
    displayName?: string
  }
  device: {
    id: string
    secret: string
    name?: string
    platform?: string
  }
  session: {
    token: string
    expiresAt: string
  }
}

export interface AuthFixture {
  authorization: string
}

export interface JsonRequestOptions extends Omit<RequestInit, 'body' | 'headers'> {
  auth?: AuthFixture
  json?: unknown
  body?: BodyInit | null
  headers?: HeadersInit
}

export interface ParsedJsonResponse<TBody = unknown> {
  response: Response
  status: number
  headers: Headers
  body: TBody
}

export interface ApiErrorExpectation {
  status?: number
  code: string
  field?: string
}

export interface D1Execution<TMeta extends Record<string, unknown> = Record<string, unknown>> {
  sql: string
  values: unknown[]
  meta: TMeta
}

export interface D1Result<T = Record<string, unknown>> {
  results: T[]
  success: true
  meta: Record<string, unknown>
}

export interface D1HandlerContext {
  sql: string
  values: unknown[]
  history: D1Execution[]
}

export interface D1Handler {
  match: RegExp | string | ((sql: string) => boolean)
  rows?: Record<string, unknown>[] | ((context: D1HandlerContext) => Record<string, unknown>[])
  run?: (context: D1HandlerContext) => { meta?: Record<string, unknown> } | void
}

export interface MockD1Options {
  handlers?: D1Handler[]
  strict?: boolean
}

export interface MockD1Database {
  history: D1Execution[]
  prepare(sql: string): MockD1PreparedStatement
}

export interface MockD1PreparedStatement {
  bind(...values: unknown[]): MockD1PreparedStatement
  first<T = Record<string, unknown>>(): Promise<T | null>
  all<T = Record<string, unknown>>(): Promise<D1Result<T>>
  run(): Promise<D1Result>
}

export interface MockR2Object {
  body: BodyInit
  httpMetadata?: { contentType?: string; cacheControl?: string }
  arrayBuffer(): Promise<ArrayBuffer>
}

export interface MockR2Bucket {
  objects: Map<string, MockR2Object>
  get(key: string): Promise<MockR2Object | null>
  put(key: string, value: ArrayBuffer | Uint8Array | string, options?: { httpMetadata?: { contentType?: string; cacheControl?: string } }): Promise<void>
}

export type SmokeAnswer = 'yes' | 'no'

export interface SmokeChecklistItem {
  id: 'no-login-wall' | 'device-bootstrap-hook' | 'settings-path' | 'state-path' | 'tts-fallback-path'
  question: string
  answer: SmokeAnswer
  evidence: string
}

export interface TtsFallbackSmoke {
  attemptedPlatformTts: boolean
  fallbackMode: 'generation-api' | 'browser-speech' | 'silent-noop'
  error?: string
}

export interface YesNoSmokeEvidence {
  appRenderedWithoutLoginWall: boolean
  deviceBootstrapRequest?: Request
  settingsRequest?: Request
  stateRequest?: Request
  ttsFallback?: TtsFallbackSmoke
}

export interface WebAppFetchMockOptions {
  appId: string
  settings?: JsonObject
  state?: JsonObject
  identity?: JsonObject
  failCookieSession?: boolean
  failBootstrap?: boolean
}

export const packageName = '@tiko/testing'

export const jsonHeaders = {
  'content-type': 'application/json; charset=utf-8',
} as const

export function bearerAuth(token: string): AuthFixture {
  return { authorization: `Bearer ${token}` }
}

export function createDeviceSessionFixture(overrides: Partial<{
  userId: string
  deviceId: string
  deviceSecret: string
  sessionToken: string
  expiresAt: string
  name: string
  platform: string
  recoverable: boolean
}> = {}): DeviceSessionFixture {
  const recoverable = overrides.recoverable ?? false
  return {
    user: {
      id: overrides.userId ?? 'usr_test',
      kind: recoverable ? 'recoverable' : 'device',
      recoverable,
    },
    device: {
      id: overrides.deviceId ?? 'dev_test',
      secret: overrides.deviceSecret ?? 'tds_test_secret',
      name: overrides.name,
      platform: overrides.platform,
    },
    session: {
      token: overrides.sessionToken ?? 'tks_test_session',
      expiresAt: overrides.expiresAt ?? '2999-01-01T00:00:00.000Z',
    },
  }
}

export function requestBuilder(baseUrl: string): (path: string, options?: JsonRequestOptions) => Request {
  const normalizedBase = baseUrl.replace(/\/$/, '')
  return (path, options = {}) => createJsonRequest(`${normalizedBase}/${path.replace(/^\//, '')}`, options)
}

export function createJsonRequest(url: string, options: JsonRequestOptions = {}): Request {
  const headers = new Headers(options.headers)
  if (options.json !== undefined && !headers.has('content-type')) headers.set('content-type', jsonHeaders['content-type'])
  if (options.auth) headers.set('authorization', options.auth.authorization)

  const init: RequestInit = {
    ...options,
    method: options.method ?? (options.json !== undefined ? 'POST' : options.method),
    headers,
    body: options.json !== undefined ? JSON.stringify(options.json) : options.body,
  }
  delete (init as Partial<JsonRequestOptions>).json
  delete (init as Partial<JsonRequestOptions>).auth

  return new Request(url, init)
}

export async function parseJsonResponse<TBody = unknown>(response: Response): Promise<ParsedJsonResponse<TBody>> {
  const contentType = response.headers.get('content-type') ?? ''
  const body = response.status === 204 ? null : contentType.includes('json') ? await response.json() : await safeJsonFromText(response)
  return { response, status: response.status, headers: response.headers, body: body as TBody }
}

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: jsonHeaders })
}

export function createWebAppFetchHandler(options: WebAppFetchMockOptions): typeof fetch {
  return (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    const method = init?.method ?? 'GET'
    const identity = options.identity ?? createWebAppIdentityBundle()

    if (url.endsWith('/identity/session') && method === 'GET') {
      if (options.failCookieSession && !hasAuthorizationHeader(init?.headers)) {
        return jsonResponse({ error: { code: 'unauthorized', message: 'Unauthorized' } }, 401)
      }
      return jsonResponse(identity)
    }

    if (url.endsWith('/identity/device') && method === 'POST') {
      if (options.failBootstrap) return jsonResponse({ error: { code: 'offline', message: 'Offline' } }, 503)
      return jsonResponse(identity)
    }

    if (url.endsWith('/identity/profile') && method === 'GET') {
      return jsonResponse({ profile: {} })
    }

    if (url.endsWith('/identity/profile') && method === 'PUT') {
      return jsonResponse({ profile: safeJsonParse(init?.body) ?? {} })
    }

    if (url.endsWith(`/apps/${options.appId}/settings`) && method === 'GET') {
      return jsonResponse({ app: options.appId, updatedAt: null, version: 1, settings: options.settings ?? {} })
    }

    if (url.endsWith(`/apps/${options.appId}/state`) && method === 'GET') {
      return jsonResponse({ app: options.appId, updatedAt: null, version: 1, state: options.state ?? {} })
    }

    if (url.endsWith(`/apps/${options.appId}/settings`) && method === 'PUT') {
      const body = safeJsonParse(init?.body) as { settings?: JsonObject } | null
      return jsonResponse({ app: options.appId, updatedAt: 'test', version: 2, settings: body?.settings ?? {} })
    }

    if (url.endsWith(`/apps/${options.appId}/state`) && method === 'PUT') {
      const body = safeJsonParse(init?.body) as { state?: JsonObject } | null
      return jsonResponse({ app: options.appId, updatedAt: 'test', version: 2, state: body?.state ?? {} })
    }

    return jsonResponse({ error: { code: 'unexpected_test_fetch', message: url } }, 500)
  }) as typeof fetch
}

export function assertJsonResponse(parsed: ParsedJsonResponse, expectedStatus = 200): asserts parsed is ParsedJsonResponse<JsonObject> {
  if (parsed.status !== expectedStatus) {
    throw new Error(`Expected HTTP ${expectedStatus}, received ${parsed.status}.`)
  }
  if (!parsed.body || typeof parsed.body !== 'object' || Array.isArray(parsed.body)) {
    throw new Error('Expected response body to be a JSON object.')
  }
}

export function assertApiError(parsed: ParsedJsonResponse, expectation: ApiErrorExpectation): asserts parsed is ParsedJsonResponse<{ error: { code: string; message: string; field?: string } }> {
  if (expectation.status !== undefined && parsed.status !== expectation.status) {
    throw new Error(`Expected error HTTP ${expectation.status}, received ${parsed.status}.`)
  }
  const error = (parsed.body as { error?: { code?: unknown; field?: unknown } } | null)?.error
  if (!error || error.code !== expectation.code) {
    throw new Error(`Expected API error code ${expectation.code}, received ${String(error?.code)}.`)
  }
  if (expectation.field !== undefined && error.field !== expectation.field) {
    throw new Error(`Expected API error field ${expectation.field}, received ${String(error.field)}.`)
  }
}

export function mockD1(options: MockD1Options = {}): MockD1Database {
  const history: D1Execution[] = []
  const handlers = options.handlers ?? []
  return {
    history,
    prepare(sql: string) {
      return createStatement(sql, handlers, history, options.strict ?? true)
    },
  }
}

export function mockR2(initialObjects: Record<string, ArrayBuffer | Uint8Array | string> = {}): MockR2Bucket {
  const objects = new Map<string, MockR2Object>()
  const bucket: MockR2Bucket = {
    objects,
    async get(key) {
      return objects.get(key) ?? null
    },
    async put(key, value, options) {
      objects.set(key, createR2Object(value, options?.httpMetadata))
    },
  }
  for (const [key, value] of Object.entries(initialObjects)) objects.set(key, createR2Object(value))
  return bucket
}

export function createTtsFallbackSmoke(input: TtsFallbackSmoke): TtsFallbackSmoke {
  return { ...input }
}

export function createAppSmokeChecklist(app: 'yes-no', evidence: YesNoSmokeEvidence): SmokeChecklistItem[] {
  return [
    {
      id: 'no-login-wall',
      question: `${app} renders without a login wall.`,
      answer: evidence.appRenderedWithoutLoginWall ? 'yes' : 'no',
      evidence: evidence.appRenderedWithoutLoginWall ? 'App shell rendered before auth/recovery UI.' : 'Login or recovery UI blocked app shell.',
    },
    {
      id: 'device-bootstrap-hook',
      question: `${app} can call the device bootstrap path.`,
      answer: isRequest(evidence.deviceBootstrapRequest, 'POST', '/v1/identity/device') ? 'yes' : 'no',
      evidence: requestEvidence(evidence.deviceBootstrapRequest),
    },
    {
      id: 'settings-path',
      question: `${app} can call its settings path with a bearer session.`,
      answer: isRequest(evidence.settingsRequest, 'GET', '/v1/apps/yes-no/settings') && hasBearer(evidence.settingsRequest) ? 'yes' : 'no',
      evidence: requestEvidence(evidence.settingsRequest),
    },
    {
      id: 'state-path',
      question: `${app} can call its state path with a bearer session.`,
      answer: isRequest(evidence.stateRequest, undefined, '/v1/apps/yes-no/state') && hasBearer(evidence.stateRequest) ? 'yes' : 'no',
      evidence: requestEvidence(evidence.stateRequest),
    },
    {
      id: 'tts-fallback-path',
      question: `${app} has a non-blocking TTS fallback path.`,
      answer: evidence.ttsFallback?.attemptedPlatformTts && Boolean(evidence.ttsFallback.fallbackMode) ? 'yes' : 'no',
      evidence: evidence.ttsFallback ? `${evidence.ttsFallback.fallbackMode}${evidence.ttsFallback.error ? ` after ${evidence.ttsFallback.error}` : ''}` : 'No TTS fallback evidence supplied.',
    },
  ]
}

function createStatement(sql: string, handlers: D1Handler[], history: D1Execution[], strict: boolean): MockD1PreparedStatement {
  let values: unknown[] = []
  const context = (): D1HandlerContext => ({ sql, values, history })
  const findHandler = () => handlers.find((handler) => matches(handler.match, sql))
  return {
    bind(...nextValues: unknown[]) {
      values = nextValues
      return this
    },
    async first<T>() {
      const handler = findHandler()
      history.push({ sql, values: [...values], meta: {} })
      if (!handler) {
        if (strict) throw new Error(`Unhandled D1 SQL in mock: ${sql}`)
        return null
      }
      const rows = typeof handler.rows === 'function' ? handler.rows(context()) : handler.rows ?? []
      return (rows[0] as T | undefined) ?? null
    },
    async all<T>() {
      const handler = findHandler()
      history.push({ sql, values: [...values], meta: {} })
      if (!handler) {
        if (strict) throw new Error(`Unhandled D1 SQL in mock: ${sql}`)
        return { results: [] as T[], success: true, meta: {} }
      }
      const rows = typeof handler.rows === 'function' ? handler.rows(context()) : handler.rows ?? []
      return { results: rows as T[], success: true, meta: {} }
    },
    async run() {
      const handler = findHandler()
      if (!handler) {
        history.push({ sql, values: [...values], meta: {} })
        if (strict) throw new Error(`Unhandled D1 SQL in mock: ${sql}`)
        return { results: [], success: true, meta: {} }
      }
      const runResult = handler.run?.(context())
      const meta = runResult && 'meta' in runResult ? runResult.meta ?? {} : {}
      history.push({ sql, values: [...values], meta })
      return { results: [], success: true, meta }
    },
  }
}

async function safeJsonFromText(response: Response): Promise<unknown> {
  const text = await response.text()
  if (!text) return null
  try {
    return JSON.parse(text) as unknown
  } catch {
    return text
  }
}

function createR2Object(value: ArrayBuffer | Uint8Array | string, httpMetadata?: MockR2Object['httpMetadata']): MockR2Object {
  const snapshot = toUint8Array(value).slice()
  const body = copyArrayBuffer(snapshot)
  return {
    body,
    httpMetadata,
    async arrayBuffer() {
      return copyArrayBuffer(snapshot)
    },
  }
}

function copyArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength)
  copy.set(bytes)
  return copy.buffer
}

function toUint8Array(value: ArrayBuffer | Uint8Array | string): Uint8Array {
  if (typeof value === 'string') return new TextEncoder().encode(value)
  if (value instanceof Uint8Array) return value
  return new Uint8Array(value)
}

function matches(match: D1Handler['match'], sql: string): boolean {
  if (typeof match === 'string') return sql.includes(match)
  if (match instanceof RegExp) return match.test(sql)
  return match(sql)
}

function isRequest(request: Request | undefined, method: string | undefined, path: string): boolean {
  if (!request) return false
  if (method && request.method !== method) return false
  return new URL(request.url).pathname === path
}

function hasBearer(request: Request | undefined): boolean {
  return /^Bearer\s+\S+/.test(request?.headers.get('authorization') ?? '')
}

function requestEvidence(request: Request | undefined): string {
  if (!request) return 'No request evidence supplied.'
  return `${request.method} ${request.url}`
}

function createWebAppIdentityBundle(): JsonObject {
  return {
    subject: { id: 'user-device', kind: 'device', product: 'tiko' },
    user: { id: 'user-device', accountType: 'temporary', recoverable: false },
    device: { id: 'device-1', secret: 'device-secret' },
    account: null,
    session: { id: 'session-1', token: 'session-token', transport: 'bearer', expiresAt: '2099-01-01T00:00:00.000Z' },
    runtime: { mode: 'parent', childModeEnabled: false, pinConfigured: false },
    capabilities: {
      canVerifyEmail: true,
      canUseParentMode: false,
      canUseChildMode: false,
      canManageChildAccounts: false,
      canDeleteAccount: false,
    },
  }
}

function hasAuthorizationHeader(headers: HeadersInit | undefined): boolean {
  if (!headers) return false
  return new Headers(headers).has('authorization')
}

function safeJsonParse(body: BodyInit | null | undefined): unknown {
  if (typeof body !== 'string') return null
  try {
    return JSON.parse(body) as unknown
  } catch {
    return null
  }
}
