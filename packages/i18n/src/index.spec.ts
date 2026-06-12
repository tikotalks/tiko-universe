import { describe, expect, it, vi } from 'vitest'
import {
  defaultLanguage,
  tikoAppKeys,
  tikoI18nKeys,
  createI18n,
  createLezuTranslationLoader,
  createTranslationBundle,
  type TikoAppKey,
  type TikoLanguage,
} from './index'

describe('@tiko/i18n fallback contract', () => {
  it('loads initial typed Yes No and Type keys from the local English fallback bundle', () => {
    const i18n = createI18n({ app: 'yes-no', language: defaultLanguage })

    expect(tikoAppKeys).toEqual(['yes-no', 'type', 'timer', 'radio', 'cards', 'sequence', 'todo', 'talk'])
    expect(tikoI18nKeys.yesNo.answers.yes).toBe('yesNo.answers.yes')
    expect(i18n.t(tikoI18nKeys.yesNo.appName)).toBe('Yes No')
    expect(i18n.t(tikoI18nKeys.yesNo.answers.yes)).toBe('Yes')
    expect(i18n.t(tikoI18nKeys.yesNo.answers.no)).toBe('No')
    expect(i18n.t(tikoI18nKeys.yesNo.latestAnswer)).toBe('Latest answer')

    const typeI18n = createI18n({ app: 'type', language: 'en' })
    expect(typeI18n.t(tikoI18nKeys.type.appName)).toBe('Type')
    expect(typeI18n.t(tikoI18nKeys.type.compose.placeholder)).toBe('Type what you want to say')

    const talkI18n = createI18n({ app: 'talk', language: 'en' })
    expect(talkI18n.t(tikoI18nKeys.talk.appName)).toBe('Talk')
    expect(talkI18n.t(tikoI18nKeys.talk.sentence.placeholder)).toBe('Build a sentence')
    expect(talkI18n.t(tikoI18nKeys.talk.status.offline)).toBe('Offline words active')
  })

  it('merges partial runtime bundles over local selected-language fallbacks and keeps track of missing keys', () => {
    const i18n = createI18n({
      app: 'yes-no',
      language: 'nl',
      bundles: [createTranslationBundle({
        app: 'yes-no',
        language: 'nl',
        translations: {
          [tikoI18nKeys.yesNo.answers.yes]: 'Ja',
        },
      })],
    })

    expect(i18n.t(tikoI18nKeys.yesNo.answers.yes)).toBe('Ja')
    expect(i18n.t(tikoI18nKeys.yesNo.answers.no)).toBe('Nee')
    expect(i18n.t('yesNo.missing.futureKey')).toBe('yesNo.missing.futureKey')
    expect(i18n.missingKeys()).toEqual(['nl:yesNo.missing.futureKey'])
  })

  it('switches language without rebuilding consumers and applies parameter interpolation', () => {
    const i18n = createI18n({ app: 'yes-no', language: 'en' })

    expect(i18n.t(tikoI18nKeys.yesNo.status.answerCount, { count: 2 })).toBe('2 answers')

    i18n.setLanguage('fr')

    expect(i18n.language.value).toBe('fr')
    expect(i18n.t(tikoI18nKeys.yesNo.answers.yes)).toBe('Oui')
    expect(i18n.t(tikoI18nKeys.yesNo.status.answerCount, { count: 2 })).toBe('2 réponses')
  })

  it('exposes typed app and language contracts for web, iOS, Android, and Lezu callers', () => {
    const app: TikoAppKey = 'type'
    const language: TikoLanguage = 'hy'

    expect(app).toBe('type')
    expect(language).toBe('hy')
  })

  it('wraps a Lezu-backed fetcher behind the same bundle shape without owning translation management', async () => {
    const fetcher = vi.fn(async () => ({
      translations: {
        [tikoI18nKeys.yesNo.answers.yes]: 'Ja',
      },
    }))
    const loadFromLezu = createLezuTranslationLoader({ fetcher, projectId: 'project-test' })

    const bundle = await loadFromLezu({ app: 'yes-no', language: 'nl' })

    expect(fetcher).toHaveBeenCalledWith({ app: 'yes-no', language: 'nl', projectId: 'project-test' })
    expect(bundle).toEqual(createTranslationBundle({
      app: 'yes-no',
      language: 'nl',
      source: 'lezu',
      translations: {
        [tikoI18nKeys.yesNo.answers.yes]: 'Ja',
      },
    }))
  })
})
