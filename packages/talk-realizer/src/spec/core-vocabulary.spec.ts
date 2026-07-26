import { describe, expect, it } from 'vitest'
import { customNounFeatures, languages, lexicons, realize, supportedLanguages } from '../index'
import { packWords, select } from './pack'

/**
 * The core rebalance: 53 concepts added to every pack, weighted to verbs and
 * relational words, because 123 nouns against 30 verbs is the wrong shape for a
 * board a child builds sentences on.
 *
 * The negation tile is the one that mattered most. The realizer had done negation
 * properly in 53 of 54 languages from the start, and no pack had the word, so a
 * child could say "I want water" and not "I don't want water" — and refusal is
 * among the first things anybody needs to say.
 */
describe('the negation tile', () => {
  it('exists in every pack, as a negation rather than a social', () => {
    for (const language of supportedLanguages) {
      const word = packWords(language).get('not')
      expect(word, `${language} has no "not" tile`).toBeDefined()
      expect(word!.pos, `${language}: "not" is filed as ${word!.pos}`).toBe('negation')
      expect(word!.text.length).toBeGreaterThan(0)
    }
  })

  const golden: Array<[string, string]> = [
    ['en', 'I do not want water.'],
    ['nl', 'Ik wil geen water.'],
    ['de', 'Ich will kein Wasser.'],
    ['fr', "Je ne veux pas d'eau."],
    ['es', 'Yo no quiero agua.'],
    ['af', 'Ek wil nie water hê nie.'],
    ['fi', 'Minä en halua vettä.'],
    ['cs', 'Já nechci vodu.'],
    ['ka', 'მე არ მინდა წყალი.'],
    ['hi', 'मैं पानी नहीं चाहता हूँ।'],
  ]

  for (const [language, expected] of golden) {
    it(`${language}: refuses with the language's own negation`, () => {
      const result = realize(select(language, ['i', 'not', 'want', 'water']), { locale: language })
      expect(result.text).toBe(expected)
    })
  }

  it('reaches the negation tile from the board, in every language', () => {
    // A tile the transition table never names is a tile the board never offers.
    for (const language of supportedLanguages) {
      const pack = JSON.parse(
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        require('node:fs').readFileSync(`packages/talk-packs/data/${language}-v1.json`, 'utf8'),
      ) as { grammar: { validTransitions: Record<string, string[]> } }
      const transitions = pack.grammar.validTransitions
      expect(transitions.pronoun, `${language}: nothing leads to a negation`).toContain('negation')
      expect(transitions.negation, `${language}: nothing follows a negation`).toBeDefined()
      expect(transitions.negation).toContain('verb')
      expect(transitions.adverb, `${language}: nothing follows an adverb`).toBeDefined()
    }
  })
})

describe('the verbs the board was missing', () => {
  it('has more than twice as many verbs as before the rebalance', () => {
    const verbs = [...packWords('en').values()].filter((word) => word.pos === 'verb')
    expect(verbs.length).toBeGreaterThanOrEqual(70)
  })

  const golden: Array<[string, string[], string]> = [
    ['en', ['i', 'need', 'help'], 'I need help.'],
    ['en', ['you', 'give', 'me'], 'You give me.'],
    ['en', ['i', 'want', 'go'], 'I want to go.'],
    ['nl', ['i', 'want', 'go'], 'Ik wil gaan.'],
    ['de', ['i', 'want', 'go'], 'Ich will gehen.'],
    ['fr', ['you', 'give', 'me'], 'Tu me donnes.'],
  ]
  for (const [language, ids, expected] of golden) {
    it(`${language}: ${ids.join(' + ')}`, () => {
      expect(realize(select(language, ids), { locale: language }).text).toBe(expected)
    })
  }

  /**
   * The rules, not a list: bare "+s" gave "catchs" and "crys", and the past fell back
   * to the bare stem, so "he ran" came out as "he run".
   */
  it('en: inflects every verb in the pack for the third person', () => {
    const wrong: string[] = []
    for (const verb of [...packWords('en').values()].filter((word) => word.pos === 'verb')) {
      const text = realize(select('en', ['he', verb.id]), { locale: 'en' }).text
      // A sibilant or a consonant before "y" is not spelled with a bare -s.
      if (/(?:chs|shs|xs|ss|zs|[^aeiou]ys)\.$/.test(text)) wrong.push(text)
    }
    expect(wrong).toEqual([])
  })

  it('en: no verb keeps its base form in the past', () => {
    const unchanged: string[] = []
    for (const verb of [...packWords('en').values()].filter((word) => word.pos === 'verb')) {
      const past = realize(select('en', ['he', verb.id]), { locale: 'en', tense: 'past' }).text
      const present = realize(select('en', ['i', verb.id]), { locale: 'en' }).text.replace(/^I /, 'He ')
      // "put", "let" and "cut" really are the same in both; the rest must differ.
      if (past === present && !['put', 'let', 'cut', 'read'].includes(verb.id)) unchanged.push(verb.id)
    }
    expect(unchanged).toEqual([])
  })

  /**
   * Dutch and German were curated for twelve verbs each, so the other sixty came out
   * as the first-person form whatever the subject: "wij lees", "hij vang".
   */
  it.each(['nl', 'de'])('%s: inflects every verb for a plural subject', (language) => {
    const unchanged: string[] = []
    for (const verb of [...packWords(language).values()].filter((word) => word.pos === 'verb')) {
      const plural = realize(select(language, ['we', verb.id]), { locale: language }).text
      // Every Dutch and German plural ends in -n — "-en", or just "-n" after a
      // vowel ("gaan", "zien"). "Wij lees" does not. A separable part follows the
      // verb, so it is the first word that has to carry the ending.
      const first = (plural.split(' ')[1] ?? '').replace(/\.$/, '')
      if (!first.endsWith('n')) unchanged.push(`${verb.id}: ${plural}`)
    }
    expect(unchanged).toEqual([])
  })
})

