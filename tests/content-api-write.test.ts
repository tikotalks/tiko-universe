// @vitest-environment node

// Real D1 (Miniflare), the real generated migration, the real worker route.
//
// The point of these tests is not that the route returns 200 — it is that the
// stroke geometry a child traces is the geometry the repo committed. A pack that
// round-trips through D1 with a reordered stroke or a mangled path would still
// look fine in a smoke test and teach the wrong thing.

import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { readFile, readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { Miniflare } from 'miniflare'
import worker from '../workers/content-api/src/index'

interface TestRuntime {
  mf: Miniflare
  db: D1Database
  env: Record<string, unknown>
}

// One runtime for the whole file. These tests are read-only, so per-test
// isolation buys nothing and re-applying 13 migrations (~470 statements) for
// each of them pushed the file past the 5s default timeout under full-suite
// contention.
let runtime: TestRuntime

async function createRuntime(): Promise<TestRuntime> {
  const mf = new Miniflare({
    modules: true,
    script: 'export default { fetch() { return new Response("ok") } }',
    d1Databases: { CONTENT_DB: 'content-api-write-test-db' },
  })
  const db = await mf.getD1Database('CONTENT_DB')
  await applyContentMigrations(db)

  return {
    mf,
    db,
    // No CONTENT_CACHE binding on purpose: cachedInNamespace falls straight
    // through to the loader, so these tests read D1 rather than a warm cache.
    env: { CONTENT_DB: db, ALLOWED_ORIGINS: 'https://write.tiko.test' },
  }
}

async function applyContentMigrations(db: D1Database) {
  const dir = join(process.cwd(), 'workers/content-api/migrations')
  const files = (await readdir(dir)).filter((f) => f.endsWith('.sql')).sort()
  for (const file of files) {
    const sql = await readFile(join(dir, file), 'utf8')
    // Line-oriented rather than split(';'): the write seed embeds JSON in
    // metadata_json, and splitting on every semicolon would shred a payload
    // that happened to contain one.
    const statements = sql
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && !line.startsWith('--'))
      .join('\n')
      .split(/;\s*(?:\n|$)/)
      .map((s) => s.trim())
      .filter(Boolean)
    // Batched rather than one round trip per statement: the write seed alone is
    // ~570 inserts, and applying them serially held the CPU long enough to time
    // out unrelated suites running in parallel.
    for (let i = 0; i < statements.length; i += 200) {
      await db.batch(statements.slice(i, i + 200).map((s) => db.prepare(s)))
    }
  }
}

async function fetchWrite(query = '') {
  const request = new Request(`https://content-api.test/v1/write/content${query}`)
  // content-api's fetch takes (request, env) — no execution context, unlike
  // app-api's, so this is two arguments rather than three.
  const response = await worker.fetch(request, runtime.env as never)
  const body = (await response.json()) as { success: boolean; data: { packs: any[] } }
  return { response, body }
}

beforeAll(async () => {
  runtime = await createRuntime()
}, 60_000)

afterAll(async () => {
  await runtime?.mf.dispose()
})

describe('GET /v1/write/content', () => {
  it('serves every seeded pack', async () => {
    const { response, body } = await fetchWrite()

    expect(response.status).toBe(200)
    expect(body.success).toBe(true)
    const ids = body.data.packs.map((p) => p.packId).sort()
    expect(ids).toEqual(['numbers-latin', 'print-latin', 'shapes'])
  })

  it('returns the authored stroke geometry unchanged', async () => {
    const { body } = await fetchWrite()

    const source = JSON.parse(
      await readFile('packages/write-glyphs/source/print-latin.json', 'utf8')
    )
    const served = body.data.packs.find((p) => p.packId === 'print-latin')!
    expect(served.glyphs).toHaveLength(source.glyphs.length)

    // Every glyph, stroke for stroke. Not a spot check: a single mangled path is
    // one letter a child is taught wrong.
    for (const expected of source.glyphs) {
      const actual = served.glyphs.find((g: any) => g.id === expected.id)
      expect(actual, `glyph ${expected.id} missing`).toBeDefined()
      expect(actual.strokes).toEqual(expected.strokes)
      expect(actual.char).toBe(expected.char)
      expect(actual.groupId).toBe(expected.groupId)
    }
  })

  it('preserves stroke order, which is the thing being taught', async () => {
    const { body } = await fetchWrite()
    const print = body.data.packs.find((p) => p.packId === 'print-latin')!

    // A is three strokes: left diagonal, right diagonal, then the crossbar.
    // If the crossbar came back first the letter would be taught backwards.
    const upperA = print.glyphs.find((g: any) => g.id === 'upper-a')!
    expect(upperA.strokes.map((s: any) => s.d)).toEqual([
      'M50 24 L28 110',
      'M50 24 L72 110',
      'M36 84 L64 84',
    ])
  })

  it('carries the pack geometry envelope', async () => {
    const { body } = await fetchWrite()
    const print = body.data.packs.find((p) => p.packId === 'print-latin')!

    expect(print.packSchemaVersion).toBe(1)
    expect(print.viewBox).toEqual([0, 0, 100, 140])
    expect(print.guides).toMatchObject({ baseline: 110, xHeight: 60, capHeight: 24 })
    expect(print.groups.map((g: any) => g.id)).toEqual(['uppercase', 'lowercase'])
  })

  it('speaks English from the source row', async () => {
    const { body } = await fetchWrite()
    const print = body.data.packs.find((p) => p.packId === 'print-latin')!
    const a = print.glyphs.find((g: any) => g.id === 'lower-a')!

    expect(a.char).toBe('a')
    expect(a.name).toBe('ay')
    expect(a.sound).toBe('a')
    expect(a.word).toBe('apple')
  })

  it('localizes the spoken name but never the character', async () => {
    const { body } = await fetchWrite('?language=nl')
    const print = body.data.packs.find((p) => p.packId === 'print-latin')!
    const a = print.glyphs.find((g: any) => g.id === 'lower-a')!

    // The voice switches language; the tile face does not. A Dutch child still
    // traces the letter "a", they just hear it called "aa".
    expect(a.name).toBe('aa')
    expect(a.word).toBe('appel')
    expect(a.char).toBe('a')
  })

  it('is cacheable unauthenticated', async () => {
    const { response } = await fetchWrite()
    expect(response.headers.get('Cache-Control')).not.toBe('no-store')
  })

  it('serves shapes with no baseline and numbers with one', async () => {
    const { body } = await fetchWrite()

    const shapes = body.data.packs.find((p) => p.packId === 'shapes')!
    const numbers = body.data.packs.find((p) => p.packId === 'numbers-latin')!

    expect(shapes.style).toBe('shape')
    expect(shapes.guides).toBeUndefined()
    expect(numbers.style).toBe('number')
    expect(numbers.guides).toMatchObject({ baseline: 110 })
    expect(numbers.glyphs).toHaveLength(10)
  })
})
