import { describe, expect, it } from 'vitest'
import { coverageFor } from '../coverage'
import { languages, realize, supportedLanguages } from '../index'
import { packWords } from './pack'

/**
 * Coverage is a property we assert, not a claim we make in a README. Every pack
 * word in every supported language must produce a sentence, and the closed
 * classes — the tiles grammar actually leans on — must be curated by a human.
 */
describe('language coverage', () => {
  for (const language of supportedLanguages) {
    describe(language, () => {
      const words = [...packWords(language).values()]

      it('covers every closed-class tile with curated facts', () => {
        const coverage = coverageFor(language, words)
        expect(coverage.closedClassCurated).toBe(coverage.closedClassTotal)
      })

      it('leaves no tile without a usable form', () => {
        for (const word of words) {
          const result = realize([word], { locale: language })
          expect(result.text.length, `"${word.id}" produced nothing`).toBeGreaterThan(0)
        }
      })

      it('realizes every tile as a one-word sentence without crashing', () => {
        for (const word of words) {
          const result = realize([word], { locale: language })
          // Provenance holds even for a single tile.
          const ids = result.tokens.flatMap((token) => [token.from, ...(token.merged ?? [])])
          for (const id of ids) {
            if (id === null || id === undefined) continue
            expect(id).toBe(word.id)
          }
        }
      })

      it('states its own limits when it is not production-ready', () => {
        const profile = languages[language].profile
        if (profile.maturity !== 'production') {
          expect(profile.notes, `${language} is ${profile.maturity} and must say why`).toBeTruthy()
        }
      })
    })
  }

  it('covers every pack that exists', () => {
    // Thirteen shipped packs plus five authored here.
    expect(supportedLanguages.length).toBe(26)
  })
})
