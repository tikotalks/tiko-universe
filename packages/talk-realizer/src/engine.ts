import { chunk, firstNounComplement, subjectPerson, type Chunks, type NounPhrase, type Phrase } from './chunk'
import type { Realization, RealizedToken } from './features'
import { note, push, type Builder, type LanguageRules, type NegationPlan, type PhraseContext, type Role, type SentenceContext } from './profile'

/**
 * The one sentence-building flow, shared by every language.
 *
 * It owns *structure* — order, where negation lands, when a copula is needed,
 * punctuation and spacing — and delegates every language-specific string to that
 * language's rules. So a new language is a profile plus a few dozen lines of
 * hooks, and a fix to the flow fixes every language at once.
 */
export function realizeWith(
  rules: LanguageRules,
  words: Parameters<typeof chunk>[0],
  options: { negated?: boolean, tense?: 'present' | 'past' } = {},
): Realization {
  const chunks = chunk(words, options.negated ?? false)
  const builder: Builder = { tokens: [], inserted: [], notes: [] }
  const { person, number } = subjectPerson(chunks)

  const predicate = chunks.complements.find((phrase) => phrase.kind === 'adjp')
  const isQuestion = !!chunks.question
  const needsCopula = !chunks.verb && !!chunks.subject && (!!predicate || isQuestion)

  const ctx: SentenceContext = {
    verb: chunks.verb,
    scratch: {},
    person,
    number,
    tense: options.tense ?? 'present',
    negated: chunks.negated,
    isQuestion,
    needsCopula,
    builder,
  }

  // A language may restructure the clause before anything is emitted.
  rules.transform?.(chunks, ctx)
  ctx.verb = chunks.verb

  const plan: NegationPlan = chunks.negated ? rules.negation(ctx) : { kind: 'none' }

  // Negation can live inside an indefinite object phrase instead of, or as well
  // as, next to the verb.
  const negatableObjectPhrase = chunks.negated ? negatableObject(chunks) : undefined
  const negateInPhrase = !!negatableObjectPhrase && !!plan.phraseNegation
  const suppressVerbParticle = negateInPhrase && plan.phraseNegation === 'replace'
  const particleAfterObject =
    plan.kind === 'afterVerb'
    && plan.afterDefiniteObject === true
    && hasDefiniteObject(chunks)
    && !suppressVerbParticle

  const phraseContext = (role: Role, np: Phrase | undefined, afterPreposition: boolean): PhraseContext => ({
    ...ctx,
    role,
    afterPreposition,
    negateHere: negateInPhrase && np === negatableObjectPhrase,
  })

  const emitNounPhrase = (np: NounPhrase, role: Role, afterPreposition = false): void => {
    const phraseCtx = phraseContext(role, np, afterPreposition)
    const startedAt = builder.tokens.length

    if (np.pronoun) {
      push(builder, rules.pronoun(np.pronoun, phraseCtx), np.pronoun.id)
    } else {
      const determiner = rules.determiner(np, phraseCtx)
      if (determiner) push(builder, determiner.text, determiner.from, determiner.merged)

      // Each adjective may override the language's default position.
      const fallbackPosition = rules.adjectivePosition ?? 'before'
      const emitAdjectives = (where: 'before' | 'after'): void => {
        for (const adjective of np.adjectives) {
          const position = adjective.features.adjectivePosition ?? fallbackPosition
          if (position !== where) continue
          push(builder, rules.adjective(adjective, np, phraseCtx), adjective.id)
        }
      }
      emitAdjectives('before')
      if (np.head) push(builder, rules.noun(np.head, np, phraseCtx), np.head.id)
      emitAdjectives('after')
      const postposed = rules.postposed?.(np, phraseCtx)
      if (postposed) push(builder, postposed.text, postposed.from, postposed.merged)
    }

    const realized = builder.tokens.slice(startedAt).map((token) => token.text).join('')
    const particle = rules.particle?.(np, phraseCtx, realized)
    if (particle) {
      if (rules.profile.glueParticles && builder.tokens.length) {
        const previous = builder.tokens[builder.tokens.length - 1]
        previous.text = `${previous.text}${particle}`
      } else {
        push(builder, particle, null)
      }
    }
  }

  const emitPhrase = (phrase: Phrase): void => {
    switch (phrase.kind) {
      case 'raw':
        push(builder, phrase.word.text, phrase.word.id)
        return
      case 'adjp': {
        const phraseCtx = phraseContext('predicate', phrase, false)
        for (const adjective of phrase.adjectives) {
          push(builder, rules.adjective(adjective, { kind: 'np', adjectives: [] }, phraseCtx), adjective.id)
        }
        return
      }
      case 'pp': {
        const after = rules.profile.prepositionPosition === 'after'
        if (!after) push(builder, phrase.preposition.text, phrase.preposition.id)
        if (phrase.object) emitNounPhrase(phrase.object, 'oblique', true)
        if (after) {
          // A postposition attaches to the phrase it marks: "こうえんへ".
          const previous = builder.tokens[builder.tokens.length - 1]
          if (previous && rules.profile.spacing === 'none') {
            previous.text = `${previous.text}${phrase.preposition.text}`
            previous.merged = [...(previous.merged ?? []), phrase.preposition.id]
          } else if (previous && rules.profile.glueParticles) {
            previous.text = `${previous.text}${phrase.preposition.text}`
            previous.merged = [...(previous.merged ?? []), phrase.preposition.id]
          } else {
            push(builder, phrase.preposition.text, phrase.preposition.id)
          }
        }
        return
      }
      default:
        emitNounPhrase(phrase, 'object')
    }
  }

  /** The finite verb (or the copula), with any verb-adjacent negation. */
  const emitVerb = (bare = false): void => {
    if (needsCopula) {
      const copula = rules.copula(ctx)
      // A circumfix language wraps the copula too: "je **ne** suis **pas** …".
      if (chunks.negated && plan.kind === 'circumfix' && !suppressVerbParticle) {
        push(builder, plan.before, null)
      }
      if (chunks.negated && plan.kind === 'beforeVerb' && !suppressVerbParticle) {
        push(builder, plan.word, null)
      }
      if (copula) {
        push(builder, copula, null)
        note(builder, `copula "${copula}": a subject and a predicate with no verb tile`)
      } else {
        note(builder, 'no copula: this language leaves it out here')
      }
      if (chunks.negated && !suppressVerbParticle) {
        const word = plan.kind === 'afterVerb'
          ? plan.word
          : plan.kind === 'circumfix' ? plan.after : plan.kind === 'auxiliary' ? plan.word : null
        if (word) push(builder, word, null)
      }
      return
    }
    if (!chunks.verb) return
    const verb = chunks.verb

    // A preverbal object clitic, parked by the language's transform hook.
    const emitClitic = (): void => {
      const clitic = ctx.scratch.clitic as { text: string, from: string } | undefined
      if (clitic) push(builder, clitic.text, clitic.from)
    }

    if (bare) {
      push(builder, verb.text, verb.id)
      return
    }

    if (!chunks.negated || suppressVerbParticle) {
      emitClitic()
      push(builder, rules.verbForm(verb, ctx), verb.id)
      if (suppressVerbParticle) {
        note(builder, 'the negation is carried by the object phrase')
      }
      return
    }

    switch (plan.kind) {
      case 'auxiliary':
        push(builder, plan.auxiliary, null)
        push(builder, plan.word, null)
        note(builder, `"${plan.auxiliary} ${plan.word}": auxiliary negation, verb stays bare`)
        push(builder, verb.text, verb.id)
        return
      case 'circumfix':
        push(builder, plan.before, null)
        emitClitic()
        push(builder, rules.verbForm(verb, ctx), verb.id)
        push(builder, plan.after, null)
        note(builder, `"${plan.before} … ${plan.after}": negation around the verb`)
        return
      case 'beforeVerb':
        push(builder, plan.word, null)
        emitClitic()
        push(builder, rules.verbForm(verb, ctx), verb.id)
        note(builder, `"${plan.word}": negation before the verb`)
        return
      case 'afterVerb':
        emitClitic()
        push(builder, rules.verbForm(verb, ctx), verb.id)
        if (!particleAfterObject) {
          push(builder, plan.word, null)
          note(builder, `"${plan.word}": negation after the verb`)
        }
        return
      default:
        push(builder, rules.verbForm(verb, ctx), verb.id)
    }
  }

  // ---- Assemble ----

  for (const social of chunks.leadingSocials) {
    push(builder, social.text, social.id)
  }
  const questionWordFinal = rules.profile.questionWordPosition === 'final'
  if (chunks.question && !questionWordFinal) {
    push(builder, chunks.question.text, chunks.question.id)
  }

  const sov = rules.profile.wordOrder === 'sov'
  const strategy = rules.profile.questionStrategy

  if (isQuestion && strategy === 'inversion') {
    emitVerb()
    note(builder, 'verb-second: the verb precedes the subject in a question')
    if (chunks.subject) emitNounPhrase(chunks.subject, 'subject')
  } else if (isQuestion && strategy === 'auxiliary') {
    if (needsCopula || chunks.verb?.features.copula) {
      emitVerb()
      if (chunks.subject) emitNounPhrase(chunks.subject, 'subject')
    } else if (chunks.verb) {
      const auxiliary = chunks.negated && plan.kind === 'auxiliary'
        ? plan.auxiliary
        : auxiliaryFor(ctx)
      push(builder, auxiliary, null)
      note(builder, `do-support: "${auxiliary}" fronted for the question`)
      if (chunks.negated && plan.kind === 'auxiliary') push(builder, plan.word, null)
      if (chunks.subject) emitNounPhrase(chunks.subject, 'subject')
      emitVerb(true)
    } else if (chunks.subject) {
      emitNounPhrase(chunks.subject, 'subject')
    }
  } else {
    if (chunks.subject) emitNounPhrase(chunks.subject, 'subject')
    if (!sov) emitVerb()
  }

  for (const phrase of chunks.complements) {
    emitPhrase(phrase)
  }

  if (sov) emitVerb()

  if (particleAfterObject && plan.kind === 'afterVerb') {
    push(builder, plan.word, null)
    note(builder, `"${plan.word}": negation after a definite object`)
  }

  for (const adverb of chunks.adverbs) {
    push(builder, adverb.text, adverb.id)
  }

  if (chunks.question && questionWordFinal) {
    push(builder, chunks.question.text, chunks.question.id)
    note(builder, 'the question word goes at the end, as in speech')
  }

  if (isQuestion && strategy === 'particle' && rules.profile.questionParticle) {
    push(builder, rules.profile.questionParticle, null)
    note(builder, `question particle "${rules.profile.questionParticle}"`)
  }

  let tokens = builder.tokens
  if (rules.postprocess) tokens = rules.postprocess(tokens, ctx)

  return finish(rules, { ...builder, tokens }, chunks, isQuestion)
}

