import { browser } from 'wxt/browser'
import type { FeedbackItem, Resolution, Session } from '@/types'
import { hostOf } from '@/core/naming'
import { pruneShots } from './db'

const KEY_SESSIONS = 'sessions'
const KEY_ACTIVE = 'activeSessionId'

export interface StoreState {
  sessions: Session[]
  activeSessionId?: string
}

export function newId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`
}

export async function loadState(): Promise<StoreState> {
  const raw = await browser.storage.local.get([KEY_SESSIONS, KEY_ACTIVE])
  const sessions = Array.isArray(raw[KEY_SESSIONS]) ? (raw[KEY_SESSIONS] as Session[]) : []
  const activeSessionId = typeof raw[KEY_ACTIVE] === 'string' ? raw[KEY_ACTIVE] : undefined
  return { sessions, activeSessionId }
}

async function writeState(state: StoreState): Promise<void> {
  await browser.storage.local.set({
    [KEY_SESSIONS]: state.sessions,
    [KEY_ACTIVE]: state.activeSessionId ?? null,
  })
}

const LOCK = 'vibecheck.store'

/**
 * Read-modify-write against `storage.local` is not atomic, and the side panel,
 * the injected overlay and the worker all write to the same key. An in-process
 * promise chain would only order one of them, so the lock is a Web Lock: it is
 * held across every extension context of this origin.
 */
async function mutate(fn: (state: StoreState) => void | Promise<void>): Promise<StoreState> {
  let result: StoreState | undefined
  await navigator.locks.request(LOCK, async () => {
    const state = await loadState()
    await fn(state)
    await writeState(state)
    result = state
  })
  if (!result) throw new Error('The VibeCheck store lock was released without writing')
  return result
}

function createSession(origin: string): Session {
  const now = Date.now()
  return {
    id: newId('ses'),
    title: hostOf(origin),
    origin,
    createdAt: now,
    updatedAt: now,
    items: [],
  }
}

/**
 * Feedback for one app belongs in one session, so a page from a different
 * origin starts a fresh one rather than mixing two reviews together.
 */
export async function sessionForOrigin(origin: string): Promise<Session> {
  // The find and the create have to share one lock: two tabs capturing into a
  // new origin at once would otherwise each create their own session.
  let resolved: Session | undefined
  await mutate((state) => {
    const active = state.sessions.find((s) => s.id === state.activeSessionId)
    if (active?.origin === origin) {
      resolved = active
      return
    }
    const existing = state.sessions.find((s) => s.origin === origin)
    if (existing) {
      state.activeSessionId = existing.id
      resolved = existing
      return
    }
    const session = createSession(origin)
    state.sessions.unshift(session)
    state.activeSessionId = session.id
    resolved = session
  })
  return resolved!
}

export async function startSession(origin: string): Promise<Session> {
  const session = createSession(origin)
  await mutate((state) => {
    state.sessions.unshift(session)
    state.activeSessionId = session.id
  })
  return session
}

export async function setActiveSession(sessionId: string): Promise<void> {
  await mutate((state) => {
    state.activeSessionId = sessionId
  })
}

export async function addItem(sessionId: string, item: FeedbackItem): Promise<void> {
  await mutate((state) => {
    const session = state.sessions.find((s) => s.id === sessionId)
    if (!session) return
    session.items.push(item)
    session.updatedAt = Date.now()
  })
}

export async function updateItem(
  sessionId: string,
  itemId: string,
  patch: Partial<FeedbackItem>,
): Promise<void> {
  await mutate((state) => {
    const session = state.sessions.find((s) => s.id === sessionId)
    const index = session?.items.findIndex((i) => i.id === itemId) ?? -1
    if (!session || index < 0) return
    session.items[index] = { ...session.items[index]!, ...patch }
    session.updatedAt = Date.now()
  })
}

/** Tick or untick several items in one write. */
export async function setChecked(
  sessionId: string,
  itemIds: string[],
  checked: boolean,
): Promise<void> {
  const ids = new Set(itemIds)
  await mutate((state) => {
    const session = state.sessions.find((s) => s.id === sessionId)
    if (!session) return
    session.items = session.items.map((item) =>
      ids.has(item.id) ? { ...item, checked } : item,
    )
  })
}

/**
 * Clear a batch off the open list once the reviewer has decided what to do
 * with it. Unticking matters as much as marking: the next action should start
 * from what is still outstanding.
 */
export async function markDone(
  sessionId: string,
  itemIds: string[],
  resolution: Resolution,
): Promise<void> {
  const ids = new Set(itemIds)
  await mutate((state) => {
    const session = state.sessions.find((s) => s.id === sessionId)
    if (!session) return
    session.items = session.items.map((item) =>
      ids.has(item.id) ? { ...item, done: resolution, checked: false } : item,
    )
    session.updatedAt = Date.now()
  })
}

/** Put items back on the open list, ticked so they are ready to send again. */
export async function reopen(sessionId: string, itemIds: string[]): Promise<void> {
  const ids = new Set(itemIds)
  await mutate((state) => {
    const session = state.sessions.find((s) => s.id === sessionId)
    if (!session) return
    session.items = session.items.map((item) => {
      if (!ids.has(item.id)) return item
      const { done: _done, ...rest } = item
      return { ...rest, checked: true }
    })
    session.updatedAt = Date.now()
  })
}

export async function removeItems(sessionId: string, itemIds: string[]): Promise<void> {
  const ids = new Set(itemIds)
  await mutate((state) => {
    const session = state.sessions.find((s) => s.id === sessionId)
    if (!session) return
    session.items = session.items.filter((item) => !ids.has(item.id))
    session.updatedAt = Date.now()
  })
  await collectGarbage()
}

export async function reorderItems(sessionId: string, orderedIds: string[]): Promise<void> {
  await mutate((state) => {
    const session = state.sessions.find((s) => s.id === sessionId)
    if (!session) return
    const byId = new Map(session.items.map((item) => [item.id, item]))
    const reordered = orderedIds.flatMap((id) => {
      const item = byId.get(id)
      if (!item) return []
      byId.delete(id)
      return [item]
    })
    // Anything the caller did not mention keeps its relative position at the end.
    session.items = [...reordered, ...byId.values()]
    session.updatedAt = Date.now()
  })
}

export async function removeSession(sessionId: string): Promise<void> {
  await mutate((state) => {
    state.sessions = state.sessions.filter((s) => s.id !== sessionId)
    if (state.activeSessionId === sessionId) {
      state.activeSessionId = state.sessions[0]?.id
    }
  })
  await collectGarbage()
}

export async function renameSession(sessionId: string, title: string): Promise<void> {
  await mutate((state) => {
    const session = state.sessions.find((s) => s.id === sessionId)
    if (session) session.title = title
  })
}

/** Delete screenshot blobs no session references any more. */
export async function collectGarbage(): Promise<number> {
  const { sessions } = await loadState()
  const keep = new Set(
    sessions.flatMap((s) => s.items.map((i) => i.shotKey).filter((k): k is string => !!k)),
  )
  return pruneShots(keep)
}

export function watchState(onChange: (state: StoreState) => void): () => void {
  const listener = (
    changes: Record<string, { newValue?: unknown }>,
    areaName: string,
  ): void => {
    if (areaName !== 'local') return
    if (!(KEY_SESSIONS in changes) && !(KEY_ACTIVE in changes)) return
    void loadState().then(onChange)
  }
  browser.storage.onChanged.addListener(listener)
  return () => browser.storage.onChanged.removeListener(listener)
}
