import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import type { LanguagePack } from '@tiko/talk-types'

const DATA_DIR = 'workers/sentence-api/data'
const DB_DIR = 'workers/sentence-api/db'
const emojiPattern = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u

const packFiles = readdirSync(DATA_DIR).filter((name) => /^[a-z]{2}-v\d+\.json$/.test(name)).sort()
const packs = new Map<string, LanguagePack>(
  packFiles.map((name) => [name, JSON.parse(readFileSync(`${DATA_DIR}/${name}`, 'utf8')) as LanguagePack]),
)
const enPack = packs.get('en-v1.json')
if (!enPack) throw new Error('en-v1.json must exist — it is the reference pack')

const enWordIds = enPack.words.map((word) => word.id)
const enTemplateIds = enPack.templates.map((template) => template.id)

function placeholders(pattern: string): string[] {
  return (pattern.match(/\{[a-z]+\}/g) ?? []).sort()
}

describe('Talk English v1 language pack seed', () => {
  it('meets the v1 size requirements', () => {
    expect(enPack.locale).toBe('en')
    expect(enPack.version).toBe(1)
    expect(enPack.words.length).toBeGreaterThanOrEqual(200)
    expect(enPack.templates.length).toBeGreaterThanOrEqual(20)
  })

  it('uses stable identifiers and no emoji UI labels/icons', () => {
    const wordIds = new Set(enWordIds)
    const templateIds = new Set(enTemplateIds)

    expect(wordIds.size).toBe(enPack.words.length)
    expect(templateIds.size).toBe(enPack.templates.length)

    for (const word of enPack.words) {
      expect(word.id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
      expect(word.text).not.toMatch(emojiPattern)
      expect(word.icon ?? '').not.toMatch(emojiPattern)
      expect(word.frequency).toBeGreaterThanOrEqual(0)
    }

    for (const template of enPack.templates) {
      expect(template.id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
      expect(template.pattern).not.toMatch(emojiPattern)
      expect(template.icon ?? '').not.toMatch(emojiPattern)
      expect(template.slots.length).toBeGreaterThan(0)
    }
  })

  it('documents fallback generator expectations in the SQL metadata', () => {
    const seedSql = readFileSync(`${DB_DIR}/seed-en.sql`, 'utf8')
    expect(seedSql).toContain('fallbackGenerator')
    expect(seedSql).toContain('targetWords')
    expect(seedSql).toContain('targetTemplates')
    expect(seedSql).toContain('INSERT OR REPLACE INTO talk_language_packs')
    expect(seedSql).toContain('INSERT OR REPLACE INTO talk_transitions')
  })
})

describe('Talk language packs — all supported locales', () => {
  it('covers every supported Tiko language', () => {
    // The platform language list (packages/i18n tikoLanguageOptions).
    const supported = ['en', 'de', 'es', 'fr', 'nl', 'pt', 'ja', 'zh', 'ko', 'mt', 'it', 'ar', 'hy']
    const present = packFiles.map((name) => name.slice(0, 2))
    for (const locale of supported) {
      expect(present, `missing language pack for "${locale}" — every supported language must be seeded`).toContain(locale)
    }
  })

  for (const [fileName, pack] of packs) {
    const locale = fileName.slice(0, 2)

    describe(`${fileName}`, () => {
      it('declares the right locale and version', () => {
        expect(pack.locale).toBe(locale)
        expect(pack.version).toBeGreaterThanOrEqual(1)
      })

      it('has full word-id and template-id parity with the English reference pack', () => {
        expect(pack.words.map((word) => word.id)).toEqual(enWordIds)
        expect(pack.templates.map((template) => template.id)).toEqual(enTemplateIds)
      })

      it('keeps pos/category/frequency aligned with English and translates the text', () => {
        pack.words.forEach((word, index) => {
          const reference = enPack.words[index]
          expect(word.pos, `${word.id}: pos drifted`).toBe(reference.pos)
          expect(word.category, `${word.id}: category drifted`).toBe(reference.category)
          expect(word.frequency, `${word.id}: frequency drifted`).toBe(reference.frequency)
          expect(typeof word.text).toBe('string')
          expect(word.text.length).toBeGreaterThan(0)
          expect(word.text).not.toMatch(emojiPattern)
        })
      })

      it('keeps template slots and placeholders aligned with English', () => {
        pack.templates.forEach((template, index) => {
          const reference = enPack.templates[index]
          expect(template.slots.length, `${template.id}: slot count drifted`).toBe(reference.slots.length)
          expect(placeholders(template.pattern), `${template.id}: placeholders drifted`).toEqual(placeholders(reference.pattern))
          expect(template.pattern).not.toMatch(emojiPattern)
        })
      })

      it('has a coherent grammar over the pack POS set', () => {
        const posSet = new Set(pack.words.map((word) => word.pos))
        const transitions = pack.grammar.validTransitions
        expect(Object.keys(transitions).length).toBeGreaterThan(0)
        for (const [fromPos, toList] of Object.entries(transitions)) {
          expect(posSet.has(fromPos), `validTransitions key "${fromPos}" is not a pack POS`).toBe(true)
          expect(Array.isArray(toList)).toBe(true)
          for (const toPos of toList) {
            expect(posSet.has(toPos), `validTransitions["${fromPos}"] → "${toPos}" is not a pack POS`).toBe(true)
          }
        }
        // The engine's starter set must be reachable in every grammar.
        for (const starter of ['pronoun', 'question', 'social']) {
          expect(posSet.has(starter), `starter POS "${starter}" missing from pack`).toBe(true)
        }
      })

      it('has a generated seed SQL file with locale-namespaced ids', () => {
        const seedPath = `${DB_DIR}/seed-${locale}.sql`
        expect(existsSync(seedPath), `${seedPath} missing — run npm run generate:talk-seeds`).toBe(true)
        const seedSql = readFileSync(seedPath, 'utf8')
        expect(seedSql).toContain('INSERT OR REPLACE INTO talk_language_packs')
        expect(seedSql).toContain('INSERT OR REPLACE INTO talk_word_inventory')
        expect(seedSql).toContain('INSERT OR REPLACE INTO talk_templates')
        expect(seedSql).toContain('INSERT OR REPLACE INTO talk_transitions')
        expect(seedSql).toContain(`'${locale}-v${pack.version}'`)
        // Non-en packs must namespace global word/template ids with the locale prefix.
        if (locale !== 'en') {
          expect(seedSql).toContain(`'${locale}-i'`)
        }
      })
    })
  }
})
