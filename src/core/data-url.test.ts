import { describe, expect, it } from 'vitest'
import { dataUrlToBlob, dataUrlToBytes } from './data-url'

const PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='

describe('dataUrlToBytes', () => {
  it('decodes base64 payloads and reports the mime type', () => {
    const { bytes, mime } = dataUrlToBytes(`data:image/png;base64,${PNG_BASE64}`)
    expect(mime).toBe('image/png')
    // PNG magic number.
    expect(Array.from(bytes.subarray(0, 4))).toEqual([0x89, 0x50, 0x4e, 0x47])
  })

  it('decodes percent-encoded payloads', () => {
    const { bytes, mime } = dataUrlToBytes('data:text/plain,hello%20world')
    expect(mime).toBe('text/plain')
    expect(new TextDecoder().decode(bytes)).toBe('hello world')
  })

  it('rejects anything that is not a data URL', () => {
    expect(() => dataUrlToBytes('https://example.com/a.png')).toThrow('Not a data URL')
  })
})

describe('dataUrlToBlob', () => {
  it('produces a blob of the right type and size', () => {
    const blob = dataUrlToBlob(`data:image/png;base64,${PNG_BASE64}`)
    expect(blob.type).toBe('image/png')
    expect(blob.size).toBe(atob(PNG_BASE64).length)
  })
})
