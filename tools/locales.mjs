/**
 * The languages Tiko offers, in one place.
 *
 * This list was duplicated in three: `packages/i18n/src/index.ts` for the web,
 * `TikoLanguage.defaultLanguages` in Swift for iOS, and the README of
 * `workers/translations-api`. They had already drifted — the worker claimed
 * thirteen locales, the picker offered thirteen, and the Talk realizer supported
 * fifty-two. `tools/generate-locales.mjs` now writes all of them from here.
 *
 * Each entry:
 *
 * - `code` — the locale the app stores in `tiko.language` and sends to the APIs.
 *   Two-letter ISO 639-1 where one exists, ISO 639-3 otherwise (`pap`, `cnr`).
 * - `name` — English name, for a list a parent reads in English.
 * - `native` — what speakers call it, which is what the picker shows first.
 * - `rtl` — written right to left.
 * - `talk` — the Talk realizer has grammar for it (see
 *   `packages/talk-realizer/README.md`). A locale without it still gets a
 *   translated interface; its sentence is the tiles joined.
 * - `ui` — how complete the interface translation is: `full` for the languages
 *   Tiko shipped with, `core` for the shared vocabulary generated here, `none`
 *   for a locale whose interface still falls back to English.
 */
export const locales = [
  // Shipped with the app, translated in full.
  { code: 'en', name: 'English', native: 'English', talk: true, ui: 'full' },
  { code: 'nl', name: 'Dutch', native: 'Nederlands', talk: true, ui: 'full' },
  { code: 'de', name: 'German', native: 'Deutsch', talk: true, ui: 'full' },
  { code: 'fr', name: 'French', native: 'Français', talk: true, ui: 'full' },
  { code: 'es', name: 'Spanish', native: 'Español', talk: true, ui: 'full' },
  { code: 'pt', name: 'Portuguese', native: 'Português', talk: true, ui: 'full' },
  { code: 'it', name: 'Italian', native: 'Italiano', talk: true, ui: 'full' },
  { code: 'mt', name: 'Maltese', native: 'Malti', talk: true, ui: 'full' },

  // Non-European, already in the picker.
  { code: 'ja', name: 'Japanese', native: '日本語', talk: true, ui: 'core' },
  { code: 'zh', name: 'Chinese', native: '中文', talk: true, ui: 'core' },
  { code: 'ko', name: 'Korean', native: '한국어', talk: true, ui: 'core' },
  { code: 'ar', name: 'Arabic', native: 'العربية', rtl: true, talk: true, ui: 'core' },
  { code: 'hy', name: 'Armenian', native: 'Հայերեն', talk: true, ui: 'core' },
  { code: 'id', name: 'Indonesian', native: 'Bahasa Indonesia', talk: true, ui: 'core' },
  { code: 'ms', name: 'Malay', native: 'Bahasa Melayu', talk: true, ui: 'core' },
  { code: 'vi', name: 'Vietnamese', native: 'Tiếng Việt', talk: true, ui: 'core' },
  { code: 'af', name: 'Afrikaans', native: 'Afrikaans', talk: true, ui: 'core' },

  // Germanic
  { code: 'sv', name: 'Swedish', native: 'Svenska', talk: true, ui: 'core' },
  { code: 'da', name: 'Danish', native: 'Dansk', talk: true, ui: 'core' },
  { code: 'nb', name: 'Norwegian', native: 'Norsk', talk: true, ui: 'core' },
  { code: 'is', name: 'Icelandic', native: 'Íslenska', talk: true, ui: 'core' },
  { code: 'fy', name: 'West Frisian', native: 'Frysk', talk: true, ui: 'core' },
  { code: 'lb', name: 'Luxembourgish', native: 'Lëtzebuergesch', talk: true, ui: 'core' },

  // Romance
  { code: 'ca', name: 'Catalan', native: 'Català', talk: true, ui: 'core' },
  { code: 'gl', name: 'Galician', native: 'Galego', talk: true, ui: 'core' },
  { code: 'ro', name: 'Romanian', native: 'Română', talk: true, ui: 'core' },
  { code: 'pap', name: 'Papiamentu', native: 'Papiamentu', talk: true, ui: 'core' },

  // Slavic
  { code: 'ru', name: 'Russian', native: 'Русский', talk: true, ui: 'core' },
  { code: 'uk', name: 'Ukrainian', native: 'Українська', talk: true, ui: 'core' },
  { code: 'be', name: 'Belarusian', native: 'Беларуская', talk: true, ui: 'core' },
  { code: 'pl', name: 'Polish', native: 'Polski', talk: true, ui: 'core' },
  { code: 'cs', name: 'Czech', native: 'Čeština', talk: true, ui: 'core' },
  { code: 'sk', name: 'Slovak', native: 'Slovenčina', talk: true, ui: 'core' },
  { code: 'sl', name: 'Slovenian', native: 'Slovenščina', talk: true, ui: 'core' },
  { code: 'hr', name: 'Croatian', native: 'Hrvatski', talk: true, ui: 'core' },
  { code: 'sr', name: 'Serbian', native: 'Српски', talk: true, ui: 'core' },
  { code: 'bs', name: 'Bosnian', native: 'Bosanski', talk: true, ui: 'core' },
  { code: 'cnr', name: 'Montenegrin', native: 'Crnogorski', talk: true, ui: 'core' },
  { code: 'bg', name: 'Bulgarian', native: 'Български', talk: true, ui: 'core' },
  { code: 'mk', name: 'Macedonian', native: 'Македонски', talk: true, ui: 'core' },

  // Baltic
  { code: 'lt', name: 'Lithuanian', native: 'Lietuvių', talk: true, ui: 'core' },
  { code: 'lv', name: 'Latvian', native: 'Latviešu', talk: true, ui: 'core' },

  // Finno-Ugric
  { code: 'fi', name: 'Finnish', native: 'Suomi', talk: true, ui: 'core' },
  { code: 'et', name: 'Estonian', native: 'Eesti', talk: true, ui: 'core' },
  { code: 'hu', name: 'Hungarian', native: 'Magyar', talk: true, ui: 'core' },

  // Celtic
  { code: 'cy', name: 'Welsh', native: 'Cymraeg', talk: true, ui: 'core' },
  { code: 'ga', name: 'Irish', native: 'Gaeilge', talk: true, ui: 'core' },

  // South Asia
  { code: 'bn', name: 'Bengali', native: 'বাংলা', talk: true, ui: 'core' },
  { code: 'hi', name: 'Hindi', native: 'हिन्दी', talk: true, ui: 'core' },

  // The rest of Europe
  { code: 'el', name: 'Greek', native: 'Ελληνικά', talk: true, ui: 'core' },
  { code: 'sq', name: 'Albanian', native: 'Shqip', talk: true, ui: 'core' },
  { code: 'tr', name: 'Turkish', native: 'Türkçe', talk: true, ui: 'core' },
  { code: 'eu', name: 'Basque', native: 'Euskara', talk: true, ui: 'core' },
  { code: 'ka', name: 'Georgian', native: 'ქართული', talk: true, ui: 'core' },
]

/** The locale a missing translation falls back to. */
export const fallbackLocale = 'en'

/** Locale codes, in picker order. */
export const localeCodes = locales.map((locale) => locale.code)
