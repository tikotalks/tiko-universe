import { describe, expect, it } from 'vitest'
import { realize } from '../index'
import { select } from './pack'

/**
 * German golden list. The article and the adjective ending both depend on gender
 * *and* case, so these cases are the real test of whether the machinery holds:
 * "der Apfel" is the subject form and "den Apfel" the object form of the same
 * noun, and the adjective changes with the article in front of it.
 */
const golden: Array<[string, string[], string]> = [
  // Indefinite article by gender, in the accusative (object position)
  ['masculine object takes einen', ['i', 'want', 'apple'], 'Ich will einen Apfel.'],
  ['feminine object takes eine', ['i', 'want', 'banana'], 'Ich will eine Banane.'],
  ['neuter object takes ein', ['i', 'want', 'egg'], 'Ich will ein Ei.'],
  ['mass noun takes no article', ['i', 'want', 'water'], 'Ich will Wasser.'],

  // Definite article by gender and case
  ['definite masculine object is den', ['i', 'want', 'the', 'apple'], 'Ich will den Apfel.'],
  ['definite feminine object is die', ['i', 'want', 'the', 'banana'], 'Ich will die Banane.'],
  ['definite neuter object is das', ['i', 'want', 'the', 'book'], 'Ich will das Buch.'],

  // Verb agreement, including stem changes
  ['first person singular', ['i', 'want', 'apple'], 'Ich will einen Apfel.'],
  ['second person of wollen', ['you', 'want', 'apple'], 'Du willst einen Apfel.'],
  ['third person of wollen', ['he', 'want', 'apple'], 'Er will einen Apfel.'],
  ['plural of wollen', ['we', 'want', 'apple'], 'Wir wollen einen Apfel.'],
  ['essen changes its stem', ['he', 'eat', 'bread'], 'Er isst Brot.'],
  ['sehen changes its stem', ['you', 'see', 'the', 'book'], 'Du siehst das Buch.'],
  ['regular verb from the pack form', ['i', 'play'], 'Ich spiele.'],
  ['regular verb, third person', ['he', 'play'], 'Er spielt.'],
  ['regular verb, plural', ['we', 'play'], 'Wir spielen.'],

  // Adjective endings: mixed after ein/kein, weak after der/die/das
  ['mixed ending, masculine accusative', ['i', 'want', 'big', 'apple'], 'Ich will einen großen Apfel.'],
  ['mixed ending, feminine accusative', ['i', 'want', 'big', 'banana'], 'Ich will eine große Banane.'],
  ['mixed ending, neuter accusative', ['i', 'want', 'big', 'egg'], 'Ich will ein großes Ei.'],
  ['weak ending after the definite article', ['i', 'want', 'the', 'big', 'apple'], 'Ich will den großen Apfel.'],
  ['weak ending, neuter', ['i', 'want', 'the', 'big', 'book'], 'Ich will das große Buch.'],

  // Plurals
  ['quantifier forces the plural', ['i', 'want', 'two', 'cookie'], 'Ich will zwei Kekse.'],
  ['umlaut plural', ['i', 'want', 'two', 'apple'], 'Ich will zwei Äpfel.'],
  ['strong plural ending after a bare numeral', ['i', 'want', 'two', 'big', 'apple'], 'Ich will zwei große Äpfel.'],

  // Copula
  ['copula, first person', ['i', 'happy'], 'Ich bin glücklich.'],
  ['copula, second person', ['you', 'happy'], 'Du bist glücklich.'],
  ['copula, third person', ['he', 'sad'], 'Er ist traurig.'],
  ['copula, plural', ['we', 'tired'], 'Wir sind müde.'],

  // Negation: kein replaces the article, nicht handles the rest
  ['kein for a negated masculine object', ['i', 'not', 'want', 'apple'], 'Ich will keinen Apfel.'],
  ['kein for a negated feminine object', ['i', 'not', 'want', 'banana'], 'Ich will keine Banane.'],
  ['kein for a negated mass object', ['i', 'not', 'want', 'water'], 'Ich will kein Wasser.'],
  ['nicht for a negated predicate', ['i', 'not', 'happy'], 'Ich bin nicht glücklich.'],
  ['nicht follows a definite object', ['i', 'not', 'want', 'the', 'apple'], 'Ich will den Apfel nicht.'],

  // Questions invert, like Dutch
  ['question inverts the verb', ['what', 'you', 'want'], 'Was willst du?'],
  ['question, third person', ['what', 'he', 'want'], 'Was will er?'],

  // Demonstratives agree instead of passing the tile text through
  ['demonstrative agrees', ['i', 'want', 'this', 'apple'], 'Ich will diesen Apfel.'],
  ['demonstrative, neuter', ['i', 'want', 'this', 'book'], 'Ich will dieses Buch.'],

  // Objects, possessives, socials
  ['helfen governs the dative', ['you', 'help', 'me'], 'Du hilfst mir.'],
  ['possessive inflects like ein', ['i', 'want', 'my', 'ball'], 'Ich will meinen Ball.'],
  ['possessive, neuter needs no ending', ['i', 'want', 'my', 'book'], 'Ich will mein Buch.'],
  ['possessive, feminine', ['i', 'want', 'my', 'bag'], 'Ich will meine Tasche.'],
  ['trailing social', ['i', 'want', 'apple', 'please'], 'Ich will einen Apfel, bitte.'],
]

describe('German realizer', () => {
  for (const [name, ids, expected] of golden) {
    it(`${name}: ${ids.join(' + ')} → "${expected}"`, () => {
      const result = realize(select('de', ids), { locale: 'de-DE' })
      expect(result.text).toBe(expected)
    })
  }

  it('explains a case-driven article change', () => {
    const result = realize(select('de', ['i', 'want', 'the', 'apple']), { locale: 'de' })
    expect(result.notes.join(' ')).toContain('"den" not "der"')
  })

  it('notes that dative after a preposition is out of scope', () => {
    const result = realize(select('de', ['we', 'go', 'to', 'the', 'park']), { locale: 'de' })
    expect(result.notes.join(' ')).toContain('dative')
  })
})
