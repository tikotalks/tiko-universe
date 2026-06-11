export type AtlasSpeechProvider = 'openai' | 'elevenlabs' | 'narakeet'

export interface AtlasSpeechServiceConfig {
  defaultProvider: AtlasSpeechProvider
  models: Partial<Record<AtlasSpeechProvider, string>>
  voices: Partial<Record<AtlasSpeechProvider, Record<string, string>>>
}

export const DEFAULT_NARAKEET_VOICE_BY_LOCALE: Record<string, string> = {
  'en-us': 'raymond',
  'en-gb': 'beatrice',
  'en-ca': 'ryan',
  'en-au': 'graham',
  'en-nz': 'keith',
  'en-ie': 'cillian',
  'en-in': 'neerja',
  'en-za': 'aletta',
  'en-ng': 'obinna',
  'en-ph': 'manny',
  'en-sg': 'ava',
  'af-za': 'rolanda',
  'sq-al': 'arben',
  'am-et': 'girum',
  'ar-xa': 'farah',
  'hy-am': 'nune',
  'as-in': 'jahnu',
  'az-az': 'tofiq',
  'bn-bd': 'mahiya',
  'bn-in': 'arpita',
  'eu-es': 'aitor',
  'bs-ba': 'mujo',
  'bg-bg': 'desislava',
  'my-mm': 'zeya',
  'ca-es': 'silvia',
  'cmn-cn': 'yifei',
  'cmn-tw': 'yili',
  'cmn-hk': 'man-chi',
  'hr-hr': 'jasna',
  'cs-cz': 'ladislav',
  'da-dk': 'iben',
  'nl-nl': 'famke',
  'nl-be': 'koen',
  'et-ee': 'pille',
  'fi-fi': 'juha',
  'fil-ph': 'piolo',
  'fr-fr': 'marion',
  'fr-ca': 'audrey',
  'fr-be': 'laetitia',
  'fr-ch': 'matthieu',
  'gl-es': 'gonzalo',
  'de-de': 'andreas',
  'de-ch': 'heidi',
  'de-at': 'fritzi',
  'ka-ge': 'tornike',
  'el-gr': 'afroditi',
  'gu-in': 'pratik',
  'he-il': 'ayelet',
  'hi-in': 'amitabh',
  'hu-hu': 'eszter',
  'is-is': 'steinunn',
  'it-it': 'vittorio',
  'id-id': 'agung',
  'ga-ie': 'aoife',
  'ja-jp': 'hideaki',
  'jv-id': 'riyanto',
  'kn-in': 'bhavana',
  'kk-kz': 'gulshat',
  'km-kh': 'sovath',
  'ko-kr': 'dong-min',
  'lo-la': 'tonkham',
  'lv-lv': 'kristaps',
  'lt-lt': 'jurga',
  'mk-mk': 'vlatko',
  'ml-in': 'ajay',
  'ms-my': 'taufan',
  'mt-mt': 'corazon',
  'mr-in': 'shahana',
  'mn-mn': 'ganbaatar',
  'nr-za': 'dumisani',
  'ne-np': 'lhakpa',
  'nb-no': 'aksel',
  'or-in': 'baisali',
  'ps-af': 'dilawar',
  'fa-ir': 'reza',
  'pl-pl': 'danuta',
  'pt-pt': 'lurdes',
  'pt-br': 'gisele',
  'pa-in': 'inderjit',
  'ro-ro': 'alina',
  'ru-ru': 'irina',
  'si-lk': 'sanath',
  'ssw-za': 'nomcebo',
  'nso-za': 'mpho',
  'sr-rs': 'lazar',
  'st-za': 'palesa',
  'sk-sk': 'juraj',
  'sl-si': 'mojca',
  'so-so': 'cabdi',
  'es-es': 'alejandra',
  'es-us': 'hector',
  'es-mx': 'ramona',
  'es-pr': 'margarita',
  'su-id': 'atep',
  'sv-se': 'elsa',
  'sw-ke': 'ngina',
  'ta-in': 'aparna',
  'te-in': 'ramakrishna',
  'th-th': 'somsak',
  'tn-za': 'bokang',
  'ven-za': 'mulalo',
  'tr-tr': 'murat',
  'uk-ua': 'oleksandr',
  'ur-pk': 'imran',
  'uz-uz': 'shavkat',
  'vi-vn': 'nga',
  'cy-gb': 'rhys',
  'tso-za': 'basetsana',
  'xh-za': 'thabo',
  'zu-za': 'nandi',
}

