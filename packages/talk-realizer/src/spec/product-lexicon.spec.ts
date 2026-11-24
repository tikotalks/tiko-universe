import { describe, expect, it } from 'vitest'
import type { Lexicon, SelectedWord } from '../features'
import { lexicons, realize } from '../index'
import { select } from './pack'

/**
 * Golden rows for a **second product's vocabulary**, run through the same 54
 * languages of grammar.
 *
 * `realize()` takes a `lexicon` so a pack can ship its own, and the sentences
 * below are the ones that came out wrong the first time another product used it.
 * They are here rather than in the per-language lists because the words are not
 * in Talk's packs — an adult app needs "glasses" and "pain", and a board built
 * for a four-year-old does not — and the whole point of the caller lexicon is
 * that a word Tiko never heard of still gets the language's real grammar.
 *
 * Everything except the one noun still comes from the real pack, so a change to
 * a pack's own tiles is still what breaks these.
 */
interface Row {
  name: string
  language: string
  /** Pack concept ids, in the order the speaker tapped them. */
  ids: string[]
  /** The word the product supplies, tapped last. */
  word: SelectedWord
  features: Lexicon[string]
  expected: string
  /** What the same selection said before, so the row explains itself. */
  was: string
}

const golden: Row[] = [
  {
    name: 'a plural noun takes no indefinite article',
    language: 'en',
    ids: ['i', 'need'],
    word: { id: 'glasses', text: 'glasses', pos: 'noun' },
    features: { pos: 'noun', number: 'pl' },
    expected: 'I need glasses.',
    was: 'I need a glasses.',
  },
  {
    name: 'nor in Spanish, which has a plural article and does not want one here',
    language: 'es',
    ids: ['i', 'need'],
    word: { id: 'glasses', text: 'gafas', pos: 'noun' },
    features: { pos: 'noun', gender: 'feminine', number: 'pl' },
    expected: 'Yo necesito gafas.',
    was: 'Yo necesito una gafas.',
  },
  {
    name: 'and a negated one takes the plural kein',
    language: 'de',
    ids: ['i', 'not', 'have'],
    word: { id: 'pain', text: 'Schmerzen', pos: 'noun' },
    features: { pos: 'noun', gender: 'masculine', number: 'pl' },
    expected: 'Ich habe keine Schmerzen.',
    was: 'Ich habe keinen Schmerzen.',
  },
]

describe('a caller lexicon', () => {
  for (const row of golden) {
    it(`${row.name}: "${row.was}" → "${row.expected}"`, () => {
      const words = [...select(row.language, row.ids), row.word]
      const lexicon: Lexicon = { ...lexicons[row.language], [row.word.id]: row.features }
      expect(realize(words, { locale: row.language, lexicon }).text).toBe(row.expected)
    })
  }

  it('leaves the article alone for a noun that is only singular', () => {
    // The suppression is the noun's plurality talking, not the caller's lexicon
    // being present: the same call with a singular noun still gets its article.
    const words = [...select('en', ['i', 'need']), { id: 'lens', text: 'lens', pos: 'noun' }]
    const lexicon: Lexicon = { ...lexicons.en, lens: { pos: 'noun' } }
    expect(realize(words, { locale: 'en', lexicon }).text).toBe('I need a lens.')
  })
})
