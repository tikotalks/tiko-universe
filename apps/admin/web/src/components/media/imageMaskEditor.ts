/**
 * Geometry and history for the two-layer mask editor. Everything here is plain
 * arithmetic so it can be tested without a canvas: the component owns the pixels,
 * this module owns the decisions about where they go and how to step back.
 */

export type MaskLayerId = 'base' | 'overlay'

/** Which layer sits on top when the two are composited. */
export type LayerOrder = 'base-on-top' | 'overlay-on-top'

export type MaskTool = 'erase' | 'restore'

export interface Size {
  width: number
  height: number
}

export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

/** Where a layer's source pixels land on the editor canvas. */
export interface LayerPlacement {
  /** Multiplier on the source's natural size. 1 draws it pixel for pixel. */
  scale: number
  /** Canvas-space position of the layer's top-left corner, in editor pixels. */
  offsetX: number
  offsetY: number
}

export const IDENTITY_PLACEMENT: LayerPlacement = { scale: 1, offsetX: 0, offsetY: 0 }

function isUsableSize(size: Size): boolean {
  return Number.isFinite(size.width) && Number.isFinite(size.height) && size.width > 0 && size.height > 0
}

/**
 * Centres a source inside the canvas at the largest scale that fits both axes.
 * An uploaded original is usually the same size as the image it repairs, in which
 * case this is the identity placement — but it must not overflow when it isn't.
 *
 * @param source Natural size of the layer's image.
 * @param canvas Editor canvas size.
 * @returns The placement that contains the source, centred.
 */
export function containPlacement(source: Size, canvas: Size): LayerPlacement {
  if (!isUsableSize(source) || !isUsableSize(canvas)) return { ...IDENTITY_PLACEMENT }
  const scale = Math.min(canvas.width / source.width, canvas.height / source.height)
  return {
    scale,
    offsetX: (canvas.width - source.width * scale) / 2,
    offsetY: (canvas.height - source.height * scale) / 2,
  }
}

/**
 * The destination rectangle `drawImage` should use for a placed layer.
 *
 * @param source Natural size of the layer's image.
 * @param placement Scale and offset to apply.
 * @returns Canvas-space rectangle to draw into.
 */
export function placementRect(source: Size, placement: LayerPlacement): Rect {
  return {
    x: placement.offsetX,
    y: placement.offsetY,
    width: source.width * placement.scale,
    height: source.height * placement.scale,
  }
}

/**
 * Layers bottom first, which is the order they have to be painted in.
 *
 * @param order Which layer the operator put on top.
 * @returns Layer ids, bottom to top.
 */
export function stackBottomFirst(order: LayerOrder): MaskLayerId[] {
  return order === 'base-on-top' ? ['overlay', 'base'] : ['base', 'overlay']
}

/**
 * Turns a pointer position into editor pixels. Derived from the element's measured
 * box rather than from the zoom factor, so it stays correct when the browser has
 * fitted the canvas to the viewport itself.
 *
 * @param client Pointer position in client coordinates.
 * @param element Bounding box of the displayed canvas.
 * @param canvas Editor canvas size in pixels.
 * @returns The matching point in canvas pixels.
 */
export function viewToImagePoint(
  client: { x: number; y: number },
  element: { left: number; top: number; width: number; height: number },
  canvas: Size,
): { x: number; y: number } {
  if (element.width <= 0 || element.height <= 0) return { x: 0, y: 0 }
  return {
    x: (client.x - element.left) * (canvas.width / element.width),
    y: (client.y - element.top) * (canvas.height / element.height),
  }
}

/**
 * A filename the media API will accept for an edited picture.
 *
 * @param title Human title of the asset being edited.
 * @returns A lowercase-safe `.png` filename.
 */
export function maskedFileName(title: string): string {
  const stem = title.trim().replace(/[^a-z0-9_-]+/gi, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
  return `${stem || 'edited'}.png`
}

/**
 * Undo/redo over mask snapshots. Snapshots are opaque to this class — the editor
 * stores one alpha channel per stroke, which is a quarter of an `ImageData` and
 * keeps a deep history affordable.
 */
export class MaskHistory<T> {
  private past: T[] = []
  private future: T[] = []

  constructor(private readonly limit = 24) {}

  get undoDepth(): number {
    return this.past.length
  }

  get redoDepth(): number {
    return this.future.length
  }

  get canUndo(): boolean {
    return this.past.length > 0
  }

  get canRedo(): boolean {
    return this.future.length > 0
  }

  /**
   * The snapshot `undo` would return, without consuming it. Callers that keep one
   * snapshot per target need this to know which target's current state to capture.
   *
   * @returns The next undo snapshot, or undefined when there is nothing to undo.
   */
  peekUndo(): T | undefined {
    return this.past.at(-1)
  }

  /**
   * The snapshot `redo` would return, without consuming it.
   *
   * @returns The next redo snapshot, or undefined when there is nothing to redo.
   */
  peekRedo(): T | undefined {
    return this.future.at(-1)
  }

  /**
   * Records the state as it was before a change, discarding any redo trail.
   *
   * @param before Snapshot taken before the stroke is applied.
   */
  record(before: T): void {
    this.past.push(before)
    if (this.past.length > this.limit) this.past.shift()
    this.future = []
  }

  /**
   * Steps back one change.
   *
   * @param current Snapshot of the state being left behind, so redo can return to it.
   * @returns The previous snapshot, or undefined when there is nothing to undo.
   */
  undo(current: T): T | undefined {
    const previous = this.past.pop()
    if (previous === undefined) return undefined
    this.future.push(current)
    return previous
  }

  /**
   * Steps forward one undone change.
   *
   * @param current Snapshot of the state being left behind, so undo can return to it.
   * @returns The next snapshot, or undefined when there is nothing to redo.
   */
  redo(current: T): T | undefined {
    const next = this.future.pop()
    if (next === undefined) return undefined
    this.past.push(current)
    return next
  }

  clear(): void {
    this.past = []
    this.future = []
  }
}
