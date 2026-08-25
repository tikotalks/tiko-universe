import { describe, expect, it } from 'vitest'
import { realize } from '../index'
import { select } from './pack'

/**
 * Polish golden list. Polish shows the genitive of negation more clearly than any
 * other language here, because it is obligatory: "chcę jabłko" but "nie chcę
 * jabłka". Negation reaches inside the noun phrase and changes the noun itself —
 * nothing else in this package has a rule like it.
 */
const golden: Array<[string, string[], string]> = [
  ['neuter accusative equals the nominative', ['i', 'want', 'apple'], 'Ja chcę jabłko.'],
  ['feminine accusative changes', ['i', 'want', 'water'], 'Ja chcę wodę.'],
  ['no article at all', ['i', 'want', 'the', 'apple'], 'Ja chcę jabłko.'],
  ['mass noun is unchanged', ['i', 'want', 'bread'], 'Ja chcę chleb.'],
  ['curated verb person', ['he', 'want', 'apple'], 'On chce jabłko.'],
  ['first person plural', ['we', 'want', 'apple'], 'My chcemy jabłko.'],
  ['adjective agrees with a neuter object', ['i', 'want', 'big', 'apple'], 'Ja chcę duże jabłko.'],
  ['Polish has a present copula, unlike Russian', ['i', 'happy'], 'Ja jestem szczęśliwy.'],
  ['third person copula', ['he', 'happy'], 'On jest szczęśliwy.'],
  ['the genitive of negation is obligatory', ['i', 'not', 'want', 'apple'], 'Ja nie chcę jabłka.'],
  ['negated copula', ['i', 'not', 'happy'], 'Ja nie jestem szczęśliwy.'],
  ['animate masculine accusative borrows the genitive', ['i', 'see', 'the', 'friend'], 'Ja widzę kolegę.'],
  ['a negated animate object goes genitive', ['i', 'not', 'see', 'the', 'friend'], 'Ja nie widzę kolegi.'],
  ['pomagać governs the dative', ['you', 'help', 'me'], 'Ty pomagasz mi.'],
  ['do governs the genitive', ['we', 'go', 'to', 'the', 'park'], 'My idziemy do parku.'],
  ['the possessive agrees in the accusative', ['i', 'want', 'my', 'ball'], 'Ja chcę moją piłkę.'],
  ['question needs no inversion', ['what', 'you', 'want'], 'Co ty chcesz?'],
]

describe('Polish realizer', () => {
  for (const [name, ids, expected] of golden) {
    it(`${name}: ${ids.join(' + ')} → "${expected}"`, () => {
      expect(realize(select('pl', ids), { locale: 'pl' }).text).toBe(expected)
    })
  }

  it('explains the genitive of negation', () => {
    const result = realize(select('pl', ['i', 'not', 'want', 'apple']), { locale: 'pl' })
    expect(result.notes.join(' ')).toContain('genitive of negation')
  })
})
