import { browser } from 'wxt/browser'
import type { Settings } from '@/types'

const KEY = 'settings'

/**
 * Where the one-click GitHub sign-in is completed. The secret lives there, not
 * here; the source is in `worker/`. A fork can point this at its own copy.
 */
export const DEFAULT_AUTH_ENDPOINT = 'https://vibecheck-auth.kojokamo120.workers.dev'

export function isAuthEndpointMissing(endpoint: string): boolean {
  return endpoint.trim().length === 0
}

export const DEFAULT_SETTINGS: Settings = {
  locale: 'auto',
  github: {
    authEndpoint: DEFAULT_AUTH_ENDPOINT,
    recentRepos: [],
  },
  slack: {},
  discord: { webhooks: [] },
}

function merge(stored: unknown): Settings {
  const value = (stored ?? {}) as Partial<Settings>
  return {
    ...DEFAULT_SETTINGS,
    ...value,
    github: { ...DEFAULT_SETTINGS.github, ...value.github },
    slack: { ...DEFAULT_SETTINGS.slack, ...value.slack },
    discord: { ...DEFAULT_SETTINGS.discord, ...value.discord },
  }
}

export async function loadSettings(): Promise<Settings> {
  const raw = await browser.storage.local.get(KEY)
  return merge(raw[KEY])
}

/**
 * Apply a change against whatever is stored *now*.
 *
 * The GitHub device flow can sit waiting for minutes; saving a patch built
 * from the settings a component captured at click time would quietly undo
 * anything edited in the meantime.
 */
export async function updateSettings(
  apply: (current: Settings) => Partial<Settings>,
): Promise<Settings> {
  const current = await loadSettings()
  const next = merge({ ...current, ...apply(current) })
  await browser.storage.local.set({ [KEY]: next })
  return next
}

export function saveSettings(patch: Partial<Settings>): Promise<Settings> {
  return updateSettings(() => patch)
}

export function watchSettings(onChange: (settings: Settings) => void): () => void {
  const listener = (changes: Record<string, unknown>, areaName: string): void => {
    if (areaName === 'local' && KEY in changes) void loadSettings().then(onChange)
  }
  browser.storage.onChanged.addListener(listener)
  return () => browser.storage.onChanged.removeListener(listener)
}
