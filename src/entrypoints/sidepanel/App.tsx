import { useEffect, useMemo, useState } from 'react'
import { browser } from 'wxt/browser'
import { Button, Spinner } from '@/ui/components'
import * as exporters from '@/ui/exporters'
import { useLocale, useSettings, useShortcut, useStatus, useStore } from '@/ui/hooks'
import { panelStrings } from '@/ui/strings'
import { copyText } from '@/services/clipboard'
import { listChannels } from '@/services/slack'
import { saveSettings } from '@/services/settings'
import {
  markPosted,
  removeItems,
  removeSession,
  reorderItems,
  setActiveSession,
  setChecked,
  startSession,
  updateItem,
} from '@/services/store'
import type { FeedbackItem } from '@/types'
import { ActionBar, type CopyMode } from './ActionBar'
import { ItemRow } from './ItemRow'
import { Picker, type PickerOption } from './Picker'

type PickerKind = 'github' | 'slack' | 'discord'

export function App() {
  const { sessions, active } = useStore()
  const settings = useSettings()
  const locale = useLocale(settings)
  const t = panelStrings(locale)
  const shortcut = useShortcut()
  const { status, busy, run, report, dismiss } = useStatus()
  const [picker, setPicker] = useState<PickerKind | null>(null)

  const items = active?.items ?? []
  const selected = useMemo(() => items.filter((item) => item.checked), [items])

  const edit = (item: FeedbackItem, patch: Partial<FeedbackItem>) => {
    if (active) void updateItem(active.id, item.id, patch)
  }

  const move = (item: FeedbackItem, delta: number) => {
    if (!active) return
    const order = items.map((i) => i.id)
    const from = order.indexOf(item.id)
    const to = from + delta
    if (to < 0 || to >= order.length) return
    order.splice(to, 0, ...order.splice(from, 1))
    void reorderItems(active.id, order)
  }

  const toggleAll = () => {
    if (!active) return
    const next = !items.every((item) => item.checked)
    void setChecked(
      active.id,
      items.map((item) => item.id),
      next,
    )
  }

  const guard = (): FeedbackItem[] | null => {
    if (selected.length === 0) {
      report(t.nothingSelected, 'error')
      return null
    }
    return selected
  }

  const onCopy = (mode: CopyMode) => {
    const batch = guard()
    if (!batch || !active) return
    void run(t.working, async () => {
      if (mode === 'sheet') {
        await exporters.copySheet(batch, locale)
        return t.copiedSheet
      }
      if (mode === 'text') {
        await exporters.copyPlainText(batch, locale)
        return t.copiedText
      }
      const bundle = await exporters.copyMarkdownWithFiles(active, batch, locale)
      return t.savedTo(bundle.folder)
    })
  }

  const onSave = () => {
    const batch = guard()
    if (!batch || !active) return
    void run(t.working, async () => {
      const bundle = await exporters.save(active, batch, locale)
      return t.savedTo(bundle.folder)
    })
  }

  const openPicker = (kind: PickerKind) => {
    if (!guard()) return
    if (kind === 'github' && !settings.github.token) return needsSetup(t.needsGithub)
    if (kind === 'slack' && !settings.slack.token) return needsSetup(t.needsSlack)
    if (kind === 'discord' && settings.discord.webhooks.length === 0) {
      return needsSetup(t.needsDiscord)
    }
    setPicker(kind)
  }

  const needsSetup = (message: string) => {
    report(message, 'error')
    void browser.runtime.openOptionsPage()
  }

  const send = (kind: PickerKind, value: string) => {
    setPicker(null)
    const batch = guard()
    if (!batch || !active) return

    void run(t.working, async () => {
      if (kind === 'github') {
        const outcome = await exporters.createIssue(
          settings.github.token!,
          value,
          settings.github.assetBranch,
          active,
          batch,
          locale,
        )
        await markPosted(
          active.id,
          batch.map((item) => item.id),
          { github: outcome.htmlUrl },
        )
        await saveSettings({
          github: {
            ...settings.github,
            defaultRepo: value,
            recentRepos: [value, ...settings.github.recentRepos.filter((r) => r !== value)].slice(
              0,
              8,
            ),
          },
        })
        if (outcome.imagesAreLinks) {
          // The API cannot attach images to a private repo's issue, so hand the
          // reviewer a ready-to-paste sheet and open the issue for them.
          await exporters.copySheet(batch, locale)
          await browser.tabs.create({ url: outcome.htmlUrl })
          return t.pasteAfterIssue
        }
        return t.issueCreated(outcome.number)
      }

      if (kind === 'slack') {
        await exporters.postToSlack(settings.slack.token!, value, batch, locale)
        await saveSettings({ slack: { ...settings.slack, channelId: value } })
        return t.postedSlack
      }

      const webhook = settings.discord.webhooks.find((w) => w.id === value)
      if (!webhook) throw new Error('Webhook not found')
      await exporters.postToDiscord(webhook.url, batch, locale)
      await saveSettings({ discord: { ...settings.discord, defaultId: value } })
      return t.postedDiscord
    })
  }

  return (
    <div className="relative flex h-full flex-col">
      <header className="flex items-center gap-2 border-b border-ink-200 px-2.5 py-2 dark:border-ink-800">
        <Logo />
        <select
          value={active?.id ?? ''}
          onChange={(event) => void setActiveSession(event.target.value)}
          className="min-w-0 flex-1 truncate rounded-md bg-transparent px-1 py-1 text-[12px] font-semibold outline-none hover:bg-ink-200/60 dark:hover:bg-ink-800"
        >
          {sessions.length === 0 && <option value="">{t.appName}</option>}
          {sessions.map((session) => (
            <option key={session.id} value={session.id}>
              {session.title} · {session.items.length}
            </option>
          ))}
        </select>
        {active && (
          <Button variant="ghost" onClick={() => void startSession(active.origin)}>
            {t.newSession}
          </Button>
        )}
        <Button variant="ghost" onClick={() => void browser.runtime.openOptionsPage()}>
          {t.settings}
        </Button>
      </header>

      {status && (
        <button
          type="button"
          onClick={dismiss}
          className={`flex items-center gap-2 px-3 py-1.5 text-left text-[11.5px] ${
            status.tone === 'error'
              ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200'
              : status.tone === 'info'
                ? 'bg-brand-50 text-ink-600 dark:bg-ink-900 dark:text-ink-300'
                : 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200'
          }`}
        >
          {status.tone === 'info' && <Spinner />}
          <span className="min-w-0 flex-1">{status.text}</span>
        </button>
      )}

      {items.length === 0 ? (
        <Empty t={t} shortcut={shortcut} />
      ) : (
        <ul className="flex-1 space-y-2 overflow-y-auto p-2.5">
          {items.map((item, index) => (
            <ItemRow
              key={item.id}
              item={item}
              seq={index + 1}
              t={t}
              isFirst={index === 0}
              isLast={index === items.length - 1}
              onToggle={() => edit(item, { checked: !item.checked })}
              onEdit={(patch) => edit(item, patch)}
              onMove={(delta) => move(item, delta)}
              onDelete={() => active && void removeItems(active.id, [item.id])}
            />
          ))}
          {active && (
            <li className="pt-1 text-center">
              <Button variant="ghost" onClick={() => void removeSession(active.id)}>
                {t.deleteSession}
              </Button>
            </li>
          )}
        </ul>
      )}

      <ActionBar
        t={t}
        count={selected.length}
        total={items.length}
        busy={busy}
        allChecked={items.length > 0 && items.every((item) => item.checked)}
        onToggleAll={toggleAll}
        onCopy={onCopy}
        onSave={onSave}
        onIssue={() => openPicker('github')}
        onSlack={() => openPicker('slack')}
        onDiscord={() => openPicker('discord')}
      />

      {picker === 'github' && (
        <Picker
          t={t}
          title={t.chooseRepo}
          freeform
          options={settings.github.recentRepos.map(
            (repo): PickerOption => ({ value: repo, label: repo }),
          )}
          {...(settings.github.defaultRepo ? { initial: settings.github.defaultRepo } : {})}
          note={t.privateRepoNotice}
          onCancel={() => setPicker(null)}
          onConfirm={(value) => send('github', value)}
        />
      )}

      {picker === 'slack' && (
        <SlackPicker
          t={t}
          token={settings.slack.token!}
          {...(settings.slack.channelId ? { initial: settings.slack.channelId } : {})}
          onCancel={() => setPicker(null)}
          onConfirm={(value) => send('slack', value)}
        />
      )}

      {picker === 'discord' && (
        <Picker
          t={t}
          title={t.chooseWebhook}
          options={settings.discord.webhooks.map(
            (webhook): PickerOption => ({ value: webhook.id, label: webhook.name }),
          )}
          {...(settings.discord.defaultId ? { initial: settings.discord.defaultId } : {})}
          onCancel={() => setPicker(null)}
          onConfirm={(value) => send('discord', value)}
        />
      )}
    </div>
  )
}