describe('the relational words', () => {
  const golden: Array<[string, string[], string]> = [
    // A degree adverb belongs in front of what it strengthens.
    ['en', ['i', 'very', 'happy'], 'I am very happy.'],
    ['en', ['i', 'happy', 'very'], 'I am very happy.'],
    ['nl', ['i', 'very', 'happy'], 'Ik ben heel blij.'],
    // Chinese marks an adjectival predicate with the same word, and must not repeat it.
    ['zh', ['i', 'very', 'happy'], '我很开心。'],

    // "All" forces the plural, and takes the definite article where the language wants it.
    ['en', ['i', 'want', 'all', 'cookie'], 'I want all cookies.'],
    ['fr', ['i', 'want', 'all', 'cookie'], 'Je veux tous les biscuits.'],
    ['fr', ['i', 'want', 'all', 'apple'], 'Je veux toutes les pommes.'],
    ['es', ['i', 'want', 'all', 'cookie'], 'Yo quiero todas las galletas.'],
    ['it', ['i', 'want', 'all', 'cookie'], 'Io voglio tutti i biscotti.'],
    ['nl', ['i', 'want', 'all', 'cookie'], 'Ik wil alle koekjes.'],

    // A measure word counts; it does not quantify.
    ['zh', ['i', 'want', 'two', 'cookie'], '我要两块饼干。'],
    ['zh', ['i', 'want', 'all', 'cookie'], '我要全部饼干。'],

    // "Mine" stands on its own and never becomes a clitic.
    ['en', ['i', 'want', 'mine'], 'I want mine.'],
    ['fr', ['i', 'want', 'mine'], 'Je veux le mien.'],
    ['es', ['i', 'want', 'mine'], 'Yo quiero mío.'],
  ]

  for (const [language, ids, expected] of golden) {
    it(`${language}: ${ids.join(' + ')} → "${expected}"`, () => {
      expect(realize(select(language, ids), { locale: language }).text).toBe(expected)
    })
  }

  it('keeps a standalone possessive out of the clitic slot in every language that has one', () => {
    for (const language of supportedLanguages) {
      const selected = select(language, ['i', 'want', 'mine'])
      const result = realize(selected, { locale: language })
      const used = new Set(result.tokens.flatMap((token) => [token.from, ...(token.merged ?? [])]))
      expect(used, `${language} lost "mine" from "${result.text}"`).toContain('mine')
    }
  })

  it('never inserts a word the language has not declared', () => {
    // The new words brought new inserted forms with them: English "to", the Romance
    // definite article after "all". Every one has to be in the closed set.
    for (const language of supportedLanguages) {
      const allowed = new Set(languages[language]?.profile.functionWords ?? [])
      for (const ids of [['i', 'not', 'want', 'water'], ['i', 'want', 'all', 'cookie'], ['i', 'want', 'go']]) {
        const result = realize(select(language, ids), { locale: language })
        for (const word of result.inserted) {
          expect(allowed, `${language} inserted "${word}" for ${ids.join('+')}`).toContain(word)
        }
      }
    }
  })
})

/**
 * A word a parent typed in themselves. Every caller used to call it a name, which
 * is right for "Mum" and wrong for "trampoline" — and things are most of what gets
 * added, so the board said "I want trampoline".
 */
describe('a word the parent added', () => {
  const cases: Array<[string, string, string]> = [
    // A capital is how a name is written, so it keeps its bare form.
    ['en', 'Mum', 'I want Mum.'],
    ['en', 'Sil', 'I want Sil.'],
    // A lower-case thing takes the article the language gives it.
    ['en', 'trampoline', 'I want a trampoline.'],
    ['en', 'oven', 'I want an oven.'],
    ['nl', 'trampoline', 'Ik wil een trampoline.'],
    ['nl', 'Mama', 'Ik wil Mama.'],
    // The gender is induced from the ending, because a word a parent typed carries
    // none: French reads a final -e as feminine, and is wrong about this one. An
    // article of the wrong gender still beats no article at all.
    ['fr', 'trampoline', 'Je veux une trampoline.'],
    // German capitalises every noun, so a capital says nothing about names there —
    // and its guess of neuter happens to be right here.
    ['de', 'Trampolin', 'Ich will ein Trampolin.'],
  ]

  for (const [language, text, expected] of cases) {
    it(`${language}: "${text}" → "${expected}"`, () => {
      const words = [
        ...select(language, ['i', 'want']),
        { id: 'uword-1', text, pos: 'noun' },
      ]
      const result = realize(words, {
        locale: language,
        lexicon: { ...lexicons[language], 'uword-1': customNounFeatures(text, language) },
      })
      expect(result.text).toBe(expected)
    })
  }

  it('treats a script with no capitals as a common noun', () => {
    // Nothing in "トランポリン" can mark a name, and Japanese has no article to get
    // wrong either way.
    expect(customNounFeatures('トランポリン', 'ja')).toEqual({ pos: 'noun' })
    expect(customNounFeatures('ماما', 'ar')).toEqual({ pos: 'noun' })
  })
})
