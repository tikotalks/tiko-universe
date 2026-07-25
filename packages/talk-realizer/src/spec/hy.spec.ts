import { describe, expect, it } from 'vitest'
import { realize } from '../index'
import { select } from './pack'

/** Armenian golden list, run against the real pack. */
const golden: Array<[string, string[], string]> = [
  ["participle plus auxiliary", ["i", "want", "apple"], "Ես խնձոր ուզում եմ։"],
  ["third person auxiliary", ["he", "want", "apple"], "Նա խնձոր ուզում է։"],
  ["plural auxiliary", ["we", "want", "apple"], "Մենք խնձոր ուզում ենք։"],
  ["the definite article is a suffix", ["i", "want", "the", "apple"], "Ես խնձորը ուզում եմ։"],
  ["adjectives do not agree", ["i", "want", "big", "apple"], "Ես մեծ խնձոր ուզում եմ։"],
  ["copula at the end", ["i", "happy"], "Ես ուրախ եմ։"],
  ["negation moves the auxiliary forward", ["i", "not", "want", "apple"], "Ես խնձոր չեմ ուզում։"],
  ["negated copula", ["i", "not", "happy"], "Ես ուրախ չեմ։"],
  ["object case", ["you", "help", "me"], "Դու ինձ օգնում ես։"],
]

describe('Armenian realizer', () => {
  for (const [name, ids, expected] of golden) {
    it(`${name}: ${ids.join(' + ')} → "${expected}"`, () => {
      expect(realize(select('hy', ids), { locale: 'hy' }).text).toBe(expected)
    })
  }
})
