import { useEffect, useRef, useState } from 'react'
import { browser } from 'wxt/browser'
import { copyText } from '@/services/clipboard'
import * as github from '@/services/github'
import {
  DEFAULT_ASSET_BRANCH,
  DEFAULT_GITHUB_CLIENT_ID,
  isClientIdMissing,
  saveSettings,
  updateSettings,
} from '@/services/settings'
import * as slack from '@/services/slack'
import { isWebhookUrl } from '@/services/discord'
import { Button, Spinner } from '@/ui/components'
import { useLocale, useSettings, useShortcut, useStatus } from '@/ui/hooks'
import { optionsStrings } from '@/ui/options-strings'
import { newId } from '@/services/store'
import type { Locale } from '@/types'
import { inputClass, Labelled, Section } from './Section'

const SHORTCUTS_URL = 'chrome://extensions/shortcuts'
const SETUP_DOCS = 'https://github.com/Kojok120/vibecheck#setup'

export function Options() {
  const settings = useSettings()
  const locale = useLocale(settings)
  const t = optionsStrings(locale)
  const shortcut = useShortcut()
  const { status, report } = useStatus()

  return (
    <main className="mx-auto max-w-2xl space-y-4 p-6">
      <header className="mb-2">
        <h1 className="text-[18px] font-semibold">{t.title}</h1>
        <p className="mt-1 text-[13px] text-ink-500 dark:text-ink-400">{t.subtitle}</p>
      </header>

      {status && (
        <p
          className={`rounded-lg px-3 py-2 text-[12.5px] ${
            status.tone === 'error'
              ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200'
              : 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200'
          }`}
        >
          {status.text}
        </p>
      )}

      <Section title={t.shortcut} description={t.shortcutBody}>
        <div className="flex items-center gap-3">
          <kbd className="rounded-md bg-ink-100 px-2.5 py-1 font-mono text-[13px] dark:bg-ink-950">
            {shortcut ?? t.shortcutNone}
          </kbd>
          <Button
            onClick={() =>
              void browser.tabs.create({ url: SHORTCUTS_URL }).catch(() => copyText(SHORTCUTS_URL))
            }
          >
            {t.openShortcuts}
          </Button>
        </div>
      </Section>

      <Section title={t.language}>
        <select
          value={settings.locale}
          onChange={(event) =>
            void saveSettings({ locale: event.target.value as Locale | 'auto' })
          }
          className={inputClass}
        >
          <option value="auto">{t.auto}</option>
          <option value="ja">{t.japanese}</option>
          <option value="en">{t.english}</option>
        </select>
      </Section>

      <GithubSection t={t} settings={settings} onReport={report} />
      <SlackSection t={t} settings={settings} onReport={report} />
      <DiscordSection t={t} settings={settings} onReport={report} />

      <Section title={t.danger}>
        <Button
          variant="secondary"
          className="text-rose-600 dark:text-rose-400"
          onClick={() => {
            if (!confirm(t.clearConfirm)) return
            void clearEverything(t.clearBlocked).then(
              () => report(t.cleared),
              (error: unknown) =>
                report(error instanceof Error ? error.message : String(error), 'error'),
            )
          }}
        >
          {t.clearAll}
        </Button>
      </Section>

      <p className="pb-6 text-center text-[12px]">
        <a
          href={SETUP_DOCS}
          target="_blank"
          rel="noreferrer"
          className="text-brand-700 hover:underline dark:text-brand-400"
        >
          {t.setupGuide}
        </a>
      </p>
    </main>
  )
}

/** An open side panel holds the IndexedDB connection, which blocks the delete. */
function clearEverything(blockedMessage: string): Promise<void> {
  return browser.storage.local.clear().then(
    () =>
      new Promise<void>((resolve, reject) => {
        const request = indexedDB.deleteDatabase('vibecheck')
        request.onsuccess = () => resolve()
        request.onerror = () => reject(request.error ?? new Error('Could not delete the database'))
        request.onblocked = () => reject(new Error(blockedMessage))
      }),
  )
}

type Reporter = (text: string, tone?: 'success' | 'error') => void
type Strings = ReturnType<typeof optionsStrings>
type Settings = ReturnType<typeof useSettings>

