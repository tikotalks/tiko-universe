import type { Features } from './features'

/**
 * What to make of a word a parent typed in themselves.
 *
 * Every caller used to mark these `proper: true` — a name — which is right for "Mum"
 * and wrong for "trampoline", and things are most of what gets added. The result was
 * "I want trampoline".
 *
 * A capital letter is the signal, because that is how a name is written. Two cases
 * where it says nothing:
 *
 * - **German and Luxembourgish capitalise every noun**, so "Trampolin" is not a name.
 * - **A script with no capitals at all** — Chinese, Japanese, Arabic, Hindi — cannot
 *   mark one. Those languages mostly have no article either, so the common-noun
 *   reading costs nothing.
 *
 * A parent who knows better should be able to say so; until the UI asks them, this
 * is the reading that is right more often.
 */
const CAPITALISES_EVERY_NOUN = new Set(['de', 'lb'])

export function customNounFeatures(text: string, locale: string): Features {
  const language = locale.split('-')[0].toLowerCase()
  if (CAPITALISES_EVERY_NOUN.has(language)) return { pos: 'noun' }
  const first = text.trim().charAt(0)
  const hasCase = first !== '' && first.toLocaleLowerCase() !== first.toLocaleUpperCase()
  const capitalised = hasCase && first === first.toLocaleUpperCase()
  return capitalised ? { pos: 'noun', proper: true } : { pos: 'noun' }
}
