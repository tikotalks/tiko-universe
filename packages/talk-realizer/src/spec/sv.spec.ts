import { describe, expect, it } from 'vitest'
import { realize } from '../index'
import { select } from './pack'

/**
 * Swedish golden list. Swedish had no pack at all until this package added one,
 * so these cases are also the proof that adding a language is data plus a
 * grammar file — not a new engine.
 */
const golden: Array<[string, string[], string]> = [
  ['ett-word takes ett', ['i', 'want', 'apple'], 'Jag vill ha ett äpple.'],
  ['en-word takes en', ['i', 'want', 'ball'], 'Jag vill ha en boll.'],
  ['mass noun takes none', ['i', 'want', 'bread'], 'Jag vill ha bröd.'],
  ['definiteness is a suffix', ['i', 'want', 'the', 'apple'], 'Jag vill ha äpplet.'],
  ['en-word definite suffix', ['i', 'want', 'the', 'ball'], 'Jag vill ha bollen.'],
  ['verbs do not inflect for person', ['he', 'want', 'apple'], 'Han vill ha ett äpple.'],
  ['plural is the same', ['we', 'want', 'apple'], 'Vi vill ha ett äpple.'],
  ['indefinite neuter adjective takes -t', ['i', 'want', 'big', 'apple'], 'Jag vill ha ett stort äpple.'],
  ['indefinite common adjective is bare', ['i', 'want', 'big', 'ball'], 'Jag vill ha en stor boll.'],
  ['the definite adjective takes -a and the free article', ['i', 'want', 'the', 'big', 'apple'], 'Jag vill ha det stora äpplet.'],
  ['plural noun', ['i', 'want', 'two', 'cookie'], 'Jag vill ha två kakor.'],
  ['irregular plural', ['i', 'want', 'two', 'book'], 'Jag vill ha två böcker.'],
  ['copula', ['i', 'happy'], 'Jag är glad.'],
  ['negation splits the verb from its tail', ['i', 'not', 'want', 'apple'], 'Jag vill inte ha ett äpple.'],
  ['negated copula', ['i', 'not', 'happy'], 'Jag är inte glad.'],
  // The tail waits for the subject under inversion: "Vad vill du ha?".
  ['verb-second question keeps the tail last', ['what', 'you', 'want'], 'Vad vill du ha?'],
  ['object pronoun', ['you', 'help', 'me'], 'Du hjälper mig.'],
  ['definite suffix after a preposition', ['we', 'go', 'to', 'the', 'park'], 'Vi går till parken.'],
]

describe('Swedish realizer', () => {
  for (const [name, ids, expected] of golden) {
    it(`${name}: ${ids.join(' + ')} → "${expected}"`, () => {
      expect(realize(select('sv', ids), { locale: 'sv' }).text).toBe(expected)
    })
  }
})
