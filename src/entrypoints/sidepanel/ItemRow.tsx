import { compactUrl } from '@/core/naming'
import { Badge, Field, IconButton } from '@/ui/components'
import { useShotUrl } from '@/ui/hooks'
import type { PanelStrings } from '@/ui/strings'
import type { FeedbackItem } from '@/types'

interface Props {
  item: FeedbackItem
  seq: number
  t: PanelStrings
  isFirst: boolean
  isLast: boolean
  onToggle: () => void
  onEdit: (patch: Partial<FeedbackItem>) => void
  onMove: (delta: number) => void
  onDelete: () => void
}

export function ItemRow({
  item,
  seq,
  t,
  isFirst,
  isLast,
  onToggle,
  onEdit,
  onMove,
  onDelete,
}: Props) {
  const shot = useShotUrl(item.shotKey)

  return (
    <li className="group rounded-xl bg-white p-2.5 ring-1 ring-ink-200 transition-shadow hover:shadow-sm dark:bg-ink-900 dark:ring-ink-800">
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={item.checked}
          onChange={onToggle}
          className="size-3.5 flex-none accent-brand-600"
          aria-label={`#${seq}`}
        />
        <Badge n={seq} />
        <a
          href={item.page.url}
          target="_blank"
          rel="noreferrer"
          title={item.page.url}
          className="min-w-0 flex-1 truncate text-[11.5px] text-ink-500 hover:text-brand-600 hover:underline dark:text-ink-400"
        >
          {compactUrl(item.page.url, 80)}
        </a>
        <div className="flex flex-none items-center opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
          <IconButton label={t.moveUp} disabled={isFirst} onClick={() => onMove(-1)}>
            <ArrowUp />
          </IconButton>
          <IconButton label={t.moveDown} disabled={isLast} onClick={() => onMove(1)}>
            <ArrowDown />
          </IconButton>
          <IconButton label={t.delete} onClick={onDelete}>
            <Trash />
          </IconButton>
        </div>
      </div>

      {shot && (
        <a href={shot} target="_blank" rel="noreferrer" className="mt-2 block">
          <img
            src={shot}
            alt=""
            className="max-h-44 w-full rounded-lg border border-ink-200 bg-ink-100 object-contain object-left-top dark:border-ink-800 dark:bg-ink-950"
          />
        </a>
      )}

      <div className="mt-2 space-y-1.5">
        <Field
          label={t.background}
          value={item.background}
          placeholder={t.backgroundPlaceholder}
          onCommit={(background) => onEdit({ background })}
        />
        <Field
          label={t.request}
          value={item.request}
          placeholder={t.requestPlaceholder}
          onCommit={(request) => onEdit({ request })}
        />
      </div>

      {item.target && (
        <p className="mt-1.5 truncate font-mono text-[10.5px] text-ink-400 dark:text-ink-600">
          {item.target.selector}
        </p>
      )}

      {item.posted?.github && (
        <a
          href={item.posted.github}
          target="_blank"
          rel="noreferrer"
          className="mt-1.5 inline-block text-[11px] font-semibold text-brand-600 hover:underline"
        >
          {item.posted.github.replace('https://github.com/', '')}
        </a>
      )}
    </li>
  )
}

function ArrowUp() {
  return (
    <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M8 12.5v-9M4.5 7 8 3.5 11.5 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function ArrowDown() {
  return (
    <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M8 3.5v9M11.5 9 8 12.5 4.5 9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function Trash() {
  return (
    <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path
        d="M3 4.5h10M6.5 4.5V3h3v1.5M4.5 4.5l.6 8a1 1 0 0 0 1 .9h3.8a1 1 0 0 0 1-.9l.6-8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
