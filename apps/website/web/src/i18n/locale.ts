import { computed, ref, watch, type Ref } from 'vue'
import {
  defaultLanguage,
  normalizeTikoLanguage,
  tikoLocaleEntries,
  type TikoLocaleEntry,
} from '@tiko/i18n'

/**
 * The website's current language.
 *
 * Deliberately built on `@tiko/i18n`'s locale registry rather than a list of
 * its own: the registry is generated from `tools/locales.mjs` alongside its
 * Swift counterpart, so the site, the web apps and iOS cannot disagree about
 * which languages exist, what they are called, or which are right-to-left.
 *
 * The stored key is the same `tiko.language` the apps and iOS use, so a
 * caregiver who picks Dutch in an app finds the site in Dutch too.
 */
export const LOCALE_STORAGE_KEY = 'tiko.language'

/** Locales the marketing copy has actually been written in. */
export const translatedLocales = ['en', 'nl', 'de', 'fr', 'es', 'pt', 'it', 'mt', 'hy'] as const
export type TranslatedLocale = (typeof translatedLocales)[number]

function safeStorage(op: 'get', key: string): string | null
function safeStorage(op: 'set', key: string, value: string): void
function safeStorage(op: 'get' | 'set', key: string, value?: string): string | null | void {
  try {
    if (op === 'get') return localStorage.getItem(key)
    localStorage.setItem(key, value!)
  } catch {
    // Private browsing, or storage disabled. A language preference is not worth
    // breaking the page over.
    return op === 'get' ? null : undefined
  }
}

/** The browser's preferred language, if the site has copy for it. */
function preferredFromBrowser(): string | null {
  if (typeof navigator === 'undefined') return null
  const candidates = navigator.languages?.length ? navigator.languages : [navigator.language]
  for (const tag of candidates) {
    if (!tag) continue
    // `en-GB` and `pt-BR` should both find their base locale.
    const base = tag.toLowerCase().split('-')[0]
    if (translatedLocales.includes(base as TranslatedLocale)) return base
  }
  return null
}

function initialLocale(): string {
  const stored = safeStorage('get', LOCALE_STORAGE_KEY)
  // An explicit choice always wins over the browser's guess.
  if (stored) return normalizeTikoLanguage(stored)
  return preferredFromBrowser() ?? defaultLanguage
}

/** The active language. Module-level, so every page reads the same value. */
export const activeLocale: Ref<string> = ref(initialLocale())

export function setLocale(code: string): void {
  const next = normalizeTikoLanguage(code)
  activeLocale.value = next
  safeStorage('set', LOCALE_STORAGE_KEY, next)
}

const entryByCode = new Map(tikoLocaleEntries.map((entry) => [entry.code, entry]))

export function localeEntry(code: string): TikoLocaleEntry | undefined {
  return entryByCode.get(code)
}

/** What the language picker offers: translated locales first, then the rest. */
export const localeOptions = computed<TikoLocaleEntry[]>(() => {
  const translated: TikoLocaleEntry[] = []
  for (const code of translatedLocales) {
    const entry = entryByCode.get(code)
    if (entry) translated.push(entry)
  }
  return translated
})

/** True when the site has written copy for this locale rather than falling back. */
export function isTranslated(code: string): boolean {
  return translatedLocales.includes(code as TranslatedLocale)
}

/**
 * Keep `<html lang>` and `<html dir>` in step with the active language.
 *
 * `lang` matters for screen-reader pronunciation and for the browser's own
 * translation prompt; `dir` comes from the registry so a right-to-left locale
 * lays out correctly without the site keeping its own list.
 */
export function useLocaleDocumentEffect(
  documentTarget: Document | undefined = typeof document === 'undefined' ? undefined : document,
): void {
  const apply = (code: string) => {
    const root = documentTarget?.documentElement
    if (!root) return
    root.setAttribute('lang', code)
    root.setAttribute('dir', localeEntry(code)?.rtl ? 'rtl' : 'ltr')
  }
  apply(activeLocale.value)
  watch(activeLocale, apply)
}
