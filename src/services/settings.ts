import { browser } from 'wxt/browser'
import type { Settings } from '@/types'

const KEY = 'settings'

/**
 * OAuth client ids are public by design; the device flow never uses a secret.
 * There is no shared app yet, so each install points at its own — see the
 * GitHub section of the README.
 */
export const DEFAULT_GITHUB_CLIENT_ID = ''

export function isClientIdMissing(clientId: string): boolean {
  return clientId.trim().length === 0
}
export const DEFAULT_ASSET_BRANCH = 'vibecheck-assets'

export const DEFAULT_SETTINGS: Settings = {
  locale: 'auto',
  github: {
    clientId: DEFAULT_GITHUB_CLIENT_ID,
    assetBranch: DEFAULT_ASSET_BRANCH,
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

export async function saveSettings(patch: Partial<Settings>): Promise<Settings> {
  const current = await loadSettings()
  const next = merge({ ...current, ...patch })
  await browser.storage.local.set({ [KEY]: next })
  return next
}

export function watchSettings(onChange: (settings: Settings) => void): () => void {
  const listener = (changes: Record<string, unknown>, areaName: string): void => {
    if (areaName === 'local' && KEY in changes) void loadSettings().then(onChange)
  }
  browser.storage.onChanged.addListener(listener)
  return () => browser.storage.onChanged.removeListener(listener)
}
