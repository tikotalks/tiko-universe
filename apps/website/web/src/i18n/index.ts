import { computed, type ComputedRef } from 'vue'
import { en, type SiteCopy } from './copy/en'
import { overlayCopy, type DeepPartial } from './resolve'
import { activeLocale } from './locale'

/**
 * Locale overrides.
 *
 * Loaded eagerly rather than lazily: the whole site's copy for one locale is a
 * few kilobytes gzipped, and a marketing page that renders in English and then
 * flips to Dutch a moment later reads as a bug. Vite tree-shakes what a build
 * never references, and there are only a handful of locales here.
 */
import { nl } from './copy/nl'
import { de } from './copy/de'
import { fr } from './copy/fr'
import { es } from './copy/es'
import { pt } from './copy/pt'
import { it } from './copy/it'
import { mt } from './copy/mt'
import { hy } from './copy/hy'

export type SiteCopyOverride = DeepPartial<SiteCopy>

const overrides: Record<string, SiteCopyOverride> = { nl, de, fr, es, pt, it, mt, hy }

/**
 * The English base, widened. `en` itself is `as const`, which keeps its keys
 * exact but also pins every value to a literal type; overlaying a translation
 * onto that would be a type error by construction.
 */
const base: SiteCopy = en

/** Copy for a specific locale, with English filling every untranslated leaf. */
export function copyFor(locale: string): SiteCopy {
  if (locale === 'en') return base
  return overlayCopy(base, overrides[locale])
}

/** The active locale's copy. Recomputes when the language changes. */
export function useCopy(): ComputedRef<SiteCopy> {
  return computed(() => copyFor(activeLocale.value))
}

/** Locales that have an override file, for tests and coverage reporting. */
export const localesWithCopy = ['en', ...Object.keys(overrides)]

export { activeLocale, setLocale, isTranslated, localeOptions, localeEntry, useLocaleDocumentEffect, translatedLocales, LOCALE_STORAGE_KEY } from './locale'
export type { SiteCopy } from './copy/en'
export type { ContentPage, ContentSection, ContentPoint, ContentStep, ContentQuestion } from './content.model'
