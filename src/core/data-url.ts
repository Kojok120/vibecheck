/**
 * `captureVisibleTab` hands back a data: URL. Decoding it by hand (rather than
 * `fetch`ing it) keeps the capture path working in the service worker without
 * depending on data: URL fetch support.
 */
export function dataUrlToBytes(dataUrl: string): { bytes: Uint8Array; mime: string } {
  const comma = dataUrl.indexOf(',')
  if (!dataUrl.startsWith('data:') || comma < 0) {
    throw new Error('Not a data URL')
  }
  const meta = dataUrl.slice(5, comma)
  const payload = dataUrl.slice(comma + 1)
  const mime = meta.split(';')[0] || 'application/octet-stream'

  if (!meta.includes('base64')) {
    return { bytes: new TextEncoder().encode(decodeURIComponent(payload)), mime }
  }

  const binary = atob(payload)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
  return { bytes, mime }
}

export function dataUrlToBlob(dataUrl: string): Blob {
  const { bytes, mime } = dataUrlToBytes(dataUrl)
  return new Blob([bytes as unknown as BlobPart], { type: mime })
}