function GithubSection({
  t,
  settings,
  onReport,
}: {
  t: Strings
  settings: Settings
  onReport: Reporter
}) {
  const [device, setDevice] = useState<github.DeviceCode | null>(null)
  const [pending, setPending] = useState(false)
  const abort = useRef<AbortController | null>(null)

  const connect = async () => {
    const clientId = settings.github.clientId || DEFAULT_GITHUB_CLIENT_ID
    if (isClientIdMissing(clientId)) {
      onReport(t.clientIdMissing, 'error')
      return
    }
    setPending(true)
    const controller = new AbortController()
    abort.current = controller
    try {
      const code = await github.startDeviceFlow(clientId)
      setDevice(code)
      // Opened in the background: the reviewer needs to read the code first.
      await browser.tabs.create({ url: code.verificationUri, active: false })
      const token = await github.pollDeviceFlow(clientId, code, { signal: controller.signal })
      const user = await github.getUser(token)
      // Approval can take minutes; merge onto whatever is stored now so any
      // edits made while waiting survive.
      await updateSettings((current) => ({
        github: { ...current.github, token, login: user.login },
      }))
      onReport(t.connectedAs(user.login))
    } catch (error) {
      onReport(error instanceof Error ? error.message : String(error), 'error')
    } finally {
      abort.current = null
      setDevice(null)
      setPending(false)
    }
  }

  const connected = Boolean(settings.github.token)

  return (
    <Section
      title={t.github}
      description={t.githubBody}
      aside={
        connected ? (
          <Button
            onClick={() => {
              const { token: _token, login: _login, ...rest } = settings.github
              void saveSettings({ github: rest })
            }}
          >
            {t.disconnect}
          </Button>
        ) : (
          <Button
            variant="primary"
            disabled={pending || isClientIdMissing(settings.github.clientId)}
            onClick={() => void connect()}
          >
            {pending ? <Spinner /> : null}
            {t.connect}
          </Button>
        )
      }
    >
      {connected && settings.github.login && (
        <p className="text-[12.5px] font-semibold text-emerald-700 dark:text-emerald-400">
          {t.connectedAs(settings.github.login)}
        </p>
      )}

      {device && (
        <div className="rounded-xl bg-brand-50 p-4 dark:bg-ink-950">
          <p className="text-[12.5px] text-ink-600 dark:text-ink-400">{t.deviceCodeHint}</p>
          <p className="my-2 font-mono text-[26px] font-bold tracking-[0.2em]">{device.userCode}</p>
          <div className="flex gap-2">
            <Button onClick={() => void copyText(device.userCode)}>{t.copyCode}</Button>
            <Button onClick={() => void browser.tabs.create({ url: device.verificationUri })}>
              {t.openGithub}
            </Button>
            <Button variant="ghost" onClick={() => abort.current?.abort()}>
              {t.cancel}
            </Button>
          </div>
          <p className="mt-2 flex items-center gap-2 text-[12px] text-ink-500 dark:text-ink-400">
            <Spinner /> {t.waiting}
          </p>
        </div>
      )}

      <Labelled label={t.assetBranch} hint={t.assetBranchHint}>
        <TextSetting
          value={settings.github.assetBranch}
          onCommit={(assetBranch) =>
            void updateSettings((current) => ({
              github: { ...current.github, assetBranch: assetBranch || DEFAULT_ASSET_BRANCH },
            }))
          }
        />
      </Labelled>

      <Labelled label={t.defaultRepo}>
        <TextSetting
          value={settings.github.defaultRepo ?? ''}
          placeholder="owner/repo"
          onCommit={(defaultRepo) =>
            void updateSettings((current) => ({ github: { ...current.github, defaultRepo } }))
          }
        />
      </Labelled>

      <Labelled label={t.clientId} hint={t.clientIdHint}>
        <TextSetting
          value={settings.github.clientId}
          onCommit={(clientId) =>
            void updateSettings((current) => ({ github: { ...current.github, clientId } }))
          }
        />
      </Labelled>
    </Section>
  )
}

