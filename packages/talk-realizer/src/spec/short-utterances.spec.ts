import { describe, expect, it } from 'vitest'
import { realize } from '../index'
import { select } from './pack'

/**
 * The short things a child actually says.
 *
 * Every golden list in this package starts from "I want an apple", and that hid two
 * bugs for as long as the realizer existed. A board is mostly tapped one or two
 * tiles at a time, and:
 *
 * - a verb with no subject was conjugated as though someone else were doing it —
 *   "Helps." when the child meant "Help.";
 * - a second verb was dropped on the floor in all 54 languages, so "I want to play"
 *   came out as "I want."
 *
 * The invariants spec now carries these selections too, which is what catches the
 * second one everywhere at once. This file pins down what the sentences should be.
 */

/** One verb, nobody named: the child is the subject. */
describe('a verb on its own', () => {
  const golden: Array<[string, string, string]> = [
    ['en', 'help', 'Help.'],
    ['en', 'eat', 'Eat.'],
    ['nl', 'help', 'Help.'],
    ['nl', 'eat', 'Eet.'],
    // A pronoun-dropping language needs nothing else: the verb says who.
    ['es', 'eat', 'Como.'],
    ['it', 'eat', 'Mangio.'],
    ['ru', 'eat', 'Ем.'],
    ['pl', 'eat', 'Jem.'],
    ['el', 'eat', 'Τρώω.'],
    ['fi', 'eat', 'Syön.'],
    ['tr', 'eat', 'Yiyorum.'],
    ['mt', 'eat', 'Niekol.'],
  ]

  for (const [language, id, expected] of golden) {
    it(`${language}: "${id}" is first person, not third`, () => {
      expect(realize(select(language, [id]), { locale: language }).text).toBe(expected)
    })
  }

  it('does not conjugate for a third person nobody mentioned', () => {
    // The bug this file exists for: "Helps." put the sentence in someone else's mouth.
    expect(realize(select('en', ['help']), { locale: 'en' }).text).not.toBe('Helps.')
  })
})

describe('two verbs', () => {
  const golden: Array<[string, string[], string]> = [
    // English marks the infinitive with "to".
    ['en', ['i', 'want', 'play'], 'I want to play.'],
    ['en', ['i', 'want', 'eat', 'apple'], 'I want to eat an apple.'],
    // "help" is also a noun, and after another verb that is the reading — the
    // alternative says the child is offering to help.
    ['en', ['i', 'need', 'help'], 'I need help.'],

    // The Germanic languages send the infinitive to the end of the clause.
    ['nl', ['i', 'want', 'play'], 'Ik wil spelen.'],
    ['nl', ['i', 'want', 'eat', 'apple'], 'Ik wil een appel eten.'],
    ['de', ['i', 'want', 'play'], 'Ich will spielen.'],
    ['de', ['i', 'want', 'eat', 'apple'], 'Ich will einen Apfel essen.'],
    ['af', ['i', 'want', 'eat', 'apple'], "Ek wil 'n appel eet."],

    // Romance packs list the infinitive already, so it needs nothing done to it.
    ['fr', ['i', 'want', 'play'], 'Je veux jouer.'],
    ['es', ['i', 'want', 'eat', 'apple'], 'Yo quiero comer una manzana.'],
    ['pt', ['i', 'want', 'play'], 'Eu quero brincar.'],

    // Scandinavian packs list the present, and the infinitive comes from it.
    ['sv', ['i', 'want', 'play'], 'Jag vill leka.'],
    ['da', ['i', 'want', 'play'], 'Jeg vil lege.'],
    ['nb', ['i', 'want', 'play'], 'Jeg vil leke.'],
  ]

  for (const [language, ids, expected] of golden) {
    it(`${language}: ${ids.join(' + ')}`, () => {
      expect(realize(select(language, ids), { locale: language }).text).toBe(expected)
    })
  }

  it('keeps the second verb, whatever the language does with it', () => {
    for (const language of ['en', 'nl', 'de', 'fr', 'es', 'ru', 'pl', 'tr', 'fi', 'ja', 'zh', 'ar', 'hi', 'cy']) {
      const selected = select(language, ['i', 'want', 'play'])
      const result = realize(selected, { locale: language })
      const used = new Set(
        result.tokens.flatMap((token) => [token.from, ...(token.merged ?? [])]).filter(Boolean),
      )
      expect(used, `${language} dropped "play" from "${result.text}"`).toContain('play')
    }
  })

  it('drops the auxiliary\'s own lexical half when a verb follows', () => {
    // Swedish "vill ha" is "want to have", which is right before an object and
    // wrong before a verb.
    expect(realize(select('sv', ['i', 'want', 'apple']), { locale: 'sv' }).text).toBe('Jag vill ha ett äpple.')
    expect(realize(select('sv', ['i', 'want', 'play']), { locale: 'sv' }).text).toBe('Jag vill leka.')
  })

  it('says in a note where it could not form the infinitive', () => {
    // Russian's pack lists a finite form and there is no rule from "играю" to
    // "играть", so the sentence is flagged rather than quietly wrong.
    const result = realize(select('ru', ['i', 'want', 'play']), { locale: 'ru' })
    expect(result.notes.join(' ')).toContain('no infinitive')
  })
})

describe('a social after what it applies to', () => {
  it('trails "please" rather than fronting it', () => {
    expect(realize(select('en', ['more', 'please']), { locale: 'en' }).text).toBe('More, please.')
    expect(realize(select('nl', ['more', 'please']), { locale: 'nl' }).text).toBe('Meer, alsjeblieft.')
  })

  it('still leads a social the child put first', () => {
    expect(realize(select('en', ['please', 'more']), { locale: 'en' }).text).toBe('Please more.')
  })

  it('trails a social after an adverb, which is content like any other', () => {
    expect(realize(select('en', ['now', 'please']), { locale: 'en' }).text).toBe('Now, please.')
  })
})
