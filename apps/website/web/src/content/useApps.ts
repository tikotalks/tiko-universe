import { computed, type ComputedRef } from 'vue'
import { useCopy, type SiteCopy } from '../i18n'
import { tikoApps, type TikoAppInfo, type TikoWebsiteAppSlug } from './appUniverse'

/**
 * The app universe in the visitor's language.
 *
 * `tikoApps` carries the English prose alongside each app's route, colour and
 * store links. Everything a visitor reads is replaced here from the locale
 * bundle; everything structural — slug, path, icon, screenshot files — is not,
 * because those are addresses rather than text.
 */
function localize(app: TikoAppInfo, copy: SiteCopy): TikoAppInfo {
  const text = copy.apps[app.id as TikoWebsiteAppSlug]
  if (!text) return app
  return {
    ...app,
    headline: text.headline,
    description: text.description,
    summary: text.shortSummary,
    platformNotes: text.platformNotes,
    useWhen: [...text.useWhen],
    moment: text.moment,
    whySmall: text.whySmall,
    calmDetail: text.calmDetail,
    features: text.features.map((feature) => ({ title: feature.title, body: feature.body })),
    // Captions are positional against the app's own screenshot list; a locale
    // that translated fewer keeps the English caption for the rest.
    screenshots: app.screenshots.map((shot, i) => ({
      ...shot,
      caption: text.captions[i] ?? shot.caption,
    })),
    statusLabel: app.status === 'available' ? copy.common.available : copy.common.planned,
  }
}

/** Every Tiko app, in the active language. */
export function useApps(): ComputedRef<TikoAppInfo[]> {
  const copy = useCopy()
  return computed(() => tikoApps.map((app) => localize(app, copy.value)))
}

/** One Tiko app by slug, in the active language. */
export function useApp(slug: () => string): ComputedRef<TikoAppInfo | undefined> {
  const copy = useCopy()
  return computed(() => {
    const app = tikoApps.find((item) => item.id === slug())
    return app ? localize(app, copy.value) : undefined
  })
}
