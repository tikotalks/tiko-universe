import { describe, expect, it } from 'vitest'
import type { SavedPhrase, Template, WordTile } from '@tiko/talk-types'
import { useSentenceStrip } from './useSentenceStrip'

const words: WordTile[] = [
  { id: 'i', text: 'I', pos: 'pron', category: 'people' },
  { id: 'want', text: 'want', pos: 'verb', category: 'actions' },
  { id: 'water', text: 'water', pos: 'noun', category: 'needs' },
]

describe('useSentenceStrip', () => {
  it('adds, removes, clears, and exposes display text', () => {
    const strip = useSentenceStrip({ allWords: words })

    strip.addWord(words[0]!)
    strip.addWord(words[1]!)

    expect(strip.display.value).toBe('I want')
    expect(strip.wordIds.value).toEqual(['i', 'want'])
    expect(strip.canSpeak.value).toBe(true)

    strip.removeWord(0)
    expect(strip.display.value).toBe('want')

    strip.clear()
    expect(strip.display.value).toBe('')
    expect(strip.canSpeak.value).toBe(false)
  })

  it('reorders words within bounds only', () => {
    const strip = useSentenceStrip({ allWords: words })
    strip.setWords(words)

    strip.moveWord(2, 0)
    expect(strip.wordIds.value).toEqual(['water', 'i', 'want'])

    strip.moveWord(-1, 1)
    strip.moveWord(1, 9)
    expect(strip.wordIds.value).toEqual(['water', 'i', 'want'])
  })

  it('applies saved phrases by known word ids', () => {
    const strip = useSentenceStrip({ allWords: words })
    const phrase: SavedPhrase = {
      id: 'phrase-water',
      sentence: 'I want water.',
      wordIds: ['i', 'want', 'missing', 'water'],
      isAuto: true,
      usageCount: 1,
    }

    strip.applyPhrase(phrase)

    expect(strip.wordIds.value).toEqual(['i', 'want', 'water'])
  })

  it('extracts fixed words from simple templates', () => {
    const strip = useSentenceStrip({ allWords: words })
    const template: Template = {
      id: 'template-want',
      pattern: 'I want ___',
      category: 'needs',
      slotCount: 1,
    }

    strip.applyTemplate(template)

    expect(strip.wordIds.value).toEqual(['i', 'want'])
  })
})
