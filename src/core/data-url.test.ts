import { describe, expect, it } from 'vitest'
import { blobToBase64, dataUrlToBlob, dataUrlToBytes } from './data-url'

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

describe('blobToBase64', () => {
  it('round-trips a blob back to its base64 payload', async () => {
    const blob = dataUrlToBlob(`data:image/png;base64,${PNG_BASE64}`)
    expect(await blobToBase64(blob)).toBe(PNG_BASE64)
  })

  it('handles payloads larger than one chunk', async () => {
    const bytes = new Uint8Array(100_000).map((_, i) => i % 256)
    const blob = new Blob([bytes])
    expect(await blobToBase64(blob)).toBe(Buffer.from(bytes).toString('base64'))
  })
})
