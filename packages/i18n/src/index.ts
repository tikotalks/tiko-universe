import { shallowRef, triggerRef, type Ref } from '@vue/reactivity'

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

export interface TikoLanguageOption {
  value: TikoLanguage
  label: string
  nativeLabel: string
}

export const tikoLanguageOptions: TikoLanguageOption[] = [
  { value: 'en', label: 'English', nativeLabel: 'English' },
  { value: 'de', label: 'German', nativeLabel: 'Deutsch' },
  { value: 'es', label: 'Spanish', nativeLabel: 'Español' },
  { value: 'fr', label: 'French', nativeLabel: 'Français' },
  { value: 'nl', label: 'Dutch', nativeLabel: 'Nederlands' },
  { value: 'pt', label: 'Portuguese', nativeLabel: 'Português' },
  { value: 'ja', label: 'Japanese', nativeLabel: '日本語' },
  { value: 'zh', label: 'Chinese', nativeLabel: '中文' },
  { value: 'ko', label: 'Korean', nativeLabel: '한국어' },
  { value: 'mt', label: 'Maltese', nativeLabel: 'Malti' },
  { value: 'it', label: 'Italian', nativeLabel: 'Italiano' },
  { value: 'ar', label: 'Arabic', nativeLabel: 'العربية' },
  { value: 'hy', label: 'Armenian', nativeLabel: 'Հայերեն' },
]

export const tikoAppKeys = ['yes-no', 'type', 'timer', 'radio', 'cards', 'sequence', 'todo', 'talk'] as const

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
  /** @internal Reactive revision counter for Vue computed invalidation. */
  _revision: Ref<number>
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
      popup: {
        title: 'yesNo.history.popup.title',
        subtitle: 'yesNo.history.popup.subtitle',
      },
    },
    latestAnswer: 'yesNo.latestAnswer',
    settings: {
      title: 'yesNo.settings.title',
      speakAnswers: 'yesNo.settings.speakAnswers',
      answerStyle: 'yesNo.settings.answerStyle',
      answerTiles: 'yesNo.settings.answerTiles',
      answerTilesDefault: 'yesNo.settings.answerTilesDefault',
    },
    question: {
      empty: 'yesNo.question.empty',
      hint: 'yesNo.question.hint',
    },
    answerStyle: {
      popup: {
        title: 'yesNo.answerStyle.popup.title',
        subtitle: 'yesNo.answerStyle.popup.subtitle',
      },
    },
    tileEditor: {
      title: 'yesNo.tileEditor.title',
      subtitle: 'yesNo.tileEditor.subtitle',
      empty: 'yesNo.tileEditor.empty',
      addTile: 'yesNo.tileEditor.addTile',
      reset: 'yesNo.tileEditor.reset',
      save: 'yesNo.tileEditor.save',
    },
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
  cards: {
    appName: 'cards.appName',
    collections: {
      empty: 'cards.collections.empty',
      addNew: 'cards.collections.addNew',
      newName: 'cards.collections.newName',
      create: 'cards.collections.create',
    },
    tiles: {
      empty: 'cards.tiles.empty',
      addNew: 'cards.tiles.addNew',
      newName: 'cards.tiles.newName',
    },
    settings: {
      restoreDefaults: 'cards.settings.restoreDefaults',
      restoreConfirm: 'cards.settings.restoreConfirm',
    },
    status: {
      browserVoiceFallback: 'cards.status.browserVoiceFallback',
      speechError: 'cards.status.speechError',
    },
  },
  sequence: {
    appName: 'sequence.appName',
    empty: {
      title: 'sequence.empty.title',
      description: 'sequence.empty.description',
      create: 'sequence.empty.create',
    },
    create: {
      title: 'sequence.create.title',
      name: 'sequence.create.name',
      namePlaceholder: 'sequence.create.namePlaceholder',
      submit: 'sequence.create.submit',
      cancel: 'sequence.create.cancel',
      addStep: 'sequence.create.addStep',
    },
    play: {
      step: 'sequence.play.step',
      next: 'sequence.play.next',
      done: 'sequence.play.done',
    },
    status: {
      loadError: 'sequence.status.loadError',
      retry: 'sequence.status.retry',
    },
  },
  todo: {
    appName: 'todo.appName',
    empty: {
      title: 'todo.empty.title',
      description: 'todo.empty.description',
      create: 'todo.empty.create',
    },
    create: {
      title: 'todo.create.title',
      name: 'todo.create.name',
      namePlaceholder: 'todo.create.namePlaceholder',
      details: 'todo.create.details',
      submit: 'todo.create.submit',
      cancel: 'todo.create.cancel',
      selectImage: 'todo.create.selectImage',
      step: 'todo.create.step',
      speak: 'todo.create.speak',
    },
    item: {
      markComplete: 'todo.item.markComplete',
      markIncomplete: 'todo.item.markIncomplete',
      done: 'todo.item.done',
      pending: 'todo.item.pending',
      remaining: 'todo.item.remaining',
    },
    status: {
      loadError: 'todo.status.loadError',
      retry: 'todo.status.retry',
    },
  },
  talk: {
    appName: 'talk.appName',
    sentence: {
      label: 'talk.sentence.label',
      placeholder: 'talk.sentence.placeholder',
      speak: 'talk.sentence.speak',
      clear: 'talk.sentence.clear',
      complete: 'talk.sentence.complete',
    },
    templates: {
      title: 'talk.templates.title',
      empty: 'talk.templates.empty',
    },
    suggestions: {
      title: 'talk.suggestions.title',
      empty: 'talk.suggestions.empty',
    },
    categories: {
      title: 'talk.categories.title',
      all: 'talk.categories.all',
    },
    phrases: {
      title: 'talk.phrases.title',
      empty: 'talk.phrases.empty',
      save: 'talk.phrases.save',
      saved: 'talk.phrases.saved',
      remove: 'talk.phrases.remove',
    },
    status: {
      loading: 'talk.status.loading',
      offline: 'talk.status.offline',
      listening: 'talk.status.listening',
      audioCached: 'talk.status.audioCached',
      speechError: 'talk.status.speechError',
      loadError: 'talk.status.loadError',
      retry: 'talk.status.retry',
    },
  },
  common: {
    back: 'common.back',
    cancel: 'common.cancel',
    create: 'common.create',
    delete: 'common.delete',
    save: 'common.save',
    settings: 'common.settings',
    language: 'common.language',
    appearance: 'common.appearance',
    appPreferences: 'common.appPreferences',
    colorMode: 'common.colorMode',
    colorModeOptions: {
      light: 'common.colorMode.light',
      dark: 'common.colorMode.dark',
      system: 'common.colorMode.system',
    },
    size: {
      small: 'common.size.small',
      medium: 'common.size.medium',
      large: 'common.size.large',
    },
    identity: {
      close: 'common.identity.close',
      account: 'common.identity.account',
      deviceUser: 'common.identity.deviceUser',
      temporaryDeviceUser: 'common.identity.temporaryDeviceUser',
      profile: 'common.identity.profile',
      setNameAndEmail: 'common.identity.setNameAndEmail',
      profileDetail: 'common.identity.profileDetail',
      recoverableUserDetail: 'common.identity.recoverableUserDetail',
      logIn: 'common.identity.logIn',
      logInDetail: 'common.identity.logInDetail',
      childMode: 'common.identity.childMode',
      hideParentControls: 'common.identity.hideParentControls',
      createParentCode: 'common.identity.createParentCode',
      childAccounts: 'common.identity.childAccounts',
      childAccountsDetail: 'common.identity.childAccountsDetail',
      deleteAccount: 'common.identity.deleteAccount',
      deleteAccountDetail: 'common.identity.deleteAccountDetail',
      logOut: 'common.identity.logOut',
      logOutDetail: 'common.identity.logOutDetail',
      childAccountsSubtitle: 'common.identity.childAccountsSubtitle',
      code: 'common.identity.code',
      codeNotSet: 'common.identity.codeNotSet',
      rename: 'common.identity.rename',
      resetCode: 'common.identity.resetCode',
      name: 'common.identity.name',
      newCode: 'common.identity.newCode',
      childAccountsEmpty: 'common.identity.childAccountsEmpty',
      addChildAccount: 'common.identity.addChildAccount',
      childName: 'common.identity.childName',
      loginCode: 'common.identity.loginCode',
      deleteChildConfirm: 'common.identity.deleteChildConfirm',
      childAccountsLoadError: 'common.identity.childAccountsLoadError',
      childAccountCreateError: 'common.identity.childAccountCreateError',
      childAccountUpdateError: 'common.identity.childAccountUpdateError',
      childAccountResetError: 'common.identity.childAccountResetError',
      childAccountDeleteError: 'common.identity.childAccountDeleteError',
      pinCreateTitle: 'common.identity.pinCreateTitle',
      pinCreateSubtitle: 'common.identity.pinCreateSubtitle',
      pinConfirmTitle: 'common.identity.pinConfirmTitle',
      pinConfirmSubtitle: 'common.identity.pinConfirmSubtitle',
      pinEnterTitle: 'common.identity.pinEnterTitle',
      pinEnterSubtitle: 'common.identity.pinEnterSubtitle',
      pinCodesDontMatch: 'common.identity.pinCodesDontMatch',
      pinWrongCode: 'common.identity.pinWrongCode',
      accountTitle: 'common.identity.accountTitle',
      setupUserTitle: 'common.identity.setupUserTitle',
      verifiedAccount: 'common.identity.verifiedAccount',
      addEmailToRecover: 'common.identity.addEmailToRecover',
      displayName: 'common.identity.displayName',
      yourName: 'common.identity.yourName',
      email: 'common.identity.email',
      emailPlaceholder: 'common.identity.emailPlaceholder',
      codePlaceholder: 'common.identity.codePlaceholder',
      sendCodeError: 'common.identity.sendCodeError',
      verifyCodeError: 'common.identity.verifyCodeError',
      verified: 'common.identity.verified',
      pleaseWait: 'common.identity.pleaseWait',
      verifyCode: 'common.identity.verifyCode',
      sendMagicLink: 'common.identity.sendMagicLink',
      signOut: 'common.identity.signOut',
      deleteAccountConfirm: 'common.identity.deleteAccountConfirm',
    },
  },
} as const

