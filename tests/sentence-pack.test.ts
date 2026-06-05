import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import type { LanguagePack } from '@tiko/talk-types'

const pack = JSON.parse(readFileSync('workers/sentence-api/data/en-v1.json', 'utf8')) as LanguagePack
const seedSql = readFileSync('workers/sentence-api/db/seed-en.sql', 'utf8')
const emojiPattern = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u

describe('Talk English v1 language pack seed', () => {
  it('meets the v1 size requirements', () => {
    expect(pack.locale).toBe('en')
    expect(pack.version).toBe(1)
    expect(pack.words.length).toBeGreaterThanOrEqual(200)
    expect(pack.templates.length).toBeGreaterThanOrEqual(20)
  })

  it('uses stable identifiers and no emoji UI labels/icons', () => {
    const wordIds = new Set(pack.words.map((word) => word.id))
    const templateIds = new Set(pack.templates.map((template) => template.id))

    expect(wordIds.size).toBe(pack.words.length)
    expect(templateIds.size).toBe(pack.templates.length)

    for (const word of pack.words) {
      expect(word.id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
      expect(word.text).not.toMatch(emojiPattern)
      expect(word.icon ?? '').not.toMatch(emojiPattern)
      expect(word.frequency).toBeGreaterThanOrEqual(0)
    }

    for (const template of pack.templates) {
      expect(template.id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
      expect(template.pattern).not.toMatch(emojiPattern)
      expect(template.icon ?? '').not.toMatch(emojiPattern)
      expect(template.slots.length).toBeGreaterThan(0)
    }
  })

  it('documents fallback generator expectations in the SQL metadata', () => {
    expect(seedSql).toContain('fallbackGenerator')
    expect(seedSql).toContain('targetWords')
    expect(seedSql).toContain('targetTemplates')
    expect(seedSql).toContain('INSERT OR REPLACE INTO language_packs')
    expect(seedSql).toContain('INSERT OR REPLACE INTO transitions')
  })
})
