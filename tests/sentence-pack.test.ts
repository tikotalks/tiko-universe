import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import type { LanguagePack } from '@tiko/talk-types'

const DATA_DIR = 'packages/talk-packs/data'
const SOURCE_DIR = 'packages/talk-packs/source'
const DB_DIR = 'workers/sentence-api/db'
const emojiPattern = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u

// Two- and three-letter codes both: `pap` and `cnr` were silently excluded while
// this only matched two, which meant two language packs were never tested.
const packFiles = readdirSync(DATA_DIR).filter((name) => /^[a-z]{2,3}-v\d+\.json$/.test(name)).sort()
const localeOf = (fileName: string): string => fileName.replace(/-v\d+\.json$/, '')
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
  it('covers every language the app offers', async () => {
    // Read the real list rather than a copy of it: this test used to hold its own
    // thirteen locales and call them "the platform language list", which is how the
    // registry drifted in the first place.
    const { locales } = await import('../tools/locales.mjs')
    const present = packFiles.map(localeOf)
    for (const locale of locales) {
      expect(
        present,
        `missing language pack for "${locale.code}" (${locale.name}) — every language the picker offers must be seeded`,
      ).toContain(locale.code)
    }
  })

  for (const [fileName, pack] of packs) {
    const locale = localeOf(fileName)

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

/**
 * The packs are generated from one spine and one file per language. These are the
 * properties that made that worth doing: before it, each concept's part of speech,
 * category, frequency and icon were written out 54 times with nothing comparing the
 * copies.
 */
describe('Talk pack source of truth', () => {
  interface Spine {
    version: number
    words: Array<{ id: string, pos: string, category: string, frequency: number, icon?: string }>
    templates: Array<{ id: string, category: string, icon?: string, slots: unknown[] }>
  }
  interface Source {
    locale: string
    words: Record<string, string>
    templates: Record<string, string>
    grammar: unknown
  }

  const spine = JSON.parse(readFileSync(`${SOURCE_DIR}/spine.json`, 'utf8')) as Spine
  const sourceFiles = readdirSync(SOURCE_DIR).filter((name) => name.endsWith('.json') && name !== 'spine.json').sort()

  it('has one source file per pack, and one pack per source file', () => {
    expect(sourceFiles.map((name) => name.replace(/\.json$/, ''))).toEqual(packFiles.map(localeOf))
  })

  it('states each concept once, not once per language', () => {
    expect(spine.words).toHaveLength(enPack.words.length)
    expect(spine.words.map((word) => word.id)).toEqual(enWordIds)
    expect(spine.templates.map((template) => template.id)).toEqual(enTemplateIds)
    expect(new Set(spine.words.map((word) => word.id)).size).toBe(spine.words.length)
  })

  for (const fileName of sourceFiles) {
    const source = JSON.parse(readFileSync(`${SOURCE_DIR}/${fileName}`, 'utf8')) as Source
    const pack = packs.get(`${source.locale}-v${spine.version}.json`)

    describe(source.locale, () => {
      it('names every concept in the spine, and none outside it', () => {
        expect(Object.keys(source.words).sort()).toEqual(spine.words.map((word) => word.id).sort())
        expect(Object.keys(source.templates).sort()).toEqual(spine.templates.map((template) => template.id).sort())
      })

      it('is what the generated pack says — nobody edited data/ by hand', () => {
        expect(pack, `no pack for ${source.locale}`).toBeDefined()
        for (const word of pack!.words) {
          expect(word.text, `${source.locale}/${word.id} drifted from source`).toBe(source.words[word.id])
        }
        for (const template of pack!.templates) {
          expect(template.pattern, `${source.locale}/${template.id} drifted from source`).toBe(source.templates[template.id])
        }
      })
    })
  }
})
