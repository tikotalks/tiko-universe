export const defaultLanguage = 'en' as const

export const tikoLanguages = [
  'en',
  'de',
  'es',
  'fr',
  'nl',
  'pt',
  'ja',
  'zh',
  'ko',
  'mt',
  'it',
  'ar',
  'hy',
] as const

export type TikoLanguage = typeof tikoLanguages[number]

export const tikoAppKeys = ['yes-no', 'type', 'timer'] as const

export type TikoAppKey = typeof tikoAppKeys[number]

export type TranslationParams = Record<string, string | number | boolean | null | undefined>
export type TranslationMap = Record<string, string>
export type TranslationSource = 'local' | 'lezu' | 'runtime'

export interface TranslationBundle<App extends TikoAppKey = TikoAppKey, Language extends TikoLanguage = TikoLanguage> {
  app: App
  language: Language
  source: TranslationSource
  translations: TranslationMap
}

export interface CreateTranslationBundleOptions<App extends TikoAppKey, Language extends TikoLanguage> {
  app: App
  language: Language
  source?: TranslationSource
  translations: TranslationMap
}

export interface TranslationLoaderRequest {
  app: TikoAppKey
  language: TikoLanguage
}

export type TranslationLoader = (request: TranslationLoaderRequest) => Promise<TranslationBundle>

export interface LezuTranslationRequest extends TranslationLoaderRequest {
  projectId: string
}

export interface LezuTranslationResponse {
  translations: TranslationMap
}

export type LezuTranslationFetcher = (request: LezuTranslationRequest) => Promise<LezuTranslationResponse>

export interface CreateLezuTranslationLoaderOptions {
  projectId: string
  fetcher: LezuTranslationFetcher
}

export interface CreateI18nOptions {
  app: TikoAppKey
  language?: TikoLanguage
  fallbackLanguage?: TikoLanguage
  bundles?: TranslationBundle[]
}

export interface TikoI18n {
  readonly app: TikoAppKey
  readonly fallbackLanguage: TikoLanguage
  readonly language: { readonly value: TikoLanguage }
  t: (key: string, params?: TranslationParams) => string
  setLanguage: (language: TikoLanguage) => void
  addBundle: (bundle: TranslationBundle) => void
  missingKeys: () => string[]
}

export const tikoI18nKeys = {
  yesNo: {
    appName: 'yesNo.appName',
    sentence: {
      label: 'yesNo.sentence.label',
      default: 'yesNo.sentence.default',
      reset: 'yesNo.sentence.reset',
      speak: 'yesNo.sentence.speak',
    },
    answers: {
      yes: 'yesNo.answers.yes',
      no: 'yesNo.answers.no',
    },
    history: {
      label: 'yesNo.history.label',
      title: 'yesNo.history.title',
      empty: 'yesNo.history.empty',
    },
    latestAnswer: 'yesNo.latestAnswer',
    status: {
      answerCount: 'yesNo.status.answerCount',
      browserVoiceFallback: 'yesNo.status.browserVoiceFallback',
      speechError: 'yesNo.status.speechError',
    },
  },
  type: {
    appName: 'type.appName',
    compose: {
      label: 'type.compose.label',
      placeholder: 'type.compose.placeholder',
      speak: 'type.compose.speak',
      clear: 'type.compose.clear',
    },
    phrases: {
      title: 'type.phrases.title',
      empty: 'type.phrases.empty',
    },
    status: {
      browserVoiceFallback: 'type.status.browserVoiceFallback',
      speechError: 'type.status.speechError',
    },
  },
  timer: {
    appName: 'timer.appName',
    display: {
      expired: 'timer.display.expired',
    },
    controls: {
      start: 'timer.controls.start',
      pause: 'timer.controls.pause',
      resume: 'timer.controls.resume',
      reset: 'timer.controls.reset',
    },
    presets: {
      label: 'timer.presets.label',
      oneMin: 'timer.presets.oneMin',
      threeMin: 'timer.presets.threeMin',
      fiveMin: 'timer.presets.fiveMin',
      tenMin: 'timer.presets.tenMin',
      custom: 'timer.presets.custom',
    },
    settings: {
      minutes: 'timer.settings.minutes',
      seconds: 'timer.settings.seconds',
    },
  },
} as const

