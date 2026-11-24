import { describe, expect, it } from 'vitest'
import { fitzgeraldCategory, fitzgeraldColors, fitzgeraldInk, isFitzgeraldCategory } from './fitzgerald'

describe('six-category modified Fitzgerald Key', () => {
  it.each([
    ['pronoun', 'person'], ['verb', 'action'], ['noun', 'thing'],
    ['adjective', 'describing'], ['adverb', 'describing'], ['social', 'social'],
    ['interjection', 'social'], ['question', 'miscellaneous'], ['phrase', 'miscellaneous'],
    ['preposition', 'miscellaneous'], ['determiner', 'miscellaneous'], ['conjunction', 'miscellaneous'],
    ['unknown', 'miscellaneous'], ['', 'miscellaneous'],
  ])('classifies %s as %s', (pos, expected) => expect(fitzgeraldCategory(pos)).toBe(expected))

  it('accepts only explicit categories, not inherited object property names', () => {
    expect(isFitzgeraldCategory('person')).toBe(true)
    for (const input of ['constructor', 'yellow', null, {}, 'verb']) expect(isFitzgeraldCategory(input)).toBe(false)
  })

  it('keeps text at least 4.5:1 on every reference fill', () => {
    const luminance = (hex: string) => {
      const rgb = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255)
        .map(c => c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
      return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722
    }
    for (const fill of Object.values(fitzgeraldColors)) {
      expect((luminance(fill) + 0.05) / (luminance(fitzgeraldInk) + 0.05)).toBeGreaterThanOrEqual(4.5)
    }
  })
})