const commonEnglish: TranslationMap = {
  [tikoI18nKeys.common.back]: 'Back',
  [tikoI18nKeys.common.cancel]: 'Cancel',
  [tikoI18nKeys.common.create]: 'Create',
  [tikoI18nKeys.common.delete]: 'Delete',
  [tikoI18nKeys.common.save]: 'Save',
  [tikoI18nKeys.common.settings]: 'Settings',
  [tikoI18nKeys.common.language]: 'Language',
  [tikoI18nKeys.common.appearance]: 'Appearance',
  [tikoI18nKeys.common.appPreferences]: 'Language, appearance and app preferences.',
  [tikoI18nKeys.common.colorMode]: 'Color mode',
  [tikoI18nKeys.common.colorModeOptions.light]: 'Light',
  [tikoI18nKeys.common.colorModeOptions.dark]: 'Dark',
  [tikoI18nKeys.common.colorModeOptions.system]: 'System',
  [tikoI18nKeys.common.size.small]: 'Small',
  [tikoI18nKeys.common.size.medium]: 'Medium',
  [tikoI18nKeys.common.size.large]: 'Large',
  [tikoI18nKeys.common.identity.close]: 'Close',
  [tikoI18nKeys.common.identity.account]: 'Account',
  [tikoI18nKeys.common.identity.deviceUser]: 'Device user',
  [tikoI18nKeys.common.identity.temporaryDeviceUser]: 'Temporary device user',
  [tikoI18nKeys.common.identity.profile]: 'Profile',
  [tikoI18nKeys.common.identity.setNameAndEmail]: 'Set name and email',
  [tikoI18nKeys.common.identity.profileDetail]: 'Name, email, avatar',
  [tikoI18nKeys.common.identity.recoverableUserDetail]: 'Make this a recoverable user',
  [tikoI18nKeys.common.identity.logIn]: 'Log in',
  [tikoI18nKeys.common.identity.logInDetail]: 'Recover an existing user by email',
  [tikoI18nKeys.common.identity.childMode]: 'Child mode',
  [tikoI18nKeys.common.identity.hideParentControls]: 'Hide parent controls',
  [tikoI18nKeys.common.identity.createParentCode]: 'Create a 4-digit code',
  [tikoI18nKeys.common.identity.childAccounts]: 'Child accounts',
  [tikoI18nKeys.common.identity.childAccountsDetail]: 'Manage child profiles and login codes',
  [tikoI18nKeys.common.identity.deleteAccount]: 'Delete account',
  [tikoI18nKeys.common.identity.deleteAccountDetail]: 'Remove this user and its sessions',
  [tikoI18nKeys.common.identity.logOut]: 'Log out',
  [tikoI18nKeys.common.identity.logOutDetail]: 'Keep this app available on the device',
  [tikoI18nKeys.common.identity.childAccountsSubtitle]: 'Manage profiles for your children',
  [tikoI18nKeys.common.identity.code]: 'Code',
  [tikoI18nKeys.common.identity.codeNotSet]: 'not set',
  [tikoI18nKeys.common.identity.rename]: 'Rename',
  [tikoI18nKeys.common.identity.resetCode]: 'Reset code',
  [tikoI18nKeys.common.identity.name]: 'Name',
  [tikoI18nKeys.common.identity.newCode]: 'New 4-digit code',
  [tikoI18nKeys.common.identity.childAccountsEmpty]: 'No child accounts yet. Add one so your child can log in with a 4-digit code.',
  [tikoI18nKeys.common.identity.addChildAccount]: 'Add child account',
  [tikoI18nKeys.common.identity.childName]: "Child's name",
  [tikoI18nKeys.common.identity.loginCode]: '4-digit login code',
  [tikoI18nKeys.common.identity.deleteChildConfirm]: 'Delete this child account?',
  [tikoI18nKeys.common.identity.childAccountsLoadError]: 'Could not load child accounts.',
  [tikoI18nKeys.common.identity.childAccountCreateError]: 'Could not create child account.',
  [tikoI18nKeys.common.identity.childAccountUpdateError]: 'Could not update name.',
  [tikoI18nKeys.common.identity.childAccountResetError]: 'Could not reset code.',
  [tikoI18nKeys.common.identity.childAccountDeleteError]: 'Could not delete child account.',
  [tikoI18nKeys.common.identity.pinCreateTitle]: 'Create a code',
  [tikoI18nKeys.common.identity.pinCreateSubtitle]: 'This protects parent mode from kids',
  [tikoI18nKeys.common.identity.pinConfirmTitle]: 'Confirm code',
  [tikoI18nKeys.common.identity.pinConfirmSubtitle]: 'Enter the same 4 digits again',
  [tikoI18nKeys.common.identity.pinEnterTitle]: 'Enter code',
  [tikoI18nKeys.common.identity.pinEnterSubtitle]: 'to switch to parent mode',
  [tikoI18nKeys.common.identity.pinCodesDontMatch]: "Codes don't match",
  [tikoI18nKeys.common.identity.pinWrongCode]: 'Wrong code',
  [tikoI18nKeys.common.identity.accountTitle]: 'Your account',
  [tikoI18nKeys.common.identity.setupUserTitle]: 'Set up user',
  [tikoI18nKeys.common.identity.verifiedAccount]: 'Verified account',
  [tikoI18nKeys.common.identity.addEmailToRecover]: 'Add email to recover this user',
  [tikoI18nKeys.common.identity.displayName]: 'Display name',
  [tikoI18nKeys.common.identity.yourName]: 'Your name',
  [tikoI18nKeys.common.identity.email]: 'Email',
  [tikoI18nKeys.common.identity.emailPlaceholder]: 'you@example.com',
  [tikoI18nKeys.common.identity.codePlaceholder]: '123 456',
  [tikoI18nKeys.common.identity.sendCodeError]: 'Could not send the code. Please try again.',
  [tikoI18nKeys.common.identity.verifyCodeError]: 'Invalid or expired code. Try again or resend.',
  [tikoI18nKeys.common.identity.verified]: 'Verified',
  [tikoI18nKeys.common.identity.pleaseWait]: 'Please wait...',
  [tikoI18nKeys.common.identity.verifyCode]: 'Verify code',
  [tikoI18nKeys.common.identity.sendMagicLink]: 'Send magic link',
  [tikoI18nKeys.common.identity.signOut]: 'Sign out',
  [tikoI18nKeys.common.identity.deleteAccountConfirm]: 'Delete this Tiko user? This removes the account and sessions.',
}

