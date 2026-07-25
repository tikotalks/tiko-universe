import type { Features } from '../features'

/**
 * Preverbal object clitics. The mechanism is shared by every language here that
 * puts an object pronoun in front of its verb — the Romance languages, Greek,
 * Bulgarian and Albanian — so it lives on its own rather than inside one family.
 *
 * The clitic is parked in `scratch.clitic` and the engine emits it just before
 * the verb, as its own token, so the audit trail still points at the tile the
 * child chose. A language whose spelling fuses the two (French "je t'aide")
 * merges them in its own elision step.
 */
export function extractObjectClitic(
  chunks: { complements: Array<{ kind: string, pronoun?: { id: string, features: Features, text: string } }> },
  scratch: Record<string, unknown>,
  /** Picks the form, for languages where some verbs govern the dative. */
  pick?: (pronoun: { features: Features, text: string }) => string,
): void {
  const index = chunks.complements.findIndex(
    (phrase) => phrase.kind === 'np' && !!phrase.pronoun,
  )
  if (index === -1) return
  const phrase = chunks.complements[index]
  const pronoun = phrase.pronoun
  if (!pronoun) return
  const text = pick?.(pronoun) ?? pronoun.features.accusative ?? pronoun.text
  scratch.clitic = { text, from: pronoun.id }
  chunks.complements.splice(index, 1)
}