export const NARAKEET_LOCALE_ALIASES: Record<string, string> = {
  zh: 'cmn-cn',
  'zh-cn': 'cmn-cn',
  'zh-tw': 'cmn-tw',
  'zh-hk': 'cmn-hk',
}

export const DEFAULT_NARAKEET_VOICE_BY_LANGUAGE = Object.entries(DEFAULT_NARAKEET_VOICE_BY_LOCALE)
  .reduce<Record<string, string>>((voices, [locale, voice]) => {
    const language = locale.split('-')[0]
    voices[language] ??= voice
    return voices
  }, { zh: DEFAULT_NARAKEET_VOICE_BY_LOCALE['cmn-cn'] })

export const DEFAULT_ATLAS_SPEECH_CONFIG: AtlasSpeechServiceConfig = {
  defaultProvider: 'narakeet',
  models: {
    openai: 'tts-1',
    elevenlabs: 'eleven_multilingual_v2',
    narakeet: 'narakeet-mp3',
  },
  voices: {
    openai: {},
    elevenlabs: {},
    narakeet: DEFAULT_NARAKEET_VOICE_BY_LOCALE,
  },
}

export function normalizeSpeechLocale(locale: string): string {
  const normalized = locale.trim().toLowerCase().replace(/_/g, '-')
  return NARAKEET_LOCALE_ALIASES[normalized] ?? normalized
}

export function normalizeSpeechServiceConfig(value: unknown): AtlasSpeechServiceConfig {
  const record = isRecord(value) ? value : {}
  const defaultProvider = isSpeechProvider(record.defaultProvider) ? record.defaultProvider : DEFAULT_ATLAS_SPEECH_CONFIG.defaultProvider
  return {
    defaultProvider,
    models: {
      ...DEFAULT_ATLAS_SPEECH_CONFIG.models,
      ...normalizeModelMap(record.models),
    },
    voices: {
      openai: normalizeVoiceMap(record.voices, 'openai'),
      elevenlabs: normalizeVoiceMap(record.voices, 'elevenlabs'),
      narakeet: {
        ...DEFAULT_NARAKEET_VOICE_BY_LOCALE,
        ...normalizeVoiceMap(record.voices, 'narakeet'),
      },
    },
  }
}

export function defaultSpeechVoiceForProvider(provider: AtlasSpeechProvider, locale: string, config: AtlasSpeechServiceConfig): string {
  const normalizedLocale = normalizeSpeechLocale(locale)
  const language = normalizedLocale.split('-')[0]
  return config.voices[provider]?.[normalizedLocale]
    ?? config.voices[provider]?.[language]
    ?? (provider === 'narakeet' ? DEFAULT_NARAKEET_VOICE_BY_LANGUAGE[language] : undefined)
    ?? fallbackVoice(provider)
}

export function fallbackVoice(provider: AtlasSpeechProvider): string {
  if (provider === 'narakeet') return DEFAULT_NARAKEET_VOICE_BY_LANGUAGE.en
  if (provider === 'elevenlabs') return '21m00Tcm4TlvDq8ikWAM'
  return 'nova'
}

function normalizeModelMap(value: unknown): Partial<Record<AtlasSpeechProvider, string>> {
  if (!isRecord(value)) return {}
  const models: Partial<Record<AtlasSpeechProvider, string>> = {}
  for (const provider of ['openai', 'elevenlabs', 'narakeet'] as const) {
    const model = value[provider]
    if (typeof model === 'string' && model.trim()) models[provider] = model.trim()
  }
  return models
}

function normalizeVoiceMap(value: unknown, provider: AtlasSpeechProvider): Record<string, string> {
  if (!isRecord(value) || !isRecord(value[provider])) return {}
  const voices: Record<string, string> = {}
  for (const [locale, voice] of Object.entries(value[provider])) {
    if (typeof voice !== 'string' || !voice.trim()) continue
    voices[normalizeSpeechLocale(locale)] = voice.trim()
  }
  return voices
}

function isSpeechProvider(value: unknown): value is AtlasSpeechProvider {
  return value === 'openai' || value === 'elevenlabs' || value === 'narakeet'
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}
