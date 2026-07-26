import type { Features, SelectedWord } from '../features'
import { applyExperiencer } from '../morphology/romance'
import { extractObjectClitic } from '../morphology/clitic'
import { agreesWith, formFor, note, type LanguageRules, type SentenceContext } from '../profile'

/**
 * Greek. Three genders and a case system, but a regular one — which makes it the
 * gentlest place to build case handling before attempting a Slavic language.
 *
 * - **The article agrees in gender and case**: "ο σκύλος" (nominative) becomes
 *   "τον σκύλο" as an object; "το μήλο" is the same in both.
 * - **Adjectives precede the noun and agree** with it.
 * - **Negation is "δεν" before the verb**, and the copula is είμαι.
 * - Verbs conjugate regularly in -ω, which the pack's tiles are already in.
 *
 * Marked `beta`: the nominative and accusative are modelled (what Talk's sentence
 * shapes produce); the genitive is not. Accusative noun endings are applied by
 * rule, which is right for the common declensions and wrong for some others, so a
 * Greek speaker should review before this reaches a child.
 */
type Gender = 'm' | 'f' | 'n'
type Case = 'nom' | 'acc'

const DEFINITE: Record<Case, Record<Gender | 'pl', string>> = {
  nom: { m: 'ο', f: 'η', n: 'το', pl: 'τα' },
  acc: { m: 'τον', f: 'την', n: 'το', pl: 'τα' },
}
const INDEFINITE: Record<Case, Record<Gender, string>> = {
  nom: { m: 'ένας', f: 'μία', n: 'ένα' },
  acc: { m: 'έναν', f: 'μία', n: 'ένα' },
}
const COPULA: Record<string, string> = {
  '1sg': 'είμαι', '2sg': 'είσαι', '3sg': 'είναι', '1pl': 'είμαστε', '2pl': 'είστε', '3pl': 'είναι',
}
const COPULA_PAST: Record<string, string> = {
  '1sg': 'ήμουν', '2sg': 'ήσουν', '3sg': 'ήταν', '1pl': 'ήμασταν', '2pl': 'ήσασταν', '3pl': 'ήταν',
}

/** Regular -ω conjugation, which is what the pack's verb tiles are in. */
const ENDINGS: Record<string, string> = {
  '1sg': 'ω', '2sg': 'εις', '3sg': 'ει', '1pl': 'ουμε', '2pl': 'ετε', '3pl': 'ουν',
}

function conjugate(text: string, ctx: SentenceContext): string | null {
  const [head, ...tail] = text.split(' ')
  if (!head.endsWith('ω')) return null
  const stem = head.slice(0, -1)
  const ending = ENDINGS[`${ctx.person}${ctx.number}`]
  if (!ending) return null
  return [`${stem}${ending}`, ...tail].join(' ')
}

function genderOf(features: Features): Gender {
  switch (features.gender) {
    case 'feminine': return 'f'
    case 'neuter': return 'n'
    default: return 'm'
  }
}

/** Induces gender from the ending, which Greek makes unusually easy. */
function induceGender(text: string): Features['gender'] {
  const word = text.split(' ').pop() ?? text
  if (/(ος|ας|ης|ές)$/.test(word)) return 'masculine'
  if (/(α|η|ω|ού)$/.test(word)) return 'feminine'
  if (/(ο|ι|μα|ος)$/.test(word)) return 'neuter'
  return 'neuter'
}

/** The accusative singular: masculines drop their final -ς. */
function accusative(text: string, gender: Gender): string {
  if (gender === 'm' && text.endsWith('ς')) return text.slice(0, -1)
  return text
}