const commonFrench: TranslationMap = {
  [tikoI18nKeys.common.settings]: 'Réglages',
  [tikoI18nKeys.common.language]: 'Langue',
  [tikoI18nKeys.common.appearance]: 'Apparence',
  [tikoI18nKeys.common.appPreferences]: 'Langue, apparence et préférences de l’app.',
  [tikoI18nKeys.common.colorMode]: 'Mode couleur',
  [tikoI18nKeys.common.colorModeOptions.light]: 'Clair',
  [tikoI18nKeys.common.colorModeOptions.dark]: 'Sombre',
  [tikoI18nKeys.common.colorModeOptions.system]: 'Système',
  [tikoI18nKeys.common.size.small]: 'Petit',
  [tikoI18nKeys.common.size.medium]: 'Moyen',
  [tikoI18nKeys.common.size.large]: 'Grand',
}

const commonDutch: TranslationMap = {
  [tikoI18nKeys.common.settings]: 'Instellingen',
  [tikoI18nKeys.common.language]: 'Taal',
  [tikoI18nKeys.common.appearance]: 'Weergave',
  [tikoI18nKeys.common.appPreferences]: 'Taal, weergave en app-voorkeuren.',
  [tikoI18nKeys.common.colorMode]: 'Kleurmodus',
  [tikoI18nKeys.common.colorModeOptions.light]: 'Licht',
  [tikoI18nKeys.common.colorModeOptions.dark]: 'Donker',
  [tikoI18nKeys.common.colorModeOptions.system]: 'Systeem',
  [tikoI18nKeys.common.size.small]: 'Klein',
  [tikoI18nKeys.common.size.medium]: 'Middel',
  [tikoI18nKeys.common.size.large]: 'Groot',
}

const commonSpanish: TranslationMap = {
  [tikoI18nKeys.common.settings]: 'Ajustes',
  [tikoI18nKeys.common.language]: 'Idioma',
  [tikoI18nKeys.common.appearance]: 'Apariencia',
  [tikoI18nKeys.common.appPreferences]: 'Idioma, apariencia y preferencias de la app.',
  [tikoI18nKeys.common.colorMode]: 'Modo de color',
  [tikoI18nKeys.common.colorModeOptions.light]: 'Claro',
  [tikoI18nKeys.common.colorModeOptions.dark]: 'Oscuro',
  [tikoI18nKeys.common.colorModeOptions.system]: 'Sistema',
  [tikoI18nKeys.common.size.small]: 'Pequeño',
  [tikoI18nKeys.common.size.medium]: 'Mediano',
  [tikoI18nKeys.common.size.large]: 'Grande',
}

