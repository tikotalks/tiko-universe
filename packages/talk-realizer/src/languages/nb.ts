import { createScandinavian } from '../morphology/scandinavian'

/**
 * Norwegian Bokmål. Like Swedish it keeps double definiteness ("det store
 * eplet"); like Danish its definite plural is "-ene" and its definite adjective
 * ends in "-e".
 *
 * The optional feminine gender (ei jente) is not modelled: Bokmål permits the
 * common-gender form throughout, which is what this generates.
 *
 * Marked `beta`: the vocabulary was generated against the shared concept ids and
 * needs review by a Norwegian speaker; the grammar is tested.
 */
export const norwegian = createScandinavian({
  language: 'nb',
  maturity: 'beta',
  indefinite: { common: 'en', neuter: 'et' },
  free: { common: 'den', neuter: 'det', plural: 'de' },
  doubleDefiniteness: true,
  definiteSuffix: { common: 'en', commonAfterVowel: 'n', neuter: 'et', neuterAfterVowel: 't' },
  definitePlural: 'ene',
  pluralEnding: 'er',
  adjectiveDefiniteEnding: 'e',
  adjectiveNeuterEnding: 't',
  infinitiveEnding: 'e',
  copula: { present: 'er', past: 'var' },
  negation: 'ikke',
  notes: 'Grammar is rule-based and tested; the optional feminine gender is not modelled, and the vocabulary was generated against the shared concept ids and needs review by a Norwegian speaker.',
})
