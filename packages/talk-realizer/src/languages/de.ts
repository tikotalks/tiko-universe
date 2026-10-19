import type { Features, SelectedWord } from '../features'
import { formFor, isDativeSensation, isPlural, isSensation, note, type LanguageRules, type PhraseContext, type SentenceContext } from '../profile'

/**
 * German. The hardest of the European languages here, because articles and
 * adjective endings depend on gender *and* case, and gender is not derivable —
 * so the nouns are curated.
 *
 * Scope, deliberately: nominative and accusative only, which is what Talk's
 * sentence shapes produce (a subject, a direct object, a predicate). Dative
 * turns up with prepositions like "mit" and "in", and this module marks those
 * phrases with a note rather than pretending to inflect them.
 */
type Gender = 'm' | 'f' | 'n'
type Case = 'nom' | 'acc'

const DEFINITE: Record<Case, Record<Gender | 'pl', string>> = {
  nom: { m: 'der', f: 'die', n: 'das', pl: 'die' },
  acc: { m: 'den', f: 'die', n: 'das', pl: 'die' },
}

const INDEFINITE: Record<Case, Record<Gender | 'pl', string>> = {
  nom: { m: 'ein', f: 'eine', n: 'ein', pl: '' },
  acc: { m: 'einen', f: 'eine', n: 'ein', pl: '' },
}

const KEIN: Record<Case, Record<Gender | 'pl', string>> = {
  nom: { m: 'kein', f: 'keine', n: 'kein', pl: 'keine' },
  acc: { m: 'keinen', f: 'keine', n: 'kein', pl: 'keine' },
}

/** Weak endings (after a definite article) and mixed endings (after ein/kein). */
const WEAK: Record<Case, Record<Gender | 'pl', string>> = {
  nom: { m: 'e', f: 'e', n: 'e', pl: 'en' },
  acc: { m: 'en', f: 'e', n: 'e', pl: 'en' },
}
const MIXED: Record<Case, Record<Gender | 'pl', string>> = {
  nom: { m: 'er', f: 'e', n: 'es', pl: 'en' },
  acc: { m: 'en', f: 'e', n: 'es', pl: 'en' },
}
/** Strong endings: nothing in front of the adjective, or a bare numeral. */
const STRONG: Record<Case, Record<Gender | 'pl', string>> = {
  nom: { m: 'er', f: 'e', n: 'es', pl: 'e' },
  acc: { m: 'en', f: 'e', n: 'es', pl: 'e' },
}
/** Possessives inflect like ein/kein: mein → meinen Ball. */
const POSSESSIVE: Record<Case, Record<Gender | 'pl', string>> = {
  nom: { m: '', f: 'e', n: '', pl: 'e' },
  acc: { m: 'en', f: 'e', n: '', pl: 'e' },
}
/** Dative pronouns, for the verbs that govern the dative. */
const DATIVE_FALLBACK: Record<string, string> = { ich: 'mir', du: 'dir', wir: 'uns', er: 'ihm', sie: 'ihr' }

const COPULA: Record<string, string> = { '1sg': 'bin', '2sg': 'bist', '3sg': 'ist', pl: 'sind' }
const COPULA_PAST: Record<string, string> = { '1sg': 'war', '2sg': 'warst', '3sg': 'war', pl: 'waren' }

function key(ctx: SentenceContext): string {
  return ctx.number === 'pl' ? 'pl' : `${ctx.person}sg`
}

function genderOf(features: Features): Gender {
  switch (features.gender) {
    case 'masculine': return 'm'
    case 'feminine': return 'f'
    case 'neuter': return 'n'
    default: return 'm'
  }
}

/**
 * A predicate stands in the nominative alongside the subject it renames — "das
 * ist ein Arzt" — which is why it is not simply "the subject is nominative and
 * everything else is accusative".
 */
function caseOf(ctx: PhraseContext): Case {
  return ctx.role === 'subject' || ctx.role === 'predicate' ? 'nom' : 'acc'
}

/**
 * Present tense from a stem. German is regular enough here that the pack's tile
 * (a first-person form like "will", "gehe") plus a stem gets us the paradigm;
 * genuinely irregular verbs are curated.
 */