function SlackPicker({
  t,
  token,
  initial,
  onCancel,
  onConfirm,
}: {
  t: ReturnType<typeof panelStrings>
  token: string
  initial?: string
  onCancel: () => void
  onConfirm: (value: string) => void
}) {
  const [options, setOptions] = useState<PickerOption[]>([])
  const [error, setError] = useState<string>()

  useEffect(() => {
    void listChannels(token).then(
      (channels) =>
        setOptions(
          channels.map((channel) => ({
            value: channel.id,
            label: `${channel.isPrivate ? '🔒' : '#'}${channel.name}`,
          })),
        ),
      (reason: unknown) => setError(reason instanceof Error ? reason.message : String(reason)),
    )
  }, [token])

  return (
    <Picker
      t={t}
      title={t.chooseChannel}
      options={options}
      {...(initial ? { initial } : {})}
      {...(error ? { note: error } : {})}
      onCancel={onCancel}
      onConfirm={onConfirm}
    />
  )
}

function Empty({
  t,
  shortcut,
}: {
  t: ReturnType<typeof panelStrings>
  shortcut: string | null
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center">
      <Logo large />
      <p className="text-[13px] font-semibold">{t.emptyTitle}</p>
      <p className="text-[12px] leading-relaxed text-ink-500 dark:text-ink-400">
        {t.emptyBody.replace('{shortcut}', shortcut ?? '—')}
      </p>
      {!shortcut && (
        <>
          <p className="text-[12px] font-semibold text-rose-600 dark:text-rose-400">
            {t.shortcutMissing}
          </p>
          <Button variant="secondary" onClick={openShortcutSettings} title={SHORTCUTS_URL}>
            {t.shortcutFix}
          </Button>
        </>
      )}
    </div>
  )
}

const SHORTCUTS_URL = 'chrome://extensions/shortcuts'

/** Chrome sometimes refuses navigation to chrome:// from an extension page. */
function openShortcutSettings(): void {
  void browser.tabs.create({ url: SHORTCUTS_URL }).catch(() => copyText(SHORTCUTS_URL))
}

function Logo({ large }: { large?: boolean }) {
  return (
    <img
      src={browser.runtime.getURL('/icon/48.png')}
      alt=""
      className={large ? 'size-9 rounded-lg' : 'size-5 flex-none rounded'}
    />
  )
}
