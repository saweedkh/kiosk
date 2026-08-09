'use client'

import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function AdminPageHeader({
  title,
  description,
  actions,
}: {
  title: string
  description?: string
  actions?: ReactNode
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        <h2 className="text-xl font-black tracking-tight text-foreground sm:text-2xl">
          {title}
        </h2>
        {description ? (
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  )
}

export function AdminSurface({
  children,
  className,
  padded = true,
}: {
  children: ReactNode
  className?: string
  padded?: boolean
}) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-border/80 bg-card text-card-foreground shadow-sm shadow-black/[0.02]',
        padded && 'p-5 sm:p-6',
        className
      )}
    >
      {children}
    </div>
  )
}

export function AdminToolbar({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <AdminSurface className={cn('mb-5', className)}>
      <div className="flex flex-col gap-3 md:flex-row md:items-center">{children}</div>
    </AdminSurface>
  )
}

export function AdminSegmented<T extends string>({
  value,
  onChange,
  options,
  className,
}: {
  value: T
  onChange: (v: T) => void
  options: { id: T; label: string; hint?: string }[]
  className?: string
}) {
  return (
    <div
      className={cn(
        'inline-flex max-w-full flex-wrap gap-1 rounded-2xl border border-border/80 bg-muted/50 p-1',
        className
      )}
    >
      {options.map((opt) => {
        const selected = value === opt.id
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onChange(opt.id)}
            className={cn(
              'rounded-xl px-3.5 py-2 text-sm font-semibold transition-all',
              selected
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {opt.label}
            {opt.hint ? (
              <span
                className={cn(
                  'ms-1.5 text-[11px] font-normal',
                  selected ? 'text-muted-foreground' : 'text-muted-foreground/70'
                )}
              >
                {opt.hint}
              </span>
            ) : null}
          </button>
        )
      })}
    </div>
  )
}

export function AdminStatusBadge({
  tone = 'neutral',
  children,
}: {
  tone?: 'success' | 'danger' | 'warning' | 'neutral' | 'primary'
  children: ReactNode
}) {
  const tones = {
    success:
      'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-500/20',
    danger: 'bg-red-500/10 text-red-700 dark:text-red-300 ring-1 ring-red-500/20',
    warning: 'bg-amber-500/10 text-amber-800 dark:text-amber-300 ring-1 ring-amber-500/20',
    neutral: 'bg-muted text-muted-foreground ring-1 ring-border/60',
    primary: 'bg-primary/10 text-primary ring-1 ring-primary/20',
  }
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold',
        tones[tone]
      )}
    >
      {children}
    </span>
  )
}

export function AdminEmpty({
  title,
  description,
}: {
  title: string
  description?: string
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden>
          <path
            d="M4 7h16M4 12h10M4 17h7"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
          />
        </svg>
      </div>
      <p className="font-bold text-foreground">{title}</p>
      {description ? (
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
      ) : null}
    </div>
  )
}

export function AdminSelect({
  className,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={cn(
        'h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none transition-shadow focus:ring-2 focus:ring-primary/30',
        className
      )}
    />
  )
}

export function AdminAlert({
  tone = 'danger',
  children,
  onClose,
}: {
  tone?: 'danger' | 'success' | 'info'
  children: ReactNode
  onClose?: () => void
}) {
  const tones = {
    danger:
      'border-red-200 bg-red-50 text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200',
    success:
      'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-200',
    info: 'border-border bg-muted/60 text-foreground',
  }
  return (
    <div
      className={cn(
        'mb-5 flex items-start justify-between gap-3 rounded-2xl border px-4 py-3 text-sm',
        tones[tone]
      )}
    >
      <div className="min-w-0 flex-1">{children}</div>
      {onClose ? (
        <button type="button" onClick={onClose} className="shrink-0 opacity-70 hover:opacity-100">
          بستن
        </button>
      ) : null}
    </div>
  )
}

export function AdminMeta({ children }: { children: ReactNode }) {
  return <p className="text-xs text-muted-foreground sm:text-sm">{children}</p>
}
