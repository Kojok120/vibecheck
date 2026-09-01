import type { ReactNode } from 'react'

export function Section({
  title,
  description,
  aside,
  children,
}: {
  title: string
  description?: string
  aside?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="rounded-2xl bg-white p-5 ring-1 ring-ink-200 dark:bg-ink-900 dark:ring-ink-800">
      <div className="mb-3 flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="text-[14px] font-semibold">{title}</h2>
          {description && (
            <p className="mt-0.5 text-[12.5px] leading-relaxed text-ink-500 dark:text-ink-400">
              {description}
            </p>
          )}
        </div>
        {aside}
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  )
}

export function Labelled({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: ReactNode
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-ink-500 dark:text-ink-400">
        {label}
      </span>
      {children}
      {hint && (
        <span className="mt-1 block text-[11.5px] leading-relaxed text-ink-500 dark:text-ink-400">
          {hint}
        </span>
      )}
    </label>
  )
}

export const inputClass =
  'block w-full rounded-lg border border-ink-300 bg-white px-2.5 py-1.5 text-[12.5px] outline-none focus:border-brand-500 dark:border-ink-800 dark:bg-ink-950'
