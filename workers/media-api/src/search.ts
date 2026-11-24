// Media search: which library items answer a search (the SQL filter) and which
// of them come first (the score). Both read the search the same way, word by
// word, so a picture is never found by one and misjudged by the other.

/** How many matches a search ranks. Past this the tail keeps its upload order. */
export const SEARCH_RANK_WINDOW = 1000

/** A search is read as at most this many words; D1 allows 100 bound values a query. */
const SEARCH_WORD_LIMIT = 5

/** D1 refuses a LIKE pattern longer than 50 bytes; the wildcards around the text take up to four. */
const SEARCH_PATTERN_BYTES = 44

/** The text escaped for LIKE, cut where it would outgrow what D1 accepts. */
function pattern(text: string): string {
  const encoder = new TextEncoder()
  let escaped = ''
  for (const character of text) {
    const next = escaped + escapeLike(character)
    if (encoder.encode(next).length > SEARCH_PATTERN_BYTES) break
    escaped = next
  }
  return escaped
}

// `%` and `_` are LIKE wildcards, so a search for "100%" or "_" would otherwise
// match everything. Neutralise them and pair with likeClause's ESCAPE.
export function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, character => `\\${character}`)
}

export function likeClause(column: string): string {
  return `${column} LIKE ? ESCAPE '\\'`
}

export function searchWords(value: unknown): string[] {
  return String(value ?? '').toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(Boolean)
}

// Plurals no rule finds. Both directions are needed: the score reads plural as
// singular, the filter has to look for both spellings.
const IRREGULAR_PLURALS: Record<string, string> = {
  teeth: 'tooth',
  feet: 'foot',
  children: 'child',
  men: 'man',
  women: 'woman',
  mice: 'mouse',
  geese: 'goose',
  people: 'person',
  leaves: 'leaf',
  knives: 'knife',
  wolves: 'wolf',
  shelves: 'shelf',
  loaves: 'loaf',
  scarves: 'scarf',
}
const IRREGULAR_SINGULARS: Record<string, string> = Object.fromEntries(
  Object.entries(IRREGULAR_PLURALS).map(([plural, one]) => [one, plural]),
)

/** "cars" and "car", "boxes" and "box", "berries" and "berry", "teeth" and "tooth" are the same word to someone searching. */
export function singular(word: string): string {
  if (IRREGULAR_PLURALS[word]) return IRREGULAR_PLURALS[word]
  if (word.length > 4 && word.endsWith('ies')) return `${word.slice(0, -3)}y`
  if (word.length > 4 && /(?:ch|sh|ss|x|z)es$/.test(word)) return word.slice(0, -2)
  if (word.length > 3 && word.endsWith('s') && !word.endsWith('ss')) return word.slice(0, -1)
  return word
}

const VOWEL = /[aeiouy]/

/**
 * What is left of a verb once "-ing" or "-ed" is taken off: "biking" → "bik",
 * "running" → "run", "baked" → "bak". Undefined when the word is not such a
 * form, or when too little would be left to mean anything ("king", "red",
 * "thing", "speed").
 */
function verbStem(word: string): string | undefined {
  let stem: string | undefined
  if (word.length > 4 && word.endsWith('ing')) stem = word.slice(0, -3)
  else if (word.length > 4 && word.endsWith('ed') && !word.endsWith('eed')) stem = word.slice(0, -2)
  if (!stem || stem.length < 3 || !VOWEL.test(stem)) return undefined
  // "running" → "runn" → "run".
  if (/([^aeiouylsz])\1$/.test(stem)) stem = stem.slice(0, -1)
  return stem.length >= 3 ? stem : undefined
}

/**
 * The spellings one word answers to. "biking" answers to "bike" and "running"
 * to "run"; a plain word answers only to itself, so "car" is not "care".
 */
function wordForms(word: string): string[] {
  const stem = verbStem(word)
  return stem ? [word, stem, `${stem}e`] : [word]
}

function sameWord(a: string, b: string): boolean {
  if (a === b) return true
  const formsOfB = wordForms(b)
  return wordForms(a).some(form => formsOfB.includes(form))
}

function listValues(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(item => String(item).toLowerCase())
  if (typeof value !== 'string' || !value) return []
  try {
    const parsed = JSON.parse(value)
    if (Array.isArray(parsed)) return parsed.map(item => String(item).toLowerCase())
  } catch { /* a bare category string */ }
  return [value.toLowerCase()]
}

function normalizedWords(value: unknown): string[] {
  return searchWords(value).map(singular)
}

/** The words, plus each neighbouring pair written as one: "ice cream cone" also offers "icecream". */
function withJoinedPairs(words: string[]): string[] {
  const joined = words.slice(0, -1).map((word, index) => `${word}${words[index + 1]}`)
  return [...words, ...joined]
}

