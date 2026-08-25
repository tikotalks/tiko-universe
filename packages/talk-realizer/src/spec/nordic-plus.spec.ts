import { describe, expect, it } from 'vitest'
import { realize } from '../index'
import { select } from './pack'

/**
 * Icelandic, Luxembourgish, Papiamentu and Montenegrin — four languages that share
 * nothing except being in this package, which is the point of testing them
 * together: the same engine, four completely different answers to the same
 * sentence.
 *
 * - **Icelandic** carries case *and* a suffixed article, so one word says both:
 *   "eplið" as a subject, "eplið" as an object, "garðinum" after a preposition.
 * - **Luxembourgish** contracts its prepositions into its articles ("am Gaart")
 *   and negates an indefinite phrase with "keen", as German and Dutch do.
 * - **Papiamentu** has no inflection at all: the pronoun carries the person, a
 *   particle carries the tense, and "-nan" is the only ending in the language.
 * - **Montenegrin** is the fourth vocabulary of the one BCS grammar.
 */
const golden: Array<[string, string[], string]> = [
  // Icelandic
  ['is', ['i', 'want', 'apple'], 'Ég vil epli.'],
  ['is', ['i', 'want', 'the', 'apple'], 'Ég vil eplið.'],
  ['is', ['i', 'want', 'big', 'apple'], 'Ég vil stórt epli.'],
  ['is', ['i', 'not', 'want', 'apple'], 'Ég vil ekki epli.'],
  ['is', ['i', 'happy'], 'Ég er glaður.'],
  ['is', ['we', 'happy'], 'Við erum glaðir.'],
  ['is', ['the', 'apple', 'is', 'big'], 'Eplið er stórt.'],
  ['is', ['you', 'help', 'me'], 'Þú hjálpar mér.'],
  ['is', ['i', 'see', 'the', 'friend'], 'Ég sé vininn.'],
  ['is', ['we', 'go', 'to', 'the', 'park'], 'Við förum í garðinn.'],
  ['is', ['i', 'play', 'in', 'the', 'garden'], 'Ég leik í garðinum.'],
  ['is', ['i', 'want', 'two', 'cookie'], 'Ég vil tvær smákökur.'],
  ['is', ['what', 'you', 'want'], 'Hvað vilt þú?'],

  // Luxembourgish
  ['lb', ['i', 'want', 'apple'], 'Ech wëll en Apel.'],
  ['lb', ['i', 'want', 'the', 'apple'], 'Ech wëll den Apel.'],
  ['lb', ['i', 'not', 'want', 'apple'], 'Ech wëll keen Apel.'],
  ['lb', ['i', 'happy'], 'Ech sinn frou.'],
  ['lb', ['i', 'not', 'happy'], 'Ech sinn net frou.'],
  ['lb', ['i', 'hungry'], 'Ech hunn Hunger.'],
  ['lb', ['the', 'apple', 'is', 'big'], 'Den Apel ass grouss.'],
  ['lb', ['i', 'play', 'in', 'the', 'garden'], 'Ech spillen am Gaart.'],
  ['lb', ['we', 'go', 'to', 'the', 'park'], 'Mir ginn um Park.'],
  ['lb', ['i', 'read', 'the', 'book'], 'Ech liesen d’Buch.'],
  ['lb', ['what', 'you', 'want'], 'Wat wëlls du?'],

  // Papiamentu
  ['pap', ['i', 'want', 'apple'], 'Mi ke un apel.'],
  ['pap', ['i', 'want', 'the', 'apple'], 'Mi ke e apel.'],
  ['pap', ['i', 'want', 'water'], 'Mi ke awa.'],
  ['pap', ['i', 'not', 'want', 'apple'], 'Mi no ke un apel.'],
  ['pap', ['i', 'happy'], 'Mi ta kontentu.'],
  ['pap', ['we', 'happy'], 'Nos ta kontentu.'],
  ['pap', ['i', 'hungry'], 'Mi tin hamber.'],
  ['pap', ['i', 'not', 'hungry'], 'Mi no tin hamber.'],
  ['pap', ['the', 'water', 'is', 'cold'], 'E awa ta friu.'],
  ['pap', ['i', 'see', 'the', 'friend'], 'Mi ta mira e amigu.'],
  ['pap', ['i', 'want', 'two', 'cookie'], 'Mi ke dos kuki.'],
  ['pap', ['i', 'want', 'big', 'apple'], 'Mi ke un apel grandi.'],
  ['pap', ['what', 'you', 'want'], 'Kiko bo ke?'],

  // Montenegrin
  ['cnr', ['i', 'want', 'apple'], 'Ja želim jabuku.'],
  ['cnr', ['i', 'not', 'happy'], 'Ja nisam srećan.'],
  ['cnr', ['you', 'help', 'me'], 'Ti mi pomažeš.'],
  ['cnr', ['what', 'you', 'want'], 'Šta ti želiš?'],
]

describe('Icelandic, Luxembourgish, Papiamentu, Montenegrin', () => {
  for (const [language, ids, expected] of golden) {
    it(`${language}: ${ids.join(' + ')} → "${expected}"`, () => {
      expect(realize(select(language, ids), { locale: language }).text).toBe(expected)
    })
  }

  it('Papiamentu needs no conjugation at all', () => {
    const first = realize(select('pap', ['i', 'read', 'the', 'book']), { locale: 'pap' })
    const third = realize(select('pap', ['he', 'read', 'the', 'book']), { locale: 'pap' })
    expect(first.text).toBe('Mi ta lesa e buki.')
    expect(third.text).toBe('E ta lesa e buki.')
  })

  it('Luxembourgish records the preposition it swallowed', () => {
    const result = realize(select('lb', ['i', 'play', 'in', 'the', 'garden']), { locale: 'lb' })
    const accounted = result.tokens.flatMap((token) => [token.from, ...(token.merged ?? [])])
    expect(accounted).toContain('in')
    expect(accounted).toContain('the')
  })
})
