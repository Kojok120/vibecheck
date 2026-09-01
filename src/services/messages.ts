import { browser } from 'wxt/browser'
import type { CaptureResult, NewItem, Rect } from '@/types'

export type BackgroundRequest =
  | { type: 'capture'; rect: Rect; dpr: number }
  | { type: 'discard-shot'; shotKey: string }
  | { type: 'add-item'; item: NewItem }
  | { type: 'open-panel' }

export interface ResultMap {
  capture: CaptureResult
  'discard-shot': null
  'add-item': { seq: number }
  'open-panel': null
}

export type Envelope<T> = { ok: true; value: T } | { ok: false; error: string }

/** Send a request to the background worker, surfacing its errors as throws. */
export async function request<K extends BackgroundRequest['type']>(
  message: Extract<BackgroundRequest, { type: K }>,
): Promise<ResultMap[K]> {
  const reply = (await browser.runtime.sendMessage(message)) as
    | Envelope<ResultMap[K]>
    | undefined
  if (!reply) throw new Error('No response from the VibeCheck background worker')
  if (!reply.ok) throw new Error(reply.error)
  return reply.value
}

export function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  return String(error)
}
