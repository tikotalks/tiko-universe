import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import TikoQrCode from './TikoQrCode.vue'

function moduleCountOf(viewBox: string, margin = 4): number {
  const size = Number(viewBox.split(' ')[2])
  return size - margin * 2
}

/** Is the module at (row, column) drawn? The path holds one square per module. */
function isDark(path: string, row: number, column: number, margin = 4): boolean {
  return path.includes(`M${column + margin} ${row + margin}h1v1h-1z`)
}

describe('TikoQrCode', () => {
  it('renders a square QR grid of a valid version size', () => {
    const wrapper = mount(TikoQrCode, {
      props: { value: 'https://radio.tikoapps.org/?collection=K7M2Q9XR' },
    })

    const svg = wrapper.get('svg')
    const count = moduleCountOf(svg.attributes('viewBox') as string)

    // Every QR version is 21 + 4n modules across.
    expect(count).toBeGreaterThanOrEqual(21)
    expect((count - 21) % 4).toBe(0)
    expect(svg.attributes('width')).toBe('200')
  })

  it('draws the three finder patterns a scanner looks for', () => {
    const wrapper = mount(TikoQrCode, {
      props: { value: 'https://radio.tikoapps.org/?collection=K7M2Q9XR' },
    })
    const path = wrapper.get('path').attributes('d') as string
    const count = moduleCountOf(wrapper.get('svg').attributes('viewBox') as string)

    // A finder pattern is a 7×7 ring: dark border, light gap, dark 3×3 centre.
    // They sit in three corners; the fourth carries data.
    for (const [top, left] of [[0, 0], [0, count - 7], [count - 7, 0]]) {
      expect(isDark(path, top, left)).toBe(true)
      expect(isDark(path, top + 1, left + 1)).toBe(false)
      expect(isDark(path, top + 3, left + 3)).toBe(true)
      expect(isDark(path, top + 6, left + 6)).toBe(true)
    }
  })

  it('encodes what it is given, and nothing when there is nothing to encode', () => {
    const first = mount(TikoQrCode, { props: { value: 'ONE' } }).get('path').attributes('d')
    const second = mount(TikoQrCode, { props: { value: 'TWO' } }).get('path').attributes('d')
    expect(first).not.toBe(second)

    expect(mount(TikoQrCode, { props: { value: '' } }).find('svg').exists()).toBe(false)
  })

  it('keeps the quiet zone the caller asks for', () => {
    const wrapper = mount(TikoQrCode, { props: { value: 'ONE', margin: 2 } })
    const size = Number((wrapper.get('svg').attributes('viewBox') as string).split(' ')[2])
    const count = moduleCountOf(wrapper.get('svg').attributes('viewBox') as string, 2)

    expect(size).toBe(count + 4)
    expect(isDark(wrapper.get('path').attributes('d') as string, 0, 0, 2)).toBe(true)
  })
})
