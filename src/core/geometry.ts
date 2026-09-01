import type { Rect } from '@/types'

export interface Point {
  x: number
  y: number
}

export interface Size {
  width: number
  height: number
}

/** Build a positive-area rect from two drag corners, in any order. */
export function rectFromDrag(a: Point, b: Point): Rect {
  return {
    x: Math.min(a.x, b.x),
    y: Math.min(a.y, b.y),
    width: Math.abs(a.x - b.x),
    height: Math.abs(a.y - b.y),
  }
}

/** Clip a rect to `bounds`, returning a rect that never extends outside it. */
export function clampRect(rect: Rect, bounds: Size): Rect {
  const left = Math.max(0, Math.min(rect.x, bounds.width))
  const top = Math.max(0, Math.min(rect.y, bounds.height))
  const right = Math.max(left, Math.min(rect.x + rect.width, bounds.width))
  const bottom = Math.max(top, Math.min(rect.y + rect.height, bounds.height))
  return { x: left, y: top, width: right - left, height: bottom - top }
}

/**
 * Convert a CSS-pixel viewport rect into the device-pixel rect used to crop a
 * `captureVisibleTab` bitmap. The capture is the whole viewport at `dpr`, so
 * the mapping is a pure scale — but it has to stay inside the bitmap or
 * `drawImage` silently produces transparent edges.
 */
export function toDeviceRect(rect: Rect, dpr: number, bitmap: Size): Rect {
  const scaled: Rect = {
    x: Math.round(rect.x * dpr),
    y: Math.round(rect.y * dpr),
    width: Math.round(rect.width * dpr),
    height: Math.round(rect.height * dpr),
  }
  return clampRect(scaled, bitmap)
}

/** A selection this small is almost always an accidental click, not a drag. */
export const MIN_SELECTION_PX = 8

export function isUsableSelection(rect: Rect): boolean {
  return rect.width >= MIN_SELECTION_PX && rect.height >= MIN_SELECTION_PX
}

export function centreOf(rect: Rect): Point {
  return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 }
}
