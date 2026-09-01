import { buildIssue } from '@/core/issue'
import { renderMarkdown, renderPlainText, renderSlackText } from '@/core/markdown'
import { itemLabel, screenshotFileName, sessionFolderName } from '@/core/naming'
import { parseRepo, type RepoRef } from '@/core/repo'
import { copyImage, copyText } from '@/services/clipboard'
import { getShot } from '@/services/db'
import * as discord from '@/services/discord'
import * as github from '@/services/github'
import { renderContactSheet, type SheetEntry } from '@/services/sheet'
import * as slack from '@/services/slack'
import { saveBundle, type SavedBundle } from '@/services/download'
import type { FeedbackItem, Locale, NumberedItem, Session } from '@/types'

export async function loadShots(items: NumberedItem[]): Promise<Map<string, Blob>> {
  const shots = new Map<string, Blob>()
  for (const { item } of items) {
    if (!item.shotKey) continue
    const blob = await getShot(item.shotKey)
    if (blob) shots.set(item.shotKey, blob)
  }
  return shots
}

async function toEntries(items: NumberedItem[], shots: Map<string, Blob>): Promise<SheetEntry[]> {
  const entries: SheetEntry[] = []
  for (const { item, seq } of items) {
    const blob = item.shotKey ? shots.get(item.shotKey) : undefined
    entries.push({ item, seq, ...(blob ? { image: await createImageBitmap(blob) } : {}) })
  }
  return entries
}

/** One tall PNG carrying every selected item, each screenshot badged with its number. */
export async function buildSheet(items: NumberedItem[], locale: Locale): Promise<Blob> {
  const shots = await loadShots(items)
  const entries = await toEntries(items, shots)
  try {
    return await renderContactSheet(entries, { locale })
  } finally {
    for (const entry of entries) entry.image?.close()
  }
}

export async function copySheet(items: NumberedItem[], locale: Locale): Promise<void> {
  await copyImage(await buildSheet(items, locale))
}

export async function copyPlainText(items: NumberedItem[], locale: Locale): Promise<void> {
  await copyText(renderPlainText(items, locale))
}

/**
 * Markdown that a coding agent can act on: the screenshots have to exist on
 * disk first, so this writes the bundle and then copies the text that points
 * at it.
 */
export async function copyMarkdownWithFiles(
  session: Session,
  items: NumberedItem[],
  locale: Locale,
): Promise<SavedBundle> {
  const bundle = await save(session, items, locale)
  const paths = Object.fromEntries(
    bundle.files.flatMap((file) =>
      file.itemId && file.absolute ? [[file.itemId, file.absolute] as const] : [],
    ),
  )
  await copyText(
    renderMarkdown(items, { locale, images: { kind: 'path', paths }, headings: true }),
  )
  return bundle
}

export async function save(
  session: Session,
  items: NumberedItem[],
  locale: Locale,
): Promise<SavedBundle> {
  const shots = await loadShots(items)
  const sheet = items.length > 1 ? await buildSheet(items, locale) : undefined
  return saveBundle({ session, items, shots, locale, ...(sheet ? { sheet } : {}) })
}

// ---- GitHub ------------------------------------------------------------

export interface IssueOutcome {
  number: number
  htmlUrl: string
  /** True when the repo is private and the images could only be linked. */
  imagesAreLinks: boolean
}

export async function createIssue(
  token: string,
  repoInput: string,
  assetBranch: string,
  session: Session,
  items: NumberedItem[],
  locale: Locale,
): Promise<IssueOutcome> {
  const ref = parseRepo(repoInput)
  if (!ref) throw new Error(`Not a repository: ${repoInput}`)

  const repo = await github.getRepo(token, ref)
  const shots = await loadShots(items)
  const withShots = items.filter(({ item }) => item.shotKey && shots.has(item.shotKey))

  const urls: Record<string, string> = {}
  if (withShots.length > 0) {
    await github.ensureAssetBranch(token, ref, assetBranch, repo.defaultBranch)
    const folder = sessionFolderName(session)
    for (const { item, seq } of withShots) {
      const path = `assets/${folder}/${screenshotFileName(seq, item)}`
      const uploaded = await github.uploadAsset(
        token,
        ref,
        assetBranch,
        path,
        shots.get(item.shotKey!)!,
        `chore(vibecheck): add screenshot for ${itemLabel(item, 50)}`,
      )
      // GitHub's image proxy cannot read a private repo's raw URLs, so a
      // private repo gets a link that a signed-in reader can still open.
      urls[item.id] = repo.isPrivate ? uploaded.blobUrl : uploaded.rawUrl
    }
  }

  const draft = buildIssue(items, {
    locale,
    images: repo.isPrivate ? { kind: 'link', urls } : { kind: 'inline', urls },
  })
  const issue = await github.createIssue(token, ref, draft.title, draft.body)
  return { ...issue, imagesAreLinks: repo.isPrivate && withShots.length > 0 }
}

export function repoRefOf(input: string): RepoRef | null {
  return parseRepo(input)
}

// ---- Slack / Discord ---------------------------------------------------

export async function postToSlack(
  token: string,
  channelId: string,
  items: NumberedItem[],
  locale: Locale,
): Promise<void> {
  const shots = await loadShots(items)
  const files: slack.SlackUpload[] = items.flatMap(({ item, seq }) => {
    const blob = item.shotKey ? shots.get(item.shotKey) : undefined
    if (!blob) return []
    return [
      {
        name: screenshotFileName(seq, item),
        title: `#${seq} ${itemLabel(item, 60)}`,
        blob,
      },
    ]
  })

  await slack.postFeedback(token, { channelId, text: renderSlackText(items, locale), files })
}

export async function postToDiscord(
  webhookUrl: string,
  items: NumberedItem[],
  locale: Locale,
): Promise<void> {
  const shots = await loadShots(items)
  const files: discord.DiscordUpload[] = items.flatMap(({ item, seq }) => {
    const blob = item.shotKey ? shots.get(item.shotKey) : undefined
    return blob ? [{ name: screenshotFileName(seq, item), blob }] : []
  })

  // Discord caps a message at ten attachments; beyond that the contact sheet
  // is the only way to keep every screenshot in one message.
  if (files.length > discord.DISCORD_FILE_LIMIT) {
    const sheet = await buildSheet(items, locale)
    await discord.postFeedback(
      webhookUrl,
      renderPlainText(items, locale),
      [{ name: 'vibecheck-sheet.png', blob: sheet }],
    )
    return
  }

  await discord.postFeedback(
    webhookUrl,
    renderMarkdown(items, { locale, images: { kind: 'none' }, headings: true }),
    files,
  )
}
