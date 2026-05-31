# @tiko/i18n

Framework-agnostic i18n contract for Tiko apps. The package provides typed app/language contracts, local fallback bundles, missing-key tracking, language switching, and a thin Lezu-backed loader interface.

## Apps and languages

`TikoAppKey` currently covers the first two rebuild apps: `yes-no` and `type`. Add later apps to the tuple when their text/API contracts are mapped.

`TikoLanguage` covers the shared Lezu locale set used by Tiko clients: `en`, `de`, `es`, `fr`, `nl`, `pt`, `ja`, `zh`, `ko`, `mt`, `it`, `ar`, and `hy`.

Initial local text is intentionally small and limited to the Yes No proof app plus Type shell keys. Apps should import `tikoI18nKeys` instead of hardcoding key strings.

## Basic use

```ts
import { createI18n, defaultLanguage, tikoI18nKeys } from '@tiko/i18n'

const i18n = createI18n({ app: 'yes-no', language: defaultLanguage })

const yesLabel = i18n.t(tikoI18nKeys.yesNo.answers.yes)

i18n.setLanguage('fr')
const frenchYesLabel = i18n.t(tikoI18nKeys.yesNo.answers.yes)
```

Resolution order is selected language first, then English fallback, then the key itself. Missing keys are recorded with `missingKeys()` so apps/tests can surface translation gaps without blocking startup.

## Local fallback bundles

Use `createTranslationBundle()` to provide app/runtime overrides from app settings, tests, or later platform APIs:

```ts
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
```

## Lezu integration seam

`createLezuTranslationLoader()` wraps a caller-provided fetcher and normalizes the result to the same `TranslationBundle` shape used by local fallbacks:

```ts
const loadFromLezu = createLezuTranslationLoader({
  projectId: 'lezu-project-id',
  fetcher: async ({ app, language, projectId }) => {
    const response = await fetch(`/translations?app=${app}&language=${language}&project=${projectId}`)
    return response.json()
  },
})

const bundle = await loadFromLezu({ app: 'yes-no', language: 'nl' })
i18n.addBundle(bundle)
```

This package does not own translation management, Lezu project provisioning, or Cloudflare caching. Remaining integration work is to wire the real Lezu endpoint/API key inside the appropriate worker or app client, then pass fetched bundles into `createI18n()`/`addBundle()`.
