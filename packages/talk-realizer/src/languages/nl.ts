import { formFor, isSensation, note, type LanguageRules, type SentenceContext } from '../profile'

/**
 * Dutch. Three rules carry the weight, and each is one that plain tile
 * concatenation gets wrong every time:
 *
 * - **de/het** by the noun's gender: "de appel", "het brood". Not derivable.
 * - **The attributive -e**: "de grote appel", "een grote appel", "het grote
 *   boek" — but "een groot boek". No -e before a singular indefinite neuter.
 * - **niet vs geen**: negating an indefinite object replaces its article
 *   ("Ik wil geen appel"); otherwise "niet" goes before a predicate but after a
 *   definite object ("Ik wil de appel niet").
 */
const COPULA: Record<string, string> = { '1sg': 'ben', '2sg': 'bent', '3sg': 'is', pl: 'zijn' }
const COPULA_PAST: Record<string, string> = { '1sg': 'was', '2sg': 'was', '3sg': 'was', pl: 'waren' }

function key(ctx: SentenceContext): string {
  return ctx.number === 'pl' ? 'pl' : `${ctx.person}sg`
}

const HAVE: Record<string, string> = {
  '1sg': 'heb', '2sg': 'hebt', '3sg': 'heeft', '1pl': 'hebben', '2pl': 'hebben', '3pl': 'hebben',
}

/**
 * Dutch spelling, from the first person the packs list to the rest of the paradigm.
 * Only twelve verbs were ever curated, so the other sixty-one came out as the
 * first-person form whatever the subject was: "wij lees", "hij vang".
 *
 * The plural is also the infinitive, so getting this right fixes both "wij spelen"
 * and the "spelen" of "ik wil spelen".
 */
const VOICED: Record<string, string> = { s: 'z', f: 'v' }

/**
 * True where a stem's final syllable is unstressed and therefore does not double:
 * "teken" → "tekenen", not "tekennen". It takes two syllables to be unstressed, and
 * an unstressed prefix does not count as one — "vertel" is stressed on "-tel", so it
 * does double, to "vertellen".
 */
function unstressedEnding(stem: string): boolean {
  if (!/e[lmnr]$/.test(stem)) return false
  if (/^(?:ver|be|ge|ont|her|er)/.test(stem)) return false
  return (stem.match(/[aeiou]+/g) ?? []).length > 1
}

function dutchPlural(stem: string): string {
  // A multi-word verb inflects on its first word: "doe open" → "doen open".
  const [first, ...rest] = stem.split(' ')
  let base = first

  const long = base.match(/^(.*?)(aa|ee|oo|uu)([bcdfghjklmnpqrstvwxz])$/)
  if (long) {
    // A long vowel is written once in an open syllable, and a consonant devoiced at
    // the end of a word gets its voice back: "speel" → "spelen", "lees" → "lezen".
    base = long[1] + long[2][0] + (VOICED[long[3]] ?? long[3])
  } else if (/(aa|ee|oo|uu|ie|oe|eu|ui|ij|ei|au|ou)[sf]$/.test(base)) {
    base = base.slice(0, -1) + VOICED[base.slice(-1)]
  } else if (/[aeiou]i$/.test(base)) {
    // A glide closes the syllable already: "gooi" → "gooien".
    return [`${base}en`, ...rest].join(' ')
  } else if (/[aeiou]$/.test(base)) {
    // "doe" → "doen", "zie" → "zien" take only -n; a single vowel doubles first,
    // "ga" → "gaan".
    base = /(?:oe|ie)$/.test(base) ? base : base + base.slice(-1)
    return [`${base}n`, ...rest].join(' ')
  } else if (
    !unstressedEnding(base)
    && /[^aeiou][aeiou][bcdfgklmnprst]$/.test(base)
  ) {
    // A short vowel keeps its syllable closed by doubling: "ren" → "rennen".
    base = base + base.slice(-1)
  }
  return [`${base}en`, ...rest].join(' ')
}

function dutchThirdPerson(stem: string): string {
  const [first, ...rest] = stem.split(' ')
  // "-dt" for a stem in -d ("word" → "wordt"), nothing for a stem already in -t.
  const inflected = /t$/.test(first) ? first : `${first}t`
  return [inflected, ...rest].join(' ')
}

