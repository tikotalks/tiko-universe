import { watch, type Ref } from 'vue'
import {
  createTikoTranslationLoader,
  type TikoAppKey,
  type TikoI18n,
  type TikoLanguage,
  type TranslationLoader,
} from '@tiko/i18n'

export interface UseTikoI18nRuntimeOptions {
  app: TikoAppKey
  language: Ref<TikoLanguage>
  i18n: Pick<TikoI18n, 'setLanguage' | 'addBundle'>
  loader?: TranslationLoader
  onLanguageChange?: (language: TikoLanguage) => void | Promise<void>
}

export function useTikoI18nRuntime(options: UseTikoI18nRuntimeOptions) {
  const loader = options.loader ?? createTikoTranslationLoader()
  const loadedLanguages = new Set<TikoLanguage>()

  async function loadLanguage(language: TikoLanguage) {
    if (loadedLanguages.has(language)) return false

    try {
      const bundle = await loader({ app: options.app, language })
      if (Object.keys(bundle.translations).length > 0) {
        options.i18n.addBundle(bundle)
      }
      loadedLanguages.add(language)
      return true
    } catch {
      return false
    }
  }

  const stop = watch(options.language, (language) => {
    options.i18n.setLanguage(language)
    void loadLanguage(language)
    void options.onLanguageChange?.(language)
  }, { immediate: true })

  return {
    loadedLanguages,
    loadLanguage,
    stop,
  }
}
