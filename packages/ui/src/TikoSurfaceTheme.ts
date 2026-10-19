import type { TikoColorMode } from './app-config'

/**
 * How dark "dark" is and how light "light" is.
 *
 * Both surfaces are chosen by the user, so nothing here may assume a
 * particular brightness. The foreground is always derived from whichever
 * background is in effect, which is what keeps a free colour choice safe: pick
 * a pale "dark" and the text turns dark rather than staying white and
 * vanishing.
 */
export interface TikoSurfaceColors {
  light: string
  dark: string
}

/** The historic hardcoded values, kept as the defaults so nothing shifts. */
export const tikoDefaultSurfaces: TikoSurfaceColors = {
  light: '#f8f6f1',
  dark: '#140e18',
}

export function normalizeSurfaceColor(value: string | undefined | null): string {
  const raw = value?.trim()
  if (!raw) return ''
  const match = raw.match(/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i)
  if (!match) return ''
  const hex = match[1]
  if (hex.length === 3) {
    return `#${hex.split('').map((part) => `${part}${part}`).join('')}`.toLowerCase()
  }
  return `#${hex.toLowerCase()}`
}

export function surfaceLuminance(color: string): number {
  const hex = normalizeSurfaceColor(color).slice(1)
  if (!hex) return 1
  const red = Number.parseInt(hex.slice(0, 2), 16)
  const green = Number.parseInt(hex.slice(2, 4), 16)
  const blue = Number.parseInt(hex.slice(4, 6), 16)
  return (0.2126 * red + 0.7152 * green + 0.0722 * blue) / 255
}

/**
 * The text colour for a background. Deliberately not user-configurable — the
 * whole point of deriving it is that no pair of choices can produce
 * unreadable text.
 */
export function tikoForegroundFor(background: string): string {
  return surfaceLuminance(background) > 0.58 ? '#17131c' : '#f6f4ef'
}

export function resolveTikoSurfaces(surfaces?: Partial<TikoSurfaceColors>): TikoSurfaceColors {
  return {
    light: normalizeSurfaceColor(surfaces?.light) || tikoDefaultSurfaces.light,
    dark: normalizeSurfaceColor(surfaces?.dark) || tikoDefaultSurfaces.dark,
  }
}

export interface TikoSurfaceTarget {
  documentElement: { style: { setProperty: (property: string, value: string) => void } }
}

/**
 * Writes the chosen surface into `@sil/ui`'s own custom properties. These
 * override the token values rather than introducing a second set of globals.
 */
export function applyTikoSurfaceColors(
  effectiveMode: 'light' | 'dark',
  surfaces?: Partial<TikoSurfaceColors>,
  documentTarget: TikoSurfaceTarget | undefined = typeof document === 'undefined' ? undefined : document,
): { background: string; foreground: string } {
  const resolved = resolveTikoSurfaces(surfaces)
  const background = effectiveMode === 'dark' ? resolved.dark : resolved.light
  const foreground = tikoForegroundFor(background)

  documentTarget?.documentElement.style.setProperty('--color-background', background)
  documentTarget?.documentElement.style.setProperty('--color-foreground', foreground)
  // Panels and cards sit just off the background in whichever direction has
  // room, so they stay visible against black and against white alike.
  documentTarget?.documentElement.style.setProperty(
    '--tiko-surface',
    `color-mix(in srgb, ${background}, ${foreground} 6%)`,
  )

  return { background, foreground }
}
