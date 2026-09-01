import { useEffect, useRef, useState } from 'react'
import type { ButtonHTMLAttributes, ReactNode } from 'react'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost'
}

const VARIANTS = {
  primary:
    'bg-brand-600 text-white hover:bg-brand-700 disabled:bg-brand-600/40 disabled:text-white/70',
  secondary:
    'bg-white text-ink-700 ring-1 ring-ink-300 hover:bg-ink-100 dark:bg-ink-900 dark:text-ink-100 dark:ring-ink-800 dark:hover:bg-ink-800',
  ghost:
    'text-ink-600 hover:bg-ink-200/70 dark:text-ink-400 dark:hover:bg-ink-800',
} as const

export function Button({ variant = 'secondary', className = '', ...props }: ButtonProps) {
  return (
    <button
      type="button"
      {...props}
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-[12.5px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${VARIANTS[variant]} ${className}`}
    />
  )
}

export function IconButton({
  label,
  children,
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string; children: ReactNode }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      {...props}
      className={`inline-flex size-6 items-center justify-center rounded-md text-ink-500 transition-colors hover:bg-ink-200 hover:text-ink-800 disabled:opacity-30 dark:text-ink-400 dark:hover:bg-ink-800 dark:hover:text-ink-100 ${className}`}
    >
      {children}
    </button>
  )
}

export function Badge({ n }: { n: number }) {
  return (
    <span className="inline-flex size-5 flex-none items-center justify-center rounded-full bg-brand-600 text-[11px] font-bold tabular-nums text-white">
      {n}
    </span>
  )
}

export function Field({
  label,
  value,
  placeholder,
  onCommit,
}: {
  label: string
  value: string
  placeholder: string
  onCommit: (value: string) => void
}) {
  return (
    <label className="block">
      <span className="mb-0.5 block text-[10px] font-semibold uppercase tracking-wide text-ink-500 dark:text-ink-400">
        {label}
      </span>
      <AutoTextarea value={value} placeholder={placeholder} onCommit={onCommit} />
    </label>
  )
}

function AutoTextarea({
  value,
  placeholder,
  onCommit,
}: {
  value: string
  placeholder: string
  onCommit: (value: string) => void
}) {
  const ref = useRef<HTMLTextAreaElement>(null)
  const [draft, setDraft] = useState(value)

  // Track external edits (another panel, or an undo) without stomping typing.
  useEffect(() => setDraft(value), [value])

  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [draft])

  return (
    <textarea
      ref={ref}
      rows={1}
      value={draft}
      placeholder={placeholder}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={() => draft !== value && onCommit(draft)}
      className="block w-full resize-none overflow-hidden rounded-lg border border-transparent bg-ink-100/70 px-2 py-1.5 text-[12.5px] leading-relaxed outline-none placeholder:text-ink-400 focus:border-brand-500 focus:bg-white dark:bg-ink-950/60 dark:placeholder:text-ink-600 dark:focus:bg-ink-950"
    />
  )
}

export function Spinner() {
  return (
    <span className="inline-block size-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
  )
}
