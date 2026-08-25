import { type MediaImageName } from './content/mediaImages'
import { docsPages } from './docsContent'
import { stableRoutes } from './content/appUniverse'

export { docsPages, stableRoutes }

/**
 * Colour rotation for card grids, so adjacent cards read as distinct Tiko colours.
 *
 * `accent` is deliberately absent: @sil/ui hardcodes `--color-accent` to
 * `var(--color-foreground)`, so a card toned `accent` renders black-on-black in
 * dark mode. See the note at the top of `styles.scss`.
 */
export const sectionTones = [
  'primary',
  'secondary',
  'tertiary',
  'warning',
  'yes-no',
  'cards',
  'sequence',
  'say',
  'first',
] as const

/**
 * Artwork for the home page's card rotations.
 *
 * The prose these illustrate lives in each locale's `home.ts` copy file — a
 * picture is not a translation, so the two are paired by position here rather
 * than travelling together through the copy files.
 */
export const whyFreePillarImages: readonly MediaImageName[] = ['childSayingHi', 'balloons', 'coin']
export const platformNoteImages: readonly MediaImageName[] = ['laptop', 'smartphone', 'tablet']