const yesNoEnglish: TranslationMap = {
  [tikoI18nKeys.yesNo.appName]: 'Yes No',
  [tikoI18nKeys.yesNo.sentence.label]: 'Sentence to speak',
  [tikoI18nKeys.yesNo.sentence.default]: 'Do you want to go eat?',
  [tikoI18nKeys.yesNo.sentence.reset]: 'Reset',
  [tikoI18nKeys.yesNo.sentence.speak]: 'Speak sentence',
  [tikoI18nKeys.yesNo.answers.yes]: 'Yes',
  [tikoI18nKeys.yesNo.answers.no]: 'No',
  [tikoI18nKeys.yesNo.history.label]: 'Answer history',
  [tikoI18nKeys.yesNo.history.title]: 'History',
  [tikoI18nKeys.yesNo.history.empty]: 'No answers yet.',
  [tikoI18nKeys.yesNo.latestAnswer]: 'Latest answer',
  [tikoI18nKeys.yesNo.status.answerCount]: '{count} answers',
  [tikoI18nKeys.yesNo.status.browserVoiceFallback]: 'Browser voice used',
  [tikoI18nKeys.yesNo.status.speechError]: 'Could not speak yet. Try again.',
}

const yesNoFrench: TranslationMap = {
  [tikoI18nKeys.yesNo.answers.yes]: 'Oui',
  [tikoI18nKeys.yesNo.answers.no]: 'Non',
  [tikoI18nKeys.yesNo.latestAnswer]: 'Dernière réponse',
  [tikoI18nKeys.yesNo.status.answerCount]: '{count} réponses',
  [tikoI18nKeys.yesNo.status.browserVoiceFallback]: 'Voix du navigateur utilisée',
}

const yesNoDutch: TranslationMap = {
  [tikoI18nKeys.yesNo.answers.yes]: 'Ja',
  [tikoI18nKeys.yesNo.answers.no]: 'Nee',
  [tikoI18nKeys.yesNo.latestAnswer]: 'Laatste antwoord',
  [tikoI18nKeys.yesNo.status.browserVoiceFallback]: 'Browser voice used',
}

const yesNoSpanish: TranslationMap = {
  [tikoI18nKeys.yesNo.answers.yes]: 'Sí',
  [tikoI18nKeys.yesNo.answers.no]: 'No',
  [tikoI18nKeys.yesNo.latestAnswer]: 'Última respuesta',
  [tikoI18nKeys.yesNo.status.browserVoiceFallback]: 'Voz del navegador usada',
}

const typeEnglish: TranslationMap = {
  [tikoI18nKeys.type.appName]: 'Type',
  [tikoI18nKeys.type.compose.label]: 'Message to speak',
  [tikoI18nKeys.type.compose.placeholder]: 'Type what you want to say',
  [tikoI18nKeys.type.compose.speak]: 'Speak',
  [tikoI18nKeys.type.compose.clear]: 'Clear',
  [tikoI18nKeys.type.phrases.title]: 'Saved phrases',
  [tikoI18nKeys.type.phrases.empty]: 'No saved phrases yet.',
  [tikoI18nKeys.type.status.browserVoiceFallback]: 'Browser voice used',
  [tikoI18nKeys.type.status.speechError]: 'Could not speak yet. Try again.',
}

const timerEnglish: TranslationMap = {
  [tikoI18nKeys.timer.appName]: 'Timer',
  [tikoI18nKeys.timer.display.expired]: 'Time is up!',
  [tikoI18nKeys.timer.controls.start]: 'Start',
  [tikoI18nKeys.timer.controls.pause]: 'Pause',
  [tikoI18nKeys.timer.controls.resume]: 'Resume',
  [tikoI18nKeys.timer.controls.reset]: 'Reset',
  [tikoI18nKeys.timer.presets.label]: 'Quick presets',
  [tikoI18nKeys.timer.presets.oneMin]: '1 min',
  [tikoI18nKeys.timer.presets.threeMin]: '3 min',
  [tikoI18nKeys.timer.presets.fiveMin]: '5 min',
  [tikoI18nKeys.timer.presets.tenMin]: '10 min',
  [tikoI18nKeys.timer.presets.custom]: 'Custom',
  [tikoI18nKeys.timer.settings.minutes]: 'Minutes',
  [tikoI18nKeys.timer.settings.seconds]: 'Seconds',
}

