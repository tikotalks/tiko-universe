import { normalizeConfig, type AnkoreConfig, type NormalizedAnkoreConfig } from 'ankore'
import { createIdentityWorker, type EmailMessage } from 'ankore/worker'

interface D1Database {
  prepare(sql: string): unknown
}

interface ServiceBinding {
  fetch(input: Request | string, init?: RequestInit): Promise<Response>
}

export interface Env {
  IDENTITY_DB: D1Database
  TOKEN_PEPPER: string
  ANKORE_TOKEN_PEPPER?: string
  MAGIC_LINK_BASE_URL?: string
  COMMUNICATION_API_URL?: string
  COMMUNICATION_API_KEY?: string
  COMMUNICATION_SERVICE?: ServiceBinding
  ALLOWED_ORIGINS?: string
  MAGIC_LINK_TEST_SINK?: Array<{ email: string; token: string; otp: string; url: string; webUrl: string }>
}

const SESSION_TTL_DAYS = 180
const DEFAULT_COMMUNICATION_API_URL = 'https://api.tikotalks.com/v1/communication'
const DEFAULT_ALLOWED_ORIGINS = 'https://tiko.mt,https://www.tiko.mt,https://tiko.tikoapps.org,https://yesno.tikoapps.org,https://cards.tikoapps.org,https://sequence.tikoapps.org,https://type.tikoapps.org,https://timer.tikoapps.org,https://admin.tikoapps.org,https://dev.tiko.tikoapps.org,https://dev.yesno.tikoapps.org,https://dev.cards.tikoapps.org,https://dev.sequence.tikoapps.org,https://dev.type.tikoapps.org,https://dev.timer.tikoapps.org,https://dev.admin.tikoapps.org,http://localhost:3060,http://localhost:3061,http://localhost:3062,http://localhost:3063,http://localhost:3064,http://localhost:3065,http://localhost:5173,http://localhost:4173,capacitor://localhost,ionic://localhost,tiko://native'

const baseConfig = {
  product: 'tiko',
  databaseBinding: 'IDENTITY_DB',
  basePath: '/v1/identity',
  session: {
    bearer: true,
    cookie: false,
    ttlDays: SESSION_TTL_DAYS,
    rotateOnRefresh: true
  },
  device: {
    required: true,
    autoCreateSubject: true
  },
  email: {
    enabled: true,
    storage: 'hash',
    purposes: ['recover']
  },
  accounts: {
    enabled: false,
    passwords: false,
    required: false
  },
  apiKeys: {
    enabled: false
  },
  entitlements: {
    enabled: false
  },
  cors: {
    allowedOrigins: DEFAULT_ALLOWED_ORIGINS.split(',')
  }
} satisfies AnkoreConfig

export const identityConfig: NormalizedAnkoreConfig = normalizeConfig(baseConfig)

export default {
  fetch(request: Request, env: Env, _ctx?: unknown): Promise<Response> {
    return createIdentityWorker(configForEnv(env), {
      sendEmail: message => requestMagicLinkDelivery(env, message)
    }).fetch(request, {
      ...env,
      ANKORE_TOKEN_PEPPER: env.ANKORE_TOKEN_PEPPER ?? env.TOKEN_PEPPER
    })
  }
}

function configForEnv(env: Env): AnkoreConfig {
  const allowedOrigins = (env.ALLOWED_ORIGINS ?? DEFAULT_ALLOWED_ORIGINS).split(',').map(entry => entry.trim()).filter(Boolean)
  return { ...baseConfig, cors: { allowedOrigins } }
}

async function requestMagicLinkDelivery(env: Env, message: EmailMessage): Promise<void> {
  const url = magicLinkUrl(env, message.token)
  const webUrl = webMagicLinkUrl(message.token)
  env.MAGIC_LINK_TEST_SINK?.push({ email: message.to, token: message.token, otp: message.otp, url, webUrl })

  if (!env.COMMUNICATION_API_KEY) return

  const baseUrl = (env.COMMUNICATION_API_URL ?? DEFAULT_COMMUNICATION_API_URL).replace(/\/$/, '')
  const endpoint = `${baseUrl}/email/magic-link`
  const init: RequestInit = {
    method: 'POST',
    headers: {
      authorization: `Bearer ${env.COMMUNICATION_API_KEY}`,
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      to: message.to,
      magicLinkUrl: webUrl,
      webLinkUrl: url !== webUrl ? url : undefined,
      otp: message.otp
    })
  }

  const response = env.COMMUNICATION_SERVICE
    ? await env.COMMUNICATION_SERVICE.fetch(endpoint, init)
    : await fetch(endpoint, init)

  if (!response.ok) throw new Error('communication_send_failed')
}

function magicLinkUrl(env: Env, magicToken: string): string {
  const base = env.MAGIC_LINK_BASE_URL ?? 'https://admin.tikoapps.org'
  const url = new URL(base)
  url.searchParams.set('token', magicToken)
  return url.toString()
}

function webMagicLinkUrl(magicToken: string): string {
  const url = new URL('https://admin.tikoapps.org')
  url.searchParams.set('token', magicToken)
  return url.toString()
}
