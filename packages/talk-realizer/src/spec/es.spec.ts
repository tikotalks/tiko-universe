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
  ["predicate agrees with a noun subject", ["the", "apple", "is", "cold"], "La manzana está fría."],
  ["a plural subject takes a plural predicate", ["they", "tired"], "Ellos están cansados."],
  ["plural agreement inside the noun phrase", ["i", "want", "two", "dirty", "cookie"], "Yo quiero dos galletas sucias."],
  ["an invariant adjective is left alone", ["i", "sad"], "Yo estoy triste."],

  // A pronoun subject carries a gender of its own, and the predicate agrees with
  // it. Reading only the noun-phrase head left every sentence about a girl
  // masculine: "Ella está cansado".
  ["predicate agrees with a feminine pronoun subject", ["she", "tired"], "Ella está cansada."],
  ["and with a masculine one", ["he", "tired"], "Él está cansado."],
  ["nothing to move in an invariant adjective", ["she", "happy"], "Ella está feliz."],
]

describe('Spanish realizer', () => {
  for (const [name, ids, expected] of golden) {
    it(`${name}: ${ids.join(' + ')} → "${expected}"`, () => {
      expect(realize(select('es', ids), { locale: 'es' }).text).toBe(expected)
    })
  }
})

/**
 * Predicate agreement with the speaker. Every Spanish sentence a girl or a woman
 * makes with an adjective in -o is wrong without this, and there is no tile in the
 * selection that carries the answer — only the profile knows.
 */
describe('Spanish speaker agreement', () => {
  const tired = (speakerGender?: 'masculine' | 'feminine') =>
    realize(select('es', ['i', 'tired']), speakerGender ? { locale: 'es', speakerGender } : { locale: 'es' })

  it('says "cansada" for a girl and "cansado" for a boy', () => {
    expect(tired('feminine').text).toBe('Yo estoy cansada.')
    expect(tired('masculine').text).toBe('Yo estoy cansado.')
  })

  it('agrees a negated predicate too', () => {
    expect(realize(select('es', ['i', 'not', 'tired']), { locale: 'es', speakerGender: 'feminine' }).text)
      .toBe('Yo no estoy cansada.')
  })

  it('keeps the masculine when nobody said, and records that it had to assume', () => {
    const assumed = tired()
    expect(assumed.text).toBe('Yo estoy cansado.')
    expect(assumed.notes.join(' ')).toContain('wrong for a girl')

    // Told the answer, it says what it agreed with rather than warning about it.
    expect(tired('feminine').notes.join(' ')).not.toContain('not recorded')
  })

  it('says nothing about an adjective that never moves', () => {
    // "triste" and "feliz" are the same word for everyone: a warning here would be
    // noise, and noise is what teaches a reader to skip the notes that matter.
    for (const id of ['sad', 'happy']) {
      const result = realize(select('es', ['i', id]), { locale: 'es' })
      expect(result.notes.some((entry) => entry.includes('speaker'))).toBe(false)
      expect(realize(select('es', ['i', id]), { locale: 'es', speakerGender: 'feminine' }).text)
        .toBe(result.text)
    }
  })

  it('leaves the first person plural masculine, because a group is not the speaker', () => {
    const asWoman = realize(select('es', ['we', 'tired']), { locale: 'es', speakerGender: 'feminine' })
    expect(asWoman.text).toBe('Nosotros estamos cansados.')
  })

  it('lets the third person keep its own gender, whoever is speaking', () => {
    // The speaker's gender answers for "yo" and for nothing else: a woman saying
    // "él está cansado" is not talking about herself.
    expect(realize(select('es', ['she', 'tired']), { locale: 'es', speakerGender: 'masculine' }).text)
      .toBe('Ella está cansada.')
    expect(realize(select('es', ['he', 'tired']), { locale: 'es', speakerGender: 'feminine' }).text)
      .toBe('Él está cansado.')
    expect(realize(select('es', ['i', 'tired']), { locale: 'es', speakerGender: 'feminine' }).text)
      .toBe('Yo estoy cansada.')
  })

  it('agrees an attributive adjective with its noun, not with the speaker', () => {
    // "manzana" is feminine whoever is holding the tablet.
    expect(realize(select('es', ['i', 'want', 'big', 'apple']), { locale: 'es', speakerGender: 'feminine' }).text)
      .toBe('Yo quiero una manzana grande.')
    expect(realize(select('es', ['i', 'want', 'dirty', 'cookie']), { locale: 'es', speakerGender: 'masculine' }).text)
      .toBe('Yo quiero una galleta sucia.')
  })
})
