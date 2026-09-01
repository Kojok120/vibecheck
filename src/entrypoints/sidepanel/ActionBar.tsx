import { useEffect, useRef, useState } from 'react'
import { Button, Spinner } from '@/ui/components'
import type { PanelStrings } from '@/ui/strings'

export type CopyMode = 'sheet' | 'markdown' | 'text'

interface Props {
  t: PanelStrings
  count: number
  total: number
  busy: boolean
  allChecked: boolean
  onToggleAll: () => void
  onCopy: (mode: CopyMode) => void
  onSave: () => void
  onIssue: () => void
  onSlack: () => void
  onDiscord: () => void
}

export function ActionBar({
  t,
  count,
  total,
  busy,
  allChecked,
  onToggleAll,
  onCopy,
  onSave,
  onIssue,
  onSlack,
  onDiscord,
}: Props) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    const close = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [menuOpen])

  const disabled = busy || count === 0

  return (
    <div className="border-t border-ink-200 bg-white/85 p-2.5 backdrop-blur dark:border-ink-800 dark:bg-ink-900/85">
      <label className="mb-2 flex items-center gap-2 text-[11.5px] text-ink-500 dark:text-ink-400">
        <input
          type="checkbox"
          checked={allChecked}
          onChange={onToggleAll}
          disabled={total === 0}
          className="size-3.5 accent-brand-600"
        />
        {count > 0 ? t.selected(count) : t.selectAll}
      </label>

      <div className="flex flex-wrap gap-1.5">
        <div ref={menuRef} className="relative">
          <Button
            variant="primary"
            disabled={disabled}
            onClick={() => setMenuOpen((open) => !open)}
          >
            {busy ? <Spinner /> : null}
            {t.copy}
            <Caret />
          </Button>
          {menuOpen && (
            <div className="absolute bottom-full left-0 z-10 mb-1.5 w-64 overflow-hidden rounded-xl bg-white py-1 shadow-lg ring-1 ring-ink-200 dark:bg-ink-900 dark:ring-ink-800">
              {(
                [
                  ['sheet', t.copySheet],
                  ['markdown', t.copyMarkdown],
                  ['text', t.copyText],
                ] as const
              ).map(([mode, label]) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => {
                    setMenuOpen(false)
                    onCopy(mode)
                  }}
                  className="block w-full px-3 py-2 text-left text-[12.5px] hover:bg-ink-100 dark:hover:bg-ink-800"
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>

        <Button disabled={disabled} onClick={onSave}>
          {t.save}
        </Button>
        <Button disabled={disabled} onClick={onIssue}>
          {t.issue}
        </Button>
        <Button disabled={disabled} onClick={onSlack}>
          {t.slack}
        </Button>
        <Button disabled={disabled} onClick={onDiscord}>
          {t.discord}
        </Button>
      </div>
    </div>
  )
}

function Caret() {
  return (
    <svg viewBox="0 0 16 16" className="size-3" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="m4.5 6.5 3.5 3.5 3.5-3.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
