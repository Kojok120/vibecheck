import { browser } from 'wxt/browser'
import type { FeedbackItem, Session } from '@/types'
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

/** Re-read, mutate, write. Sessions are small, so a whole-object write is fine. */
async function mutate(fn: (state: StoreState) => void | Promise<void>): Promise<StoreState> {
  const state = await loadState()
  await fn(state)
  await writeState(state)
  return state
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
  const { sessions, activeSessionId } = await loadState()
  const active = sessions.find((s) => s.id === activeSessionId)
  if (active && active.origin === origin) return active

  const existing = sessions.find((s) => s.origin === origin)
  if (existing) {
    await mutate((state) => {
      state.activeSessionId = existing.id
    })
    return existing
  }

  const session = createSession(origin)
  await mutate((state) => {
    state.sessions.unshift(session)
    state.activeSessionId = session.id
  })
  return session
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