export const greek: LanguageRules = {
  profile: {
    language: 'el',
    maturity: 'beta',
    wordOrder: 'svo',
    questionStrategy: 'inversion',
    spacing: 'space',
    capitalize: true,
    // Greek asks with a semicolon-shaped mark.
    punctuation: { statement: '.', question: ';' },
    functionWords: [
      'ο', 'η', 'το', 'τα', 'τον', 'την', 'ένας', 'μία', 'ένα', 'έναν',
      'είμαι', 'είσαι', 'είναι', 'είμαστε', 'ήταν', 'δεν',
    ],
    notes: 'Nominative and accusative only; the genitive is not modelled. Accusative endings are applied by rule and are right for the common declensions — a Greek speaker should review. Vocabulary was generated against the shared concept ids.',
  },

  induce(word: SelectedWord): Features {
    if (word.pos === 'noun') return { gender: induceGender(word.text) }
    if (word.pos === 'adjective') return {}
    return {}
  },

  verbForm(verb, ctx) {
    const forms = verb.features.forms ?? {}
    if (ctx.tense === 'past') return forms.past ?? verb.text
    if (verb.features.copula) return COPULA[`${ctx.person}${ctx.number}`] ?? verb.text
    if (ctx.scratch.experiencer) {
      // "μου αρέσει το ψωμί": the thing liked is the subject.
      const plural = ctx.scratch.experiencerPlural === true
      return forms[plural ? '3pl' : '3sg'] ?? verb.text
    }
    const curated = formFor(forms, ctx.person, ctx.number)
    if (curated) return curated
    const regular = conjugate(verb.text, ctx)
    if (regular) return regular
    note(ctx.builder, `no conjugation for "${verb.text}", left as it is`)
    return verb.text
  },

  copula(ctx) {
    return (ctx.tense === 'past' ? COPULA_PAST : COPULA)[`${ctx.person}${ctx.number}`] ?? 'είναι'
  },

  determiner(np, ctx) {
    const head = np.head
    const determiner = np.determiner
    const plural = determiner?.features.forcesNumber === 'pl'
    const gender = genderOf(head?.features ?? {})
    const grammaticalCase: Case = ctx.role === 'subject' ? 'nom' : 'acc'

    if (determiner) {
      const kind = determiner.features.determinerKind
      if (determiner.features.pronounCase === 'poss') {
        // "την μπάλα μου": the noun keeps its article and the possessive follows.
        const article = plural ? DEFINITE[grammaticalCase].pl : DEFINITE[grammaticalCase][gender]
        note(ctx.builder, 'the possessive follows the noun, which keeps its article')
        return { text: article, from: determiner.id }
      }
      if (kind === 'definite') {
        const article = plural ? DEFINITE[grammaticalCase].pl : DEFINITE[grammaticalCase][gender]
        if (article !== determiner.text) {
          note(ctx.builder, `"${article}" not "${determiner.text}": ${gender} in the ${grammaticalCase}`)
        }
        return { text: article, from: determiner.id }
      }
      if (kind === 'indefinite') {
        if (plural) return null
        return { text: INDEFINITE[grammaticalCase][gender], from: determiner.id }
      }
      return { text: determiner.text, from: determiner.id }
    }

    if (!head) return null
    if (ctx.scratch.experiencer && ctx.role === 'object') {
      const article = plural ? DEFINITE.nom.pl : DEFINITE.nom[gender]
      note(ctx.builder, `"${article}": the thing liked is the grammatical subject`)
      return { text: article, from: null }
    }
    if (head.features.mass || head.features.proper || plural) {
      if (head.features.mass) note(ctx.builder, 'no article: mass noun')
      return null
    }
    if (ctx.afterPreposition && head.features.institutional) {
      note(ctx.builder, `no article: "${head.text}" is institutional after a preposition`)
      return null
    }
    const article = INDEFINITE[grammaticalCase][gender]
    note(ctx.builder, `article "${article}": ${gender} in the ${grammaticalCase}`)
    return { text: article, from: null }
  },

  postposed(np) {
    const determiner = np.determiner
    if (determiner?.features.pronounCase === 'poss' && np.head) {
      return { text: determiner.text, from: determiner.id }
    }
    return null
  },

  adjective(adjective, np, ctx) {
    const head = np.head
    const predicate = ctx.role === 'predicate'
    if (!head && !predicate) return adjective.text
    const { gender: subjectGender, plural } = agreesWith(np, ctx)
    const gender = predicate
      ? (subjectGender === 'feminine' ? 'f' : subjectGender === 'neuter' ? 'n' : 'm')
      : genderOf(head!.features)
    // A predicate is in the nominative, like the subject it describes.
    const grammaticalCase: Case = ctx.role === 'subject' || predicate ? 'nom' : 'acc'
    // Adjectives in -ος follow the ος/η/ο pattern.
    const stem = adjective.text.replace(/(ος|η|ο)$/, '')
    if (stem === adjective.text) return adjective.text
    let form: string
    if (plural) form = gender === 'f' ? `${stem}ες` : gender === 'n' ? `${stem}α` : `${stem}οι`
    else if (gender === 'f') form = `${stem}η`
    else if (gender === 'n') form = `${stem}ο`
    else form = grammaticalCase === 'acc' ? `${stem}ο` : `${stem}ος`
    return form
  },

  noun(head, np, ctx) {
    const gender = genderOf(head.features)
    const plural = np.determiner?.features.forcesNumber === 'pl'
    const grammaticalCase: Case = ctx.role === 'subject' ? 'nom' : 'acc'
    if (plural) {
      return head.features.plural
        ?? (gender === 'n' ? `${head.text.replace(/ο$/, '')}α` : `${head.text.replace(/(ος|α|η)$/, '')}ες`)
    }
    if (grammaticalCase === 'acc') {
      const form = accusative(head.text, gender)
      if (form !== head.text) note(ctx.builder, `"${form}": accusative singular`)
      return form
    }
    return head.text
  },

  pronoun(word, ctx) {
    if (ctx.role === 'subject') return word.text
    return word.features.accusative ?? word.text
  },

  negation() {
    return { kind: 'beforeVerb', word: 'δεν' }
  },

  transform(chunks, ctx) {
    ctx.scratch.experiencerPlural = chunks.complements.some(
      (phrase) => phrase.kind === 'np' && phrase.determiner?.features.forcesNumber === 'pl',
    )
    const clitics = { '1sg': 'μου', '2sg': 'σου', '3sg': 'του', '1pl': 'μας', '2pl': 'σας', '3pl': 'τους' }
    if (applyExperiencer(chunks, ctx.scratch, clitics, ctx.person, ctx.number)) {
      note(ctx.builder, 'αρέσει inverts: the experiencer becomes a clitic')
      return
    }
    // Object pronouns are preverbal clitics: "εσύ με βοηθάς".
    extractObjectClitic(chunks, ctx.scratch)
  },
}