const commonMaltese: TranslationMap = {
  [tikoI18nKeys.common.back]: 'Lura',
  [tikoI18nKeys.common.cancel]: 'Ikkanċella',
  [tikoI18nKeys.common.create]: 'Oħloq',
  [tikoI18nKeys.common.delete]: 'Ħassar',
  [tikoI18nKeys.common.save]: 'Issejvja',
  [tikoI18nKeys.common.settings]: 'Impostazzjonijiet',
  [tikoI18nKeys.common.language]: 'Lingwa',
  [tikoI18nKeys.common.appearance]: 'Dehra',
  [tikoI18nKeys.common.appPreferences]: 'Lingwa, dehra u preferenzi tal-app.',
  [tikoI18nKeys.common.colorMode]: 'Mod tal-kulur',
  [tikoI18nKeys.common.colorModeOptions.light]: 'Ċar',
  [tikoI18nKeys.common.colorModeOptions.dark]: 'Skur',
  [tikoI18nKeys.common.colorModeOptions.system]: 'Sistema',
  [tikoI18nKeys.common.size.small]: 'Żgħir',
  [tikoI18nKeys.common.size.medium]: 'Medju',
  [tikoI18nKeys.common.size.large]: 'Kbir',
  [tikoI18nKeys.common.identity.close]: 'Agħlaq',
  [tikoI18nKeys.common.identity.account]: 'Kont',
  [tikoI18nKeys.common.identity.deviceUser]: 'Utent taʼ dan l-apparat',
  [tikoI18nKeys.common.identity.temporaryDeviceUser]: 'Utent temporanju fuq dan l-apparat',
  [tikoI18nKeys.common.identity.profile]: 'Profil',
  [tikoI18nKeys.common.identity.setNameAndEmail]: 'Issettja isem u email',
  [tikoI18nKeys.common.identity.profileDetail]: 'Isem, email u avatar',
  [tikoI18nKeys.common.identity.recoverableUserDetail]: 'Agħmel lil dan l-utent rekuperabbli',
  [tikoI18nKeys.common.identity.logIn]: 'Idħol',
  [tikoI18nKeys.common.identity.logInDetail]: 'Irkupra utent eżistenti bl-email',
  [tikoI18nKeys.common.identity.childMode]: 'Modalità tat-tfal',
  [tikoI18nKeys.common.identity.hideParentControls]: 'Aħbi l-kontrolli tal-ġenituri',
  [tikoI18nKeys.common.identity.createParentCode]: 'Oħloq kodiċi b’4 ċifri',
  [tikoI18nKeys.common.identity.childAccounts]: 'Kontijiet tat-tfal',
  [tikoI18nKeys.common.identity.childAccountsDetail]: 'Immaniġġja profili tat-tfal u kodiċijiet tad-dħul',
  [tikoI18nKeys.common.identity.deleteAccount]: 'Ħassar il-kont',
  [tikoI18nKeys.common.identity.deleteAccountDetail]: 'Neħħi dan l-utent u s-sessjonijiet tiegħu',
  [tikoI18nKeys.common.identity.logOut]: 'Oħroġ',
  [tikoI18nKeys.common.identity.logOutDetail]: 'Żomm din l-app disponibbli fuq l-apparat',
  [tikoI18nKeys.common.identity.childAccountsSubtitle]: 'Immaniġġja profili għal uliedek',
  [tikoI18nKeys.common.identity.code]: 'Kodiċi',
  [tikoI18nKeys.common.identity.codeNotSet]: 'mhux issettjat',
  [tikoI18nKeys.common.identity.rename]: 'Ibdel l-isem',
  [tikoI18nKeys.common.identity.resetCode]: 'Irrisettja l-kodiċi',
  [tikoI18nKeys.common.identity.name]: 'Isem',
  [tikoI18nKeys.common.identity.newCode]: 'Kodiċi ġdid b’4 ċifri',
  [tikoI18nKeys.common.identity.childAccountsEmpty]: 'Għad m’hemmx kontijiet tat-tfal. Żid wieħed biex it-tifel jew tifla jidħlu b’kodiċi b’4 ċifri.',
  [tikoI18nKeys.common.identity.addChildAccount]: 'Żid kont tat-tfal',
  [tikoI18nKeys.common.identity.childName]: 'Isem it-tifel jew tifla',
  [tikoI18nKeys.common.identity.loginCode]: 'Kodiċi tad-dħul b’4 ċifri',
  [tikoI18nKeys.common.identity.deleteChildConfirm]: 'Tħassar dan il-kont tat-tfal?',
  [tikoI18nKeys.common.identity.childAccountsLoadError]: 'Ma setgħux jitgħabbew il-kontijiet tat-tfal.',
  [tikoI18nKeys.common.identity.childAccountCreateError]: 'Ma setax jinħoloq il-kont tat-tfal.',
  [tikoI18nKeys.common.identity.childAccountUpdateError]: 'Ma setax jiġi aġġornat l-isem.',
  [tikoI18nKeys.common.identity.childAccountResetError]: 'Ma setax jiġi rrisettjat il-kodiċi.',
  [tikoI18nKeys.common.identity.childAccountDeleteError]: 'Ma setax jitħassar il-kont tat-tfal.',
  [tikoI18nKeys.common.identity.pinCreateTitle]: 'Oħloq kodiċi',
  [tikoI18nKeys.common.identity.pinCreateSubtitle]: 'Dan jipproteġi l-modalità tal-ġenituri mit-tfal',
  [tikoI18nKeys.common.identity.pinConfirmTitle]: 'Ikkonferma l-kodiċi',
  [tikoI18nKeys.common.identity.pinConfirmSubtitle]: 'Daħħal l-istess 4 ċifri mill-ġdid',
  [tikoI18nKeys.common.identity.pinEnterTitle]: 'Daħħal il-kodiċi',
  [tikoI18nKeys.common.identity.pinEnterSubtitle]: 'biex taqleb għall-modalità tal-ġenituri',
  [tikoI18nKeys.common.identity.pinCodesDontMatch]: 'Il-kodiċijiet ma jaqblux',
  [tikoI18nKeys.common.identity.pinWrongCode]: 'Kodiċi ħażin',
  [tikoI18nKeys.common.identity.accountTitle]: 'Il-kont tiegħek',
  [tikoI18nKeys.common.identity.setupUserTitle]: 'Issettja utent',
  [tikoI18nKeys.common.identity.verifiedAccount]: 'Kont ivverifikat',
  [tikoI18nKeys.common.identity.addEmailToRecover]: 'Żid email biex tirkupra lil dan l-utent',
  [tikoI18nKeys.common.identity.displayName]: 'Isem murija',
  [tikoI18nKeys.common.identity.yourName]: 'Ismek',
  [tikoI18nKeys.common.identity.email]: 'Email',
  [tikoI18nKeys.common.identity.emailPlaceholder]: 'int@example.com',
  [tikoI18nKeys.common.identity.codePlaceholder]: '123 456',
  [tikoI18nKeys.common.identity.sendCodeError]: 'Ma setax jintbagħat il-kodiċi. Erġaʼ pprova.',
  [tikoI18nKeys.common.identity.verifyCodeError]: 'Kodiċi invalidu jew skada. Erġaʼ pprova jew ibgħatu mill-ġdid.',
  [tikoI18nKeys.common.identity.verified]: 'Ivverifikat',
  [tikoI18nKeys.common.identity.pleaseWait]: 'Stenna ftit...',
  [tikoI18nKeys.common.identity.verifyCode]: 'Ivverifika l-kodiċi',
  [tikoI18nKeys.common.identity.sendMagicLink]: 'Ibgħat link maġiku',
  [tikoI18nKeys.common.identity.signOut]: 'Oħroġ',
  [tikoI18nKeys.common.identity.deleteAccountConfirm]: 'Tħassar dan l-utent taʼ Tiko? Dan ineħħi l-kont u s-sessjonijiet.',
}