export const dutch: LanguageRules = {
  profile: {
    language: 'nl',
    maturity: 'production',
    wordOrder: 'svo',
    subordinateVerbFinal: true,
    verbComplementPosition: 'clauseFinal',
    questionStrategy: 'inversion',
    spacing: 'space',
    capitalize: true,
    punctuation: { statement: '.', question: '?' },
    functionWords: ['de', 'het', 'een', 'ben', 'bent', 'is', 'zijn', 'was', 'waren', 'niet', 'geen'],
  },

  verbForm(verb, ctx) {
    const forms = verb.features.forms ?? {}
    if (ctx.tense === 'past') return forms.past ?? verb.text
    if (verb.features.copula) return COPULA[key(ctx)] ?? verb.text
    // Inversion drops the second-person -t: "jij wilt" but "wil jij?".
    if (ctx.isQuestion && ctx.person === 2 && ctx.number === 'sg') {
      return forms['1sg'] ?? verb.text
    }
    const direct = formFor(forms, ctx.person, ctx.number)
    if (direct) return direct
    // Nothing curated: derive it. The plural is the infinitive, and the second and
    // third person singular add -t.
    if (ctx.number === 'pl') return dutchPlural(verb.text)
    if (ctx.person === 1) return verb.text
    return dutchThirdPerson(verb.text)
  },

  /**
   * A second verb takes the infinitive, and Dutch spells that exactly like the
   * third person plural — "willen", "spelen", "lezen" — so the form the plural
   * takes is the form to use, and no separate list of infinitives is needed.
   */
  verbComplement(verb, ctx) {
    const infinitive = dutch.verbForm(verb, { ...ctx, person: 3, number: 'pl', tense: 'present' })
    note(ctx.builder, `"${infinitive}": the infinitive, spelled like the plural`)
    return infinitive
  },

  copula(ctx) {
    // A sensation is said with "have" and a noun in this language:
    // "j'ai faim", not "je suis faim".
    const sensation = isSensation(ctx)
    if (sensation && ctx.tense === 'present') {
      const form = HAVE[`${ctx.person}${ctx.number}`] ?? 'heeft'
      note(ctx.builder, `"${form} ${sensation}": a sensation takes "have" and a noun`)
      return form
    }
    return (ctx.tense === 'past' ? COPULA_PAST : COPULA)[key(ctx)] ?? 'is'
  },

  determiner(np, ctx) {
    const head = np.head
    const determiner = np.determiner
    const plural = determiner?.features.forcesNumber === 'pl'

    if (determiner) {
      const kind = determiner.features.determinerKind
      if (kind === 'definite') {
        const article = head?.features.gender === 'neuter' && !plural ? 'het' : 'de'
        if (article !== determiner.text) {
          note(ctx.builder, `"${article}" not "${determiner.text}": ${head?.id} is ${head?.features.gender}`)
        }
        return { text: article, from: determiner.id }
      }
      if (ctx.negateHere) {
        note(ctx.builder, '"geen": negated indefinite object')
        return { text: 'geen', from: null }
      }
      return { text: determiner.text, from: determiner.id }
    }

    if (!head) return null
    if (ctx.negateHere) {
      note(ctx.builder, '"geen": negated object with no article')
      return { text: 'geen', from: null }
    }
    if (ctx.afterPreposition && head.features.institutional) {
      note(ctx.builder, `no article: "${head.text}" is institutional after a preposition`)
      return null
    }
    if (head.features.mass) {
      note(ctx.builder, 'no article: mass noun')
      return null
    }
    if (head.features.proper || plural) return null
    note(ctx.builder, 'article "een": indefinite countable singular')
    return { text: 'een', from: null }
  },

  adjective(adjective, np, ctx) {
    // The sensation noun replaces the adjective entirely.
    const sensation = ctx.role === 'predicate' ? isSensation(ctx) : undefined
    if (sensation && ctx.tense === 'present') return sensation
    const head = np.head
    if (!head) return adjective.text
    const inflected = adjective.features.attributive ?? `${adjective.text}e`
    const plural = np.determiner?.features.forcesNumber === 'pl'
    const kind = np.determiner?.features.determinerKind
    const definite = kind === 'definite' || kind === 'demonstrative'
      || np.determiner?.features.pronounCase === 'poss'
    if (head.features.gender === 'neuter' && !plural && !definite) {
      note(ctx.builder, `"${adjective.text}" stays uninflected: singular indefinite neuter noun`)
      return adjective.text
    }
    return inflected
  },

  noun(head, np, ctx) {
    if (np.determiner?.features.forcesNumber === 'pl') {
      if (!head.features.plural) {
        note(ctx.builder, `no plural form for "${head.id}", using the singular`)
        return head.text
      }
      return head.features.plural
    }
    return head.text
  },

  pronoun(word, ctx) {
    if (ctx.role !== 'subject' && word.features.accusative) return word.features.accusative
    return word.text
  },

  negation() {
    // "geen" replaces the particle when there is an indefinite object; otherwise
    // "niet" goes before a predicate but after a definite object.
    return { kind: 'afterVerb', word: 'niet', afterDefiniteObject: true, phraseNegation: 'replace' }
  },
}

export const FUNCTION_WORDS = dutch.profile.functionWords
