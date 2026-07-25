import { describe, expect, it } from 'vitest'
import { languages, realize, supportedLanguages } from '../index'
import { select } from './pack'

/**
 * Maturity is a promise the package has to keep: a caller who asks for
 * production-only output must not silently receive beta grammar.
 */
describe('maturity gating', () => {
  const ids = ['i', 'want', 'apple']

  it('realizes a production language when production is required', () => {
    const result = realize(select('en', ids), { locale: 'en', minMaturity: 'production' })
    expect(result.text).toBe('I want an apple.')
  })

  it('falls back for a beta language when production is required', () => {
    const beta = supportedLanguages.find((code) => languages[code].profile.maturity === 'beta')
    expect(beta, 'expected at least one beta language').toBeTruthy()
    const result = realize(select(beta!, ids), { locale: beta!, minMaturity: 'production' })
    // The fallback is exactly what the app does today: the tiles, joined.
    expect(result.text).toBe(
      select(beta!, ids).map((word, index) => (index === 0
        ? word.text.charAt(0).toLocaleUpperCase() + word.text.slice(1)
        : word.text)).join(' '),
    )
    expect(result.notes[0]).toContain('below the requested production')
  })

  it('realizes a beta language by default', () => {
    const beta = supportedLanguages.find((code) => languages[code].profile.maturity === 'beta')!
    const result = realize(select(beta, ids), { locale: beta })
    expect(result.notes.some((note) => note.includes('below the requested'))).toBe(false)
  })

  it('every language declares a maturity, and non-production ones say why', () => {
    for (const code of supportedLanguages) {
      const profile = languages[code].profile
      expect(['production', 'beta', 'draft']).toContain(profile.maturity)
      if (profile.maturity !== 'production') expect(profile.notes).toBeTruthy()
    }
  })
})
