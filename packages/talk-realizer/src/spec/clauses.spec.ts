import { describe, expect, it } from 'vitest'
import { functionWords, realize, supportedLanguages, type SupportedLanguage } from '../index'
import { select } from './pack'

/**
 * Two clauses, joined.
 *
 * The chunker is one clause deep, and left to itself it melted the halves together:
 * "I am sad because I want Mum" came out as "I want sad because me mum", with the
 * second subject eaten as an object pronoun. Worse, nothing flagged it — every other
 * limit the realizer has, it says so in a note.
 *
 * Splitting at the conjunction first means each half gets the whole grammar: its own
 * subject, its own verb, its own agreement, its own negation.
 */
describe('a sentence with two clauses', () => {
  const golden: Array<[string, string[], string]> = [
    ['en', ['i', 'sad', 'because', 'i', 'want', 'mum'], 'I am sad because I want mum.'],
    ['en', ['i', 'want', 'juice', 'because', 'i', 'thirsty'], 'I want juice because I am thirsty.'],
    ['en', ['i', 'tired', 'but', 'i', 'want', 'play'], 'I am tired but I want to play.'],
    ['en', ['i', 'want', 'juice', 'or', 'i', 'want', 'water'], 'I want juice or I want water.'],
    // Each half agrees on its own: "Mum is" and "dad is", not one verb for both.
    ['en', ['mum', 'happy', 'and', 'dad', 'sad'], 'Mum is happy and dad is sad.'],
    ['fr', ['i', 'sad', 'because', 'i', 'want', 'mum'], 'Je suis triste parce que je veux maman.'],
    ['es', ['i', 'sad', 'because', 'i', 'want', 'mum'], 'Yo estoy triste porque yo quiero mamá.'],
    ['ru', ['i', 'sad', 'because', 'i', 'want', 'mum'], 'Я расстроен потому что я хочу маму.'],
  ]

  for (const [language, ids, expected] of golden) {
    it(`${language}: ${ids.join(' + ')} → "${expected}"`, () => {
      expect(realize(select(language, ids), { locale: language }).text).toBe(expected)
    })
  }

  it('builds a chain of three', () => {
    const result = realize(
      select('en', ['i', 'tired', 'and', 'i', 'hungry', 'and', 'i', 'sad', 'because', 'i', 'want', 'mum']),
      { locale: 'en' },
    )
    expect(result.text).toBe('I am tired and I am hungry and I am sad because I want mum.')
  })

  it('punctuates and capitalises the sentence once, not each clause', () => {
    const text = realize(select('en', ['i', 'sad', 'because', 'i', 'want', 'mum']), { locale: 'en' }).text
    expect(text.match(/\./g)).toHaveLength(1)
    expect(text.match(/\bI\b/g)).toHaveLength(2)
    // The second clause does not start a new sentence.
    expect(text).not.toContain('. ')
  })

  it('says in a note that it split, and where', () => {
    const result = realize(select('en', ['i', 'sad', 'because', 'i', 'want', 'mum']), { locale: 'en' })
    expect(result.notes.join(' ')).toContain('"because" joins two clauses')
  })

  it('works in every language, dropping nothing', () => {
    const ids = ['i', 'sad', 'because', 'i', 'want', 'mum']
    for (const language of supportedLanguages) {
      const selected = select(language, ids)
      const result = realize(selected, { locale: language })
      const used = new Set(result.tokens.flatMap((token) => [token.from, ...(token.merged ?? [])]))
      for (const word of selected) {
        expect(used, `${language} dropped "${word.id}" from "${result.text}"`).toContain(word.id)
      }
      // Both halves are there: the sentence has two verbs' worth of content.
      expect(result.text.length).toBeGreaterThan(10)
      const allowed = new Set(functionWords[language as SupportedLanguage])
      for (const inserted of result.inserted) {
        expect(allowed, `${language} inserted "${inserted}"`).toContain(inserted)
      }
    }
  })
})

/**
 * What must *not* split. A conjunction usually joins two things inside one clause,
 * and treating those as sentences would be worse than the bug this fixes.
 */
