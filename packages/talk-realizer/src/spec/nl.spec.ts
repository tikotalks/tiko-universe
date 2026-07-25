import { describe, expect, it } from 'vitest'
import { realize } from '../index'
import { select } from './pack'

/** Golden list: the same concept ids as the English suite, Dutch out. */
const golden: Array<[string, string[], string]> = [
  // Articles
  ['indefinite een', ['i', 'want', 'apple'], 'Ik wil een appel.'],
  ['een for a neuter noun too', ['i', 'want', 'cookie'], 'Ik wil een koekje.'],
  ['mass noun takes no article', ['i', 'want', 'water'], 'Ik wil water.'],
  ['de for a common noun', ['i', 'want', 'the', 'apple'], 'Ik wil de appel.'],
  ['het for a neuter noun', ['i', 'want', 'the', 'bread'], 'Ik wil het brood.'],
  ['het for koekje', ['i', 'want', 'the', 'cookie'], 'Ik wil het koekje.'],
  ['de for a common place', ['we', 'go', 'to', 'the', 'school'], 'Wij gaan naar de school.'],

  // Verb agreement — Dutch marks person, unlike English
  ['first person singular', ['i', 'want', 'apple'], 'Ik wil een appel.'],
  ['second person takes -t', ['you', 'want', 'apple'], 'Jij wilt een appel.'],
  ['third person', ['he', 'want', 'apple'], 'Hij wil een appel.'],
  ['plural', ['we', 'want', 'apple'], 'Wij willen een appel.'],
  ['irregular hebben', ['he', 'have', 'ball'], 'Hij heeft een bal.'],
  ['eten', ['i', 'eat', 'bread'], 'Ik eet brood.'],

  // The attributive -e rule
  ['adjective takes -e before a common noun', ['i', 'want', 'big', 'apple'], 'Ik wil een grote appel.'],
  // "boek" is neuter and countable, so it shows the rule in both directions.
  ['no -e before a singular indefinite neuter noun', ['i', 'want', 'big', 'book'], 'Ik wil een groot boek.'],
  ['-e returns with the definite article', ['i', 'want', 'the', 'big', 'book'], 'Ik wil het grote boek.'],
  ['-e before a definite common noun', ['i', 'want', 'the', 'big', 'apple'], 'Ik wil de grote appel.'],
  ['neuter cookie stays uninflected', ['i', 'want', 'small', 'cookie'], 'Ik wil een klein koekje.'],
  ['common ball inflects', ['i', 'want', 'small', 'ball'], 'Ik wil een kleine bal.'],
  ['-e in the plural', ['i', 'want', 'two', 'big', 'cookie'], 'Ik wil twee grote koekjes.'],

  // Plurals
  ['quantifier forces the plural', ['i', 'want', 'two', 'cookie'], 'Ik wil twee koekjes.'],
  ['irregular plural', ['i', 'want', 'three', 'book'], 'Ik wil drie boeken.'],

  // Copula
  ['copula for a predicate adjective', ['i', 'happy'], 'Ik ben blij.'],
  ['copula second person', ['you', 'happy'], 'Jij bent blij.'],
  ['copula third person', ['he', 'sad'], 'Hij is verdrietig.'],
  ['copula plural', ['we', 'happy'], 'Wij zijn blij.'],

  // niet vs geen — the rule a naive join can never get right
  ['geen for a negated indefinite object', ['i', 'not', 'want', 'apple'], 'Ik wil geen appel.'],
  ['geen for a negated mass object', ['i', 'not', 'want', 'water'], 'Ik wil geen water.'],
  ['niet for a negated predicate', ['i', 'not', 'happy'], 'Ik ben niet blij.'],
  ['niet follows a definite object', ['i', 'not', 'want', 'the', 'apple'], 'Ik wil de appel niet.'],
  ['niet follows an object pronoun', ['you', 'not', 'want', 'me'], 'Jij wilt mij niet.'],

  // Questions: verb-second
  ['verb-second question', ['what', 'you', 'want'], 'Wat wil jij?'],
  ['question with third person', ['what', 'he', 'want'], 'Wat wil hij?'],
  ['plural question', ['what', 'we', 'want'], 'Wat willen wij?'],

  // Objects and socials
  ['object pronoun form', ['you', 'help', 'me'], 'Jij helpt mij.'],
  ['possessive blocks the article', ['i', 'want', 'my', 'ball'], 'Ik wil mijn bal.'],
  ['trailing social', ['i', 'want', 'apple', 'please'], 'Ik wil een appel, alsjeblieft.'],
]

describe('Dutch realizer', () => {
  for (const [name, ids, expected] of golden) {
    it(`${name}: ${ids.join(' + ')} → "${expected}"`, () => {
      const result = realize(select('nl', ids), { locale: 'nl-NL' })
      expect(result.text).toBe(expected)
    })
  }

  it('notes why an adjective stayed uninflected', () => {
    const result = realize(select('nl', ['i', 'want', 'big', 'book']), { locale: 'nl' })
    expect(result.notes.join(' ')).toContain('singular indefinite neuter')
  })

  it('notes when it corrects de to het', () => {
    const result = realize(select('nl', ['i', 'want', 'the', 'bread']), { locale: 'nl' })
    expect(result.notes.join(' ')).toContain('"het" not "de"')
  })

  it('inflects the verb for the past tense', () => {
    const result = realize(select('nl', ['i', 'want', 'apple']), { locale: 'nl', tense: 'past' })
    expect(result.text).toBe('Ik wilde een appel.')
  })

  it('drops the second-person -t under inversion', () => {
    // "jij wilt" but "wil jij?"
    expect(realize(select('nl', ['you', 'want', 'apple']), { locale: 'nl' }).text)
      .toBe('Jij wilt een appel.')
    expect(realize(select('nl', ['what', 'you', 'want']), { locale: 'nl' }).text)
      .toBe('Wat wil jij?')
  })
})
