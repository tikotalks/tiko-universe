/**
 * The shape of the locale registry. The list itself is generated from
 * `tools/locales.mjs` into `locales.generated.ts`, so the web and iOS pickers
 * cannot disagree about which languages exist.
 */
export type TikoLocale = string

/** How complete a locale's interface translation is. */
export type TikoInterfaceCoverage = 'full' | 'core' | 'none'

export interface TikoLocaleEntry {
  /** What the app stores in `tiko.language` and sends to the APIs. */
  readonly code: TikoLocale
  /** English name, for a parent reading the list in English. */
  readonly name: string
  /** What speakers call it — what the picker shows first. */
  readonly native: string
  /** Written right to left. */
  readonly rtl?: boolean
  /**
   * The Talk realizer has grammar for this language, so a child's tiles become a
   * sentence rather than a list of words.
   */
  readonly talk: boolean
  /**
   * `full` for the languages Tiko shipped with, `core` for the shared interface
   * vocabulary, `none` where the interface still falls back to English.
   */
  readonly ui: TikoInterfaceCoverage
}
