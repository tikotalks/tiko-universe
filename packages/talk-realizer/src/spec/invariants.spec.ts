import { describe, expect, it } from 'vitest'
import { functionWords, languages, realize, supportedLanguages, type SupportedLanguage } from '../index'
import { packWords, select } from './pack'

/**
 * The safety properties. In an AAC app a wrong sentence is a nuisance, but an
 * *invented* sentence puts words in a child's mouth — so these are the tests
 * that would gate shipping any model behind the same interface.
 */
describe('realizer invariants', () => {
  const selections: string[][] = [
    ['i', 'want', 'apple'],
    ['he', 'want', 'the', 'bread'],
    ['i', 'not', 'want', 'water'],
    ['what', 'you', 'want'],
    ['we', 'go', 'to', 'the', 'park'],
    ['i', 'happy'],
    ['i', 'want', 'two', 'big', 'cookie'],
    ['you', 'help', 'me'],
    ['i', 'want', 'apple', 'please'],
    // Two verbs. Every second verb used to be dropped here — "I want to play" came
    // out as "I want." — and none of the selections above had one, which is how the
    // invariant below went on passing.
    ['i', 'want', 'play'],
    ['i', 'need', 'help'],
    ['i', 'want', 'eat', 'apple'],
    // No subject: a child tapping one tile, which is most of what they tap.
    ['help'],
    ['more', 'please'],
  ]

  for (const language of supportedLanguages) {
    describe(language, () => {
      it('never inserts a word outside the closed function-word set', () => {
        const allowed = new Set(functionWords[language as SupportedLanguage])
        for (const ids of selections) {
          const result = realize(select(language, ids), { locale: language })
          for (const word of result.inserted) {
            expect(allowed, `"${word}" inserted for ${ids.join('+')}`).toContain(word)
          }
        }
      })

      it('never invents a content word: every token traces to a tile or an insertion', () => {
        for (const ids of selections) {
          const selected = select(language, ids)
          const chosen = new Set(selected.map((word) => word.id))
          const result = realize(selected, { locale: language })
          for (const token of result.tokens) {
            for (const id of [token.from, ...(token.merged ?? [])]) {
              if (id === null || id === undefined) continue
              expect(chosen, `token "${token.text}" came from nowhere`).toContain(id)
            }
          }
        }
      })

      it('drops no tile the child chose', () => {
        for (const ids of selections) {
          const selected = select(language, ids)
          const result = realize(selected, { locale: language })
          const used = new Set(
            result.tokens.flatMap((token) => [token.from, ...(token.merged ?? [])]).filter(Boolean),
          )
          for (const word of selected) {
            // Negation is realized as a function word (do not / geen), so the
            // tile itself legitimately disappears from the output.
            if (word.pos === 'negation') continue
            expect(used, `tile "${word.id}" vanished from "${result.text}"`).toContain(word.id)
          }
        }
      })

      it('is deterministic', () => {
        for (const ids of selections) {
          const first = realize(select(language, ids), { locale: language }).text
          const second = realize(select(language, ids), { locale: language }).text
          expect(second).toBe(first)
        }
      })

      it('always ends in a single sentence-final mark', () => {
        const { statement, question } = languages[language].profile.punctuation
        for (const ids of selections) {
          const text = realize(select(language, ids), { locale: language }).text
          const ends = text.endsWith(statement) || text.endsWith(question)
          expect(ends, `"${text}" does not end in ${statement} or ${question}`).toBe(true)
          const marks = [...text].filter((ch) => ch === statement.trim() || ch === question.trim())
          expect(marks.length, `"${text}" has ${marks.length} final marks`).toBe(1)
        }
      })

      it('has no double spaces, and capitalises where the script has case', () => {
        for (const ids of selections) {
          const text = realize(select(language, ids), { locale: language }).text
          if (languages[language].profile.capitalize) {
            expect(text.charAt(0)).toBe(text.charAt(0).toUpperCase())
          }
          expect(text).not.toContain('  ')
        }
      })
    })
  }

  it('falls back to plain concatenation for a language with no rules', () => {
    // Swahili has no pack and no rules: the honest answer is the child's tiles.
    const result = realize(select('en', ['i', 'want', 'apple']), { locale: 'sw' })
    expect(result.text).toBe('I want apple')
    expect(result.inserted).toEqual([])
    expect(result.notes[0]).toContain('no realizer for this language')
  })

  it('survives every single tile in the English pack', () => {
    for (const word of packWords('en').values()) {
      const result = realize([word], { locale: 'en' })
      expect(result.text.length).toBeGreaterThan(0)
    }
  })

  it('survives every single tile in the Dutch pack', () => {
    for (const word of packWords('nl').values()) {
      const result = realize([word], { locale: 'nl' })
      expect(result.text.length).toBeGreaterThan(0)
    }
  })

  it('survives long selections without looping', () => {
    const ids = ['i', 'want', 'two', 'big', 'cookie', 'and', 'three', 'apple', 'please']
    const result = realize(select('en', ids), { locale: 'en' })
    expect(result.text.endsWith('.')).toBe(true)
  })
})
