import { describe, expect, it } from 'vitest'
import {
  isInitialStripState,
  sentenceApiRoutes,
  type GenerateLanguagePackResponse,
  type LanguagePack,
  type SentenceNextResponse,
  type SentenceStartResponse,
  type SentenceUsageAggregate,
  type WordTile,
} from './index'

describe('@tiko/talk-types contracts', () => {
  it('exports the v1 Sentence API route list', () => {
    expect(sentenceApiRoutes).toEqual([
      'GET /v1/sentence/start',
      'POST /v1/sentence/next',
      'POST /v1/sentence/complete',
      'GET /v1/sentence/vocabulary',
      'GET /v1/sentence/phrases',
      'POST /v1/sentence/phrases',
      'DELETE /v1/sentence/phrases/:phraseId',
      'GET /v1/sentence/words',
      'POST /v1/sentence/words',
      'DELETE /v1/sentence/words/:wordId',
      'POST /v1/sentence-admin/generate-pack',
    ])
  })

  it('models start and next responses from the architecture doc', () => {
    const word: WordTile = { id: 'en-i', text: 'I', pos: 'pron', category: 'people', icon: 'user' }
    const start: SentenceStartResponse = {
      templates: [{ id: 'want', pattern: 'I want [NOUN]', category: 'needs', slotCount: 1 }],
      initialCategories: [{ id: 'people', label: 'People', posTypes: ['pron'], wordCount: 1 }],
      initialWords: [word],
      savedPhrases: [],
      stripState: { words: [], validNext: ['pron'], canComplete: false },
    }
    const next: SentenceNextResponse = {
      suggestions: [{ id: 'en-want', text: 'want', pos: 'verb', category: 'actions' }],
      categories: [],
      words: { people: [word] },
      stripState: { display: 'I', validNext: ['verb'], canComplete: false },
    }

    expect(isInitialStripState(start.stripState)).toBe(true)
    expect(next.words.people[0].text).toBe('I')
  })

  it('keeps language packs and generated packs typed without child-facing LLM contracts', () => {
    const pack: LanguagePack = {
      locale: 'en',
      version: 1,
      words: [{ id: 'en-water', text: 'water', pos: 'noun', category: 'drink', frequency: 10 }],
      templates: [{ id: 'want-noun', pattern: 'I want [NOUN]', category: 'needs', slots: [{ acceptedPos: ['noun'] }] }],
      grammar: { wordOrder: 'SVO', validTransitions: { pron: ['verb'], verb: ['noun'] } },
    }
    const generated: GenerateLanguagePackResponse = { pack, warnings: [] }

    expect(generated.pack.grammar.validTransitions.pron).toEqual(['verb'])
  })

  it('documents aggregate usage privacy through hashed word sequences', () => {
    const aggregate: SentenceUsageAggregate = {
      id: 'usage-1',
      locale: 'en',
      posSequence: ['pron', 'verb', 'noun'],
      wordSequenceHash: 'sha256:example',
      wordCount: 3,
      usageCount: 12,
      firstSeen: '2026-06-05T00:00:00Z',
      lastSeen: '2026-06-05T00:00:00Z',
    }

    expect(aggregate).not.toHaveProperty('wordSequence')
    expect(aggregate.wordSequenceHash).toContain('sha256')
  })
})
