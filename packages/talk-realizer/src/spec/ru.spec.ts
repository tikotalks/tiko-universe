import { describe, expect, it } from 'vitest'
import { realize } from '../index'
import { select } from './pack'

/**
 * Russian golden list. Russian has no articles and no present-tense copula, so
 * what an article does in English a case ending does here — and the cases are the
 * whole test:
 *
 * - the accusative differs from the nominative for feminine nouns ("воду") and
 *   for animate masculines ("друга"), but not for neuters ("яблоко");
 * - negating a transitive verb puts its object in the genitive ("яблока");
 * - помогать governs the dative ("мне"), and к governs it too ("к парку").
 */
const golden: Array<[string, string[], string]> = [
  ['neuter accusative equals the nominative', ['i', 'want', 'apple'], 'Я хочу яблоко.'],
  ['feminine accusative changes', ['i', 'want', 'water'], 'Я хочу воду.'],
  ['no article at all', ['i', 'want', 'the', 'apple'], 'Я хочу яблоко.'],
  ['mass noun is unchanged in the accusative', ['i', 'want', 'bread'], 'Я хочу хлеб.'],
  ['curated verb person', ['he', 'want', 'apple'], 'Он хочет яблоко.'],
  ['first person plural', ['we', 'want', 'apple'], 'Мы хотим яблоко.'],
  ['adjective agrees with a neuter object', ['i', 'want', 'big', 'apple'], 'Я хочу большое яблоко.'],
  ['no copula in the present', ['i', 'happy'], 'Я счастлив.'],
  ['the predicative form is used', ['he', 'tired'], 'Он устал.'],
  ['the genitive of negation', ['i', 'not', 'want', 'apple'], 'Я не хочу яблока.'],
  ['negated predicate', ['i', 'not', 'happy'], 'Я не счастлив.'],
  ['animate masculine accusative borrows the genitive', ['i', 'see', 'the', 'friend'], 'Я вижу друга.'],
  ['помогать governs the dative', ['you', 'help', 'me'], 'Ты помогаешь мне.'],
  ['к governs the dative', ['we', 'go', 'to', 'the', 'park'], 'Мы идём к парку.'],
  ['question needs no inversion', ['what', 'you', 'want'], 'Что ты хочешь?'],
  ['trailing social', ['i', 'want', 'apple', 'please'], 'Я хочу яблоко, пожалуйста.'],
]

describe('Russian realizer', () => {
  for (const [name, ids, expected] of golden) {
    it(`${name}: ${ids.join(' + ')} → "${expected}"`, () => {
      expect(realize(select('ru', ids), { locale: 'ru' }).text).toBe(expected)
    })
  }

  it('explains the genitive of negation', () => {
    const result = realize(select('ru', ['i', 'not', 'want', 'apple']), { locale: 'ru' })
    expect(result.notes.join(' ')).toContain('genitive of negation')
  })
})
