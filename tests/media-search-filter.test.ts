// @vitest-environment node
import { createRequire } from 'node:module'
import { describe, expect, it } from 'vitest'
import { mediaSearchFilter } from '../workers/media-api/src/search'

// The filter is SQL, so it is checked against a real SQLite, which is what D1 is.
const { DatabaseSync } = createRequire(import.meta.url)('node:sqlite') as typeof import('node:sqlite')

interface Picture {
  title: string
  description?: string
  tags?: string[]
  categories?: string[]
  filename?: string
}

function found(library: Picture[], search: string): string[] {
  const database = new DatabaseSync(':memory:')
  database.exec('CREATE TABLE media (title TEXT, description TEXT, name TEXT, filename TEXT, tags TEXT, categories TEXT)')
  const insert = database.prepare('INSERT INTO media VALUES (?, ?, ?, ?, ?, ?)')
  for (const picture of library) {
    insert.run(
      picture.title,
      picture.description ?? null,
      picture.title,
      picture.filename ?? 'upload.png',
      JSON.stringify(picture.tags ?? []),
      JSON.stringify(picture.categories ?? []),
    )
  }
  const filter = mediaSearchFilter(search)
  const rows = database
    .prepare(`SELECT title FROM media WHERE ${filter.clause} ORDER BY ${filter.windowOrder}, title`)
    .all(...filter.values, ...filter.windowValues)
  database.close()
  return rows.map(row => String(row.title)).sort()
}

describe('media search filter', () => {
  const library: Picture[] = [
    { title: 'Toothbrush', tags: ['teeth', 'brush', 'bathroom'] },
    { title: 'Hair Brush', tags: ['hair'] },
    { title: 'Tooth', tags: ['mouth'] },
    { title: 'Bicycle', tags: ['bike', 'ride'] },
    { title: 'Boy Running', tags: ['sport'] },
    { title: 'Icecream Cone', tags: ['dessert'] },
    { title: 'Ice Cream Scoop', tags: ['dessert'] },
    { title: 'Vacuum', tags: ['carpet', 'home'], categories: ['tools'] },
    { title: 'Hamster', tags: ['pets'], categories: ['animals'] },
    { title: 'Waterfall', categories: ['natural-wonders'] },
    { title: 'Thor', tags: ['Norse mythology'] },
    { title: '100% Juice' },
  ]

  it('needs every word, in any order and in any field', () => {
    expect(found(library, 'brush teeth')).toEqual(['Toothbrush'])
    expect(found(library, 'teeth brush')).toEqual(['Toothbrush'])
    expect(found(library, 'brush')).toEqual(['Hair Brush', 'Toothbrush'])
  })

  it('finds other forms of a word', () => {
    expect(found(library, 'biking')).toEqual(['Bicycle'])
    expect(found(library, 'run')).toEqual(['Boy Running'])
    expect(found(library, 'teeth')).toEqual(['Tooth', 'Toothbrush'])
    expect(found(library, 'brushes')).toEqual(['Hair Brush', 'Toothbrush'])
  })

  it('finds words written together or apart', () => {
    expect(found(library, 'ice cream')).toEqual(['Ice Cream Scoop', 'Icecream Cone'])
    expect(found(library, 'icecream')).toEqual(['Ice Cream Scoop', 'Icecream Cone'])
  })

  it('matches tags and categories from the start of a word only', () => {
    expect(found(library, 'pet')).toEqual(['Hamster'])
    expect(found(library, 'mythology')).toEqual(['Thor'])
    expect(found(library, 'wonders')).toEqual(['Waterfall'])
  })

  it('takes LIKE wildcards literally', () => {
    expect(found(library, '%')).toEqual(['100% Juice'])
    expect(found(library, '_')).toEqual([])
    expect(found(library, '100%')).toEqual(['100% Juice'])
  })

  it('stays inside the 100 bound values D1 allows, however long the search', () => {
    const filter = mediaSearchFilter('running children brushing their teeth with brushes and biking home')
    expect(filter.values.length + filter.windowValues.length).toBeLessThan(80)
  })

  it('never asks for a pattern longer than D1 accepts', () => {
    const long = 'x'.repeat(200)
    for (const search of [long, `${long} ${long}`, '%'.repeat(200)]) {
      const filter = mediaSearchFilter(search)
      for (const value of [...filter.values, ...filter.windowValues]) {
        expect(new TextEncoder().encode(value).length).toBeLessThanOrEqual(50)
      }
    }
  })
})
