import { describe, expect, it } from 'vitest'
import { wrapLines } from './text-wrap'

/** Latin glyphs are 1 unit; CJK are 2 — close enough to a real font. */
const measure = (text: string) =>
  [...text].reduce((sum, ch) => sum + (ch.charCodeAt(0) > 0x2000 ? 2 : 1), 0)

describe('wrapLines', () => {
  it('breaks between words', () => {
    expect(wrapLines('the quick brown fox', 10, measure)).toEqual(['the quick', 'brown fox'])
  })

  it('never returns a line wider than the limit', () => {
    const text = 'alpha beta gamma delta epsilon zeta eta theta'
    for (const line of wrapLines(text, 12, measure)) {
      expect(measure(line)).toBeLessThanOrEqual(12)
    }
  })

  it('breaks Japanese by character since it has no spaces', () => {
    const lines = wrapLines('ヘッダーの余白が広すぎる', 8, measure)
    expect(lines).toEqual(['ヘッダー', 'の余白が', '広すぎる'])
  })

  it('hard-breaks a single word longer than the line', () => {
    const lines = wrapLines('https://example.com/a/very/long/path', 10, measure)
    expect(lines.length).toBeGreaterThan(1)
    for (const line of lines) expect(measure(line)).toBeLessThanOrEqual(10)
    expect(lines.join('')).toBe('https://example.com/a/very/long/path')
  })

  it('honours explicit newlines', () => {
    expect(wrapLines('one\ntwo', 40, measure)).toEqual(['one', 'two'])
  })

  it('keeps blank lines between paragraphs', () => {
    expect(wrapLines('a\n\nb', 40, measure)).toEqual(['a', '', 'b'])
  })

  it('loses no visible text', () => {
    const text = 'Right-align the totals and add thousands separators everywhere'
    expect(wrapLines(text, 14, measure).join(' ').replace(/\s+/g, ' ')).toBe(text)
  })

  it('degrades to a single line if there is no width to work with', () => {
    expect(wrapLines('anything', 0, measure)).toEqual(['anything'])
  })
})
