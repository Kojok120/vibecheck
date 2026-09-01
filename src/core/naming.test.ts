import { describe, expect, it } from 'vitest'
import {
  compactUrl,
  formatStamp,
  hostOf,
  itemLabel,
  screenshotFileName,
  sessionFolderName,
  slugify,
  summarise,
} from './naming'

describe('slugify', () => {
  it('collapses punctuation and spaces into single hyphens', () => {
    expect(slugify('Tighten  the  header!! (please)')).toBe('tighten-the-header-please')
  })

  it('keeps Japanese so filenames stay readable', () => {
    expect(slugify('ヘッダーの余白を詰める')).toBe('ヘッダーの余白を詰める')
  })

  it('truncates without leaving a trailing hyphen', () => {
    expect(slugify('a'.repeat(30) + ' ' + 'b'.repeat(30), 31)).toBe('a'.repeat(30))
  })

  it('returns an empty string when nothing survives', () => {
    expect(slugify('!!! ??? ...')).toBe('')
  })
})

describe('formatStamp', () => {
  it('formats local time as YYYYMMDD-HHmm', () => {
    expect(formatStamp(new Date(2026, 8, 1, 9, 5))).toBe('20260901-0905')
  })
})

describe('hostOf', () => {
  it('extracts the host', () => {
    expect(hostOf('https://example.com:3000/a/b?c=1')).toBe('example.com:3000')
  })

  it('falls back for unparseable input', () => {
    expect(hostOf('not a url')).toBe('page')
  })
})

describe('summarise', () => {
  it('flattens whitespace', () => {
    expect(summarise('a\n\n  b   c')).toBe('a b c')
  })

  it('adds an ellipsis when it has to cut', () => {
    const out = summarise('x'.repeat(100), 10)
    expect(out).toHaveLength(10)
    expect(out.endsWith('…')).toBe(true)
  })
})

describe('itemLabel', () => {
  it('prefers the requested change', () => {
    expect(itemLabel({ request: 'Right-align it', background: 'Numbers are clipped' })).toBe(
      'Right-align it',
    )
  })

  it('falls back to the background when there is no request', () => {
    expect(itemLabel({ request: '   ', background: 'Numbers are clipped' })).toBe(
      'Numbers are clipped',
    )
  })

  it('never returns an empty label', () => {
    expect(itemLabel({ request: '', background: '' })).toBe('Untitled')
  })
})

describe('sessionFolderName', () => {
  it('combines the timestamp and host', () => {
    const at = new Date(2026, 8, 1, 14, 30).getTime()
    expect(sessionFolderName({ createdAt: at, origin: 'https://app.example.com' })).toBe(
      '20260901-1430-app-example-com',
    )
  })
})

describe('screenshotFileName', () => {
  it('zero-pads the sequence so files sort in review order', () => {
    expect(screenshotFileName(3, { request: 'Tighten the header', background: '' })).toBe(
      '03-tighten-the-header.png',
    )
  })

  it('drops the slug when the text has no usable characters', () => {
    expect(screenshotFileName(12, { request: '???', background: '' })).toBe('12.png')
  })
})

describe('compactUrl', () => {
  it('keeps the host and path but drops the scheme', () => {
    expect(compactUrl('https://app.example.com/dashboard')).toBe('app.example.com/dashboard')
  })

  it('drops a bare root path', () => {
    expect(compactUrl('https://app.example.com/')).toBe('app.example.com')
  })

  it('keeps the query string', () => {
    expect(compactUrl('https://a.com/x?y=1')).toBe('a.com/x?y=1')
  })

  it('truncates long URLs', () => {
    expect(compactUrl(`https://a.com/${'x'.repeat(200)}`, 20)).toHaveLength(20)
  })

  it('degrades gracefully for unparseable input', () => {
    expect(compactUrl('about:blank')).toBe('about:blank')
  })
})
