import { useCallback, useEffect, useMemo, useState } from 'react'
import { browser } from 'wxt/browser'
import { resolveLocale } from '@/core/i18n'
import { getShot } from '@/services/db'
import { DEFAULT_SETTINGS, loadSettings, watchSettings } from '@/services/settings'
import { loadState, watchState, type StoreState } from '@/services/store'
import type { Locale, Session, Settings } from '@/types'

export function useStore(): StoreState & { active?: Session } {
  const [state, setState] = useState<StoreState>({ sessions: [] })

  useEffect(() => {
    void loadState().then(setState)
    return watchState(setState)
  }, [])

  const active = useMemo(
    () => state.sessions.find((s) => s.id === state.activeSessionId) ?? state.sessions[0],
    [state],
  )

  return { ...state, ...(active ? { active } : {}) }
}

export function useSettings(): Settings {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)
  useEffect(() => {
    void loadSettings().then(setSettings)
    return watchSettings(setSettings)
  }, [])
  return settings
}

export function useLocale(settings: Settings): Locale {
  return useMemo(
    () => resolveLocale(settings.locale, browser.i18n.getUILanguage()),
    [settings.locale],
  )
}

/** Turn an IndexedDB screenshot into an object URL, and clean it up after. */
export function useShotUrl(shotKey: string | undefined): string | undefined {
  const [url, setUrl] = useState<string>()

  useEffect(() => {
    if (!shotKey) {
      setUrl(undefined)
      return
    }
    let objectUrl: string | undefined
    let cancelled = false

    void getShot(shotKey).then((blob) => {
      if (cancelled || !blob) return
      objectUrl = URL.createObjectURL(blob)
      setUrl(objectUrl)
    })

    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [shotKey])

  return url
}

/** The shortcut the user actually has bound, so the UI never lies about it. */
export function useShortcut(command = 'toggle-vibecheck'): string | null {
  const [shortcut, setShortcut] = useState<string | null>(null)
  useEffect(() => {
    void browser.commands.getAll().then((commands) => {
      const found = commands.find((c) => c.name === command)
      setShortcut(found?.shortcut ? found.shortcut : null)
    })
  }, [command])
  return shortcut
}

export interface Status {
  text: string
  tone: 'info' | 'success' | 'error'
}

export function useStatus() {
  const [status, setStatus] = useState<Status | null>(null)
  const [busy, setBusy] = useState(false)

  const report = useCallback((text: string, tone: Status['tone'] = 'success') => {
    setStatus({ text, tone })
    if (tone !== 'error') {
      window.setTimeout(() => setStatus((s) => (s?.text === text ? null : s)), 4000)
    }
  }, [])

  const run = useCallback(
    async (working: string, task: () => Promise<string | void>) => {
      setBusy(true)
      setStatus({ text: working, tone: 'info' })
      try {
        const done = await task()
        setStatus(done ? { text: done, tone: 'success' } : null)
        // Only clear the message this run put up: a later error must not be
        // swept away by an earlier success's timer.
        if (done) {
          window.setTimeout(() => setStatus((s) => (s?.text === done ? null : s)), 4000)
        }
      } catch (error) {
        setStatus({
          text: error instanceof Error ? error.message : String(error),
          tone: 'error',
        })
      } finally {
        setBusy(false)
      }
    },
    [],
  )

  return { status, busy, report, run, dismiss: () => setStatus(null) }
}