const yesNoEnglish: TranslationMap = {
  ...commonEnglish,
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
  [tikoI18nKeys.yesNo.settings.title]: 'Yes No',
  [tikoI18nKeys.yesNo.settings.speakAnswers]: 'Speak answers',
  [tikoI18nKeys.yesNo.settings.answerStyle]: 'Answer style',
  [tikoI18nKeys.yesNo.settings.answerTiles]: 'Answer tiles',
  [tikoI18nKeys.yesNo.settings.answerTilesDefault]: 'Default',
  [tikoI18nKeys.yesNo.question.empty]: 'No questions yet',
  [tikoI18nKeys.yesNo.question.hint]: 'Questions appear here after you ask them with Yes or No.',
  [tikoI18nKeys.yesNo.history.popup.title]: 'Question history',
  [tikoI18nKeys.yesNo.history.popup.subtitle]: 'Recently typed questions.',
  [tikoI18nKeys.yesNo.answerStyle.popup.title]: 'Answer style',
  [tikoI18nKeys.yesNo.answerStyle.popup.subtitle]: 'Choose how the Yes and No buttons appear.',
  [tikoI18nKeys.yesNo.tileEditor.title]: 'Answer tiles',
  [tikoI18nKeys.yesNo.tileEditor.subtitle]: 'Choose the answers shown to the child.',
  [tikoI18nKeys.yesNo.tileEditor.empty]: 'Using the default Yes and No answers.',
  [tikoI18nKeys.yesNo.tileEditor.addTile]: 'Add tile',
  [tikoI18nKeys.yesNo.tileEditor.reset]: 'Reset',
  [tikoI18nKeys.yesNo.tileEditor.save]: 'Save',
  [tikoI18nKeys.yesNo.status.answerCount]: '{count} answers',
  [tikoI18nKeys.yesNo.status.browserVoiceFallback]: 'Browser voice used',
  [tikoI18nKeys.yesNo.status.speechError]: 'Could not speak yet. Try again.',
}

const yesNoFrench: TranslationMap = {
  ...commonFrench,
  [tikoI18nKeys.yesNo.answers.yes]: 'Oui',
  [tikoI18nKeys.yesNo.answers.no]: 'Non',
  [tikoI18nKeys.yesNo.latestAnswer]: 'Dernière réponse',
  [tikoI18nKeys.yesNo.settings.title]: 'Oui Non',
  [tikoI18nKeys.yesNo.settings.speakAnswers]: 'Énoncer les réponses',
  [tikoI18nKeys.yesNo.settings.answerStyle]: 'Style de réponse',
  [tikoI18nKeys.yesNo.settings.answerTiles]: 'Tuiles de réponse',
  [tikoI18nKeys.yesNo.settings.answerTilesDefault]: 'Par défaut',
  [tikoI18nKeys.yesNo.question.empty]: 'Pas encore de questions',
  [tikoI18nKeys.yesNo.question.hint]: 'Les questions apparaissent ici après avoir répondu.',
  [tikoI18nKeys.yesNo.history.popup.title]: 'Historique des questions',
  [tikoI18nKeys.yesNo.history.popup.subtitle]: 'Questions récentes.',
  [tikoI18nKeys.yesNo.answerStyle.popup.title]: 'Style de réponse',
  [tikoI18nKeys.yesNo.answerStyle.popup.subtitle]: 'Choisissez l’apparence des boutons Oui et Non.',
  [tikoI18nKeys.yesNo.tileEditor.title]: 'Tuiles de réponse',
  [tikoI18nKeys.yesNo.tileEditor.subtitle]: 'Choisissez les réponses affichées à l’enfant.',
  [tikoI18nKeys.yesNo.tileEditor.empty]: 'Les réponses Oui et Non par défaut sont utilisées.',
  [tikoI18nKeys.yesNo.tileEditor.addTile]: 'Ajouter une tuile',
  [tikoI18nKeys.yesNo.tileEditor.reset]: 'Réinitialiser',
  [tikoI18nKeys.yesNo.tileEditor.save]: 'Enregistrer',
  [tikoI18nKeys.yesNo.status.answerCount]: '{count} réponses',
  [tikoI18nKeys.yesNo.status.browserVoiceFallback]: 'Voix du navigateur utilisée',
}

