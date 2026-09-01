import { useState } from 'react'
import { Button } from '@/ui/components'
import type { PanelStrings } from '@/ui/strings'

export interface PickerOption {
  value: string
  label: string
}

interface Props {
  t: PanelStrings
  title: string
  options: PickerOption[]
  initial?: string
  /** Allow typing a value that is not in the list (e.g. a repo slug). */
  freeform?: boolean
  note?: string
  onCancel: () => void
  onConfirm: (value: string) => void
}

/** A small modal for picking where a batch of feedback should go. */
export function Picker({ t, title, options, initial, freeform, note, onCancel, onConfirm }: Props) {
  const [value, setValue] = useState(initial ?? options[0]?.value ?? '')

  return (
    <div
      className="absolute inset-0 z-20 flex items-end bg-ink-950/40 p-3"
      onMouseDown={(event) => event.target === event.currentTarget && onCancel()}
    >
      <div className="w-full rounded-2xl bg-white p-3.5 shadow-xl ring-1 ring-ink-200 dark:bg-ink-900 dark:ring-ink-800">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-ink-500 dark:text-ink-400">
          {title}
        </p>

        {options.length > 0 && (
          <select
            value={options.some((o) => o.value === value) ? value : ''}
            onChange={(event) => setValue(event.target.value)}
            className="mb-2 block w-full rounded-lg border border-ink-300 bg-white px-2 py-1.5 text-[12.5px] dark:border-ink-800 dark:bg-ink-950"
          >
            {!options.some((o) => o.value === value) && <option value="">—</option>}
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        )}

        {freeform && (
          <input
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder="owner/repo"
            className="mb-2 block w-full rounded-lg border border-ink-300 bg-white px-2 py-1.5 text-[12.5px] outline-none focus:border-brand-500 dark:border-ink-800 dark:bg-ink-950"
          />
        )}

        {note && (
          <p className="mb-2 rounded-lg bg-brand-50 p-2 text-[11.5px] leading-relaxed text-ink-600 dark:bg-ink-950 dark:text-ink-400">
            {note}
          </p>
        )}

        <div className="flex justify-end gap-1.5">
          <Button variant="ghost" onClick={onCancel}>
            {t.cancel}
          </Button>
          <Button variant="primary" disabled={!value.trim()} onClick={() => onConfirm(value.trim())}>
            {t.send}
          </Button>
        </div>
      </div>
    </div>
  )
}
