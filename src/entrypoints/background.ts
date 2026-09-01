import { browser } from 'wxt/browser'
import { defineBackground } from 'wxt/utils/define-background'
import { captureRegion } from '@/services/capture'
import { deleteShots } from '@/services/db'
import { errorMessage, type BackgroundRequest, type Envelope } from '@/services/messages'
import { addItem, collectGarbage, loadState, newId, sessionForOrigin } from '@/services/store'
import type { FeedbackItem } from '@/types'

const COMMAND = 'toggle-vibecheck'
const OVERLAY_FILE = '/overlay.js'

async function handle(
  message: BackgroundRequest,
  sender: chrome.runtime.MessageSender,
): Promise<unknown> {
  switch (message.type) {
    case 'capture': {
      const windowId = sender.tab?.windowId
      if (windowId === undefined) throw new Error('Capture must come from a tab')
      return captureRegion(windowId, message.rect, message.dpr)
    }

    case 'discard-shot': {
      await deleteShots([message.shotKey])
      return null
    }

    case 'add-item': {
      const origin = originOf(message.item.page.url)
      const session = await sessionForOrigin(origin)
      const item: FeedbackItem = {
        ...message.item,
        id: newId('itm'),
        createdAt: Date.now(),
        checked: true,
      }
      await addItem(session.id, item)
      const { sessions } = await loadState()
      const seq = sessions.find((s) => s.id === session.id)?.items.length ?? 1
      return { seq }
    }

    case 'open-panel': {
      const tabId = sender.tab?.id
      if (tabId !== undefined) openPanel(tabId)
      return null
    }
  }
}

function originOf(url: string): string {
  try {
    return new URL(url).origin
  } catch {
    return url
  }
}

/**
 * `sidePanel.open()` consumes the user gesture, so it has to be the first
 * thing a command handler does — an `await` before it loses the gesture and
 * the call is rejected.
 */
function openPanel(tabId: number): void {
  chrome.sidePanel.open({ tabId }).catch(() => {
    // Already open, or the gesture expired. Neither is worth surfacing.
  })
}

/**
 * The overlay is injected on demand rather than declared in the manifest, so
 * VibeCheck only ever touches a page the reviewer explicitly invoked it on.
 */
async function toggleOverlay(tabId: number): Promise<void> {
  await browser.scripting.executeScript({ target: { tabId }, files: [OVERLAY_FILE] })
}

export default defineBackground(() => {
  browser.runtime.onMessage.addListener(
    (message: BackgroundRequest, sender, sendResponse: (response: Envelope<unknown>) => void) => {
      handle(message, sender).then(
        (value) => sendResponse({ ok: true, value }),
        (error: unknown) => sendResponse({ ok: false, error: errorMessage(error) }),
      )
      return true // keep the channel open for the async reply
    },
  )

  browser.commands.onCommand.addListener((command, tab) => {
    if (command !== COMMAND || tab?.id === undefined) return
    const tabId = tab.id
    openPanel(tabId)
    void toggleOverlay(tabId).catch((error: unknown) => {
      console.warn('[VibeCheck] could not inject the overlay:', errorMessage(error))
    })
  })

  browser.action.onClicked.addListener((tab) => {
    if (tab.id === undefined) return
    openPanel(tab.id)
    void toggleOverlay(tab.id).catch(() => undefined)
  })

  browser.runtime.onInstalled.addListener((details) => {
    void chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false })
    if (details.reason === 'install') {
      void browser.tabs.create({ url: browser.runtime.getURL('/options.html#welcome') })
    }
  })

  browser.runtime.onStartup.addListener(() => {
    void collectGarbage()
  })
})