export interface SearchableMedia {
  title?: unknown
  name?: unknown
  tags?: unknown
  categories?: unknown
  folder?: unknown
  description?: unknown
}

function scoreWords(item: SearchableMedia, wanted: string[]): number {
  const phrase = wanted.join(' ')
  const title = normalizedWords(item.title || item.name)
  const titlePool = withJoinedPairs(title)
  const tags = listValues(item.tags).map(normalizedWords)
  const categories = listValues(item.categories ?? item.folder).map(normalizedWords)
  const tagWords = tags.flatMap(withJoinedPairs)
  const categoryWords = categories.flatMap(withJoinedPairs)
  const description = normalizedWords(item.description)

  const everyIn = (pool: string[]) => wanted.every(word => pool.includes(word))
  const everyFormIn = (pool: string[]) => wanted.every(word => pool.some(candidate => sameWord(candidate, word)))
  const lastWanted = wanted.at(-1) ?? ''
  const lastTitle = title.at(-1) ?? ''
  // A short title is about the word; a long one only includes it.
  const extraTitleWords = Math.min(Math.max(title.length - wanted.length, 0), 6)

  // The picture *is* the thing searched for.
  if (title.join(' ') === phrase || title.join('') === wanted.join('')) return 100

  // "Police car" is a car; "car wash" is not. In an English title the last
  // word is the thing and the words before it describe it.
  if (everyIn(titlePool)) return (lastTitle === lastWanted ? 88 : 80) - extraTitleWords
  // Words the title writes as one: "ice cream" is an "Icecream cone".
  if (wanted.length > 1 && titlePool.includes(wanted.join(''))) return 80 - extraTitleWords
  // Two words the title writes as one, the other way round: "brush teeth" is a "Toothbrush".
  if (wanted.length === 2 && titlePool.includes(`${wanted[1]}${wanted[0]}`)) return 84 - extraTitleWords
  // "Boy running" for "run", "Baked potato" for "bake".
  if (everyFormIn(titlePool)) return (sameWord(lastTitle, lastWanted) ? 85 : 77) - extraTitleWords

  // A tag that is the search. Whoever described the picture listed what it
  // shows first, so an early tag says more than a late one.
  const tagIndex = tags.findIndex(tag => tag.join(' ') === phrase || tag.join('') === wanted.join(''))
  if (tagIndex >= 0) return 70 - Math.min(tagIndex, 10) * 0.2
  // The same for a tag in another form of the word: "eating" for "eat".
  const tagFormIndex = wanted.length === 1 ? tags.findIndex(tag => tag.length === 1 && sameWord(tag[0], wanted[0])) : -1
  if (tagFormIndex >= 0) return 67 - Math.min(tagFormIndex, 10) * 0.2

  // Every word is there, spread over the title and the tags: "happy boy" for a
  // picture titled "Boy" and tagged "happy", "mythology" for "Norse mythology".
  const named = [...titlePool, ...tagWords]
  if (everyIn(named)) {
    const inTitle = wanted.filter(word => titlePool.includes(word)).length
    return 62 + (inTitle / wanted.length) * 4
  }

  if (categories.some(category => category.join(' ') === phrase)) return 60

  const filed = [...named, ...categoryWords]
  if (everyFormIn(filed)) return 57

  // Half-typed words: "ca" on the way to "cat" or "car". Only the last word
  // can be half typed; the ones before it were finished.
  const earlierWords = wanted.slice(0, -1)
  const earlierIn = (pool: string[]) => earlierWords.every(word => pool.some(candidate => sameWord(candidate, word)))
  const startsIn = (pool: string[]) => pool.some(word => word.startsWith(lastWanted))
  if (earlierIn(filed)) {
    if (title.length > 0 && title[0].startsWith(lastWanted)) return 55
    if (startsIn(title)) return 50
    if (startsIn(tagWords)) return 40
    if (startsIn(categoryWords)) return 30
  }

  const mentioned = [...filed, ...description]
  if (everyIn(mentioned)) return 20
  if (everyFormIn(mentioned)) return 15
  if (earlierIn(mentioned) && startsIn(description)) return 10
  // Matched in the middle of a word somewhere ("scarf" for "car").
  return 1
}

/**
 * How well one library item answers a search, higher is better.
 *
 * The filter decides what matches at all; it is deliberately generous, because
 * half a word is how people search. This decides what comes first. Without it
 * a search for "car" listed whatever was uploaded last among everything whose
 * description happened to contain "carved" — a cave, a mountain and a goat
 * ahead of every car in the library.
 *
 * The order of trust is the order of how deliberately the word was put there:
 * the title names the picture, a tag describes it, a category files it, and a
 * description merely mentions things.
 */