/** English do-support auxiliary for the subject and tense. */
function auxiliaryFor(ctx: SentenceContext): string {
  if (ctx.tense === 'past') return 'did'
  return ctx.person === 3 && ctx.number === 'sg' ? 'does' : 'do'
}

/** An object noun phrase a language can negate in place (geen, kein, pas de). */
function negatableObject(chunks: Chunks): NounPhrase | undefined {
  const np = firstNounComplement(chunks)
  if (!np) return undefined
  const kind = np.determiner?.features.determinerKind
  if (kind && kind !== 'indefinite') return undefined
  return np
}

function hasDefiniteObject(chunks: Chunks): boolean {
  for (const phrase of chunks.complements) {
    if (phrase.kind !== 'np') continue
    if (phrase.pronoun) return true
    if (!phrase.head) continue
    const kind = phrase.determiner?.features.determinerKind
    if (kind && kind !== 'indefinite') return true
  }
  return false
}

function finish(
  rules: LanguageRules,
  builder: Builder,
  chunks: Chunks,
  isQuestion: boolean,
): Realization {
  const separator = rules.profile.spacing === 'none' ? '' : ' '
  const tokens = [...builder.tokens]
  const body = tokens.map((token) => token.text).filter(Boolean).join(separator).replace(/\s+/g, ' ').trim()

  let text = body
  if (chunks.trailingSocials.length) {
    const listSeparator = rules.profile.listSeparator ?? (separator === '' ? '，' : ', ')
    const tail = chunks.trailingSocials.map((social) => social.text).join(listSeparator)
    text = text ? `${text}${listSeparator}${tail}` : tail
    for (const social of chunks.trailingSocials) {
      tokens.push({ text: social.text, from: social.id })
    }
  }

  if (text) {
    if (rules.profile.capitalize) {
      text = text.charAt(0).toLocaleUpperCase() + text.slice(1)
    }
    const { statement, question, questionPrefix } = rules.profile.punctuation
    text = isQuestion ? `${questionPrefix ?? ''}${text}${question}` : `${text}${statement}`
  }

  return { text, tokens, inserted: builder.inserted, notes: builder.notes }
}

export type { RealizedToken }