describe('a conjunction that joins less than a clause', () => {
  const golden: Array<[string, string[], string]> = [
    ['en', ['i', 'want', 'apple', 'and', 'banana'], 'I want an apple and a banana.'],
    ['en', ['i', 'want', 'eat', 'and', 'drink'], 'I want to eat and to drink.'],
    ['en', ['i', 'happy', 'and', 'sad'], 'I am happy and sad.'],
    // The adjective belongs to the noun after it, so this is one clause with two
    // objects — not a clause about "the small banana".
    ['en', ['i', 'want', 'the', 'big', 'apple', 'and', 'the', 'small', 'banana'], 'I want the big apple and the small banana.'],
  ]
  for (const [language, ids, expected] of golden) {
    it(`${language}: ${ids.join(' + ')} → "${expected}"`, () => {
      expect(realize(select(language, ids), { locale: language }).text).toBe(expected)
    })
  }

  it('splits at the conjunction that leaves two whole clauses', () => {
    // Breaking at "and" would strand "a banana because I am hungry", which is not a
    // sentence. The split belongs at "because".
    expect(
      realize(select('en', ['i', 'want', 'apple', 'and', 'banana', 'because', 'i', 'hungry']), { locale: 'en' }).text,
    ).toBe('I want an apple and a banana because I am hungry.')
    expect(
      realize(select('en', ['i', 'hungry', 'because', 'i', 'want', 'apple', 'and', 'banana']), { locale: 'en' }).text,
    ).toBe('I am hungry because I want an apple and a banana.')
  })

  it('keeps a dangling conjunction rather than dropping the tile', () => {
    for (const ids of [['i', 'want', 'juice', 'and'], ['and', 'i', 'want', 'juice']]) {
      const result = realize(select('en', ids), { locale: 'en' })
      const used = new Set(result.tokens.flatMap((token) => [token.from, ...(token.merged ?? [])]))
      expect(used).toContain('and')
    }
  })
})

/**
 * A subordinate clause is not just a second sentence: several languages reorder it.
 */
describe('what a subordinating conjunction does to its clause', () => {
  const golden: Array<[string, string[], string]> = [
    // Dutch and German send the verb to the end of a subordinate clause.
    ['nl', ['i', 'sad', 'because', 'i', 'want', 'mum'], 'Ik ben verdrietig omdat ik mama wil.'],
    ['de', ['i', 'sad', 'because', 'i', 'want', 'mum'], 'Ich bin traurig weil ich Mama will.'],
    ['fy', ['i', 'sad', 'because', 'i', 'want', 'mum'], 'Ik bin triest omdat ik mem wol.'],
    // Coordination does not reorder anything.
    ['nl', ['i', 'tired', 'and', 'i', 'want', 'mum'], 'Ik ben moe en ik wil mama.'],
    ['de', ['i', 'tired', 'and', 'i', 'want', 'mum'], 'Ich bin müde und ich will Mama.'],
    // Afrikaans "want" coordinates where Dutch "omdat" subordinates, so its verb
    // stays where it is. Which word does which is lexical, not familial.
    ['af', ['i', 'sad', 'because', 'i', 'want', 'mum'], 'Ek is hartseer want ek wil ma hê.'],

    // The Scandinavian rule is different again: the verb stays and the negation moves
    // in front of it. Swedish teaches it as the BIFF rule.
    ['sv', ['i', 'sad', 'because', 'i', 'not', 'want', 'school'], 'Jag är ledsen för att jag inte vill ha en skola.'],
    ['da', ['i', 'sad', 'because', 'i', 'not', 'want', 'school'], 'Jeg er ked af det fordi jeg ikke vil have en skole.'],
    ['sv', ['i', 'not', 'want', 'school'], 'Jag vill inte ha en skola.'],
  ]

  for (const [language, ids, expected] of golden) {
    it(`${language}: ${ids.join(' + ')} → "${expected}"`, () => {
      expect(realize(select(language, ids), { locale: language }).text).toBe(expected)
    })
  }
})
