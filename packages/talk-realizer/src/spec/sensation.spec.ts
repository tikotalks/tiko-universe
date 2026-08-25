import { describe, expect, it } from 'vitest'
import { realize } from '../index'
import { select } from './pack'

/**
 * "I am hungry" is one of the sentences a child says most, and outside English it
 * is usually not a copula sentence at all:
 *
 * - most of Europe says it with **have** and a noun — "j'ai faim", "tengo
 *   hambre", "ho fame", "ik heb honger";
 * - German says the temperatures with a **dative experiencer** and no subject —
 *   "mir ist kalt", where "ich bin kalt" means the speaker is a cold person;
 * - and the same tile keeps its adjective reading when the subject is a thing:
 *   "l'eau est froide", "el agua está fría".
 *
 * Which reading applies is decided by the subject: someone who can feel
 * something, or something that cannot.
 */
const feeling: Array<[string, string[], string]> = [
  ['en', ['i', 'hungry'], 'I am hungry.'],
  ['fr', ['i', 'hungry'], "J'ai faim."],
  ['fr', ['i', 'cold'], "J'ai froid."],
  ['fr', ['i', 'not', 'hungry'], "Je n'ai pas faim."],
  ['fr', ['mum', 'thirsty'], 'Maman a soif.'],
  ['es', ['i', 'hungry'], 'Yo tengo hambre.'],
  ['es', ['i', 'cold'], 'Yo tengo frío.'],
  ['es', ['mum', 'thirsty'], 'Mamá tiene sed.'],
  ['it', ['i', 'hungry'], 'Io ho fame.'],
  ['it', ['i', 'cold'], 'Io ho freddo.'],
  ['pt', ['i', 'hungry'], 'Eu tenho fome.'],
  ['ca', ['i', 'hungry'], 'Jo tinc gana.'],
  ['gl', ['i', 'hungry'], 'Eu teño fame.'],
  ['nl', ['i', 'hungry'], 'Ik heb honger.'],
  ['nl', ['i', 'cold'], 'Ik heb het koud.'],
  ['de', ['i', 'hungry'], 'Ich habe Hunger.'],
  ['de', ['i', 'cold'], 'Mir ist kalt.'],
  ['de', ['we', 'cold'], 'Uns ist kalt.'],
  ['de', ['mum', 'thirsty'], 'Mama hat Durst.'],
]

/** The same tiles, describing a thing rather than a person. */
const describing: Array<[string, string[], string]> = [
  ['en', ['the', 'water', 'is', 'cold'], 'The water is cold.'],
  ['fr', ['the', 'water', 'is', 'cold'], "L'eau est froide."],
  ['es', ['the', 'water', 'is', 'cold'], 'El agua está fría.'],
  ['it', ['the', 'water', 'is', 'cold'], "L'acqua è fredda."],
  ['nl', ['the', 'water', 'is', 'cold'], 'Het water is koud.'],
  ['de', ['the', 'water', 'is', 'cold'], 'Das Wasser ist kalt.'],
]

describe('sensations', () => {
  for (const [language, ids, expected] of feeling) {
    it(`${language}: ${ids.join(' + ')} → "${expected}"`, () => {
      expect(realize(select(language, ids), { locale: language }).text).toBe(expected)
    })
  }

  for (const [language, ids, expected] of describing) {
    it(`${language} describes a thing: ${ids.join(' + ')} → "${expected}"`, () => {
      expect(realize(select(language, ids), { locale: language }).text).toBe(expected)
    })
  }

  it('says which frame it chose', () => {
    const result = realize(select('fr', ['i', 'hungry']), { locale: 'fr' })
    expect(result.notes.join(' ')).toContain('a sensation takes "have" and a noun')
  })

  it('the sensation noun is not invented: it comes from the tile', () => {
    const result = realize(select('es', ['i', 'hungry']), { locale: 'es' })
    const carriers = result.tokens.filter((token) => token.text === 'hambre')
    expect(carriers).toHaveLength(1)
    expect(carriers[0].from).toBe('hungry')
  })
})
