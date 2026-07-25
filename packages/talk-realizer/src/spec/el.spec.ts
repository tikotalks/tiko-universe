import { describe, expect, it } from 'vitest'
import { realize } from '../index'
import { select } from './pack'

/**
 * Greek golden list. Greek is where case handling gets built properly: the
 * article changes between subject and object position ("ο σκύλος" → "τον σκύλο"),
 * which is the same machinery a Slavic language would need, on a language regular
 * enough to test it.
 */
const golden: Array<[string, string[], string]> = [
  ['neuter indefinite', ['i', 'want', 'apple'], 'Εγώ θέλω ένα μήλο.'],
  ['feminine indefinite in the accusative', ['i', 'want', 'ball'], 'Εγώ θέλω μία μπάλα.'],
  ['mass noun takes none', ['i', 'want', 'bread'], 'Εγώ θέλω ψωμί.'],
  ['definite neuter', ['i', 'want', 'the', 'apple'], 'Εγώ θέλω το μήλο.'],
  ['definite feminine takes the accusative article', ['i', 'want', 'the', 'ball'], 'Εγώ θέλω την μπάλα.'],
  ['regular -ω conjugation', ['he', 'want', 'apple'], 'Αυτός θέλει ένα μήλο.'],
  ['first person plural', ['we', 'want', 'apple'], 'Εμείς θέλουμε ένα μήλο.'],
  ['adjective precedes and agrees', ['i', 'want', 'big', 'apple'], 'Εγώ θέλω ένα μεγάλο μήλο.'],
  ['plural', ['i', 'want', 'two', 'cookie'], 'Εγώ θέλω δύο μπισκότα.'],
  ['copula', ['i', 'happy'], 'Εγώ είμαι χαρούμενος.'],
  ['δεν before the verb', ['i', 'not', 'want', 'apple'], 'Εγώ δεν θέλω ένα μήλο.'],
  ['negated copula', ['i', 'not', 'happy'], 'Εγώ δεν είμαι χαρούμενος.'],
  ['object pronouns are preverbal clitics', ['you', 'help', 'me'], 'Εσύ με βοηθάς.'],
  ['αρέσει inverts the clause', ['i', 'like', 'bread'], 'Μου αρέσει το ψωμί.'],
  ['the possessive follows a noun that keeps its article', ['i', 'want', 'my', 'ball'], 'Εγώ θέλω την μπάλα μου.'],
  ['question inverts, and asks with a semicolon', ['what', 'you', 'want'], 'Τι θέλεις εσύ;'],
]

describe('Greek realizer', () => {
  for (const [name, ids, expected] of golden) {
    it(`${name}: ${ids.join(' + ')} → "${expected}"`, () => {
      expect(realize(select('el', ids), { locale: 'el' }).text).toBe(expected)
    })
  }
})
