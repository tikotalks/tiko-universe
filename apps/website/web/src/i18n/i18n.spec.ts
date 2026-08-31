import { describe, expect, it } from 'vitest'
import { overlayCopy } from './resolve'
import { copyFor, localesWithCopy, overrides } from './index'
import { en } from './copy/en'
import { translatedLocales } from './locale'
import { tikoLocaleEntries } from '@tiko/i18n'

/**
 * Every leaf English has that the override does not, as dotted paths. Arrays
 * are compared as a unit because a locale replaces them wholesale.
 */
function missingKeys(base: unknown, override: unknown, path = ''): string[] {
  if (typeof base === 'string') return override === undefined ? [path] : []
  if (Array.isArray(base)) {
    if (!Array.isArray(override)) return [path]
    if (override.length !== base.length) return [`${path}[length]`]
    return base.flatMap((item, i) => missingKeys(item, override[i], `${path}[${i}]`))
  }
  if (base && typeof base === 'object') {
    if (!override || typeof override !== 'object') return [path]
    return Object.entries(base as Record<string, unknown>).flatMap(([key, value]) =>
      missingKeys(value, (override as Record<string, unknown>)[key], path ? `${path}.${key}` : key),
    )
  }
  return []
}

/**
 * Leaves a locale is not expected to own: an email address, a code sample, and
 * the brand's own name. `overlayCopy` keeps the English value for these, which
 * is the right answer rather than a gap.
 */
const UNTRANSLATED = [
  /^privacy\.supportEmail$/,
  /^docs\.pages\.[^.]+\.sections\[\d+\]\.code$/,
  /^appDetail\.hero\.brandPrefix$/,
]

describe('website copy resolution', () => {
  it('falls back to English leaf by leaf rather than whole-object', () => {
    const base = { a: 'A', nested: { x: 'X', y: 'Y' } }
    const merged = overlayCopy(base, { nested: { y: 'Ypsilon' } })
    // The untranslated sibling survives; only `y` is replaced.
    expect(merged).toEqual({ a: 'A', nested: { x: 'X', y: 'Ypsilon' } })
  })

  it('replaces arrays wholesale instead of zipping them by index', () => {
    const base = { items: [{ t: 'one' }, { t: 'two' }] }
    const merged = overlayCopy(base, { items: [{ t: 'een' }] })
    // Zipping by index would leave a half-English list if lengths ever drift.
    expect(merged.items).toEqual([{ t: 'een' }])
  })

  it('treats an empty string as untranslated rather than blanking the page', () => {
    expect(overlayCopy({ a: 'A' }, { a: '' })).toEqual({ a: 'A' })
    expect(overlayCopy({ a: 'A' }, { a: '   ' })).toEqual({ a: 'A' })
  })

  it('leaves English untouched when a locale has no override at all', () => {
    expect(copyFor('en')).toBe(copyFor('en'))
    expect(copyFor('en').common.learnMore).toBe(en.common.learnMore)
  })

  it('never returns an undefined string for any locale', () => {
    // The whole point of the fallback: a page must never render "undefined".
    for (const locale of [...translatedLocales, 'ja', 'ar', 'not-a-locale']) {
      const copy = copyFor(locale)
      expect(copy.common.learnMore, locale).toBeTruthy()
      expect(copy.nav.whyTiko, locale).toBeTruthy()
      for (const page of Object.values(copy.pages)) {
        expect(page.title, `${locale} page title`).toBeTruthy()
        expect(page.lede, `${locale} page lede`).toBeTruthy()
        expect(page.sections.length, `${locale} sections`).toBeGreaterThan(0)
        for (const section of page.sections) {
          expect(section.id, `${locale} section id`).toBeTruthy()
          expect(section.title, `${locale} section title`).toBeTruthy()
        }
      }
    }
  })

  it('translates the chrome for every locale it claims to support', () => {
    for (const locale of translatedLocales) {
      if (locale === 'en') continue
      const copy = copyFor(locale)
      // If these still match English the locale file is not wired up.
      expect(copy.nav.whyTiko, locale).not.toBe(en.nav.whyTiko)
      expect(copy.common.learnMore, locale).not.toBe(en.common.learnMore)
      expect(copy.footer.tagline, locale).not.toBe(en.footer.tagline)
    }
  })

  it('translates the whole bundle for every locale the picker offers', () => {
    // The bug this guards: the picker offered nine languages while seven of
    // them translated only `common`, `nav` and `footer`, so switching language
    // changed the menu and nothing else.
    //
    // Measured by key coverage, not by comparing values: "Support" and "App
    // Store" are the same word in Dutch, and asserting the text differs would
    // flag a correct translation as a missing one.
    for (const locale of translatedLocales) {
      if (locale === 'en') continue
      const override = overrides[locale] as Record<string, unknown> | undefined
      expect(override, `${locale} has a copy file`).toBeDefined()
      const missing = missingKeys(en, override).filter(
        (path) => !UNTRANSLATED.some((pattern) => pattern.test(path)),
      )
      expect(missing, `${locale} is missing copy`).toEqual([])
    }
  })

  it('keeps app slugs and doc ids identical across locales', () => {
    // These are addresses, not prose. A translated key would silently fall back
    // to English for that app or doc page instead of failing loudly.
    for (const locale of translatedLocales) {
      const copy = copyFor(locale)
      expect(Object.keys(copy.apps).sort(), `${locale} apps`).toEqual(Object.keys(en.apps).sort())
      expect(Object.keys(copy.docs.pages).sort(), `${locale} docs`).toEqual(
        Object.keys(en.docs.pages).sort(),
      )
    }
  })

  it('keeps the privacy policy anchors identical across locales', () => {
    const ids = en.privacy.sections.map((section) => section.id)
    for (const locale of translatedLocales) {
      expect(copyFor(locale).privacy.sections.map((section) => section.id), locale).toEqual(ids)
    }
  })

  it('keeps section ids identical across locales so anchors survive translation', () => {
    // Ids are anchors, not prose. A translated id would break every deep link.
    const englishIds = Object.fromEntries(
      Object.entries(en.pages).map(([name, page]) => [name, page.sections.map((s) => s.id)]),
    )
    for (const locale of translatedLocales) {
      const copy = copyFor(locale)
      for (const [name, page] of Object.entries(copy.pages)) {
        expect(page.sections.map((s) => s.id), `${locale}/${name}`).toEqual(englishIds[name])
      }
    }
  })

  it('only claims locales the shared registry actually knows about', () => {
    const known = new Set(tikoLocaleEntries.map((entry) => entry.code))
    for (const locale of localesWithCopy) {
      expect(known.has(locale), `${locale} is in the Tiko locale registry`).toBe(true)
    }
  })

  it('keeps section ids unique within a page so anchors do not collide', () => {
    for (const page of Object.values(en.pages)) {
      const ids = page.sections.map((section) => section.id)
      expect(new Set(ids).size, page.documentTitle).toBe(ids.length)
    }
  })

  it('gives every page a document title and description for search results', () => {
    for (const page of Object.values(en.pages)) {
      expect(page.documentTitle.length).toBeGreaterThan(3)
      expect(page.description.length).toBeGreaterThan(40)
    }
  })
})
