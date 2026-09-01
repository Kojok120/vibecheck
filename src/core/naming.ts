/** Slug/filename helpers. Kept pure so filenames stay predictable and testable. */

// Letters and digits of any script are safe (and readable) in filenames on
// macOS/Linux/Windows. Everything else — punctuation, emoji, whitespace —
// collapses into a single hyphen.
const DROP = /[^\p{L}\p{N}]+/gu

export function slugify(text: string, maxLength = 40): string {
  const slug = text
    .normalize('NFKC')
    .toLowerCase()
    .replace(DROP, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '')
  return slug.length > maxLength ? slug.slice(0, maxLength).replace(/-$/, '') : slug
}

export function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

/** `YYYYMMDD-HHmm` in the reviewer's local time. */
export function formatStamp(date: Date): string {
  return (
    `${date.getFullYear()}${pad2(date.getMonth() + 1)}${pad2(date.getDate())}` +
    `-${pad2(date.getHours())}${pad2(date.getMinutes())}`
  )
}

export function hostOf(url: string): string {
  try {
    // `file:` and other schemes parse fine but carry no host.
    return new URL(url).host || 'page'
  } catch {
    return 'page'
  }
}

/** Shorten free text to a single line suitable for a title or heading. */
export function summarise(text: string, maxLength = 60): string {
  const line = text.replace(/\s+/g, ' ').trim()
  return truncate(line, maxLength)
}

/** Cut to `maxLength` characters without splitting an emoji down the middle. */
export function truncate(text: string, maxLength: number): string {
  const characters = [...text]
  if (characters.length <= maxLength) return text
  return `${characters.slice(0, maxLength - 1).join('').trimEnd()}…`
}

/**
 * A one-line label for an item: the requested change is what a reader scans
 * for, so it wins over the background when both are present.
 */
export function itemLabel(
  item: { request: string; background: string },
  maxLength = 60,
): string {
  const source = item.request.trim() || item.background.trim()
  return summarise(source, maxLength) || 'Untitled'
}

export function sessionFolderName(session: { createdAt: number; origin: string }): string {
  const host = slugify(hostOf(session.origin), 24) || 'page'
  return `${formatStamp(new Date(session.createdAt))}-${host}`
}

/** `03-tighten-the-header.png` — the numeric prefix keeps files in review order. */
export function screenshotFileName(
  seq: number,
  item: { request: string; background: string },
): string {
  const slug = slugify(itemLabel(item, 40), 40)
  return slug ? `${pad2(seq)}-${slug}.png` : `${pad2(seq)}.png`
}

/** `app.example.com/dashboard` — enough to place a screenshot, short enough to fit. */
export function compactUrl(url: string, maxLength = 64): string {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return summarise(url, maxLength)
  }
  if (!parsed.host) return summarise(url, maxLength)
  const path = parsed.pathname === '/' ? '' : parsed.pathname.replace(/\/$/, '')
  // The hash carries the route on a hash-routed SPA, so dropping it would
  // leave every screenshot labelled with the bare host.
  return summarise(`${parsed.host}${path}${parsed.search}${parsed.hash}`, maxLength)
}
