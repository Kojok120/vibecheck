import { stringsFor } from '@/core/i18n'
import { compactUrl } from '@/core/naming'
import {
  DEFAULT_THEME,
  layoutSheet,
  type FontSpec,
  type SheetSource,
  type SheetTheme,
  type TextRole,
} from '@/core/sheet-layout'
import { wrapLines } from '@/core/text-wrap'
import type { FeedbackItem, Locale } from '@/types'

/**
 * The contact sheet is the answer to "the OS clipboard only holds one image":
 * every selected item becomes one tall PNG, and each screenshot carries the
 * number its text block uses, so a single paste stays readable anywhere.
 */

const FONT_STACK =
  'ui-sans-serif, -apple-system, "Hiragino Sans", "Noto Sans JP", "Segoe UI", system-ui, sans-serif'

const COLOURS = {
  page: '#FFFFFF',
  header: '#171426',
  label: '#8A83A3',
  body: '#3B3550',
  divider: '#E7E3F2',
  imageBorder: '#DDD9E8',
  badge: '#7C5CFF',
  badgeText: '#FFFFFF',
  badgeRing: '#FFFFFF',
}

const ROLE_COLOUR: Record<TextRole, string> = {
  header: COLOURS.header,
  label: COLOURS.label,
  body: COLOURS.body,
}

function fontString(font: FontSpec): string {
  return `${font.bold ? '600' : '400'} ${font.size}px ${FONT_STACK}`
}

function roundedRectPath(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): void {
  const r = Math.min(radius, width / 2, height / 2)
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + width, y, x + width, y + height, r)
  ctx.arcTo(x + width, y + height, x, y + height, r)
  ctx.arcTo(x, y + height, x, y, r)
  ctx.arcTo(x, y, x + width, y, r)
  ctx.closePath()
}

export interface SheetEntry {
  item: FeedbackItem
  seq: number
  image?: ImageBitmap
}

export function toSources(entries: SheetEntry[]): SheetSource[] {
  return entries.map(({ item, seq, image }) => ({
    seq,
    location: compactUrl(item.page.url),
    background: item.background,
    request: item.request,
    ...(image ? { image: { width: image.width, height: image.height } } : {}),
  }))
}

export interface SheetOptions {
  locale: Locale
  /** Render at 2x so the sheet stays sharp on a Retina display. */
  scale?: number
  theme?: SheetTheme
}

export async function renderContactSheet(
  entries: SheetEntry[],
  options: SheetOptions,
): Promise<Blob> {
  const theme = options.theme ?? DEFAULT_THEME
  const scale = options.scale ?? 2
  const t = stringsFor(options.locale)

  // A throwaway context, purely to measure text before the real canvas exists.
  const ruler = new OffscreenCanvas(1, 1).getContext('2d')
  if (!ruler) throw new Error('Could not measure text for the contact sheet')

  const wrap = (text: string, maxWidth: number, font: FontSpec) => {
    ruler.font = fontString(font)
    return wrapLines(text, maxWidth, (value) => ruler.measureText(value).width)
  }

  const layout = layoutSheet(
    toSources(entries),
    { background: t.background, request: t.request },
    wrap,
    theme,
  )

  const canvas = new OffscreenCanvas(
    Math.round(layout.width * scale),
    Math.round(layout.height * scale),
  )
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Could not create a drawing context')
  ctx.scale(scale, scale)
  ctx.fillStyle = COLOURS.page
  ctx.fillRect(0, 0, layout.width, layout.height)
  ctx.textBaseline = 'top'

  const bitmaps = new Map(entries.map((entry) => [entry.seq, entry.image]))

  for (const block of layout.blocks) {
    for (const line of block.lines) {
      ctx.font = fontString({
        size: line.size,
        bold: line.role === 'header' || line.role === 'label',
      })
      ctx.fillStyle = ROLE_COLOUR[line.role]
      ctx.fillText(line.text, line.x, line.y)
    }

    const image = bitmaps.get(block.seq)
    if (block.image && image && block.image.width > 0) {
      const { x, y, width, height } = block.image
      ctx.save()
      roundedRectPath(ctx, x, y, width, height, 8)
      ctx.clip()
      ctx.drawImage(image, x, y, width, height)
      ctx.restore()
      ctx.strokeStyle = COLOURS.imageBorder
      ctx.lineWidth = 1
      roundedRectPath(ctx, x + 0.5, y + 0.5, width - 1, height - 1, 8)
      ctx.stroke()
    }

    if (block.badge) drawBadge(ctx, block.badge, block.seq)

    if (block.divider !== undefined) {
      ctx.strokeStyle = COLOURS.divider
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(theme.padding, block.divider + 0.5)
      ctx.lineTo(layout.width - theme.padding, block.divider + 0.5)
      ctx.stroke()
    }
  }

  return canvas.convertToBlob({ type: 'image/png' })
}

/**
 * The badge is what ties a picture back to its text, so it needs a white ring:
 * a flat violet circle disappears against a violet UI screenshot.
 */
function drawBadge(
  ctx: OffscreenCanvasRenderingContext2D,
  badge: { x: number; y: number; size: number },
  seq: number,
): void {
  const radius = badge.size / 2
  const cx = badge.x + radius
  const cy = badge.y + radius

  ctx.beginPath()
  ctx.arc(cx, cy, radius, 0, Math.PI * 2)
  ctx.fillStyle = COLOURS.badge
  ctx.fill()
  ctx.lineWidth = 2
  ctx.strokeStyle = COLOURS.badgeRing
  ctx.stroke()

  ctx.font = fontString({ size: Math.round(badge.size * 0.5), bold: true })
  ctx.fillStyle = COLOURS.badgeText
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(String(seq), cx, cy + 0.5)
  ctx.textAlign = 'left'
  ctx.textBaseline = 'top'
}