const localTranslationBundles = [
  createTranslationBundle({ app: 'yes-no', language: 'en', translations: yesNoEnglish }),
  createTranslationBundle({ app: 'yes-no', language: 'fr', translations: yesNoFrench }),
  createTranslationBundle({ app: 'yes-no', language: 'nl', translations: yesNoDutch }),
  createTranslationBundle({ app: 'yes-no', language: 'es', translations: yesNoSpanish }),
  createTranslationBundle({ app: 'type', language: 'en', translations: typeEnglish }),
  createTranslationBundle({ app: 'timer', language: 'en', translations: timerEnglish }),
]

export function createTranslationBundle<App extends TikoAppKey, Language extends TikoLanguage>(
  options: CreateTranslationBundleOptions<App, Language>,
): TranslationBundle<App, Language> {
  return {
    app: options.app,
    language: options.language,
    source: options.source ?? 'local',
    translations: { ...options.translations },
  }
}

export function getLocalTranslationBundle(request: TranslationLoaderRequest): TranslationBundle | undefined {
  const bundle = localTranslationBundles.find((candidate) => (
    candidate.app === request.app && candidate.language === request.language
  ))

  return bundle ? cloneBundle(bundle) : undefined
}

export function listLocalTranslationBundles(app?: TikoAppKey): TranslationBundle[] {
  return localTranslationBundles
    .filter((bundle) => !app || bundle.app === app)
    .map(cloneBundle)
}

export function createLocalTranslationLoader(): TranslationLoader {
  return async (request) => {
    const bundle = getLocalTranslationBundle(request)
    if (!bundle) {
      return createTranslationBundle({
        app: request.app,
        language: request.language,
        translations: {},
      })
    }

    return bundle
  }
}

export function createLezuTranslationLoader(options: CreateLezuTranslationLoaderOptions): TranslationLoader {
  return async (request) => {
    const response = await options.fetcher({ ...request, projectId: options.projectId })

    return createTranslationBundle({
      app: request.app,
      language: request.language,
      source: 'lezu',
      translations: response.translations,
    })
  }
}

export function createI18n(options: CreateI18nOptions): TikoI18n {
  let currentLanguage = options.language ?? defaultLanguage
  const fallbackLanguage = options.fallbackLanguage ?? defaultLanguage
  const missing = new Set<string>()
  const bundles = new Map<string, TranslationBundle>()

  for (const bundle of listLocalTranslationBundles(options.app)) {
    bundles.set(bundleKey(bundle.app, bundle.language), bundle)
  }

  for (const bundle of options.bundles ?? []) {
    bundles.set(bundleKey(bundle.app, bundle.language), cloneBundle(bundle))
  }

  const state = {
    app: options.app,
    fallbackLanguage,
    language: {
      get value() {
        return currentLanguage
      },
    },
    t(key: string, params?: TranslationParams): string {
      const text = resolveTranslation(bundles, options.app, currentLanguage, fallbackLanguage, key)

      if (text === undefined) {
        missing.add(key)
        return key
      }

      return interpolate(text, params)
    },
    setLanguage(language: TikoLanguage) {
      currentLanguage = language
    },
    addBundle(bundle: TranslationBundle) {
      bundles.set(bundleKey(bundle.app, bundle.language), cloneBundle(bundle))
    },
    missingKeys() {
      return Array.from(missing)
    },
  } satisfies TikoI18n

  return state
}

function resolveTranslation(
  bundles: Map<string, TranslationBundle>,
  app: TikoAppKey,
  language: TikoLanguage,
  fallbackLanguage: TikoLanguage,
  key: string,
): string | undefined {
  const selected = bundles.get(bundleKey(app, language))?.translations[key]
  if (selected !== undefined) return selected

  return bundles.get(bundleKey(app, fallbackLanguage))?.translations[key]
}

function interpolate(text: string, params: TranslationParams = {}): string {
  return text.replace(/\{([A-Za-z0-9_.-]+)\}/g, (match, paramName: string) => {
    const value = params[paramName]
    return value === undefined || value === null ? match : String(value)
  })
}

function bundleKey(app: TikoAppKey, language: TikoLanguage): string {
  return `${app}:${language}`
}

function cloneBundle<App extends TikoAppKey, Language extends TikoLanguage>(
  bundle: TranslationBundle<App, Language>,
): TranslationBundle<App, Language> {
  return {
    app: bundle.app,
    language: bundle.language,
    source: bundle.source,
    translations: { ...bundle.translations },
  }
}
