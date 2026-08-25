import { createScandinavian } from '../morphology/scandinavian'

/**
 * Danish. The one that breaks the Scandinavian pattern: **no double
 * definiteness**. Where Swedish says "det stora äpplet" and Norwegian "det store
 * eplet", Danish says "det store æble" — the free article replaces the suffix
 * rather than joining it.
 *
 * Marked `beta`: the vocabulary was generated against the shared concept ids and
 * needs review by a Danish speaker; the grammar is tested.
 */
export const danish = createScandinavian({
  language: 'da',
  maturity: 'beta',
  indefinite: { common: 'en', neuter: 'et' },
  free: { common: 'den', neuter: 'det', plural: 'de' },
  doubleDefiniteness: false,
  definiteSuffix: { common: 'en', commonAfterVowel: 'n', neuter: 'et', neuterAfterVowel: 't' },
  definitePlural: 'ene',
  pluralEnding: 'er',
  adjectiveDefiniteEnding: 'e',
  adjectiveNeuterEnding: 't',
  infinitiveEnding: 'e',
  copula: { present: 'er', past: 'var' },
  negation: 'ikke',
  notes: 'Grammar is rule-based and tested; the vocabulary was generated against the shared concept ids and needs review by a Danish speaker.',
})
