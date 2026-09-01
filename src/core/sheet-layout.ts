/**
 * Layout for the contact sheet: several screenshots stacked into a single
 * image so one paste carries every item, each stamped with the number its
 * text block uses.
 *
 * Pure — text measurement is injected, so the whole layout is testable without
 * a canvas.
 */

export interface SheetSource {
  seq: number
  /** `app.example.com/dashboard` */
  location: string
  background: string
  request: string
  image?: { width: number; height: number }
}

export interface SheetLabels {
  background: string
  request: string
}

export interface SheetTheme {
  width: number
  padding: number
  /** Space between the blocks of one item. */
  blockGap: number
  /** Space between items, split around the divider. */
  itemGap: number
  headerSize: number
  labelSize: number
  bodySize: number
  lineHeight: number
  badgeSize: number
  /** Inset of the badge from the screenshot's top-left corner. */
  badgeInset: number
  maxImageHeight: number
}

export const DEFAULT_THEME: SheetTheme = {
  width: 920,
  padding: 28,
  blockGap: 12,
  itemGap: 28,
  headerSize: 19,
  labelSize: 12,
  bodySize: 15,
  lineHeight: 1.5,
  badgeSize: 30,
  badgeInset: 10,
  maxImageHeight: 1600,
}

export type TextRole = 'header' | 'label' | 'body'

export interface SheetTextLine {
  text: string
  x: number
  /** Baseline-agnostic: the top of the line box. */
  y: number
  size: number
  role: TextRole
}

export interface SheetBlock {
  seq: number
  lines: SheetTextLine[]
  image?: { x: number; y: number; width: number; height: number }
  badge?: { x: number; y: number; size: number }
  /** y of the rule drawn under this item; absent on the last item. */
  divider?: number
}

export interface SheetLayout {
  width: number
  height: number
  blocks: SheetBlock[]
}

export interface FontSpec {
  size: number
  bold: boolean
}

/** Split `text` into lines that fit `maxWidth`. Supplied by the renderer. */
export type WrapText = (text: string, maxWidth: number, font: FontSpec) => string[]

const ROLE_FONTS: Record<TextRole, (theme: SheetTheme) => FontSpec> = {
  header: (t) => ({ size: t.headerSize, bold: true }),
  label: (t) => ({ size: t.labelSize, bold: true }),
  body: (t) => ({ size: t.bodySize, bold: false }),
}

/** Scale an image to fit the content box without ever enlarging it. */
export function fitImage(
  image: { width: number; height: number },
  maxWidth: number,
  maxHeight: number,
): { width: number; height: number } {
  if (image.width <= 0 || image.height <= 0) return { width: 0, height: 0 }
  const scale = Math.min(1, maxWidth / image.width, maxHeight / image.height)
  return {
    width: Math.round(image.width * scale),
    height: Math.round(image.height * scale),
  }
}

const MIN_BADGE_SIZE = 14

/**
 * Keep the badge inside its own screenshot. A crop can be as short as a button
 * bar, and a badge hanging off the bottom would sit over the next item's text
 * — which is exactly the pairing this whole layout exists to protect.
 */
function badgeFor(
  size: { width: number; height: number },
  theme: SheetTheme,
  x: number,
  y: number,
): { x: number; y: number; size: number } {
  const shortest = Math.min(size.width, size.height)
  const badge = Math.max(MIN_BADGE_SIZE, Math.min(theme.badgeSize, shortest - 4))
  const inset = Math.min(theme.badgeInset, Math.max(0, Math.floor((shortest - badge) / 2)))
  return { x: x + inset, y: y + inset, size: badge }
}

export function layoutSheet(
  sources: SheetSource[],
  labels: SheetLabels,
  wrap: WrapText,
  theme: SheetTheme = DEFAULT_THEME,
): SheetLayout {
  const contentWidth = theme.width - theme.padding * 2
  const blocks: SheetBlock[] = []
  let y = theme.padding

  sources.forEach((source, index) => {
    const lines: SheetTextLine[] = []

    const push = (text: string, role: TextRole) => {
      const font = ROLE_FONTS[role](theme)
      const height = Math.round(font.size * theme.lineHeight)
      for (const line of wrap(text, contentWidth, font)) {
        lines.push({ text: line, x: theme.padding, y, size: font.size, role })
        y += height
      }
    }

    push(`#${source.seq}  ${source.location}`, 'header')
    y += theme.blockGap

    for (const [label, value] of [
      [labels.background, source.background],
      [labels.request, source.request],
    ] as const) {
      if (!value.trim()) continue
      push(label, 'label')
      push(value.trim(), 'body')
      y += theme.blockGap
    }

    const block: SheetBlock = { seq: source.seq, lines }

    if (source.image) {
      const size = fitImage(source.image, contentWidth, theme.maxImageHeight)
      block.image = { x: theme.padding, y, width: size.width, height: size.height }
      block.badge = badgeFor(size, theme, theme.padding, y)
      y += size.height
    }

    const isLast = index === sources.length - 1
    if (!isLast) {
      y += theme.itemGap
      block.divider = y
      y += theme.itemGap
    }

    blocks.push(block)
  })

  return { width: theme.width, height: Math.round(y + theme.padding), blocks }
}
