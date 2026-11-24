import { describe, expect, it } from 'vitest'
import { realize } from '../index'
import { select } from './pack'

/**
 * An adjective inside a predicate noun phrase is attributive. "She is a big
 * doctor" builds "big doctor" exactly as "the big doctor" does: the adjective
 * agrees with its own noun, in the nominative, and takes no predicative marker.
 * Only a bare adjective after the copula — "she is big" — is predicative.
 *
 * When a predicate noun started reaching the languages in the `predicate` role,
 * its adjectives arrived there too, and every language that reads that role as
 * "a bare predicate adjective" built the wrong one: Frisian and Luxembourgish
 * dropped the attributive ending, Basque added the predicative article, Welsh put
 * "yn" inside the phrase, Chinese put "很" there, and the Slavic languages and
 * Hindi agreed the adjective with "she" rather than with the doctor.
 */
const golden: Array<[string, string[], string]> = [
  ['fy', ['she', 'is', 'big', 'doctor'], 'Sy is in grutte dokter.'],
  ['lb', ['she', 'is', 'big', 'doctor'], 'Hatt ass en grousse Dokter.'],
  ['eu', ['that', 'is', 'big', 'doctor'], 'Hori mediku handi bat dago.'],
  ['cy', ['that', 'is', 'big', 'doctor'], 'Mae hwnnw meddyg mawr.'],
  ['ru', ['she', 'is', 'big', 'doctor'], 'Она большой врач.'],
  ['pl', ['she', 'is', 'big', 'doctor'], 'Ona jest duży lekarz.'],
  ['uk', ['she', 'is', 'big', 'doctor'], 'Вона великий лікар.'],
  ['hi', ['she', 'is', 'big', 'doctor'], 'वह बड़ा डॉक्टर है।'],
]

/** The bare predicate adjective must keep its predicative form. */
const bare: Array<[string, string[], string]> = [
  ['fy', ['she', 'is', 'big'], 'Sy is grut.'],
  ['eu', ['she', 'is', 'big'], 'Bera handia da.'],
  ['cy', ['she', 'is', 'big'], "Mae hi'n fawr."],
  ['zh', ['she', 'is', 'big'], '她很大。'],
  ['ru', ['she', 'is', 'big'], 'Она большая.'],
  ['hi', ['she', 'is', 'big'], 'वह बड़ी है।'],
]

describe('adjectives inside a predicate noun phrase', () => {
  for (const [language, ids, expected] of golden) {
    it(`${language}: ${ids.join(' ')}`, () => {
      expect(realize(select(language, ids), { locale: language }).text).toBe(expected)
    })
  }

  it('zh: 很 marks a bare predicate adjective, never one inside the phrase', () => {
    expect(realize(select('zh', ['that', 'is', 'big', 'doctor']), { locale: 'zh' }).text).not.toContain('很')
  })
})

describe('a bare predicate adjective', () => {
  for (const [language, ids, expected] of bare) {
    it(`${language}: ${ids.join(' ')}`, () => {
      expect(realize(select(language, ids), { locale: language }).text).toBe(expected)
    })
  }
})