const yesNoDutch: TranslationMap = {
  ...commonDutch,
  [tikoI18nKeys.yesNo.answers.yes]: 'Ja',
  [tikoI18nKeys.yesNo.answers.no]: 'Nee',
  [tikoI18nKeys.yesNo.latestAnswer]: 'Laatste antwoord',
  [tikoI18nKeys.yesNo.settings.title]: 'Ja Nee',
  [tikoI18nKeys.yesNo.settings.speakAnswers]: 'Antwoorden uitspreken',
  [tikoI18nKeys.yesNo.settings.answerStyle]: 'Antwoordstijl',
  [tikoI18nKeys.yesNo.settings.answerTiles]: 'Antwoordtegels',
  [tikoI18nKeys.yesNo.settings.answerTilesDefault]: 'Standaard',
  [tikoI18nKeys.yesNo.question.empty]: 'Nog geen vragen',
  [tikoI18nKeys.yesNo.question.hint]: 'Vragen verschijnen hier nadat je ze stelt.',
  [tikoI18nKeys.yesNo.history.popup.title]: 'Vraaggeschiedenis',
  [tikoI18nKeys.yesNo.history.popup.subtitle]: 'Recente vragen.',
  [tikoI18nKeys.yesNo.answerStyle.popup.title]: 'Antwoordstijl',
  [tikoI18nKeys.yesNo.answerStyle.popup.subtitle]: 'Kies hoe de Ja- en Nee-knoppen eruitzien.',
  [tikoI18nKeys.yesNo.tileEditor.title]: 'Antwoordtegels',
  [tikoI18nKeys.yesNo.tileEditor.subtitle]: 'Kies welke antwoorden het kind ziet.',
  [tikoI18nKeys.yesNo.tileEditor.empty]: 'De standaardantwoorden Ja en Nee worden gebruikt.',
  [tikoI18nKeys.yesNo.tileEditor.addTile]: 'Tegel toevoegen',
  [tikoI18nKeys.yesNo.tileEditor.reset]: 'Herstellen',
  [tikoI18nKeys.yesNo.tileEditor.save]: 'Opslaan',
  [tikoI18nKeys.yesNo.status.browserVoiceFallback]: 'Browser voice used',
}

const yesNoSpanish: TranslationMap = {
  ...commonSpanish,
  [tikoI18nKeys.yesNo.answers.yes]: 'Sí',
  [tikoI18nKeys.yesNo.answers.no]: 'No',
  [tikoI18nKeys.yesNo.latestAnswer]: 'Última respuesta',
  [tikoI18nKeys.yesNo.settings.title]: 'Sí No',
  [tikoI18nKeys.yesNo.settings.speakAnswers]: 'Pronunciar respuestas',
  [tikoI18nKeys.yesNo.settings.answerStyle]: 'Estilo de respuesta',
  [tikoI18nKeys.yesNo.settings.answerTiles]: 'Tarjetas de respuesta',
  [tikoI18nKeys.yesNo.settings.answerTilesDefault]: 'Predeterminado',
  [tikoI18nKeys.yesNo.question.empty]: 'Aún no hay preguntas',
  [tikoI18nKeys.yesNo.question.hint]: 'Las preguntas aparecerán aquí después de responder.',
  [tikoI18nKeys.yesNo.history.popup.title]: 'Historial de preguntas',
  [tikoI18nKeys.yesNo.history.popup.subtitle]: 'Preguntas recientes.',
  [tikoI18nKeys.yesNo.answerStyle.popup.title]: 'Estilo de respuesta',
  [tikoI18nKeys.yesNo.answerStyle.popup.subtitle]: 'Elige cómo aparecen los botones Sí y No.',
  [tikoI18nKeys.yesNo.tileEditor.title]: 'Tarjetas de respuesta',
  [tikoI18nKeys.yesNo.tileEditor.subtitle]: 'Elige las respuestas que verá el niño.',
  [tikoI18nKeys.yesNo.tileEditor.empty]: 'Se usan las respuestas predeterminadas Sí y No.',
  [tikoI18nKeys.yesNo.tileEditor.addTile]: 'Añadir tarjeta',
  [tikoI18nKeys.yesNo.tileEditor.reset]: 'Restablecer',
  [tikoI18nKeys.yesNo.tileEditor.save]: 'Guardar',
  [tikoI18nKeys.yesNo.status.browserVoiceFallback]: 'Voz del navegador usada',
}

const yesNoMaltese: TranslationMap = {
  ...commonMaltese,
  [tikoI18nKeys.yesNo.appName]: 'Iva Le',
  [tikoI18nKeys.yesNo.answers.yes]: 'Iva',
  [tikoI18nKeys.yesNo.answers.no]: 'Le',
  [tikoI18nKeys.yesNo.latestAnswer]: 'L-aħħar risposta',
  [tikoI18nKeys.yesNo.settings.title]: 'Iva Le',
  [tikoI18nKeys.yesNo.settings.speakAnswers]: 'Aqra r-risposti',
  [tikoI18nKeys.yesNo.settings.answerStyle]: 'Stil tar-risposti',
  [tikoI18nKeys.yesNo.settings.answerTiles]: 'Madum tar-risposti',
  [tikoI18nKeys.yesNo.settings.answerTilesDefault]: 'Default',
  [tikoI18nKeys.yesNo.tileEditor.title]: 'Madum tar-risposti',
  [tikoI18nKeys.yesNo.tileEditor.subtitle]: 'Agħżel ir-risposti murija lit-tifel jew tifla.',
  [tikoI18nKeys.yesNo.tileEditor.empty]: 'Qed jintużaw ir-risposti default Iva u Le.',
  [tikoI18nKeys.yesNo.tileEditor.addTile]: 'Żid maduma',
  [tikoI18nKeys.yesNo.tileEditor.reset]: 'Irrisettja',
  [tikoI18nKeys.yesNo.tileEditor.save]: 'Issejvja',
  [tikoI18nKeys.yesNo.status.browserVoiceFallback]: 'Intużat il-vuċi tal-browser',
}

