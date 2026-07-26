import { describe, expect, it } from 'vitest'
import { realize } from '../index'
import { select } from './pack'

/**
 * Romanian golden list. Romanian needs both halves of this package: conjugation
 * from infinitives, like the other Romance languages, and a definite article
 * that is a **suffix**, like Swedish and Armenian — "măr" → "mărul".
 */
const golden: Array<[string, string[], string]> = [
  ['masculine indefinite', ['i', 'want', 'apple'], 'Eu vreau un măr.'],
  ['feminine indefinite', ['i', 'want', 'ball'], 'Eu vreau o minge.'],
  ['mass noun takes none', ['i', 'want', 'bread'], 'Eu vreau pâine.'],
  ['the definite article is a suffix', ['i', 'want', 'the', 'apple'], 'Eu vreau mărul.'],
  ['feminine definite suffix', ['i', 'want', 'the', 'ball'], 'Eu vreau mingea.'],
  ['irregular verb', ['he', 'want', 'apple'], 'El vrea un măr.'],
  ['first person plural', ['we', 'want', 'apple'], 'Noi vrem un măr.'],
  ['regular conjugation', ['i', 'help'], 'Eu ajut.'],
  ['adjective follows and agrees', ['i', 'want', 'big', 'apple'], 'Eu vreau un măr mare.'],
  ['plural', ['i', 'want', 'two', 'cookie'], 'Eu vreau doi biscuiți.'],
  ['copula', ['i', 'happy'], 'Eu sunt fericit.'],
  ['nu before the verb', ['i', 'not', 'want', 'apple'], 'Eu nu vreau un măr.'],
  ['negated copula', ['i', 'not', 'happy'], 'Eu nu sunt fericit.'],
  ['object pronouns are preverbal clitics', ['you', 'help', 'me'], 'Tu mă ajuți.'],
  ['a plăcea inverts the clause', ['i', 'like', 'bread'], 'Îmi place pâinea.'],
  ['the possessive follows a definite noun', ['i', 'want', 'my', 'ball'], 'Eu vreau mingea mea.'],
  ['masculine possessive', ['i', 'want', 'my', 'bag'], 'Eu vreau ghiozdanul meu.'],
  ['the noun stays bare after a preposition', ['we', 'go', 'to', 'the', 'park'], 'Noi mergem la parc.'],
  ['question inverts', ['what', 'you', 'want'], 'Ce vrei tu?'],
]

describe('Romanian realizer', () => {
  for (const [name, ids, expected] of golden) {
    it(`${name}: ${ids.join(' + ')} → "${expected}"`, () => {
      expect(realize(select('ro', ids), { locale: 'ro' }).text).toBe(expected)
    })
  }
})
