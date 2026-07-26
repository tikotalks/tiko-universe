import type { Conjugation } from './persons'
import type { SlavicLanguage } from './slavic'

/**
 * Present-tense conjugation for the Slavic and Baltic languages, derived from the
 * first person singular the packs ship.
 *
 * These tables are where the family's regularity finally pays off. Serbian "-ам"
 * gives "-аш, -а, -амо, -ате, -ају" for every verb that has it; Slovenian's three
 * classes are told apart by one letter; Czech's four by two. What the tables
 * deliberately do *not* claim is the ambiguous cases — Polish "-ę" can be either
 * conjugation and Russian's bare "-ю" likewise — so those verbs stay curated and
 * say so.
 */
export const SLAVIC_CONJUGATION: Record<SlavicLanguage, Conjugation> = {
  ru: {
    rules: [
      // The -j stem classes, which are unambiguous.
      { when: 'аю', forms: { '2sg': 'аешь', '3sg': 'ает', '1pl': 'аем', '2pl': 'аете', '3pl': 'ают' } },
      { when: 'яю', forms: { '2sg': 'яешь', '3sg': 'яет', '1pl': 'яем', '2pl': 'яете', '3pl': 'яют' } },
      { when: 'ую', forms: { '2sg': 'уешь', '3sg': 'ует', '1pl': 'уем', '2pl': 'уете', '3pl': 'уют' } },
      { when: 'ою', forms: { '2sg': 'оешь', '3sg': 'оет', '1pl': 'оем', '2pl': 'оете', '3pl': 'оют' } },
      // A sibilant before -у/-ю marks the second conjugation: "вижу" → "видишь"
      // is curated, but "держу" → "держишь" is the rule.
      { when: 'жу', forms: { '2sg': 'жишь', '3sg': 'жит', '1pl': 'жим', '2pl': 'жите', '3pl': 'жат' }, because: 'second conjugation after a sibilant' },
      { when: 'чу', forms: { '2sg': 'чишь', '3sg': 'чит', '1pl': 'чим', '2pl': 'чите', '3pl': 'чат' }, because: 'second conjugation after a sibilant' },
      { when: 'шу', forms: { '2sg': 'шишь', '3sg': 'шит', '1pl': 'шим', '2pl': 'шите', '3pl': 'шат' }, because: 'second conjugation after a sibilant' },
      { when: 'щу', forms: { '2sg': 'щишь', '3sg': 'щит', '1pl': 'щим', '2pl': 'щите', '3pl': 'щат' }, because: 'second conjugation after a sibilant' },
      { when: 'лю', forms: { '2sg': 'ишь', '3sg': 'ит', '1pl': 'им', '2pl': 'ите', '3pl': 'ят' }, because: 'the l is the first person only: "люблю" → "любишь"' },
      { when: 'блю', forms: { '2sg': 'бишь', '3sg': 'бит', '1pl': 'бим', '2pl': 'бите', '3pl': 'бят' } },
      { when: 'ду', forms: { '2sg': 'дёшь', '3sg': 'дёт', '1pl': 'дём', '2pl': 'дёте', '3pl': 'дут' }, because: 'first conjugation on a consonant stem' },
      { when: 'ту', forms: { '2sg': 'тёшь', '3sg': 'тёт', '1pl': 'тём', '2pl': 'тёте', '3pl': 'тут' } },
      { when: 'ну', forms: { '2sg': 'нешь', '3sg': 'нет', '1pl': 'нем', '2pl': 'нете', '3pl': 'нут' } },
      { when: 'гу', forms: { '2sg': 'жешь', '3sg': 'жет', '1pl': 'жем', '2pl': 'жете', '3pl': 'гут' } },
    ],
  },
  uk: {
    rules: [
      { when: 'аю', forms: { '2sg': 'аєш', '3sg': 'ає', '1pl': 'аємо', '2pl': 'аєте', '3pl': 'ають' } },
      { when: 'яю', forms: { '2sg': 'яєш', '3sg': 'яє', '1pl': 'яємо', '2pl': 'яєте', '3pl': 'яють' } },
      { when: 'ую', forms: { '2sg': 'уєш', '3sg': 'ує', '1pl': 'уємо', '2pl': 'уєте', '3pl': 'ують' } },
      { when: 'юю', forms: { '2sg': 'юєш', '3sg': 'ює', '1pl': 'юємо', '2pl': 'юєте', '3pl': 'юють' } },
      { when: 'жу', forms: { '2sg': 'жиш', '3sg': 'жить', '1pl': 'жимо', '2pl': 'жите', '3pl': 'жать' }, because: 'second conjugation after a sibilant' },
      { when: 'чу', forms: { '2sg': 'чиш', '3sg': 'чить', '1pl': 'чимо', '2pl': 'чите', '3pl': 'чать' }, because: 'second conjugation after a sibilant' },
      { when: 'шу', forms: { '2sg': 'шиш', '3sg': 'шить', '1pl': 'шимо', '2pl': 'шите', '3pl': 'шать' }, because: 'second conjugation after a sibilant' },
      { when: 'лю', forms: { '2sg': 'иш', '3sg': 'ить', '1pl': 'имо', '2pl': 'ите', '3pl': 'лять' } },
      { when: 'ду', forms: { '2sg': 'деш', '3sg': 'де', '1pl': 'демо', '2pl': 'дете', '3pl': 'дуть' } },
      { when: 'ну', forms: { '2sg': 'неш', '3sg': 'не', '1pl': 'немо', '2pl': 'нете', '3pl': 'нуть' } },
    ],
  },
  be: {
    rules: [
      { when: 'аю', forms: { '2sg': 'аеш', '3sg': 'ае', '1pl': 'аем', '2pl': 'аеце', '3pl': 'аюць' } },
      { when: 'яю', forms: { '2sg': 'яеш', '3sg': 'яе', '1pl': 'яем', '2pl': 'яеце', '3pl': 'яюць' } },
      { when: 'ую', forms: { '2sg': 'уеш', '3sg': 'уе', '1pl': 'уем', '2pl': 'уеце', '3pl': 'уюць' } },
      { when: 'жу', forms: { '2sg': 'жыш', '3sg': 'жыць', '1pl': 'жым', '2pl': 'жыце', '3pl': 'жаць' } },
      { when: 'чу', forms: { '2sg': 'чыш', '3sg': 'чыць', '1pl': 'чым', '2pl': 'чыце', '3pl': 'чаць' } },
      { when: 'лю', forms: { '2sg': 'іш', '3sg': 'іць', '1pl': 'ім', '2pl': 'іце', '3pl': 'ляць' } },
      { when: 'ду', forms: { '2sg': 'дзеш', '3sg': 'дзе', '1pl': 'дзем', '2pl': 'дзеце', '3pl': 'дуць' } },
    ],
  },
  pl: {
    rules: [
      { when: 'am', forms: { '2sg': 'asz', '3sg': 'a', '1pl': 'amy', '2pl': 'acie', '3pl': 'ają' } },
      { when: 'em', forms: { '2sg': 'esz', '3sg': 'e', '1pl': 'emy', '2pl': 'ecie', '3pl': 'eją' } },
      // The -ę classes are ambiguous between the two conjugations, so only the
      // plural — which they share — is claimed here.
      { when: 'ję', forms: { '2sg': 'jesz', '3sg': 'je', '1pl': 'jemy', '2pl': 'jecie', '3pl': 'ją' } },
      { when: 'zę', forms: { '3pl': 'zą' } },
      { when: 'cę', forms: { '3pl': 'cą' } },
      { when: 'dę', forms: { '2sg': 'dziesz', '3sg': 'dzie', '1pl': 'dziemy', '2pl': 'dziecie', '3pl': 'dą' } },
    ],
  },
  cs: {
    rules: [
      { when: 'ám', forms: { '2sg': 'áš', '3sg': 'á', '1pl': 'áme', '2pl': 'áte', '3pl': 'ají' } },
      { when: 'ím', forms: { '2sg': 'íš', '3sg': 'í', '1pl': 'íme', '2pl': 'íte', '3pl': 'í' } },
      { when: 'ji', forms: { '2sg': 'ješ', '3sg': 'je', '1pl': 'jeme', '2pl': 'jete', '3pl': 'jí' } },
      { when: 'u', forms: { '2sg': 'eš', '3sg': 'e', '1pl': 'eme', '2pl': 'ete', '3pl': 'ou' } },
      { when: 'm', forms: { '2sg': 'š', '3sg': '', '1pl': 'me', '2pl': 'te', '3pl': 'jí' } },
    ],
  },
  sk: {
    rules: [
      { when: 'ám', forms: { '2sg': 'áš', '3sg': 'á', '1pl': 'áme', '2pl': 'áte', '3pl': 'ajú' } },
      { when: 'ím', forms: { '2sg': 'íš', '3sg': 'í', '1pl': 'íme', '2pl': 'íte', '3pl': 'ia' } },
      { when: 'em', forms: { '2sg': 'eš', '3sg': 'e', '1pl': 'eme', '2pl': 'ete', '3pl': 'ú' } },
      { when: 'am', forms: { '2sg': 'aš', '3sg': 'a', '1pl': 'ame', '2pl': 'ate', '3pl': 'ajú' } },
      { when: 'im', forms: { '2sg': 'iš', '3sg': 'i', '1pl': 'ime', '2pl': 'ite', '3pl': 'ia' } },
    ],
  },
  sr: {
    rules: [
      { when: 'ам', forms: { '2sg': 'аш', '3sg': 'а', '1pl': 'амо', '2pl': 'ате', '3pl': 'ају' } },
      { when: 'им', forms: { '2sg': 'иш', '3sg': 'и', '1pl': 'имо', '2pl': 'ите', '3pl': 'е' } },
      { when: 'ем', forms: { '2sg': 'еш', '3sg': 'е', '1pl': 'емо', '2pl': 'ете', '3pl': 'у' } },
    ],
  },
  hr: {
    rules: [
      { when: 'am', forms: { '2sg': 'aš', '3sg': 'a', '1pl': 'amo', '2pl': 'ate', '3pl': 'aju' } },
      { when: 'im', forms: { '2sg': 'iš', '3sg': 'i', '1pl': 'imo', '2pl': 'ite', '3pl': 'e' } },
      { when: 'em', forms: { '2sg': 'eš', '3sg': 'e', '1pl': 'emo', '2pl': 'ete', '3pl': 'u' } },
    ],
  },
  bs: {
    rules: [
      { when: 'am', forms: { '2sg': 'aš', '3sg': 'a', '1pl': 'amo', '2pl': 'ate', '3pl': 'aju' } },
      { when: 'im', forms: { '2sg': 'iš', '3sg': 'i', '1pl': 'imo', '2pl': 'ite', '3pl': 'e' } },
      { when: 'em', forms: { '2sg': 'eš', '3sg': 'e', '1pl': 'emo', '2pl': 'ete', '3pl': 'u' } },
    ],
  },
  cnr: {
    rules: [
      { when: 'am', forms: { '2sg': 'aš', '3sg': 'a', '1pl': 'amo', '2pl': 'ate', '3pl': 'aju' } },
      { when: 'im', forms: { '2sg': 'iš', '3sg': 'i', '1pl': 'imo', '2pl': 'ite', '3pl': 'e' } },
      { when: 'em', forms: { '2sg': 'eš', '3sg': 'e', '1pl': 'emo', '2pl': 'ete', '3pl': 'u' } },
    ],
  },
  sl: {
    rules: [
      { when: 'am', forms: { '2sg': 'aš', '3sg': 'a', '1pl': 'amo', '2pl': 'ate', '3pl': 'ajo' } },
      { when: 'im', forms: { '2sg': 'iš', '3sg': 'i', '1pl': 'imo', '2pl': 'ite', '3pl': 'ijo' } },
      { when: 'em', forms: { '2sg': 'eš', '3sg': 'e', '1pl': 'emo', '2pl': 'ete', '3pl': 'ejo' } },
    ],
  },
  lt: {
    rules: [
      { when: 'iu', forms: { '2sg': 'i', '3sg': 'ia', '1pl': 'iame', '2pl': 'iate', '3pl': 'ia' } },
      { when: 'au', forms: { '2sg': 'ai', '3sg': 'a', '1pl': 'ame', '2pl': 'ate', '3pl': 'a' } },
      { when: 'u', forms: { '2sg': 'i', '3sg': 'a', '1pl': 'ame', '2pl': 'ate', '3pl': 'a' } },
      { when: 'i', forms: { '2sg': 'i', '3sg': 'i', '1pl': 'ime', '2pl': 'ite', '3pl': 'i' } },
    ],
  },
  lv: {
    rules: [
      { when: 'ju', forms: { '2sg': 'ji', '3sg': 'j', '1pl': 'jam', '2pl': 'jat', '3pl': 'j' } },
      { when: 'os', forms: { '2sg': 'ies', '3sg': 'as', '1pl': 'amies', '2pl': 'aties', '3pl': 'as' } },
      { when: 'u', forms: { '2sg': 'i', '3sg': '', '1pl': 'am', '2pl': 'at', '3pl': '' } },
    ],
  },
}
