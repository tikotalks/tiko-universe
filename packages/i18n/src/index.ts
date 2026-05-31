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

export const tikoAppKeys = ['yes-no', 'type', 'timer', 'radio'] as const

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
  radio: {
    appName: 'radio.appName',
    player: {
      play: 'radio.player.play',
      pause: 'radio.player.pause',
      next: 'radio.player.next',
      previous: 'radio.player.previous',
      shuffle: 'radio.player.shuffle',
      repeat: 'radio.player.repeat',
      noTracks: 'radio.player.noTracks',
    },
    playlist: {
      title: 'radio.playlist.title',
      empty: 'radio.playlist.empty',
    },
    library: {
      title: 'radio.library.title',
      empty: 'radio.library.empty',
      addTrack: 'radio.library.addTrack',
      addFromYouTube: 'radio.library.addFromYouTube',
      addFromYouTubePlaceholder: 'radio.library.addFromYouTubePlaceholder',
      addFromYouTubeButton: 'radio.library.addFromYouTubeButton',
      adding: 'radio.library.adding',
      uploadFile: 'radio.library.uploadFile',
      removeTrack: 'radio.library.removeTrack',
    },
    status: {
      nowPlaying: 'radio.status.nowPlaying',
    },
    categories: {
      title: 'radio.categories.title',
      all: 'radio.categories.all',
      favorites: 'radio.categories.favorites',
      animals: 'radio.categories.animals',
      farm: 'radio.categories.farm',
      bedtime: 'radio.categories.bedtime',
      songs: 'radio.categories.songs',
      dance: 'radio.categories.dance',
      stories: 'radio.categories.stories',
    },
    management: {
      title: 'radio.management.title',
      subtitle: 'radio.management.subtitle',
      videosIn: 'radio.management.videosIn',
      addVideo: 'radio.management.addVideo',
      youtubeLink: 'radio.management.youtubeLink',
      displayName: 'radio.management.displayName',
      preview: 'radio.management.preview',
      addToCategory: 'radio.management.addToCategory',
      addVideoButton: 'radio.management.addVideoButton',
      parentOnly: 'radio.management.parentOnly',
      dragToReorder: 'radio.management.dragToReorder',
      noVideos: 'radio.management.noVideos',
      newCategory: 'radio.management.newCategory',
      categoryName: 'radio.management.categoryName',
      createCategory: 'radio.management.createCategory',
    },
    parentMode: {
      enter: 'radio.parentMode.enter',
      exit: 'radio.parentMode.exit',
      loginRequired: 'radio.parentMode.loginRequired',
    },
    volume: 'radio.volume',
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

const radioEnglish: TranslationMap = {
  [tikoI18nKeys.radio.appName]: 'Radio',
  [tikoI18nKeys.radio.player.play]: 'Play',
  [tikoI18nKeys.radio.player.pause]: 'Pause',
  [tikoI18nKeys.radio.player.next]: 'Next',
  [tikoI18nKeys.radio.player.previous]: 'Previous',
  [tikoI18nKeys.radio.player.shuffle]: 'Shuffle',
  [tikoI18nKeys.radio.player.repeat]: 'Repeat',
  [tikoI18nKeys.radio.player.noTracks]: 'No tracks loaded',
  [tikoI18nKeys.radio.playlist.title]: 'Playlist',
  [tikoI18nKeys.radio.playlist.empty]: 'No tracks yet.',
  [tikoI18nKeys.radio.library.title]: 'Library',
  [tikoI18nKeys.radio.library.empty]: 'No tracks yet. Add music to get started.',
  [tikoI18nKeys.radio.library.addTrack]: 'Add Track',
  [tikoI18nKeys.radio.library.addFromYouTube]: 'Add from YouTube',
  [tikoI18nKeys.radio.library.addFromYouTubePlaceholder]: 'Paste a YouTube link',
  [tikoI18nKeys.radio.library.addFromYouTubeButton]: 'Add',
  [tikoI18nKeys.radio.library.adding]: 'Adding...',
  [tikoI18nKeys.radio.library.uploadFile]: 'Upload File',
  [tikoI18nKeys.radio.library.removeTrack]: 'Remove',
  [tikoI18nKeys.radio.status.nowPlaying]: 'Now playing',
  [tikoI18nKeys.radio.categories.title]: 'Pick something to listen to',
  [tikoI18nKeys.radio.categories.all]: 'All',
  [tikoI18nKeys.radio.categories.favorites]: 'Favorites',
  [tikoI18nKeys.radio.categories.animals]: 'Animals',
  [tikoI18nKeys.radio.categories.farm]: 'Farm',
  [tikoI18nKeys.radio.categories.bedtime]: 'Bedtime',
  [tikoI18nKeys.radio.categories.songs]: 'Songs',
  [tikoI18nKeys.radio.categories.dance]: 'Dance',
  [tikoI18nKeys.radio.categories.stories]: 'Stories',
  [tikoI18nKeys.radio.management.title]: 'Manage videos',
  [tikoI18nKeys.radio.management.subtitle]: 'Add YouTube videos to a category',
  [tikoI18nKeys.radio.management.videosIn]: 'Videos in {category}',
  [tikoI18nKeys.radio.management.addVideo]: 'Add video',
  [tikoI18nKeys.radio.management.youtubeLink]: 'Paste YouTube link',
  [tikoI18nKeys.radio.management.displayName]: 'Display name (optional)',
  [tikoI18nKeys.radio.management.preview]: 'Preview',
  [tikoI18nKeys.radio.management.addToCategory]: 'Add to category',
  [tikoI18nKeys.radio.management.addVideoButton]: '+ Add video',
  [tikoI18nKeys.radio.management.parentOnly]: 'Only parents can manage videos',
  [tikoI18nKeys.radio.management.dragToReorder]: 'Drag to reorder \u2022 Tap trash to remove',
  [tikoI18nKeys.radio.management.noVideos]: 'No videos yet. Add your first video!',
  [tikoI18nKeys.radio.management.newCategory]: '+ New category',
  [tikoI18nKeys.radio.management.categoryName]: 'Category name',
  [tikoI18nKeys.radio.management.createCategory]: 'Create',
  [tikoI18nKeys.radio.parentMode.enter]: 'Parent mode',
  [tikoI18nKeys.radio.parentMode.exit]: 'Exit parent mode',
  [tikoI18nKeys.radio.parentMode.loginRequired]: 'Log in to manage content',
  [tikoI18nKeys.radio.volume]: 'Volume',
}

const localTranslationBundles = [
  createTranslationBundle({ app: 'yes-no', language: 'en', translations: yesNoEnglish }),
  createTranslationBundle({ app: 'yes-no', language: 'fr', translations: yesNoFrench }),
  createTranslationBundle({ app: 'yes-no', language: 'nl', translations: yesNoDutch }),
  createTranslationBundle({ app: 'yes-no', language: 'es', translations: yesNoSpanish }),
  createTranslationBundle({ app: 'type', language: 'en', translations: typeEnglish }),
  createTranslationBundle({ app: 'timer', language: 'en', translations: timerEnglish }),
  createTranslationBundle({ app: 'radio', language: 'en', translations: radioEnglish }),
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