const typeEnglish: TranslationMap = {
  ...commonEnglish,
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
  ...commonEnglish,
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
  ...commonEnglish,
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

const cardsEnglish: TranslationMap = {
  ...commonEnglish,
  [tikoI18nKeys.cards.appName]: 'Cards',
  [tikoI18nKeys.cards.collections.empty]: 'No collections yet.',
  [tikoI18nKeys.cards.collections.addNew]: 'Add collection',
  [tikoI18nKeys.cards.collections.newName]: 'New collection name',
  [tikoI18nKeys.cards.collections.create]: 'Create',
  [tikoI18nKeys.cards.tiles.empty]: 'No tiles yet.',
  [tikoI18nKeys.cards.tiles.addNew]: 'Add tile',
  [tikoI18nKeys.cards.tiles.newName]: 'New tile name',
  [tikoI18nKeys.cards.settings.restoreDefaults]: 'Restore defaults',
  [tikoI18nKeys.cards.settings.restoreConfirm]: 'This will show all default collections again.',
  [tikoI18nKeys.cards.status.browserVoiceFallback]: 'Browser voice used',
  [tikoI18nKeys.cards.status.speechError]: 'Could not speak yet. Try again.',
}

const sequenceEnglish: TranslationMap = {
  ...commonEnglish,
  [tikoI18nKeys.sequence.appName]: 'Sequence',
  [tikoI18nKeys.sequence.empty.title]: 'No sequences yet',
  [tikoI18nKeys.sequence.empty.description]: 'Create your first sequence to get started.',
  [tikoI18nKeys.sequence.empty.create]: 'Create sequence',
  [tikoI18nKeys.sequence.create.title]: 'New Sequence',
  [tikoI18nKeys.sequence.create.name]: 'Name',
  [tikoI18nKeys.sequence.create.namePlaceholder]: 'Enter sequence name',
  [tikoI18nKeys.sequence.create.submit]: 'Create',
  [tikoI18nKeys.sequence.create.cancel]: 'Cancel',
  [tikoI18nKeys.sequence.create.addStep]: '+ Add step',
  [tikoI18nKeys.sequence.play.step]: 'Step {current} of {total}',
  [tikoI18nKeys.sequence.play.next]: 'Next',
  [tikoI18nKeys.sequence.play.done]: 'Done',
  [tikoI18nKeys.sequence.status.loadError]: 'Could not load data.',
  [tikoI18nKeys.sequence.status.retry]: 'Retry',
}

const todoEnglish: TranslationMap = {
  ...commonEnglish,
  [tikoI18nKeys.todo.appName]: 'Todo',
  [tikoI18nKeys.todo.empty.title]: 'No items yet',
  [tikoI18nKeys.todo.empty.description]: 'Add your first task to get started.',
  [tikoI18nKeys.todo.empty.create]: 'Add task',
  [tikoI18nKeys.todo.create.title]: 'New Task',
  [tikoI18nKeys.todo.create.name]: 'Task name',
  [tikoI18nKeys.todo.create.namePlaceholder]: 'Enter task name',
  [tikoI18nKeys.todo.create.details]: 'Details',
  [tikoI18nKeys.todo.create.submit]: 'Add',
  [tikoI18nKeys.todo.create.cancel]: 'Cancel',
  [tikoI18nKeys.todo.create.selectImage]: 'Select image',
  [tikoI18nKeys.todo.create.step]: 'Step',
  [tikoI18nKeys.todo.create.speak]: 'Speak',
  [tikoI18nKeys.todo.item.markComplete]: 'Mark complete',
  [tikoI18nKeys.todo.item.markIncomplete]: 'Mark incomplete',
  [tikoI18nKeys.todo.item.done]: 'Done',
  [tikoI18nKeys.todo.item.pending]: 'Pending',
  [tikoI18nKeys.todo.item.remaining]: '{count} remaining',
  [tikoI18nKeys.todo.status.loadError]: 'Could not load data.',
  [tikoI18nKeys.todo.status.retry]: 'Retry',
}

const talkEnglish: TranslationMap = {
  ...commonEnglish,
  [tikoI18nKeys.talk.appName]: 'Talk',
  [tikoI18nKeys.talk.sentence.label]: 'Sentence',
  [tikoI18nKeys.talk.sentence.placeholder]: 'Build a sentence',
  [tikoI18nKeys.talk.sentence.speak]: 'Speak',
  [tikoI18nKeys.talk.sentence.clear]: 'Clear',
  [tikoI18nKeys.talk.sentence.complete]: 'Complete sentence',
  [tikoI18nKeys.talk.templates.title]: 'Sentence starters',
  [tikoI18nKeys.talk.templates.empty]: 'No starters available yet.',
  [tikoI18nKeys.talk.suggestions.title]: 'Next words',
  [tikoI18nKeys.talk.suggestions.empty]: 'Pick another word to continue.',
  [tikoI18nKeys.talk.categories.title]: 'Word groups',
  [tikoI18nKeys.talk.categories.all]: 'All words',
  [tikoI18nKeys.talk.phrases.title]: 'Saved phrases',
  [tikoI18nKeys.talk.phrases.empty]: 'No saved phrases yet.',
  [tikoI18nKeys.talk.phrases.save]: 'Save phrase',
  [tikoI18nKeys.talk.phrases.saved]: 'Phrase saved',
  [tikoI18nKeys.talk.phrases.remove]: 'Remove phrase',
  [tikoI18nKeys.talk.status.loading]: 'Loading words',
  [tikoI18nKeys.talk.status.offline]: 'Offline words active',
  [tikoI18nKeys.talk.status.listening]: 'Ready to speak',
  [tikoI18nKeys.talk.status.audioCached]: 'Audio ready',
  [tikoI18nKeys.talk.status.speechError]: 'Could not speak yet. Try again.',
  [tikoI18nKeys.talk.status.loadError]: 'Could not load Talk yet.',
  [tikoI18nKeys.talk.status.retry]: 'Retry',
}

const commonFallbackBundles = tikoAppKeys.flatMap((app) => [
  createTranslationBundle({ app, language: 'fr', translations: commonFrench }),
  createTranslationBundle({ app, language: 'nl', translations: commonDutch }),
  createTranslationBundle({ app, language: 'es', translations: commonSpanish }),
  createTranslationBundle({ app, language: 'mt', translations: commonMaltese }),
])

const localTranslationBundles = [
  ...commonFallbackBundles,
  createTranslationBundle({ app: 'yes-no', language: 'en', translations: yesNoEnglish }),
  createTranslationBundle({ app: 'yes-no', language: 'fr', translations: yesNoFrench }),
  createTranslationBundle({ app: 'yes-no', language: 'nl', translations: yesNoDutch }),
  createTranslationBundle({ app: 'yes-no', language: 'es', translations: yesNoSpanish }),
  createTranslationBundle({ app: 'yes-no', language: 'mt', translations: yesNoMaltese }),
  createTranslationBundle({ app: 'type', language: 'en', translations: typeEnglish }),
  createTranslationBundle({ app: 'cards', language: 'en', translations: cardsEnglish }),
  createTranslationBundle({ app: 'sequence', language: 'en', translations: sequenceEnglish }),
  createTranslationBundle({ app: 'todo', language: 'en', translations: todoEnglish }),
  createTranslationBundle({ app: 'timer', language: 'en', translations: timerEnglish }),
  createTranslationBundle({ app: 'radio', language: 'en', translations: radioEnglish }),
  createTranslationBundle({ app: 'talk', language: 'en', translations: talkEnglish }),
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

export const TIKO_TRANSLATIONS_BASE_URL = 'https://translations.tikoapi.org'

/**
 * Ready-to-use loader that fetches from the Tiko translations-api Worker.
 * No API key needed — the worker keeps credentials server-side.
 *
 * Usage:
 *   const loader = createTikoTranslationLoader()
 *   const bundle = await loader({ app: 'radio', language: 'nl' })
 *   i18n.addBundle(bundle)
 */
export function createTikoTranslationLoader(
  baseUrl: string = TIKO_TRANSLATIONS_BASE_URL,
): TranslationLoader {
  return async (request: TranslationLoaderRequest): Promise<TranslationBundle> => {
    const { app, language } = request
    try {
      const response = await fetch(`${baseUrl}/v1/${app}/${language}`)
      if (!response.ok) {
        return createTranslationBundle({ app, language, source: 'lezu', translations: {} })
      }
      const data = await response.json() as { translations?: TranslationMap }
      return createTranslationBundle({
        app,
        language,
        source: 'lezu',
        translations: data.translations ?? {},
      })
    } catch (error) {
      const bundle = createTranslationBundle({ app, language, source: 'lezu', translations: {} })
      return Object.assign(bundle, { _loadError: error instanceof Error ? error.message : 'fetch_failed' })
    }
  }
}

export function createTikoIdentityLabels(t: (key: string) => string) {
  const keys = tikoI18nKeys.common.identity
  return {
    profileMenu: {
      close: t(keys.close),
      account: t(keys.account),
      deviceUser: t(keys.deviceUser),
      temporaryDeviceUser: t(keys.temporaryDeviceUser),
      profile: t(keys.profile),
      setNameAndEmail: t(keys.setNameAndEmail),
      profileDetail: t(keys.profileDetail),
      recoverableUserDetail: t(keys.recoverableUserDetail),
      logIn: t(keys.logIn),
      logInDetail: t(keys.logInDetail),
      childMode: t(keys.childMode),
      hideParentControls: t(keys.hideParentControls),
      createParentCode: t(keys.createParentCode),
      childAccounts: t(keys.childAccounts),
      childAccountsDetail: t(keys.childAccountsDetail),
      deleteAccount: t(keys.deleteAccount),
      deleteAccountDetail: t(keys.deleteAccountDetail),
      logOut: t(keys.logOut),
      logOutDetail: t(keys.logOutDetail),
    },
    childAccounts: {
      back: t(tikoI18nKeys.common.back),
      title: t(keys.childAccounts),
      subtitle: t(keys.childAccountsSubtitle),
      code: t(keys.code),
      codeNotSet: t(keys.codeNotSet),
      rename: t(keys.rename),
      resetCode: t(keys.resetCode),
      delete: t(tikoI18nKeys.common.delete),
      name: t(keys.name),
      save: t(tikoI18nKeys.common.save),
      cancel: t(tikoI18nKeys.common.cancel),
      newCode: t(keys.newCode),
      empty: t(keys.childAccountsEmpty),
      addChildAccount: t(keys.addChildAccount),
      childName: t(keys.childName),
      loginCode: t(keys.loginCode),
      create: t(tikoI18nKeys.common.create),
      deleteConfirm: t(keys.deleteChildConfirm),
      loadError: t(keys.childAccountsLoadError),
      createError: t(keys.childAccountCreateError),
      updateError: t(keys.childAccountUpdateError),
      resetError: t(keys.childAccountResetError),
      deleteError: t(keys.childAccountDeleteError),
    },
    pin: {
      createTitle: t(keys.pinCreateTitle),
      createSubtitle: t(keys.pinCreateSubtitle),
      confirmTitle: t(keys.pinConfirmTitle),
      confirmSubtitle: t(keys.pinConfirmSubtitle),
      enterTitle: t(keys.pinEnterTitle),
      enterSubtitle: t(keys.pinEnterSubtitle),
      codesDontMatch: t(keys.pinCodesDontMatch),
      wrongCode: t(keys.pinWrongCode),
      back: t(tikoI18nKeys.common.back),
      cancel: t(tikoI18nKeys.common.cancel),
    },
    accountPopup: {
      titleAccount: t(keys.accountTitle),
      titleSetup: t(keys.setupUserTitle),
      temporaryDeviceUser: t(keys.temporaryDeviceUser),
      verifiedAccount: t(keys.verifiedAccount),
      addEmailToRecover: t(keys.addEmailToRecover),
      displayName: t(keys.displayName),
      yourName: t(keys.yourName),
      email: t(keys.email),
      emailPlaceholder: t(keys.emailPlaceholder),
      codePlaceholder: t(keys.codePlaceholder),
      sendError: t(keys.sendCodeError),
      verifyError: t(keys.verifyCodeError),
      verified: t(keys.verified),
      pleaseWait: t(keys.pleaseWait),
      verifyCode: t(keys.verifyCode),
      sendMagicLink: t(keys.sendMagicLink),
      signOut: t(keys.signOut),
      deleteAccount: t(keys.deleteAccount),
      deleteConfirm: t(keys.deleteAccountConfirm),
    },
  }
}

export function createI18n(options: CreateI18nOptions): TikoI18n {
  const currentLanguage = shallowRef(options.language ?? defaultLanguage)
  const revision = shallowRef(0)
  const fallbackLanguage = options.fallbackLanguage ?? defaultLanguage
  const missing = new Set<string>()
  const bundles = new Map<string, TranslationBundle>()

  for (const bundle of listLocalTranslationBundles(options.app)) {
    upsertBundle(bundles, bundle)
  }

  for (const bundle of options.bundles ?? []) {
    upsertBundle(bundles, bundle)
  }

  const state = {
    app: options.app,
    fallbackLanguage,
    language: {
      get value() {
        return currentLanguage.value
      },
    },
    t(key: string, params?: TranslationParams): string {
      void revision.value
      const text = resolveTranslation(bundles, options.app, currentLanguage.value, fallbackLanguage, key)

      if (text === undefined) {
        missing.add(`${currentLanguage.value}:${key}`)
        return key
      }

      return interpolate(text, params)
    },
    setLanguage(language: TikoLanguage) {
      currentLanguage.value = language
      triggerRef(revision)
    },
    addBundle(bundle: TranslationBundle) {
      upsertBundle(bundles, bundle)
      triggerRef(revision)
    },
    missingKeys() {
      return Array.from(missing)
    },
    _revision: revision,
  } satisfies TikoI18n

  return state
}

function upsertBundle(bundles: Map<string, TranslationBundle>, bundle: TranslationBundle): void {
  const key = bundleKey(bundle.app, bundle.language)
  const existing = bundles.get(key)
  const next = cloneBundle(bundle)
  bundles.set(key, existing ? {
    ...next,
    translations: { ...existing.translations, ...next.translations },
  } : next)
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
