import { describe, expect, it } from 'vitest'
import {
  centreOf,
  clampRect,
  isUsableSelection,
  rectFromDrag,
  toDeviceRect,
} from './geometry'

describe('rectFromDrag', () => {
  it('normalises a drag made in any direction', () => {
    const downRight = rectFromDrag({ x: 10, y: 20 }, { x: 40, y: 60 })
    const upLeft = rectFromDrag({ x: 40, y: 60 }, { x: 10, y: 20 })
    expect(downRight).toEqual({ x: 10, y: 20, width: 30, height: 40 })
    expect(upLeft).toEqual(downRight)
  })
})

describe('clampRect', () => {
  it('clips a rect that overflows the bounds', () => {
    expect(clampRect({ x: 90, y: 90, width: 50, height: 50 }, { width: 100, height: 100 })).toEqual({
      x: 90,
      y: 90,
      width: 10,
      height: 10,
    })
  })

  it('collapses a rect that starts outside the bounds', () => {
    const r = clampRect({ x: -50, y: -50, width: 20, height: 20 }, { width: 100, height: 100 })
    expect(r.width).toBe(0)
    expect(r.height).toBe(0)
  })

  it('leaves a contained rect untouched', () => {
    const r = { x: 10, y: 10, width: 20, height: 20 }
    expect(clampRect(r, { width: 100, height: 100 })).toEqual(r)
  })
})

describe('toDeviceRect', () => {
  it('scales CSS pixels by the device pixel ratio', () => {
    expect(
      toDeviceRect({ x: 10, y: 20, width: 30, height: 40 }, 2, { width: 2000, height: 2000 }),
    ).toEqual({ x: 20, y: 40, width: 60, height: 80 })
  })

  it('rounds fractional ratios instead of truncating', () => {
    expect(
      toDeviceRect({ x: 10.5, y: 0, width: 33, height: 10 }, 1.5, { width: 2000, height: 2000 }),
    ).toEqual({ x: 16, y: 0, width: 50, height: 15 })
  })

  it('never reaches past the captured bitmap', () => {
    const r = toDeviceRect({ x: 500, y: 500, width: 400, height: 400 }, 2, {
      width: 1200,
      height: 1200,
    })
    expect(r.x + r.width).toBeLessThanOrEqual(1200)
    expect(r.y + r.height).toBeLessThanOrEqual(1200)
  })
})

describe('isUsableSelection', () => {
  it('rejects a stray click', () => {
    expect(isUsableSelection({ x: 0, y: 0, width: 2, height: 2 })).toBe(false)
  })

  it('accepts a real drag', () => {
    expect(isUsableSelection({ x: 0, y: 0, width: 120, height: 80 })).toBe(true)
  })
})

describe('centreOf', () => {
  it('returns the middle of the rect', () => {
    expect(centreOf({ x: 10, y: 10, width: 20, height: 40 })).toEqual({ x: 20, y: 30 })
  })
})
