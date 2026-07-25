import { describe, expect, it, vi } from 'vitest'
import { computed } from '@vue/reactivity'
import {
  defaultLanguage,
  generatedBundles,
  tikoLanguageOptions,
  tikoLanguages,
  tikoAppKeys,
  tikoI18nKeys,
  createI18n,
  createLezuTranslationLoader,
  createTikoIdentityLabels,
  createTikoShellLabels,
  createTranslationBundle,
  normalizeTikoLanguage,
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

  it('normalizes persisted language values through one shared helper', () => {
    expect(normalizeTikoLanguage('mt')).toBe('mt')
    expect(normalizeTikoLanguage('not-supported')).toBe(defaultLanguage)
    expect(normalizeTikoLanguage(undefined)).toBe(defaultLanguage)
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

  it('invalidates Vue computed translations when the language changes', () => {
    const i18n = createI18n({ app: 'yes-no', language: 'en' })
    const label = computed(() => i18n.t(tikoI18nKeys.yesNo.answers.yes))

    expect(label.value).toBe('Yes')
    expect(i18n._revision.value).toBe(0)

    i18n.setLanguage('nl')

    expect(i18n._revision.value).toBe(1)
    expect(label.value).toBe('Ja')
  })

  it('invalidates Vue computed translations when runtime bundles are added', () => {
    const i18n = createI18n({ app: 'yes-no', language: 'hy' })
    const label = computed(() => i18n.t(tikoI18nKeys.yesNo.answers.yes))

    expect(label.value).toBe('Yes')

    i18n.addBundle(createTranslationBundle({
      app: 'yes-no',
      language: 'hy',
      source: 'runtime',
      translations: {
        [tikoI18nKeys.yesNo.answers.yes]: 'Iva',
      },
    }))

    expect(i18n._revision.value).toBe(1)
    expect(label.value).toBe('Iva')
  })

  it('keeps Maltese fallback coverage for current non-Talk app UI keys', () => {
    const cases: Array<{ app: TikoAppKey, key: string, english: string }> = [
      { app: 'type', key: tikoI18nKeys.type.compose.placeholder, english: 'Type what you want to say' },
      { app: 'timer', key: tikoI18nKeys.timer.controls.start, english: 'Start' },
      { app: 'radio', key: tikoI18nKeys.radio.player.noTracks, english: 'No tracks loaded' },
      { app: 'cards', key: tikoI18nKeys.cards.collections.empty, english: 'No collections yet.' },
      { app: 'sequence', key: tikoI18nKeys.sequence.empty.title, english: 'No sequences yet' },
      { app: 'todo', key: tikoI18nKeys.todo.empty.title, english: 'No items yet' },
    ]

    for (const testCase of cases) {
      const i18n = createI18n({ app: testCase.app, language: 'mt' })

      expect(i18n.t(testCase.key)).not.toBe(testCase.english)
      expect(i18n.t(testCase.key)).not.toBe(testCase.key)
    }
  })

  it('exposes localized shared shell and PIN accessibility labels', () => {
    const i18n = createI18n({ app: 'cards', language: 'mt' })
    const shell = createTikoShellLabels(i18n.t)
    const identity = createTikoIdentityLabels(i18n.t)

    expect(shell).toMatchObject({
      account: 'Kont',
      back: 'Lura',
      deselect: 'Neħħi l-għażla',
      edit: 'Editja',
      openIcons: 'Iftaħ l-ikoni',
      select: 'Agħżel',
    })
    expect(identity.pin.digitLabel).toBe('Ċifra {index} minn {total}')
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

describe('the generated locale registry', () => {
  it('offers every language the Talk realizer understands', () => {
    // 52 locales, all of them with grammar: the picker and the realizer agreed on
    // nothing at all before this was generated from one list.
    expect(tikoLanguages.length).toBe(52)
    expect(tikoLanguageOptions.every((option) => option.talk)).toBe(true)
  })

  it('names every language in its own language', () => {
    for (const option of tikoLanguageOptions) {
      expect(option.nativeLabel.length, `${option.value} has no native name`).toBeGreaterThan(0)
      expect(option.label.length, `${option.value} has no English name`).toBeGreaterThan(0)
    }
  })

  it('marks Arabic as right to left, and nothing else here', () => {
    const rtl = tikoLanguageOptions.filter((option) => option.rtl).map((option) => option.value)
    expect(rtl).toEqual(['ar'])
  })

  it('ships interface strings for every locale it offers', () => {
    for (const [app, byLocale] of Object.entries(generatedBundles)) {
      const locales = Object.keys(byLocale)
      // English is the source and lives in the app itself, so it is not generated.
      expect(locales.length, `${app} has bundles for only ${locales.length} locales`).toBe(51)
      for (const [locale, strings] of Object.entries(byLocale)) {
        expect(Object.keys(strings).length, `${app}/${locale} is empty`).toBeGreaterThan(0)
      }
    }
  })

  it('translates the strings a parent meets on every screen', () => {
    // A spot check in three scripts: if these resolve, the pipeline is wired.
    expect(generatedBundles.timer.lv['timer.controls.reset']).toBe('Atiestatīt')
    expect(generatedBundles.timer.el['timer.controls.start']).toBe('Έναρξη')
    expect(generatedBundles.timer.ka['timer.controls.pause']).toBe('პაუზა')
  })

  it('normalises an unknown language to English', () => {
    expect(normalizeTikoLanguage('kl')).toBe('en')
    expect(normalizeTikoLanguage(null)).toBe('en')
    // …but keeps one it does know, including the three-letter codes.
    expect(normalizeTikoLanguage('pap')).toBe('pap')
    expect(normalizeTikoLanguage('cnr')).toBe('cnr')
  })
})
