import { describe, expect, it } from 'vitest'
import { realize } from '../index'
import { select } from './pack'

/**
 * Turkish golden list. Everything here is a suffix doing a job another language
 * spends a word on:
 *
 * - **definiteness is the accusative**: "elma istiyorum" is some apple, "elmayı
 *   istiyorum" is *the* apple. The `the` tile switches the ending on;
 * - **case is a suffix chosen by harmony**: "parka", "bahçede", "evi";
 * - **the copula is a suffix**: "mutluyum", not "ben mutlu ...";
 * - **the negation is inside the verb**: "istemiyorum";
 * - and the question word stays where the object was: "Sen ne istiyorsun?"
 */
const golden: Array<[string, string[], string]> = [
  ['an indefinite object is bare', ['i', 'want', 'apple'], 'Ben elma istiyorum.'],
  ['a definite object takes the accusative', ['i', 'want', 'the', 'apple'], 'Ben elmayı istiyorum.'],
  ['"bir" is the indefinite article', ['i', 'want', 'a', 'apple'], 'Ben bir elma istiyorum.'],
  ['a mass noun, bare', ['i', 'want', 'water'], 'Ben su istiyorum.'],
  ['an irregular accusative', ['i', 'want', 'the', 'water'], 'Ben suyu istiyorum.'],
  ['adjectives never agree', ['i', 'want', 'big', 'apple'], 'Ben büyük elma istiyorum.'],
  ['softening in the accusative', ['i', 'want', 'the', 'book'], 'Ben kitabı istiyorum.'],
  ['softening, and a front-vowel stem', ['i', 'eat', 'the', 'bread'], 'Ben ekmeği yiyorum.'],
  ['the negation is inside the verb', ['i', 'not', 'want', 'apple'], 'Ben elma istemiyorum.'],
  ['the copula is a suffix', ['i', 'happy'], 'Ben mutluyum.'],
  ['first person plural', ['we', 'happy'], 'Biz mutluyuz.'],
  ['third person has no ending', ['he', 'tired'], 'O yorgun.'],
  ['"değil" negates a predicate', ['i', 'not', 'happy'], 'Ben mutlu değilim.'],
  ['a noun subject, no copula', ['the', 'apple', 'is', 'big'], 'Elma büyük.'],
  ['the dative, governed by the verb', ['you', 'help', 'me'], 'Sen bana yardım ediyorsun.'],
  ['an animate definite object', ['i', 'see', 'the', 'friend'], 'Ben arkadaşı görüyorum.'],
  ['a preposition is a case suffix', ['we', 'go', 'to', 'the', 'park'], 'Biz parka gidiyoruz.'],
  ['the locative', ['i', 'play', 'in', 'the', 'garden'], 'Ben bahçede oynuyorum.'],
  ['the possessive is a suffix too', ['i', 'want', 'my', 'ball'], 'Ben benim topumu istiyorum.'],
  ['the question word stays in place', ['what', 'you', 'want'], 'Sen ne istiyorsun?'],
  ['a numeral leaves the noun singular', ['i', 'want', 'two', 'cookie'], 'Ben iki kurabiye istiyorum.'],
  ['a trailing social', ['i', 'want', 'apple', 'please'], 'Ben elma istiyorum, lütfen.'],
]

describe('Turkish realizer', () => {
  for (const [name, ids, expected] of golden) {
    it(`${name}: ${ids.join(' + ')} → "${expected}"`, () => {
      expect(realize(select('tr', ids), { locale: 'tr' }).text).toBe(expected)
    })
  }

  it('the article tile survives as part of the ending', () => {
    const result = realize(select('tr', ['i', 'want', 'the', 'apple']), { locale: 'tr' })
    const accounted = result.tokens.flatMap((token) => [token.from, ...(token.merged ?? [])])
    expect(accounted).toContain('the')
    expect(result.notes.join(' ')).toContain('the accusative marks a definite object')
  })

  it('a suppressed preposition keeps its place in the trail', () => {
    const result = realize(select('tr', ['we', 'go', 'to', 'the', 'park']), { locale: 'tr' })
    const accounted = result.tokens.flatMap((token) => [token.from, ...(token.merged ?? [])])
    expect(accounted).toContain('to')
  })
})
