import { lexicons, realize } from '@tiko/talk-realizer'
import { hasPack, loadPack } from '@tiko/talk-packs'
import type {
  Category,
  LanguagePack,
  PackTemplate,
  PackWord,
  SavedPhrase,
  StripState,
  TalkPartOfSpeech,
  Template,
  WordTile,
} from '@tiko/talk-types'

/**
 * The board, the grammar and the sentence — all from data the app already has.
 *
 * Talk used to fetch every one of these from `sentence-api`, with a 2 KB
 * seven-word English stub standing in when the network failed. That is the wrong
 * shape for an app a child depends on: the words a child needs and the grammar that
 * turns them into a sentence are not per-user data and do not change between
 * requests, so they belong on the device.
 *
 * What this module does *not* do is the part that genuinely needs a server: which
 * word this particular child is likely to want next (learned from their own use),
 * their saved phrases, and speech audio. `useSentenceApi` still asks for those, and
 * treats them as improvements on what is already on screen rather than as the thing
 * that makes the screen work.
 */

/** A pack, kept once per locale so switching language back is instant. */
const cache = new Map<string, Promise<LanguagePack>>()

export function localPackFor(locale: string): Promise<LanguagePack> | null {
  if (!hasPack(locale)) return null
  const code = locale.split('-')[0].toLowerCase()
  const existing = cache.get(code)
  if (existing) return existing
  const loading = loadPack(code)
  cache.set(code, loading)
  return loading
}

function toWordTile(word: PackWord): WordTile {
  return {
    id: word.id,
    text: word.text,
    pos: word.pos,
    category: word.category,
    ...(word.icon ? { icon: word.icon } : {}),
    ...(word.image ? { image: word.image } : {}),
  }
}

/** The categories the pack's own words imply, in the order the pack lists them. */
function categoriesOf(pack: LanguagePack): Category[] {
  const byId = new Map<string, { label: string, posTypes: Set<string>, count: number }>()
  for (const word of pack.words) {
    const existing = byId.get(word.category)
    if (existing) {
      existing.posTypes.add(word.pos)
      existing.count += 1
    } else {
      byId.set(word.category, { label: label(word.category), posTypes: new Set([word.pos]), count: 1 })
    }
  }
  return [...byId.entries()].map(([id, value]) => ({
    id,
    label: value.label,
    icon: 'square.grid.2x2',
    posTypes: [...value.posTypes],
    wordCount: value.count,
  }))
}

/** "hot-drink" → "Hot drink", which is what a category id is short for. */
function label(id: string): string {
  const spaced = id.replace(/[-_]/g, ' ')
  return spaced.charAt(0).toUpperCase() + spaced.slice(1)
}

export interface LocalBoard {
  pack: LanguagePack
  templates: Template[]
  categories: Category[]
  words: WordTile[]
  savedPhrases: SavedPhrase[]
}

/**
 * The pack states a template's slots; the board only needs how many there are, which
 * is the one difference between `PackTemplate` and `Template`.
 */
function toTemplate(template: PackTemplate): Template {
  return {
    id: template.id,
    pattern: template.pattern,
    category: template.category,
    ...(template.icon ? { icon: template.icon } : {}),
    slotCount: template.slots.length,
  }
}

/** Everything the board needs, from the pack on the device. */
export async function loadLocalBoard(locale: string): Promise<LocalBoard | null> {
  const loading = localPackFor(locale)
  if (!loading) return null
  const pack = await loading
  return {
    pack,
    templates: pack.templates.map(toTemplate),
    categories: categoriesOf(pack),
    words: pack.words.map(toWordTile),
    savedPhrases: [],
  }
}

/**
 * Which parts of speech may follow what the child has chosen so far. The pack states
 * this in `grammar.validTransitions`, which is the same table the API reads.
 */
export function validNextFor(pack: LanguagePack, chosen: WordTile[]): TalkPartOfSpeech[] {
  const transitions = pack.grammar?.validTransitions
  if (!transitions) return []
  // Nothing chosen yet: whatever a sentence may begin with, which is every part of
  // speech some other part can be followed by, plus the pronouns a child starts with.
  if (chosen.length === 0) return transitions.pronoun ? (Object.keys(transitions) as TalkPartOfSpeech[]) : []
  return transitions[chosen[chosen.length - 1].pos] ?? []
}

/**
 * True where the strip is a sentence a child could send. The API's rule is that the
 * last tile must be a part of speech a sentence can end on; this mirrors it.
 */
const COMPLETABLE: ReadonlySet<string> = new Set([
  'noun', 'pronoun', 'adjective', 'verb', 'social', 'adverb', 'question',
])

export function canComplete(pack: LanguagePack, chosen: WordTile[]): boolean {
  void pack
  if (chosen.length === 0) return false
  return COMPLETABLE.has(chosen[chosen.length - 1].pos)
}

/** The sentence itself, built by the realizer from the tiles the child chose. */
export function buildSentence(
  locale: string,
  chosen: WordTile[],
  customIds: ReadonlySet<string> = new Set(),
): string {
  if (chosen.length === 0) return ''
  const code = locale.split('-')[0].toLowerCase()
  const lexicon = { ...(lexicons[code] ?? {}) }
  for (const word of chosen) {
    // A word the child added is a name, and a name takes no article.
    if (customIds.has(word.id) && word.pos === 'noun') lexicon[word.id] = { pos: 'noun', proper: true }
  }
  return realize(
    chosen.map((word) => ({ id: word.id, text: word.text, pos: word.pos, category: word.category })),
    { locale: code, lexicon },
  ).text
}

/** Every sentence-final mark the realizer can produce, in every script it writes. */
const TERMINATORS = /[.。！？?!।॥։]+$/u

/**
 * The strip while the child is still building it: the same grammar, without the full
 * stop. A terminator on an unfinished sentence reads as though it were finished.
 */
export function buildStrip(
  locale: string,
  chosen: WordTile[],
  customIds?: ReadonlySet<string>,
): string {
  return buildSentence(locale, chosen, customIds).replace(TERMINATORS, '')
}

/** The strip state, entirely from local data. */
export function localStripState(
  pack: LanguagePack,
  locale: string,
  chosen: WordTile[],
  customIds?: ReadonlySet<string>,
): StripState {
  return {
    display: buildStrip(locale, chosen, customIds),
    validNext: validNextFor(pack, chosen),
    canComplete: canComplete(pack, chosen),
  }
}

/**
 * Suggestions without a server: the words that may legally follow, most frequent
 * first. The API's ranking is better because it has watched this child — but this is
 * what makes the board usable before it answers, or when it never does.
 */
export function localSuggestions(
  pack: LanguagePack,
  chosen: WordTile[],
  limit = 24,
): WordTile[] {
  const allowed = new Set(validNextFor(pack, chosen))
  const used = new Set(chosen.map((word) => word.id))
  return pack.words
    .filter((word) => !used.has(word.id) && (allowed.size === 0 || allowed.has(word.pos)))
    .sort((left, right) => (right.frequency ?? 0) - (left.frequency ?? 0))
    .slice(0, limit)
    .map(toWordTile)
}
