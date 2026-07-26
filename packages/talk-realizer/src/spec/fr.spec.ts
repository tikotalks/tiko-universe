import { describe, expect, it } from 'vitest'
import { realize } from '../index'
import { select } from './pack'

/** French golden list, run against the real pack. */
const golden: Array<[string, string[], string]> = [
  ["indefinite article agrees", ["i", "want", "apple"], "Je veux une pomme."],
  ["masculine indefinite", ["i", "want", "cookie"], "Je veux un biscuit."],
  ["partitive for a mass noun", ["i", "want", "bread"], "Je veux du pain."],
  ["partitive elides before a vowel", ["i", "want", "water"], "Je veux de l'eau."],
  ["definite article agrees", ["i", "want", "the", "apple"], "Je veux la pomme."],
  ["conjugation from the infinitive", ["he", "want", "apple"], "Il veut une pomme."],
  ["first person plural", ["we", "want", "apple"], "Nous voulons une pomme."],
  ["regular -er verb", ["i", "play"], "Je joue."],
  ["regular -er verb, plural", ["we", "play"], "Nous jouons."],
  ["prenominal adjective agrees", ["i", "want", "big", "apple"], "Je veux une grosse pomme."],
  ["plural", ["i", "want", "two", "cookie"], "Je veux deux biscuits."],
  ["copula", ["i", "happy"], "Je suis content."],
  ["ne … pas with de", ["i", "not", "want", "apple"], "Je ne veux pas de pomme."],
  ["negated copula keeps ne", ["i", "not", "happy"], "Je ne suis pas content."],
  ["object clitic elides onto the verb", ["you", "help", "me"], "Tu m'aides."],
  ["à + le contracts", ["we", "go", "to", "the", "park"], "Nous allons au parc."],
  ["possessive agrees", ["i", "want", "my", "ball"], "Je veux mon ballon."],
  ["question word goes last", ["what", "you", "want"], "Tu veux quoi ?"],
]

describe('French realizer', () => {
  for (const [name, ids, expected] of golden) {
    it(`${name}: ${ids.join(' + ')} → "${expected}"`, () => {
      expect(realize(select('fr', ids), { locale: 'fr' }).text).toBe(expected)
    })
  }
})
