import { afterEach, describe, expect, it, vi } from 'vitest'
import worker from '../workers/communication-api/src/index'

type Row = Record<string, unknown>
type JsonBody = Record<string, any>

class MemoryResult {
  constructor(private rows: Row[] = []) {}

  first<T = Row>(): T | null {
    return (this.rows[0] as T | undefined) ?? null
  }

  all<T = Row>(): { results: T[]; success: true; meta: Record<string, unknown> } {
    return { results: this.rows as T[], success: true, meta: {} }
  }

  run(): { success: true; meta: Record<string, unknown> } {
    return { success: true, meta: {} }
  }
}

class MemoryStatement {
  private values: unknown[] = []

  constructor(private db: MemoryCommunicationDb, private sql: string) {}

  bind(...values: unknown[]): MemoryStatement {
    this.values = values
    return this
  }

  first<T = Row>(): T | null {
    return this.db.execute(this.sql, this.values).first<T>()
  }

  all<T = Row>() {
    return this.db.execute(this.sql, this.values).all<T>()
  }

  run() {
    return this.db.execute(this.sql, this.values).run()
  }
}

class MemoryCommunicationDb {
  messages = new Map<string, Row>()
  attempts: Row[] = []
  events: Row[] = []

  prepare(sql: string): MemoryStatement {
    return new MemoryStatement(this, sql)
  }

  execute(sql: string, values: unknown[]): MemoryResult {
    const normalized = sql.replace(/\s+/g, ' ').trim()
    if (normalized.startsWith('INSERT INTO communication_messages')) {
      const [
        id, direction, channel, type, status, fromAddress, toAddress, subject, textBody, htmlBody,
        provider, providerMessageId, relatedUserId, relatedApp, metadataJson, createdAt, updatedAt
      ] = values
      this.messages.set(String(id), {
        id, direction, channel, type, status, from_address: fromAddress, to_address: toAddress,
        subject, text_body: textBody, html_body: htmlBody, provider, provider_message_id: providerMessageId,
        related_user_id: relatedUserId, related_app: relatedApp, metadata_json: metadataJson,
        created_at: createdAt, updated_at: updatedAt
      })
      return new MemoryResult()
    }
    if (normalized.startsWith('UPDATE communication_messages SET status')) {
      const [status, providerMessageId, updatedAt, id] = values
      const message = this.messages.get(String(id))
      if (message) Object.assign(message, { status, provider_message_id: providerMessageId ?? message.provider_message_id, updated_at: updatedAt })
      return new MemoryResult()
    }
    if (normalized.startsWith('INSERT INTO communication_delivery_attempts')) {
      const [id, messageId, provider, providerMessageId, status, errorCode, errorMessage, attemptNumber, createdAt] = values
      this.attempts.push({ id, message_id: messageId, provider, provider_message_id: providerMessageId, status, error_code: errorCode, error_message: errorMessage, attempt_number: attemptNumber, created_at: createdAt })
      return new MemoryResult()
    }
    if (normalized.startsWith('INSERT INTO communication_events')) {
      const [id, messageId, eventType, provider, payloadJson, createdAt] = values
      this.events.push({ id, message_id: messageId, event_type: eventType, provider, payload_json: payloadJson, created_at: createdAt })
      return new MemoryResult()
    }
    if (normalized.startsWith('SELECT id, direction')) {
      const [direction, status, limit] = values
      const rows = [...this.messages.values()]
        .filter((row) => row.direction === direction && row.status === status)
        .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
        .slice(0, Number(limit))
      return new MemoryResult(rows)
    }
    throw new Error(`Unhandled SQL in communication test fake: ${normalized}`)
  }
}

function env(db = new MemoryCommunicationDb()) {
  return {
    COMMUNICATION_DB: db,
    COMMUNICATION_API_KEY: 'comm_test_key',
    RESEND_API_KEY: 're_test_key',
    MAGIC_LINK_FROM_EMAIL: 'Tiko <noreply@tikotalks.com>',
    ALLOWED_ORIGINS: 'https://admin.tiko.test'
  }
}

async function fetchJson(path: string, init: RequestInit = {}, testEnv = env()) {
  const request = new Request(`https://communication.test${path}`, {
    ...init,
    headers: { 'content-type': 'application/json', ...(init.headers ?? {}) }
  })
  const response = await worker.fetch(request, testEnv as never)
  const body = response.status === 204 ? {} : await response.json() as JsonBody
  return { response, body, env: testEnv }
}

describe('communication-api', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('requires service auth for communication mutations', async () => {
    const result = await fetchJson('/v1/communication/email/magic-link', {
      method: 'POST',
      body: JSON.stringify({ to: 'caregiver@example.test', magicLinkUrl: 'https://example.test/magic?token=abc' })
    })

    expect(result.response.status).toBe(401)
    expect(result.body.error.code).toBe('unauthorized')
  })

  it('sends magic links through Resend and logs message attempts and events', async () => {
    const resendFetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ id: 'email_123' }), { status: 200 }))
    const testEnv = env()

    const result = await fetchJson('/v1/communication/email/magic-link', {
      method: 'POST',
      headers: { authorization: 'Bearer comm_test_key' },
      body: JSON.stringify({ to: 'caregiver@example.test', magicLinkUrl: 'https://example.test/magic?token=abc' })
    }, testEnv)

    expect(result.response.status).toBe(202)
    expect(result.body.data.messageId).toMatch(/^msg_/)
    expect(resendFetch).toHaveBeenCalledWith('https://api.resend.com/emails', expect.objectContaining({
      method: 'POST',
      headers: expect.objectContaining({ authorization: 'Bearer re_test_key' })
    }))
    const message = [...testEnv.COMMUNICATION_DB.messages.values()][0]
    expect(message).toMatchObject({ direction: 'outbound', status: 'sent', provider_message_id: 'email_123' })
    expect(testEnv.COMMUNICATION_DB.attempts[0]).toMatchObject({ provider: 'resend', status: 'sent' })
    expect(testEnv.COMMUNICATION_DB.events.map((event) => event.event_type)).toEqual(['message_queued', 'provider_accepted'])
  })

  it('captures inbound support email and exposes it in the inbox', async () => {
    const testEnv = env()
    const captured = await fetchJson('/v1/communication/inbound/email', {
      method: 'POST',
      headers: { authorization: 'Bearer comm_test_key' },
      body: JSON.stringify({ from: 'parent@example.test', to: 'support@tikotalks.com', subject: 'Help', text: 'Can you help?' })
    }, testEnv)
    const inbox = await fetchJson('/v1/communication/inbox', {
      headers: { authorization: 'Bearer comm_test_key' }
    }, testEnv)

    expect(captured.response.status).toBe(202)
    expect(inbox.response.status).toBe(200)
    expect(inbox.body.data).toHaveLength(1)
    expect(inbox.body.data[0]).toMatchObject({ from: 'parent@example.test', to: 'support@tikotalks.com', subject: 'Help', status: 'open' })
  })
})
