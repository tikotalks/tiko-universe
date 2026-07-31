import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { mediaImages, mediaImage, showcaseCategories } from './mediaImages'
import { tikoWebsiteAppUniverse, type TikoWebsiteAppMetadata } from './appUniverse'
import { whyTikoPillars, whyFreePillars, platformNotes } from '../siteContent'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

describe('curated media images', () => {
  it('names a real media id for every entry, with no duplicates', () => {
    const ids = Object.values(mediaImages)
    for (const id of ids) expect(id).toMatch(UUID)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('builds a media API url at the requested size', () => {
    expect(mediaImage('globe')).toBe(
      `https://media.tikoapi.org/v1/media/${mediaImages.globe}/image/medium`,
    )
    expect(mediaImage('globe', 'large')).toMatch(/\/image\/large$/)
  })

  it('gives every card and app an image that resolves in the registry', () => {
    const named = [
      ...whyTikoPillars.map((p) => p.image),
      ...whyFreePillars.map((p) => p.image),
      ...platformNotes.map((n) => n.image),
      ...(tikoWebsiteAppUniverse as readonly TikoWebsiteAppMetadata[]).map((a) => a.momentImage),
    ]
    expect(named.length).toBeGreaterThan(0)
    for (const name of named) expect(mediaImages).toHaveProperty(name)
  })

  it('keeps the library showcase on child-facing categories', () => {
    expect(showcaseCategories.split(',')).toContain('children')
    expect(showcaseCategories.split(',')).toContain('education')
  })

  // The regression this guards: section artwork used to come from a
  // `/media?limit=24&page=1` pool indexed by card position, which is ordered
  // newest-first — so cards illustrated themselves with whatever had just been
  // uploaded. Artwork must be named, not positional.
  it('has no page pulling section artwork from a positional media pool', () => {
    const pagesDir = join(__dirname, '..', 'pages')
    const offenders: string[] = []
    for (const file of readdirSync(pagesDir).filter((f) => f.endsWith('.vue'))) {
      const source = readFileSync(join(pagesDir, file), 'utf8')
      if (source.includes('poolImage') || source.includes('useMediaPool')) offenders.push(file)
    }
    expect(offenders).toEqual([])
  })
})