function SlackSection({
  t,
  settings,
  onReport,
}: {
  t: Strings
  settings: Settings
  onReport: Reporter
}) {
  const [token, setToken] = useState(settings.slack.token ?? '')
  const [pending, setPending] = useState(false)

  useEffect(() => setToken(settings.slack.token ?? ''), [settings.slack.token])

  const verify = async () => {
    setPending(true)
    try {
      const identity = await slack.verifyToken(token.trim())
      await updateSettings((current) => ({
        slack: { ...current.slack, token: token.trim(), teamName: identity.team },
      }))
      onReport(t.slackConnected(identity.team, identity.user))
    } catch (error) {
      onReport(error instanceof Error ? error.message : String(error), 'error')
    } finally {
      setPending(false)
    }
  }

  return (
    <Section
      title={t.slack}
      description={t.slackBody}
      aside={
        settings.slack.token ? (
          <Button onClick={() => void updateSettings(() => ({ slack: {} }))}>
            {t.disconnect}
          </Button>
        ) : null
      }
    >
      <Labelled label={t.slackToken} hint={t.slackTokenHint}>
        <input
          className={inputClass}
          type="password"
          placeholder="xoxb-…"
          value={token}
          onChange={(event) => setToken(event.target.value)}
        />
      </Labelled>
      <Button variant="primary" disabled={pending || !token.trim()} onClick={() => void verify()}>
        {pending ? <Spinner /> : null}
        {t.verify}
      </Button>
    </Section>
  )
}

function DiscordSection({
  t,
  settings,
  onReport,
}: {
  t: Strings
  settings: Settings
  onReport: Reporter
}) {
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')

  const add = () => {
    if (!isWebhookUrl(url)) {
      onReport(t.badWebhookUrl, 'error')
      return
    }
    const webhook = { id: newId('hook'), name: name.trim() || 'Discord', url: url.trim() }
    void updateSettings((current) => ({
      discord: {
        webhooks: [...current.discord.webhooks, webhook],
        defaultId: current.discord.defaultId ?? webhook.id,
      },
    }))
    setName('')
    setUrl('')
    onReport(t.saved)
  }

  return (
    <Section title={t.discord} description={t.discordBody}>
      {settings.discord.webhooks.length > 0 && (
        <ul className="divide-y divide-ink-200 rounded-lg ring-1 ring-ink-200 dark:divide-ink-800 dark:ring-ink-800">
          {settings.discord.webhooks.map((webhook) => (
            <li key={webhook.id} className="flex items-center gap-3 px-3 py-2">
              <span className="flex-1 text-[12.5px] font-semibold">{webhook.name}</span>
              <code className="text-[11px] text-ink-400">…{webhook.url.slice(-6)}</code>
              <Button
                variant="ghost"
                onClick={() =>
                  void updateSettings((current) => {
                    const webhooks = current.discord.webhooks.filter((w) => w.id !== webhook.id)
                    const defaultId =
                      current.discord.defaultId === webhook.id
                        ? webhooks[0]?.id
                        : current.discord.defaultId
                    return {
                      discord: { webhooks, ...(defaultId ? { defaultId } : {}) },
                    }
                  })
                }
              >
                {t.remove}
              </Button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex gap-2">
        <input
          className={`${inputClass} max-w-40`}
          placeholder={t.webhookName}
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        <input
          className={inputClass}
          type="password"
          placeholder="https://discord.com/api/webhooks/…"
          value={url}
          onChange={(event) => setUrl(event.target.value)}
        />
        <Button variant="primary" onClick={add}>
          {t.add}
        </Button>
      </div>
    </Section>
  )
}

/**
 * A stored text setting. Uncontrolled inputs would keep showing the default
 * that was there on first render — settings arrive from storage a tick later —
 * and then write that stale default back on blur.
 */
function TextSetting({
  value,
  placeholder,
  onCommit,
}: {
  value: string
  placeholder?: string
  onCommit: (value: string) => void
}) {
  const [draft, setDraft] = useState(value)
  useEffect(() => setDraft(value), [value])

  return (
    <input
      className={inputClass}
      value={draft}
      {...(placeholder ? { placeholder } : {})}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={() => {
        const next = draft.trim()
        if (next !== value) onCommit(next)
      }}
    />
  )
}
