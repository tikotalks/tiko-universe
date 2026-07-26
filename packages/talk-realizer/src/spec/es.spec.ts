import { describe, expect, it } from 'vitest'
import { realize } from '../index'
import { select } from './pack'

/** Spanish golden list, run against the real pack. */
const golden: Array<[string, string[], string]> = [
  ["indefinite article agrees", ["i", "want", "apple"], "Yo quiero una manzana."],
  ["mass noun takes none", ["i", "want", "bread"], "Yo quiero pan."],
  ["definite article agrees", ["i", "want", "the", "apple"], "Yo quiero la manzana."],
  ["stem change in the singular", ["he", "want", "apple"], "Él quiere una manzana."],
  ["no stem change in the plural", ["we", "want", "apple"], "Nosotros queremos una manzana."],
  ["regular -ar verb", ["i", "play"], "Yo juego."],
  ["adjective follows and agrees", ["i", "want", "big", "apple"], "Yo quiero una manzana grande."],
  ["plural", ["i", "want", "two", "cookie"], "Yo quiero dos galletas."],
  ["estar for a state", ["i", "happy"], "Yo estoy feliz."],
  ["negation before the verb", ["i", "not", "want", "apple"], "Yo no quiero una manzana."],
  ["negated state", ["i", "not", "happy"], "Yo no estoy feliz."],
  ["object clitic is preverbal", ["you", "help", "me"], "Tú me ayudas."],
  ["a + el contracts", ["we", "go", "to", "the", "park"], "Nosotros vamos al parque."],
  ["gustar inverts the clause", ["i", "like", "bread"], "Me gusta el pan."],
  ["inverted verb agrees with the plural", ["i", "like", "two", "cookie"], "Me gustan dos galletas."],
  ["question is bracketed", ["what", "you", "want"], "¿Qué tú quieres?"],
]

describe('Spanish realizer', () => {
  for (const [name, ids, expected] of golden) {
    it(`${name}: ${ids.join(' + ')} → "${expected}"`, () => {
      expect(realize(select('es', ids), { locale: 'es' }).text).toBe(expected)
    })
  }
})