function conjugate(stem: string, ctx: SentenceContext): string {
  const k = key(ctx)
  const needsE = /[dt]$/.test(stem)
  switch (k) {
    case '1sg': return stem === '' ? '' : `${stem}e`
    case '2sg': return `${stem}${needsE ? 'est' : 'st'}`
    case '3sg': return `${stem}${needsE ? 'et' : 't'}`
    default: return `${stem}en`
  }
}

const HAVE: Record<string, string> = {
  '1sg': 'habe', '2sg': 'hast', '3sg': 'hat', '1pl': 'haben', '2pl': 'habt', '3pl': 'haben',
}

export const german: LanguageRules = {
  profile: {
    language: 'de',
    maturity: 'production',
    wordOrder: 'svo',
    subordinateVerbFinal: true,
    verbComplementPosition: 'clauseFinal',
    questionStrategy: 'inversion',
    spacing: 'space',
    capitalize: true,
    punctuation: { statement: '.', question: '?' },
    functionWords: [
      'der', 'die', 'das', 'den',
      'ein', 'eine', 'einen',
      'kein', 'keine', 'keinen',
      'dieser', 'diese', 'dieses', 'diesen',
      'bin', 'bist', 'ist', 'sind', 'war', 'warst', 'waren',
      'mir', 'dir', 'ihm', 'ihr', 'uns',
      'nicht',
    ],
    notes: 'Nominative and accusative only. Dative after prepositions is not inflected; those phrases carry a note.',
  },

  induce(word: SelectedWord): Features {
    // Nouns are capitalised in German, which is a reliable signal, but gender is
    // not derivable — the curated map carries it and this default keeps the
    // uncurated tail readable rather than wrong-looking.
    if (word.pos === 'noun') return { gender: 'neuter' }
    return {}
  },

  verbForm(verb, ctx) {
    const forms = verb.features.forms ?? {}
    if (ctx.tense === 'past') return forms.past ?? verb.text
    if (verb.features.copula) return COPULA[key(ctx)] ?? verb.text
    const direct = formFor(forms, ctx.person, ctx.number)
    if (direct) return direct
    // The pack stores a first-person form ("gehe", "will"); strip the -e for a stem.
    // A separable prefix or a second word rides along unchanged — "höre zu" becomes
    // "hört zu", not "höre zut".
    const [first, ...rest] = verb.text.split(' ')
    const inflected = conjugate(first.replace(/e$/, ''), ctx)
    return [inflected, ...rest].join(' ')
  },

  /**
   * A second verb takes the infinitive, and German spells that exactly like the
   * third person plural — "wollen", "spielen", "lesen" — so the form the plural
   * takes is the form to use, and no separate list of infinitives is needed.
   */
  verbComplement(verb, ctx) {
    const infinitive = german.verbForm(verb, { ...ctx, person: 3, number: 'pl', tense: 'present' })
    note(ctx.builder, `"${infinitive}": the infinitive, spelled like the plural`)
    return infinitive
  },

  copula(ctx) {
    // With a dative experiencer there is no subject to agree with: "mir ist kalt",
    // "uns ist warm".
    if (isDativeSensation(ctx) && ctx.tense === 'present') {
      note(ctx.builder, 'the copula stays third person: there is no subject')
      return 'ist'
    }
    // A sensation is said with "have" and a noun in this language:
    // "j'ai faim", not "je suis faim".
    const sensation = isSensation(ctx)
    if (sensation && ctx.tense === 'present') {
      const form = HAVE[`${ctx.person}${ctx.number}`] ?? 'hat'
      note(ctx.builder, `"${form} ${sensation}": a sensation takes "have" and a noun`)
      return form
    }
    return (ctx.tense === 'past' ? COPULA_PAST : COPULA)[key(ctx)] ?? 'ist'
  },

  determiner(np, ctx) {
    const head = np.head
    const determiner = np.determiner
    const plural = isPlural(np)
    const gender: Gender | 'pl' = plural ? 'pl' : genderOf(head?.features ?? {})
    const grammaticalCase = caseOf(ctx)

    if (ctx.afterPreposition) {
      note(ctx.builder, 'dative after a preposition is not inflected by these rules')
    }

    if (determiner) {
      const kind = determiner.features.determinerKind
      if (kind === 'definite') {
        const article = DEFINITE[grammaticalCase][gender]
        if (article !== determiner.text) {
          note(ctx.builder, `"${article}" not "${determiner.text}": ${head?.id} is ${head?.features.gender ?? 'unknown'} in the ${grammaticalCase}`)
        }
        return { text: article, from: determiner.id }
      }
      if (ctx.negateHere) {
        const kein = KEIN[grammaticalCase][gender]
        note(ctx.builder, `"${kein}": negated indefinite object`)
        return { text: kein, from: null }
      }
      if (determiner.features.pronounCase === 'poss' && head) {
        const ending = POSSESSIVE[grammaticalCase][gender]
        const form = `${determiner.text}${ending}`
        if (ending) note(ctx.builder, `"${form}": possessive agreeing with ${head.id} in the ${grammaticalCase}`)
        return { text: form, from: determiner.id }
      }
      if (kind === 'demonstrative' && head) {
        // The tile reads "das hier"; with a noun German wants "diesen Keks".
        const ending = DEFINITE[grammaticalCase][gender].replace(/^d/, '')
        const demonstrative = `dies${ending === 'ie' ? 'e' : ending === 'as' ? 'es' : ending === 'er' ? 'er' : ending === 'en' ? 'en' : 'e'}`
        note(ctx.builder, `"${demonstrative}": demonstrative agreeing with ${head.id}`)
        return { text: demonstrative, from: determiner.id }
      }
      if (kind === 'indefinite') {
        const article = INDEFINITE[grammaticalCase][gender]
        return article ? { text: article, from: determiner.id } : null
      }
      return { text: determiner.text, from: determiner.id }
    }

    if (!head) return null
    if (ctx.negateHere) {
      const kein = KEIN[grammaticalCase][gender]
      note(ctx.builder, `"${kein}": negated object with no article`)
      return { text: kein, from: null }
    }
    if (head.features.mass || head.features.proper || plural) {
      if (head.features.mass) note(ctx.builder, 'no article: mass noun')
      return null
    }
    const article = INDEFINITE[grammaticalCase][gender]
    note(ctx.builder, `article "${article}": indefinite ${gender} in the ${grammaticalCase}`)
    return { text: article, from: null }
  },

  adjective(adjective, np, ctx) {
    // The sensation noun replaces the adjective entirely.
    const sensation = ctx.role === 'predicate' ? isSensation(ctx) : undefined
    if (sensation && ctx.tense === 'present') return sensation
    const head = np.head
    if (!head) return adjective.text
    const plural = isPlural(np)
    const gender: Gender | 'pl' = plural ? 'pl' : genderOf(head.features)
    const grammaticalCase = caseOf(ctx)
    const kind = np.determiner?.features.determinerKind
    const determiner = np.determiner
    const definite = kind === 'definite' || kind === 'demonstrative'
    // Weak after der/die/das and dieser; mixed after ein/kein/mein; strong when
    // the adjective stands alone or follows a bare numeral ("zwei große Äpfel").
    const declension = definite
      ? 'weak'
      : (determiner && (kind === 'indefinite' || determiner.features.pronounCase === 'poss')) || ctx.negateHere
        ? 'mixed'
        : 'strong'
    const table = declension === 'weak' ? WEAK : declension === 'mixed' ? MIXED : STRONG
    const ending = table[grammaticalCase][gender]
    const base = adjective.features.attributive ?? adjective.text
    note(ctx.builder, `"${base}${ending}": ${declension} ending, ${gender} ${grammaticalCase}`)
    return `${base}${ending}`
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
    if (ctx.role === 'subject') {
      // "Mir ist kalt": the one who feels cold is a dative, not a subject.
      if (isDativeSensation(ctx) && word.features.dative) {
        note(ctx.builder, `"${word.features.dative}": a dative experiencer, not a subject`)
        return word.features.dative
      }
      return word.text
    }
    const dativeVerb = ctx.verb?.features.objectCase === 'dative'
    if (dativeVerb || ctx.afterPreposition) {
      const dative = word.features.dative ?? DATIVE_FALLBACK[word.text]
      if (dative) {
        note(ctx.builder, `"${dative}": dative, governed by "${ctx.verb?.text ?? 'the preposition'}"`)
        return dative
      }
    }
    return word.features.accusative ?? word.text
  },

  negation() {
    // "kein" replaces the particle before an indefinite object; otherwise
    // "nicht" follows the verb, and follows a definite object.
    return { kind: 'afterVerb', word: 'nicht', afterDefiniteObject: true, phraseNegation: 'replace' }
  },
}
