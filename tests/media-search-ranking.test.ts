import { describe, expect, it } from 'vitest'
import { mediaSearchScore, rankMediaSearch } from '../workers/media-api/src/index'

interface Item extends Record<string, unknown> {
  title: string
  tags?: string
  categories?: string
  description?: string
}

function item(title: string, extra: Partial<Item> = {}): Item {
  return { title, ...extra }
}

function titles(rows: Item[], query: string): string[] {
  return rankMediaSearch(rows, query).map(row => row.title)
}

describe('media search ranking', () => {
  // TIKO-096: "Car" listed a cave, a mountain, a carving, a castle and a goat
  // before any car, because every match was equal and the newest upload won.
  it('puts the thing searched for before things that only mention it', () => {
    const library = [
      item('Carved Cave Hall', { description: 'A hall carved into the rock.' }),
      item('Mountain Lake', { description: 'Carved by a glacier.' }),
      item('Scarf', { tags: JSON.stringify(['clothing']) }),
      item('Police Car', { tags: JSON.stringify(['car', 'police']) }),
      item('Carrot', { tags: JSON.stringify(['vegetable']) }),
      item('Sedan', { tags: JSON.stringify(['car', 'vehicle']) }),
      item('Car', { tags: JSON.stringify(['vehicle']) }),
      item('Car Wash', { tags: JSON.stringify(['cleaning']) }),
    ]

    expect(titles(library, 'Car')).toEqual([
      'Car',              // is a car
      'Police Car',       // a kind of car
      'Car Wash',         // has the word, but is not a car
      'Sedan',            // tagged as a car
      'Carrot',           // a word that starts the same
      'Carved Cave Hall',
      'Mountain Lake',    // only a description that mentions a word starting with it
      'Scarf',            // only the letters, mid-word
    ])
  })

  it('treats singular and plural as the same word', () => {
    expect(mediaSearchScore(item('Cars'), 'car')).toBe(100)
    expect(mediaSearchScore(item('Car'), 'cars')).toBe(100)
    expect(mediaSearchScore(item('Blueberries'), 'blueberry')).toBe(100)
    expect(mediaSearchScore(item('Boxes'), 'box')).toBe(100)
    // "Glass" is not the plural of "glas".
    expect(mediaSearchScore(item('Glass'), 'glass')).toBe(100)
  })

  it('ranks a title that is about the word above one that only includes it', () => {
    const short = mediaSearchScore(item('Red Car'), 'car')
    const long = mediaSearchScore(item('Boy Playing With A Red Car'), 'car')
    expect(short).toBeGreaterThan(long)
  })

  it('trusts a title over a tag, a tag over a category, and a category over a description', () => {
    const inTitle = mediaSearchScore(item('Garden Bird'), 'bird')
    const inTag = mediaSearchScore(item('Robin', { tags: JSON.stringify(['bird']) }), 'bird')
    const inCategory = mediaSearchScore(item('Robin', { categories: JSON.stringify(['bird']) }), 'bird')
    const inDescription = mediaSearchScore(item('Feeder', { description: 'A bird sits on it.' }), 'bird')
    expect(inTitle).toBeGreaterThan(inTag)
    expect(inTag).toBeGreaterThan(inCategory)
    expect(inCategory).toBeGreaterThan(inDescription)
    expect(inDescription).toBeGreaterThan(1)
  })

  it('finds half-typed words, below whole ones', () => {
    const whole = mediaSearchScore(item('Cat'), 'cat')
    const half = mediaSearchScore(item('Cat'), 'ca')
    const other = mediaSearchScore(item('Camel'), 'ca')
    expect(half).toBeGreaterThan(1)
    expect(half).toBeLessThan(whole)
    expect(other).toBe(half)
  })

  it('needs every word of a longer search', () => {
    expect(mediaSearchScore(item('Police Car'), 'police car')).toBe(100)
    expect(mediaSearchScore(item('Blue Police Car'), 'police car')).toBeGreaterThan(70)
    // One of the two words is not enough to count as a title match.
    expect(mediaSearchScore(item('Police Officer'), 'police car')).toBeLessThan(50)
  })

  it('reads the category from `folder`, which is how the list query names it', () => {
    expect(mediaSearchScore({ title: 'Robin', folder: JSON.stringify(['birds']) }, 'bird')).toBe(60)
  })

  it('orders equal matches by shorter, then earlier, title so the order is stable', () => {
    const library = [item('Zebra Car'), item('Blue Car'), item('Red Car')]
    expect(titles(library, 'car')).toEqual(['Red Car', 'Blue Car', 'Zebra Car'])
  })
})
