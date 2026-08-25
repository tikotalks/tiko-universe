/**
 * Types for `tools/locales.mjs`, so TypeScript callers (the sentence-pack test,
 * the generators) see the shape of the list rather than `any`.
 */
export interface TikoLocaleEntry {
  /** Locale stored in `tiko.language` and sent to the APIs. */
  code: string
  /** English name. */
  name: string
  /** What speakers call it, which is what the picker shows first. */
  native: string
  /** Written right to left. */
  rtl?: boolean
  /** The Talk realizer has grammar for it. */
  talk?: boolean
  /** How complete the interface translation is. */
  ui?: 'full' | 'core' | 'none'
}

export declare const locales: TikoLocaleEntry[]
export declare const fallbackLocale: string
export declare const localeCodes: string[]
