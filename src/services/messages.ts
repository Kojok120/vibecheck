import { browser } from 'wxt/browser'
import type { CaptureResult, Locale, NewItem, Rect } from '@/types'

export type BackgroundRequest =
  | { type: 'capture'; rect: Rect; dpr: number }
  | { type: 'discard-shot'; shotKey: string }
  | { type: 'add-item'; item: NewItem }
  | { type: 'open-panel' }
  | { type: 'overlay-context' }

/**
 * The only state the injected overlay needs. It is deliberately not the whole
 * settings object: that carries GitHub and Slack tokens, and a content script
 * runs in the page's renderer process.
 */
export interface OverlayContext {
  locale: Locale
  openCount: number
}

export interface ResultMap {
  capture: CaptureResult
  'discard-shot': null
  'add-item': { seq: number }
  'open-panel': null
  'overlay-context': OverlayContext
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

/** Pushed from the worker to the side panel; there is no reply. */
export interface PanelNotice {
  type: 'panel-notice'
  kind: 'inject-failed'
}

export function isPanelNotice(message: unknown): message is PanelNotice {
  return (message as PanelNotice | undefined)?.type === 'panel-notice'
}
