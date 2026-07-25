/**
 * Deriving a verb's other persons from the first person singular.
 *
 * The packs ship one form per verb — "хочу", "chci", "haluan" — and until now
 * every other person had to be curated by hand, which meant thirty verbs times
 * five persons times a dozen languages of hand-written data, most of it perfectly
 * regular. This module replaces that with what the languages actually do: **the
 * ending of the first person tells you the conjugation class**, and the class tells
 * you the rest.
 *
 * Czech "-ím" gives "-íš, -í, -íme, -íte, -í"; Slovenian "-am" gives "-aš, -a,
 * -amo, -ate, -ajo"; Estonian "-n" gives "-d, -b, -me, -te, -vad". Each language
 * supplies a list of rules, longest ending first, and anything no rule matches
 * still says so out loud rather than being silently wrong.
 *
 * This does not make the languages irregular-proof. A curated form always wins —
 * these rules only fill the gap where there was nothing at all.
 */

export type PersonKey = '2sg' | '3sg' | '1pl' | '2pl' | '3pl'

export interface PersonRule {
  /** The first-person-singular ending this rule recognises. */
  when: string
  /**
   * What replaces that ending, per person. A missing person means the rule does
   * not claim to know it, and the caller falls back to a note.
   */
  forms: Partial<Record<PersonKey, string>>
  /** Optional note explaining a class that a reader might not expect. */
  because?: string
}

export interface Conjugation {
  rules: readonly PersonRule[]
  /**
   * Applied to the whole word before matching, for languages whose first person
   * carries a prefix or a particle the endings do not see.
   */
  strip?: RegExp
}

/**
 * Derives one person from the first person singular, or returns undefined when no
 * rule recognises the verb — which is a real answer, not a failure.
 */
export function derivePerson(
  firstSingular: string,
  person: PersonKey,
  conjugation: Conjugation,
): { text: string, because?: string } | undefined {
  // A multi-word verb inflects on its first word ("mám rád" → "máš rád"), so the
  // rest is held aside and reattached.
  const parts = firstSingular.split(' ')
  const head = parts[0]
  const tail = parts.slice(1)

  // Longest ending first, so "-ám" is tried before "-m".
  const ordered = [...conjugation.rules].sort((a, b) => b.when.length - a.when.length)
  for (const rule of ordered) {
    if (!head.endsWith(rule.when)) continue
    const ending = rule.forms[person]
    if (ending === undefined) continue
    const stem = rule.when ? head.slice(0, head.length - rule.when.length) : head
    return { text: [`${stem}${ending}`, ...tail].join(' '), because: rule.because }
  }
  return undefined
}
