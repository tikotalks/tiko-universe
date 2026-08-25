import { describe, expect, it } from 'vitest'
import { realize } from '../index'
import { select } from './pack'

/** Afrikaans golden list. Afrikaans brings double negation — a negated clause is bracketed by "nie … nie" — and sends its infinitive to the end of the clause. */
const golden: Array<[string, string[], string]> = [
  ["one indefinite article", ["i", "want", "apple"], "Ek wil 'n appel h\u00ea."],
  ["one definite article for everything", ["i", "want", "the", "apple"], "Ek wil die appel h\u00ea."],
  ["mass noun takes none", ["i", "want", "bread"], "Ek wil brood h\u00ea."],
  ["verbs do not inflect at all", ["he", "want", "apple"], "Hy wil 'n appel h\u00ea."],
  ["plural", ["i", "want", "two", "cookie"], "Ek wil twee koekies h\u00ea."],
  ["copula", ["i", "happy"], "Ek is gelukkig."],
  ["double negation brackets the clause, with the infinitive inside", ["i", "not", "want", "apple"], "Ek wil nie 'n appel hê nie."],
  ["double negation with a predicate", ["i", "not", "happy"], "Ek is nie gelukkig nie."],
  ["object pronoun", ["you", "help", "me"], "Jy help my."],
  ["the infinitive closes the clause", ["i", "want", "my", "ball"], "Ek wil my bal h\u00ea."],
  ["question inverts", ["what", "you", "want"], "Wat wil jy h\u00ea?"],
]

describe('Afrikaans realizer', () => {
  for (const [name, ids, expected] of golden) {
    it(`${name}: ${ids.join(' + ')} → "${expected}"`, () => {
      expect(realize(select('af', ids), { locale: 'af' }).text).toBe(expected)
    })
  }
})
