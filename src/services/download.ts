import { browser } from 'wxt/browser'
import { screenshotFileName, sessionFolderName } from '@/core/naming'
import { renderMarkdown } from '@/core/markdown'
import type { FeedbackItem, Locale, Session } from '@/types'

const ROOT = 'vibecheck'

export interface SavedFile {
  itemId?: string
  /** Path relative to the session folder, e.g. `01-tighten-header.png`. */
  relative: string
  /** Absolute local path, once Chrome reports it. */
  absolute?: string
}

export interface SavedBundle {
  folder: string
  files: SavedFile[]
  markdownPath?: string
}

function blobUrl(blob: Blob): string {
  return URL.createObjectURL(blob)
}

/**
 * Download a blob and wait for the absolute path Chrome assigned it. The path
 * is what makes the export useful to a coding agent, so it is worth the wait.
 */
async function saveBlob(blob: Blob, filename: string): Promise<string | undefined> {
  const url = blobUrl(blob)
  try {
    const id = await browser.downloads.download({
      url,
      filename,
      conflictAction: 'uniquify',
      saveAs: false,
    })
    return await resolvePath(id)
  } finally {
    // Revoking immediately can cancel an in-flight download on slower disks.
    setTimeout(() => URL.revokeObjectURL(url), 60_000)
  }
}

async function resolvePath(id: number, attempts = 40): Promise<string | undefined> {
  for (let i = 0; i < attempts; i += 1) {
    const [item] = await browser.downloads.search({ id })
    if (item?.state === 'complete' && item.filename) return item.filename
    if (item?.state === 'interrupted') return undefined
    await new Promise((resolve) => setTimeout(resolve, 75))
  }
  return undefined
}

export interface SaveBundleInput {
  session: Session
  items: FeedbackItem[]
  shots: Map<string, Blob>
  sheet?: Blob
  locale: Locale
}

/**
 * Write one folder per review: the screenshots, an optional contact sheet, and
 * a `review.md` whose image links are absolute paths a coding agent can open.
 */
export async function saveBundle(input: SaveBundleInput): Promise<SavedBundle> {
  const folder = `${ROOT}/${sessionFolderName(input.session)}`
  const files: SavedFile[] = []
  const absolutePaths: Record<string, string> = {}

  if (input.sheet) {
    const relative = '00-sheet.png'
    const absolute = await saveBlob(input.sheet, `${folder}/${relative}`)
    files.push({ relative, ...(absolute ? { absolute } : {}) })
  }

  for (const [index, item] of input.items.entries()) {
    const blob = item.shotKey ? input.shots.get(item.shotKey) : undefined
    if (!blob) continue
    const relative = screenshotFileName(index + 1, item)
    const absolute = await saveBlob(blob, `${folder}/${relative}`)
    files.push({ itemId: item.id, relative, ...(absolute ? { absolute } : {}) })
    if (absolute) absolutePaths[item.id] = absolute
  }

  const markdown = renderMarkdown(input.items, {
    locale: input.locale,
    images: { kind: 'path', paths: absolutePaths },
    headings: true,
    footer: true,
  })
  const markdownPath = await saveBlob(
    new Blob([markdown], { type: 'text/markdown' }),
    `${folder}/review.md`,
  )

  return { folder, files, ...(markdownPath ? { markdownPath } : {}) }
}

export async function saveSingle(blob: Blob, filename: string): Promise<string | undefined> {
  return saveBlob(blob, `${ROOT}/${filename}`)
}
