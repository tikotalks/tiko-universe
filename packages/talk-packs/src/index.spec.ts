import { describe, expect, it } from 'vitest'
import { hasPack, loadPack, packLocales } from '@tiko/talk-packs'

describe('talk-packs', () => {
  it('loads a pack', async () => {
    expect(packLocales.length).toBe(54)
    expect(hasPack('en')).toBe(true)
    expect(hasPack('nl-BE')).toBe(true)
    const pack = await loadPack('en')
    expect(pack.locale).toBe('en')
    expect(pack.words.length).toBe(348)
  })
})
