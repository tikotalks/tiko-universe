import { describe, expect, it } from 'vitest'
import { overlayCopy } from './resolve'
import { copyFor, localesWithCopy } from './index'
import { en } from './copy/en'
import { translatedLocales } from './locale'
import { tikoLocaleEntries } from '@tiko/i18n'

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
