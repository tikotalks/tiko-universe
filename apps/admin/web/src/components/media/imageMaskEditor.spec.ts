import { describe, expect, it } from 'vitest'
import {
  containPlacement,
  IDENTITY_PLACEMENT,
  MaskHistory,
  maskedFileName,
  placementRect,
  stackBottomFirst,
  viewToImagePoint,
} from './imageMaskEditor'

describe('containPlacement', () => {
  it('leaves an upload that already matches the canvas untouched', () => {
    expect(containPlacement({ width: 1024, height: 1024 }, { width: 1024, height: 1024 }))
      .toEqual({ scale: 1, offsetX: 0, offsetY: 0 })
  })

  it('shrinks and centres an upload that is larger than the image it repairs', () => {
    const placement = containPlacement({ width: 2048, height: 1024 }, { width: 512, height: 512 })

    expect(placement.scale).toBe(0.25)
    expect(placement.offsetX).toBe(0)
    // 1024 * 0.25 = 256 tall in a 512 canvas, so 128 of letterboxing top and bottom.
    expect(placement.offsetY).toBe(128)
  })

  it('falls back to the identity placement for a source with no dimensions yet', () => {
    expect(containPlacement({ width: 0, height: 0 }, { width: 512, height: 512 })).toEqual(IDENTITY_PLACEMENT)
  })
})

describe('placementRect', () => {
  it('applies scale and offset to the source size', () => {
    expect(placementRect({ width: 200, height: 100 }, { scale: 1.5, offsetX: 10, offsetY: -20 }))
      .toEqual({ x: 10, y: -20, width: 300, height: 150 })
  })
})

describe('stackBottomFirst', () => {
  it('paints the layer that is not on top first', () => {
    expect(stackBottomFirst('base-on-top')).toEqual(['overlay', 'base'])
    expect(stackBottomFirst('overlay-on-top')).toEqual(['base', 'overlay'])
  })
})

describe('viewToImagePoint', () => {
  it('maps a pointer on a zoomed canvas back to full-resolution pixels', () => {
    const point = viewToImagePoint(
      { x: 150, y: 90 },
      { left: 50, top: 40, width: 200, height: 200 },
      { width: 1000, height: 1000 },
    )

    expect(point).toEqual({ x: 500, y: 250 })
  })

  it('returns the origin rather than dividing by an unmeasured element', () => {
    expect(viewToImagePoint({ x: 10, y: 10 }, { left: 0, top: 0, width: 0, height: 0 }, { width: 100, height: 100 }))
      .toEqual({ x: 0, y: 0 })
  })
})

describe('maskedFileName', () => {
  it('keeps a readable stem and always ends in .png', () => {
    expect(maskedFileName('Springbok — grazing')).toBe('Springbok-grazing.png')
  })

  it('names an untitled asset rather than producing a bare extension', () => {
    expect(maskedFileName('   ')).toBe('edited.png')
    expect(maskedFileName('!!!')).toBe('edited.png')
  })
})

describe('MaskHistory', () => {
  it('starts with nothing to undo or redo', () => {
    const history = new MaskHistory<string>()

    expect(history.canUndo).toBe(false)
    expect(history.canRedo).toBe(false)
    expect(history.undo('current')).toBeUndefined()
    expect(history.redo('current')).toBeUndefined()
  })

  it('returns the state from before the last stroke', () => {
    const history = new MaskHistory<string>()
    history.record('a')
    history.record('b')

    expect(history.undo('c')).toBe('b')
    expect(history.undo('b')).toBe('a')
    expect(history.canUndo).toBe(false)
  })

  it('redoes what it undid, in order', () => {
    const history = new MaskHistory<string>()
    history.record('a')
    history.record('b')
    history.undo('c')

    expect(history.canRedo).toBe(true)
    expect(history.redo('b')).toBe('c')
    expect(history.canRedo).toBe(false)
  })

  it('drops the redo trail once a new stroke is recorded', () => {
    const history = new MaskHistory<string>()
    history.record('a')
    history.undo('b')
    expect(history.canRedo).toBe(true)

    history.record('b')

    expect(history.canRedo).toBe(false)
  })

  it('forgets the oldest snapshot past the limit instead of growing without bound', () => {
    const history = new MaskHistory<string>(2)
    history.record('a')
    history.record('b')
    history.record('c')

    expect(history.undo('d')).toBe('c')
    expect(history.undo('c')).toBe('b')
    expect(history.canUndo).toBe(false)
  })

  it('clears both directions', () => {
    const history = new MaskHistory<string>()
    history.record('a')
    history.undo('b')

    history.clear()

    expect(history.canUndo).toBe(false)
    expect(history.canRedo).toBe(false)
  })
})
