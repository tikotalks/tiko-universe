import { describe, expect, it } from 'vitest'
import { applySuffix, stack, TURKISH_HARMONY, HUNGARIAN_HARMONY, FINNISH_HARMONY } from '../morphology/agglutinative'

/**
 * The harmony mechanism on its own, because it is the piece everything
 * agglutinative rests on: get "elmayı" and "evde" right and Turkish nouns work
 * for all 295 tiles rather than for the ones somebody curated.
 */
describe('vowel harmony', () => {
  const tr = (stem: string, template: string): string =>
    applySuffix(stem, template, TURKISH_HARMONY, { soften: true })

  it('picks a low vowel by the last vowel of the stem', () => {
    expect(tr('ev', 'DA')).toBe('evde')       // front
    expect(tr('okul', 'DA')).toBe('okulda')   // back
    expect(tr('kitap', 'DA')).toBe('kitapta') // back, voiceless final
  })

  it('picks a high vowel four ways', () => {
    expect(tr('ev', '(y)I')).toBe('evi')      // front unrounded
    expect(tr('kız', '(y)I')).toBe('kızı')    // back unrounded
    expect(tr('göz', '(y)I')).toBe('gözü')    // front rounded
    expect(tr('okul', '(y)I')).toBe('okulu')  // back rounded
  })

  it('writes a buffer consonant after a vowel', () => {
    expect(tr('elma', '(y)I')).toBe('elmayı')
    expect(tr('elma', '(y)A')).toBe('elmaya')
    expect(tr('araba', '(n)In')).toBe('arabanın')
  })

  it('softens a final stop before a vowel', () => {
    expect(tr('kitap', '(y)I')).toBe('kitabı')
    expect(tr('ekmek', '(y)I')).toBe('ekmeği')
  })

  it('stacks suffixes, and harmony spreads through the stack', () => {
    expect(stack('ev', ['lAr', 'DA'], TURKISH_HARMONY)).toBe('evlerde')
    expect(stack('okul', ['lAr', 'DA'], TURKISH_HARMONY)).toBe('okullarda')
    expect(stack('elma', ['lAr', '(y)I'], TURKISH_HARMONY)).toBe('elmaları')
  })

  it('handles Hungarian three-way rounding', () => {
    expect(applySuffix('ház', 'hOz', HUNGARIAN_HARMONY)).toBe('házhoz')
    expect(applySuffix('kert', 'hOz', HUNGARIAN_HARMONY)).toBe('kerthez')
    expect(applySuffix('köny', 'hOz', HUNGARIAN_HARMONY)).toBe('könyhöz')
  })

  it('handles Finnish two-way harmony', () => {
    expect(applySuffix('talo', 'ssA', FINNISH_HARMONY)).toBe('talossa')
    expect(applySuffix('kylä', 'ssA', FINNISH_HARMONY)).toBe('kylässä')
  })
})
