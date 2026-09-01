import type { NumberedItem } from '@/types'
import { stringsFor } from './i18n'
import { renderMarkdown, type MarkdownOptions } from './markdown'
import { hostOf, itemLabel } from './naming'

export interface IssueDraft {
  title: string
  body: string
}

/**
 * One issue per batch. A single item gets its own request as the title; a batch
 * gets a title that says where the review happened and how big it is.
 */
export function buildIssue(items: NumberedItem[], options: MarkdownOptions): IssueDraft {
  const t = stringsFor(options.locale)
  const first = items[0]?.item

  const title =
    items.length === 1 && first
      ? itemLabel(first, 80)
      : first
        ? `${t.reviewTitle}: ${hostOf(first.page.url)} (${t.itemCount(items.length)})`
        : t.reviewTitle

  const body = renderMarkdown(items, {
    ...options,
    headings: items.length > 1,
    footer: true,
  })

  return { title, body }
}
