import { describe, expect, it } from 'vitest'
import {
  DEFAULT_THEME,
  fitImage,
  layoutSheet,
  type SheetSource,
  type WrapText,
} from './sheet-layout'

/** Deterministic stand-in for canvas measurement: every glyph is half an em. */
const wrap: WrapText = (text, maxWidth, font) => {
  const perLine = Math.max(1, Math.floor(maxWidth / (font.size * 0.5)))
  const lines: string[] = []
  for (let i = 0; i < text.length; i += perLine) lines.push(text.slice(i, i + perLine))
  return lines.length ? lines : ['']
}

const labels = { background: 'Background', request: 'Requested change' }

function source(overrides: Partial<SheetSource> = {}): SheetSource {
  return {
    seq: 1,
    location: 'app.example.com/dashboard',
    background: 'Numbers are clipped.',
    request: 'Right-align them.',
    image: { width: 1200, height: 400 },
    ...overrides,
  }
}

describe('fitImage', () => {
  it('shrinks a wide screenshot to the content width', () => {
    expect(fitImage({ width: 1600, height: 800 }, 800, 5000)).toEqual({ width: 800, height: 400 })
  })

  it('never enlarges a small screenshot', () => {
    expect(fitImage({ width: 200, height: 100 }, 800, 5000)).toEqual({ width: 200, height: 100 })
  })

  it('honours the height cap for very tall screenshots', () => {
    const fitted = fitImage({ width: 400, height: 4000 }, 800, 1000)
    expect(fitted.height).toBe(1000)
    expect(fitted.width).toBe(100)
  })

  it('tolerates a degenerate image', () => {
    expect(fitImage({ width: 0, height: 0 }, 800, 1000)).toEqual({ width: 0, height: 0 })
  })
})

describe('layoutSheet', () => {
  it('stacks items downward without overlap', () => {
    const { blocks } = layoutSheet([source({ seq: 1 }), source({ seq: 2 })], labels, wrap)
    const first = blocks[0]!
    const second = blocks[1]!
    const firstBottom = first.image!.y + first.image!.height
    expect(second.lines[0]!.y).toBeGreaterThan(firstBottom)
  })

  it('places the badge inside the top-left corner of its own screenshot', () => {
    const { blocks } = layoutSheet([source()], labels, wrap)
    const { image, badge } = blocks[0]!
    expect(badge!.x).toBeGreaterThanOrEqual(image!.x)
    expect(badge!.y).toBeGreaterThanOrEqual(image!.y)
    expect(badge!.x + badge!.size).toBeLessThan(image!.x + image!.width)
    expect(badge!.y + badge!.size).toBeLessThan(image!.y + image!.height)
  })

  it('keeps each badge with its own item', () => {
    const { blocks } = layoutSheet([source({ seq: 1 }), source({ seq: 2 })], labels, wrap)
    expect(blocks.map((b) => b.seq)).toEqual([1, 2])
    expect(blocks[0]!.badge!.y).toBeLessThan(blocks[1]!.badge!.y)
  })

  it('starts every item with its number and location', () => {
    const { blocks } = layoutSheet([source({ seq: 7 })], labels, wrap)
    expect(blocks[0]!.lines[0]!.text.startsWith('#7  app.example.com')).toBe(true)
    expect(blocks[0]!.lines[0]!.role).toBe('header')
  })

  it('omits the label of an empty field', () => {
    const { blocks } = layoutSheet([source({ background: '  ' })], labels, wrap)
    const texts = blocks[0]!.lines.map((l) => l.text)
    expect(texts).not.toContain('Background')
    expect(texts).toContain('Requested change')
  })

  it('lays out a comment-only item with no image or badge', () => {
    const { blocks } = layoutSheet([source({ image: undefined })], labels, wrap)
    expect(blocks[0]!.image).toBeUndefined()
    expect(blocks[0]!.badge).toBeUndefined()
  })

  it('draws a divider between items but not after the last one', () => {
    const { blocks } = layoutSheet([source({ seq: 1 }), source({ seq: 2 })], labels, wrap)
    expect(blocks[0]!.divider).toBeGreaterThan(0)
    expect(blocks[1]!.divider).toBeUndefined()
  })

  it('is tall enough to contain everything it laid out', () => {
    const { height, blocks } = layoutSheet([source({ seq: 1 }), source({ seq: 2 })], labels, wrap)
    const last = blocks[1]!
    expect(height).toBeGreaterThan(last.image!.y + last.image!.height)
  })

  it('keeps every line inside the horizontal padding', () => {
    const { blocks, width } = layoutSheet([source()], labels, wrap)
    for (const line of blocks[0]!.lines) {
      expect(line.x).toBe(DEFAULT_THEME.padding)
    }
    expect(blocks[0]!.image!.width).toBeLessThanOrEqual(width - DEFAULT_THEME.padding * 2)
  })

  it('grows with wrapped text instead of overlapping the screenshot', () => {
    const short = layoutSheet([source({ request: 'short' })], labels, wrap)
    const long = layoutSheet([source({ request: 'x'.repeat(600) })], labels, wrap)
    expect(long.height).toBeGreaterThan(short.height)
    expect(long.blocks[0]!.image!.y).toBeGreaterThan(short.blocks[0]!.image!.y)
  })

  it('returns an empty sheet for no items', () => {
    const layout = layoutSheet([], labels, wrap)
    expect(layout.blocks).toEqual([])
    expect(layout.height).toBe(DEFAULT_THEME.padding * 2)
  })
})
