import { describe, expect, it } from 'vitest'
import {
  applyTikoSurfaceColors,
  normalizeSurfaceColor,
  resolveTikoSurfaces,
  tikoDefaultSurfaces,
  tikoForegroundFor,
} from './TikoSurfaceTheme'

function fakeTarget() {
  const set: Record<string, string> = {}
  return {
    set,
    target: { documentElement: { style: { setProperty: (k: string, v: string) => { set[k] = v } } } },
  }
}

describe('tiko surface theme', () => {
  it('normalizes hex input the user might supply', () => {
    expect(normalizeSurfaceColor('#FFF')).toBe('#ffffff')
    expect(normalizeSurfaceColor('abcdef')).toBe('#abcdef')
    expect(normalizeSurfaceColor('not a color')).toBe('')
    expect(normalizeSurfaceColor(undefined)).toBe('')
  })

  it('falls back to the historic defaults when unset or invalid', () => {
    expect(resolveTikoSurfaces()).toEqual(tikoDefaultSurfaces)
    expect(resolveTikoSurfaces({ light: 'nope', dark: '' })).toEqual(tikoDefaultSurfaces)
  })

  // The point of deriving the foreground is that no user choice can produce
  // unreadable text — including choosing a light colour for "dark".
  it('derives a readable foreground for any background', () => {
    expect(tikoForegroundFor('#ffffff')).toBe('#17131c')
    expect(tikoForegroundFor('#000000')).toBe('#f6f4ef')
    expect(tikoForegroundFor('#eeeeee')).toBe('#17131c')
  })

  it('flips the text colour when the user picks a pale dark surface', () => {
    const { set, target } = fakeTarget()
    applyTikoSurfaceColors('dark', { dark: '#f2f2f2' }, target)
    expect(set['--color-background']).toBe('#f2f2f2')
    expect(set['--color-foreground']).toBe('#17131c')
  })

  it('writes the chosen surface into the sil/ui tokens', () => {
    const { set, target } = fakeTarget()
    applyTikoSurfaceColors('light', { light: '#fffdf7', dark: '#101014' }, target)
    expect(set['--color-background']).toBe('#fffdf7')
    expect(set['--tiko-surface']).toContain('color-mix')
  })
})
