import { describe, expect, it } from 'vitest'
import { realize } from '../index'
import { select } from './pack'

/**
 * Bulgarian golden list. Bulgarian is Slavic without cases, so the whole test is
 * the article — and specifically *where* it goes, because it is a suffix on the
 * first word of the phrase rather than a word of its own:
 *
 * - "ябълката" with no adjective, but "голямата ябълка" with one;
 * - "хлябът" as a subject and "хляба" as an object, the full and short masculine
 *   forms of the written standard;
 * - "моята топка", because a possessive phrase is definite too.
 */
const golden: Array<[string, string[], string]> = [
  ['no indefinite article', ['i', 'want', 'apple'], 'Аз искам ябълка.'],
  ['the definite article is a suffix', ['i', 'want', 'the', 'apple'], 'Аз искам ябълката.'],
  ['"a" adds nothing', ['i', 'want', 'a', 'apple'], 'Аз искам ябълка.'],
  ['the adjective agrees', ['i', 'want', 'big', 'apple'], 'Аз искам голяма ябълка.'],
  ['the article moves onto the adjective', ['i', 'want', 'the', 'big', 'apple'], 'Аз искам голямата ябълка.'],
  ['the full masculine article in the subject', ['the', 'bread', 'is', 'hot'], 'Хлябът е горещ.'],
  ['the short masculine article in the object', ['i', 'want', 'the', 'bread'], 'Аз искам хляба.'],
  ['a plural definite', ['i', 'want', 'two', 'cookie'], 'Аз искам две бисквити.'],
  ['the copula is obligatory', ['i', 'happy'], 'Аз съм щастлив.'],
  ['third person copula', ['he', 'tired'], 'Той е уморен.'],
  ['a plural predicate agrees', ['we', 'happy'], 'Ние сме щастливи.'],
  ['a predicate agrees with a noun subject', ['the', 'apple', 'is', 'big'], 'Ябълката е голяма.'],
  ['negation before the verb', ['i', 'not', 'want', 'apple'], 'Аз не искам ябълка.'],
  ['negation before the copula', ['i', 'not', 'happy'], 'Аз не съм щастлив.'],
  ['помагам takes a dative clitic', ['you', 'help', 'me'], 'Ти ми помагаш.'],
  ['an object keeps the short article', ['i', 'see', 'the', 'friend'], 'Аз виждам приятела.'],
  ['a possessive phrase is definite', ['i', 'want', 'my', 'ball'], 'Аз искам моята топка.'],
  ['a preposition governs nothing: no cases', ['we', 'go', 'to', 'the', 'park'], 'Ние отиваме към парка.'],
  ['a question inverts', ['where', 'mum'], 'Къде е мама?'],
  ['a question word comes first', ['what', 'you', 'want'], 'Какво искаш ти?'],
  ['a trailing social', ['i', 'want', 'apple', 'please'], 'Аз искам ябълка, моля.'],
]

describe('Bulgarian realizer', () => {
  for (const [name, ids, expected] of golden) {
    it(`${name}: ${ids.join(' + ')} → "${expected}"`, () => {
      expect(realize(select('bg', ids), { locale: 'bg' }).text).toBe(expected)
    })
  }

  it('says where the article went', () => {
    const result = realize(select('bg', ['i', 'want', 'the', 'big', 'apple']), { locale: 'bg' })
    expect(result.notes.join(' ')).toContain('the article moves onto the adjective')
  })

  it('keeps the article tile in the audit trail', () => {
    const result = realize(select('bg', ['i', 'want', 'the', 'apple']), { locale: 'bg' })
    const accounted = result.tokens.flatMap((token) => [token.from, ...(token.merged ?? [])])
    expect(accounted).toContain('the')
  })
})
