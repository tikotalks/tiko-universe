import { describe, expect, it } from 'vitest'
import { realize } from '../index'
import { select } from './pack'

/** Portuguese golden list, run against the real pack. */
const golden: Array<[string, string[], string]> = [
  ["indefinite article agrees", ["i", "want", "apple"], "Eu quero uma maçã."],
  ["definite article agrees", ["i", "want", "the", "apple"], "Eu quero a maçã."],
  ["mass noun takes none", ["i", "want", "bread"], "Eu quero pão."],
  ["irregular querer", ["he", "want", "apple"], "Ele quer uma maçã."],
  ["regular -ar verb", ["i", "play"], "Eu brinco."],
  ["adjective follows and agrees", ["i", "want", "big", "apple"], "Eu quero uma maçã grande."],
  ["copula estar", ["i", "happy"], "Eu estou feliz."],
  ["negation before the verb", ["i", "not", "want", "apple"], "Eu não quero uma maçã."],
  ["object clitic is preverbal", ["you", "help", "me"], "Tu me ajudas."],
  ["gostar carries its preposition", ["i", "like", "bread"], "Eu gosto de pão."],
  ["possessive agrees", ["i", "want", "my", "ball"], "Eu quero minha bola."],
]

describe('Portuguese realizer', () => {
  for (const [name, ids, expected] of golden) {
    it(`${name}: ${ids.join(' + ')} → "${expected}"`, () => {
      expect(realize(select('pt', ids), { locale: 'pt' }).text).toBe(expected)
    })
  }
})
