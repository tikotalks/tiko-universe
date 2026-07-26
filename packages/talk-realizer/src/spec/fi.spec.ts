import { describe, expect, it } from 'vitest'
import { realize } from '../index'
import { select } from './pack'

/**
 * Finnish golden list. Two things carry it, and neither exists anywhere else in
 * this package:
 *
 * - **the partitive**, which is the case an object takes when the action does not
 *   complete: "haluan omenaa" (I want an apple) against "näen kaverin" (I see the
 *   friend, completely). Which one a verb takes is lexical;
 * - **the negative verb**, which takes the person the main verb gives up: "haluan"
 *   becomes "en halua", "haluamme" becomes "emme halua".
 */
const golden: Array<[string, string[], string]> = [
  ['the partitive object', ['i', 'want', 'apple'], 'Minä haluan omenaa.'],
  ['no articles at all', ['i', 'want', 'the', 'apple'], 'Minä haluan omenaa.'],
  ['a curated partitive stem', ['i', 'want', 'water'], 'Minä haluan vettä.'],
  ['another one', ['i', 'want', 'bread'], 'Minä haluan leipää.'],
  ['the adjective agrees in case', ['i', 'want', 'big', 'apple'], 'Minä haluan isoa omenaa.'],
  ['the negative verb takes the person', ['i', 'not', 'want', 'apple'], 'Minä en halua omenaa.'],
  ['the copula', ['i', 'happy'], 'Minä olen iloinen.'],
  ['a plural predicate', ['we', 'happy'], 'Me olemme iloisia.'],
  ['third person', ['he', 'tired'], 'Hän on väsynyt.'],
  ['a noun subject', ['the', 'apple', 'is', 'big'], 'Omena on iso.'],
  ['the negated copula', ['i', 'not', 'happy'], 'Minä en ole iloinen.'],
  ['a partitive pronoun object', ['you', 'help', 'me'], 'Sinä autat minua.'],
  ['a total object, because seeing completes', ['i', 'see', 'the', 'friend'], 'Minä näen kaverin.'],
  ['the allative as a suffix', ['we', 'go', 'to', 'the', 'park'], 'Me menemme puistolle.'],
  ['the inessive as a suffix', ['i', 'play', 'in', 'the', 'garden'], 'Minä leikin puutarhassa.'],
  ['a question word', ['what', 'you', 'want'], 'Mitä sinä haluat?'],
  ['a numeral takes the partitive singular', ['i', 'want', 'two', 'cookie'], 'Minä haluan kaksi pikkuleipää.'],
  ['reading is ongoing, so the object is partitive', ['i', 'read', 'the', 'book'], 'Minä luen kirjaa.'],
  ['eating is unbounded too', ['i', 'eat', 'the', 'egg'], 'Minä syön kananmunaa.'],
  ['a trailing social', ['i', 'want', 'apple', 'please'], 'Minä haluan omenaa, kiitos.'],
]

describe('Finnish realizer', () => {
  for (const [name, ids, expected] of golden) {
    it(`${name}: ${ids.join(' + ')} → "${expected}"`, () => {
      expect(realize(select('fi', ids), { locale: 'fi' }).text).toBe(expected)
    })
  }

  it('explains the object case it chose', () => {
    const partial = realize(select('fi', ['i', 'want', 'apple']), { locale: 'fi' })
    expect(partial.notes.join(' ')).toContain('the partitive')
    const total = realize(select('fi', ['i', 'see', 'the', 'friend']), { locale: 'fi' })
    expect(total.notes.join(' ')).toContain('a total object, because the action completes')
  })

  it('the negative verb is inserted, not the tile', () => {
    const result = realize(select('fi', ['i', 'not', 'want', 'apple']), { locale: 'fi' })
    expect(result.inserted).toContain('en')
    const verb = result.tokens.find((token) => token.text === 'halua')
    expect(verb?.from).toBe('want')
  })
})
