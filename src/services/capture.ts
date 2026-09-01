import { browser } from 'wxt/browser'
import { dataUrlToBlob } from '@/core/data-url'
import { isUsableSelection, toDeviceRect } from '@/core/geometry'
import type { CaptureResult, Rect } from '@/types'
import { putShot } from './db'
import { newId } from './store'

/**
 * Crop the visible tab down to the reviewer's selection.
 *
 * Cropping happens here, in the worker, rather than in the page: runtime
 * messages are JSON-serialised, so shipping the bitmap back and forth would
 * mean base64-inflating every screenshot twice.
 */
export async function captureRegion(
  windowId: number,
  rect: Rect,
  dpr: number,
): Promise<CaptureResult> {
  if (!isUsableSelection(rect)) throw new Error('Selection is too small to capture')

  const dataUrl = await browser.tabs.captureVisibleTab(windowId, { format: 'png' })
  const bitmap = await createImageBitmap(dataUrlToBlob(dataUrl))

  try {
    const crop = toDeviceRect(rect, dpr, { width: bitmap.width, height: bitmap.height })
    if (crop.width < 1 || crop.height < 1) throw new Error('Selection is outside the viewport')

    const canvas = new OffscreenCanvas(crop.width, crop.height)
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Could not create a drawing context')
    context.drawImage(
      bitmap,
      crop.x,
      crop.y,
      crop.width,
      crop.height,
      0,
      0,
      crop.width,
      crop.height,
    )

    const blob = await canvas.convertToBlob({ type: 'image/png' })
    const shotKey = newId('shot')
    await putShot(shotKey, blob)
    return { shotKey, width: crop.width, height: crop.height }
  } finally {
    bitmap.close()
  }
}
