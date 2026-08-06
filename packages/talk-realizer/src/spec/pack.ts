import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import type { SelectedWord } from '../features'

/**
 * Golden tests run against the real language packs in
 * `packages/talk-packs/data`, not against invented fixtures: if a tile's text
 * or part of speech changes in the pack, these tests are what notices.
 */
interface PackFile {
  locale: string
  version: number
  words: Array<{ id: string, text: string, pos: string }>
}

/** Walks up from the working directory to find the repo root. */
function repoRoot(): string {
  let directory = process.cwd()
  for (let depth = 0; depth < 8; depth += 1) {
    if (existsSync(resolve(directory, 'packages/talk-packs/data'))) return directory
    const parent = dirname(directory)
    if (parent === directory) break
    directory = parent
  }
  throw new Error('could not locate packages/talk-packs/data from the working directory')
}

function loadPack(language: string): Map<string, SelectedWord> {
  const path = resolve(repoRoot(), `packages/talk-packs/data/${language}-v1.json`)
  const pack = JSON.parse(readFileSync(path, 'utf8')) as PackFile
  return new Map(pack.words.map((word) => [word.id, { id: word.id, text: word.text, pos: word.pos }]))
}

const packs = new Map<string, Map<string, SelectedWord>>()

export function packWords(language: string): Map<string, SelectedWord> {
  let pack = packs.get(language)
  if (!pack) {
    pack = loadPack(language)
    packs.set(language, pack)
  }
  return pack
}

/**
 * Builds a selection from concept ids, exactly as the app would after the child
 * tapped those tiles. Ids the pack does not have (`not`) fall back to a stub so
 * the negation cases can be written before the tile exists.
 */
export function select(language: string, ids: string[]): SelectedWord[] {
  const pack = packWords(language)
  return ids.map((id) => {
    const word = pack.get(id)
    if (word) return word
    if (id === 'not') {
      return { id: 'not', text: language === 'nl' ? 'niet' : 'not', pos: 'negation' }
    }
    throw new Error(`pack ${language} has no word "${id}"`)
  })
}
