import { createScandinavian } from '../morphology/scandinavian'

/**
 * Swedish. Double definiteness ("det stora äpplet"), the definite plural in
 * "-na", and the definite/plural adjective in "-a".
 *
 * Marked `beta` because the vocabulary was generated against the shared concept
 * ids rather than authored by a Swedish speaker; the grammar is tested.
 */
export const swedish = createScandinavian({
  language: 'sv',
  maturity: 'beta',
  indefinite: { common: 'en', neuter: 'ett' },
  free: { common: 'den', neuter: 'det', plural: 'de' },
  doubleDefiniteness: true,
  definiteSuffix: { common: 'en', commonAfterVowel: 'n', neuter: 'et', neuterAfterVowel: 't' },
  definitePlural: 'na',
  pluralEnding: 'ar',
  adjectiveDefiniteEnding: 'a',
  adjectiveNeuterEnding: 't',
  copula: { present: 'är', past: 'var' },
  negation: 'inte',
  notes: 'Grammar is rule-based and tested; the vocabulary was generated against the shared concept ids and needs review by a Swedish speaker.',
})
