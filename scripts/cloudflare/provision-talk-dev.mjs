#!/usr/bin/env node
import { readFile, writeFile } from 'node:fs/promises'

const TOKEN = process.env.CLOUDFLARE_API_TOKEN
const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID || 'dc2b7d14a69351375cab6de9a13ddee9'
const WORKER_WRANGLER = 'workers/sentence-api/wrangler.toml'

if (!TOKEN) {
  throw new Error('CLOUDFLARE_API_TOKEN is required to provision Talk dev resources')
}

async function cf(path, init = {}) {
  const response = await fetch(`https://api.cloudflare.com/client/v4${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  })

  const payload = await response.json().catch(() => ({}))
  if (!response.ok || payload.success === false) {
    const messages = Array.isArray(payload.errors)
      ? payload.errors.map((error) => error.message ?? error.code).join('; ')
      : response.statusText
    throw new Error(`Cloudflare API ${init.method ?? 'GET'} ${path} failed: ${messages}`)
  }

  return payload.result
}

async function ensureD1(name) {
  const existing = await cf(`/accounts/${ACCOUNT_ID}/d1/database`)
  const match = existing.find((db) => db.name === name)
  if (match) return match.uuid

  const created = await cf(`/accounts/${ACCOUNT_ID}/d1/database`, {
    method: 'POST',
    body: JSON.stringify({ name }),
  })
  return created.uuid
}

async function ensureKv(title) {
  const existing = await cf(`/accounts/${ACCOUNT_ID}/storage/kv/namespaces`)
  const match = existing.find((namespace) => namespace.title === title)
  if (match) return match.id

  const created = await cf(`/accounts/${ACCOUNT_ID}/storage/kv/namespaces`, {
    method: 'POST',
    body: JSON.stringify({ title }),
  })
  return created.id
}

async function ensureZoneId(name) {
  const zones = await cf(`/zones?name=${encodeURIComponent(name)}`)
  const zone = zones.find((candidate) => candidate.name === name)
  if (!zone) throw new Error(`Cloudflare zone not found: ${name}`)
  return zone.id
}

async function ensureDnsCname({ zone, name, content, proxied = true }) {
  const zoneId = await ensureZoneId(zone)
  const records = await cf(`/zones/${zoneId}/dns_records?name=${encodeURIComponent(name)}`)
  const exactRecords = records.filter((record) => record.name === name)
  const existing = exactRecords.find((record) => record.type === 'CNAME')
  const body = { type: 'CNAME', name, content, proxied, ttl: 1 }

  if (existing) {
    if (existing.content === content && existing.proxied === proxied) return existing.id
    const updated = await cf(`/zones/${zoneId}/dns_records/${existing.id}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    })
    return updated.id
  }

  for (const staleRecord of exactRecords) {
    await cf(`/zones/${zoneId}/dns_records/${staleRecord.id}`, { method: 'DELETE' })
  }

  const created = await cf(`/zones/${zoneId}/dns_records`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
  return created.id
}

async function ensurePagesDomain(projectName, domainName) {
  const domains = await cf(`/accounts/${ACCOUNT_ID}/pages/projects/${projectName}/domains`)
  if (domains.some((domain) => domain.name === domainName)) return

  try {
    await cf(`/accounts/${ACCOUNT_ID}/pages/projects/${projectName}/domains`, {
      method: 'POST',
      body: JSON.stringify({ name: domainName }),
    })
  } catch (error) {
    // Cloudflare can report "already exists" if the domain is attached but not returned yet.
    if (!String(error?.message ?? error).includes('already')) throw error
  }
}

function replaceFirstTomlValue(source, key, value) {
  return source.replace(new RegExp(`(^\\s*${key}\\s*=\\s*")([^"]+)(")`, 'm'), `$1${value}$3`)
}

function replaceTomlValueAfterMarker(source, marker, key, value) {
  const index = source.indexOf(marker)
  if (index === -1) throw new Error(`Marker not found in wrangler config: ${marker}`)
  const before = source.slice(0, index)
  const after = source.slice(index).replace(new RegExp(`(^\\s*${key}\\s*=\\s*")([^"]+)(")`, 'm'), `$1${value}$3`)
  return `${before}${after}`
}

// The Cloudflare account is at its D1 database limit. Reuse the existing shared
// dev app database and keep Talk isolated through sentence-api table names.
const devDbId = await ensureD1('tiko-db')
const devKvId = await ensureKv('tiko-sentence-cache-dev')

let wrangler = await readFile(WORKER_WRANGLER, 'utf8')
wrangler = replaceFirstTomlValue(wrangler, 'database_id', devDbId)
wrangler = replaceFirstTomlValue(wrangler, 'id', devKvId)
wrangler = replaceFirstTomlValue(wrangler, 'preview_id', devKvId)

if (process.env.TIKO_PROVISION_PRODUCTION === 'true') {
  const prodDbId = await ensureD1('tiko-db')
  const prodKvId = await ensureKv('tiko-sentence-cache')
  wrangler = replaceTomlValueAfterMarker(wrangler, '[env.production]', 'database_id', prodDbId)
  wrangler = replaceTomlValueAfterMarker(wrangler, '[env.production]', 'id', prodKvId)
}

await writeFile(WORKER_WRANGLER, wrangler)

await ensurePagesDomain('tiko-talk-dev', 'dev.talk.tikoapps.org')
await ensureDnsCname({ zone: 'tikoapps.org', name: 'dev.talk.tikoapps.org', content: 'tiko-talk-dev.pages.dev' })
await ensureDnsCname({
  zone: 'tikotalks.com',
  name: 'dev.api.tikotalks.com',
  content: 'tiko-generation-api-dev.silvandiepen.workers.dev',
})

console.log('Talk dev Cloudflare resources are provisioned')