export function mediaSearchScore(item: SearchableMedia, query: string): number {
  const wanted = searchWords(query).map(singular).slice(0, SEARCH_WORD_LIMIT)
  if (wanted.length === 0) return 0
  return scoreWords(item, wanted)
}

/** Best answer first; among equals the shorter, then the alphabetically earlier title. */
export function rankMediaSearch<T extends Record<string, unknown>>(rows: T[], query: string): T[] {
  return rows
    .map((row, index) => ({ row, index, score: mediaSearchScore(row, query) }))
    .sort((a, b) =>
      b.score - a.score
      || String(a.row.title ?? '').length - String(b.row.title ?? '').length
      || String(a.row.title ?? '').localeCompare(String(b.row.title ?? ''))
      || a.index - b.index)
    .map(entry => entry.row)
}

/**
 * The spellings to look for in the database for one searched word, shortest
 * first and without any that a shorter one already covers: "cars" → "car",
 * "biking" → "bik" (which finds "bike" and "biking"), "teeth" → "teeth" and
 * "tooth".
 */
function searchSpellings(word: string): string[] {
  const one = singular(word)
  const candidates = [word, one, verbStem(one), IRREGULAR_SINGULARS[one]]
    .filter((value): value is string => !!value)
  const unique = [...new Set(candidates)].sort((a, b) => a.length - b.length)
  return unique.filter((value, index) => !unique.slice(0, index).some(shorter => value.includes(shorter)))
}

// Everything written about a picture in sentences or names, as one text.
const PROSE = `(COALESCE(title, '') || ' ' || COALESCE(description, '') || ' ' || COALESCE(name, '') || ' ' || COALESCE(filename, ''))`
// A title with its spaces taken out, so "icecream" finds "Ice Cream".
const TITLE_RUN_TOGETHER = `REPLACE(COALESCE(title, ''), ' ', '')`

export interface MediaSearchFilter {
  /** A parenthesised boolean expression over the `media` table. */
  clause: string
  values: string[]
  /** An ORDER BY term that puts the likeliest answers into the ranking window first. */
  windowOrder: string
  windowValues: string[]
}

/**
 * The SQL that decides which media answer a search.
 *
 * Every word has to be found somewhere on the item, in any order: "brush
 * teeth" finds a picture titled "Toothbrush" tagged "teeth". Prose (title,
 * description, name, filename) matches anywhere in a word. Tags and categories
 * match only from the start of a word, so "pet" finds the tag "pets" without
 * dragging in everything tagged "carpet".
 */
export function mediaSearchFilter(search: string): MediaSearchFilter {
  const words = searchWords(search).slice(0, SEARCH_WORD_LIMIT)

  // Nothing to read as a word ("%", "&"): look for the characters as typed.
  if (words.length === 0) {
    const anywhere = `%${pattern(search)}%`
    return {
      clause: `(${likeClause(PROSE)} OR ${likeClause('tags')} OR ${likeClause('categories')})`,
      values: [anywhere, anywhere, anywhere],
      windowOrder: `(${likeClause('title')}) DESC`,
      windowValues: [`${pattern(search)}%`],
    }
  }

  const values: string[] = []
  const wordClauses = words.map((word) => {
    const alternatives = searchSpellings(word).map((spelling) => {
      const text = pattern(spelling)
      values.push(`%${text}%`, `%"${text}%`, `% ${text}%`, `%"${text}%`, `%-${text}%`)
      return [
        likeClause(PROSE),
        likeClause('tags'), likeClause('tags'),
        likeClause('categories'), likeClause('categories'),
      ].join(' OR ')
    })
    return `(${alternatives.join(' OR ')})`
  })

  // The whole search written as one word, against titles and tags written as
  // one word: "ice cream" finds "Icecream" and "icecream" finds "Ice Cream".
  const runTogether = pattern(words.map(singular).join(''))
  const clause = `((${wordClauses.join(' AND ')}) OR ${likeClause(TITLE_RUN_TOGETHER)} OR ${likeClause(`REPLACE(COALESCE(tags, ''), ' ', '')`)})`
  values.push(`%${runTogether}%`, `%"${runTogether}%`)

  // Two letters can match half the library. Pictures named or tagged with the
  // first word go into the ranking window first, so the cut never drops them.
  const first = pattern(searchSpellings(words[0])[0])
  return {
    clause,
    values,
    windowOrder: `(${likeClause('title')}) DESC, (${likeClause('tags')}) DESC`,
    windowValues: [`%${first}%`, `%"${first}%`],
  }
}
