import {
  tikoWebsiteAppUniverse,
  type TikoWebsiteAppMetadata,
  type TikoWebsiteAppSlug,
} from '../../../content/appUniverse'

/**
 * Per-app prose, keyed by slug.
 *
 * Keyed rather than positional on purpose: `overlayCopy` replaces arrays
 * wholesale, so a locale that translated a list of apps would have to translate
 * all nine or none. Keyed by slug, a locale can translate Yes No and leave
 * Sequence falling back to English.
 *
 * English is not re-typed here — it is read out of `content/appUniverse.ts`,
 * which stays the one place an app's English copy is written next to its route,
 * colour and store links. Other locales override these leaves.
 */
export interface AppFeatureCopy {
  title: string
  body: string
}

export interface AppCopy {
  shortSummary: string
  headline: string
  description: string
  platformNotes: string
  useWhen: readonly string[]
  moment: string
  whySmall: string
  calmDetail: string
  features: readonly AppFeatureCopy[]
  /** Screenshot captions, in the order the app declares its screenshots. */
  captions: readonly string[]
}

export const appsEn = Object.fromEntries(
  (tikoWebsiteAppUniverse as readonly TikoWebsiteAppMetadata[]).map((app): [TikoWebsiteAppSlug, AppCopy] => [
    app.slug,
    {
      shortSummary: app.shortSummary,
      headline: app.headline,
      description: app.description,
      platformNotes: app.platformNotes,
      useWhen: app.useWhen,
      moment: app.moment,
      whySmall: app.whySmall,
      calmDetail: app.calmDetail,
      features: app.features,
      captions: app.screenshots?.map((shot) => shot.caption) ?? [],
    },
  ]),
) as Record<TikoWebsiteAppSlug, AppCopy>
