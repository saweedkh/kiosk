'use client'

import type { ReactNode, Ref } from 'react'
import { cn } from '@/lib/utils'

interface PickerFieldTriggerProps {
  label: string
  icon: ReactNode
  display: string
  empty?: boolean
  placeholder?: string
  onClick?: () => void
  error?: string
  className?: string
  /** Optional overlay (e.g. transparent date input) covering the button. */
  overlay?: ReactNode
  triggerRef?: Ref<HTMLDivElement>
}

/** Shared look for date/time pickers in admin. */
export function PickerFieldTrigger({
  label,
  icon,
  display,
  empty = false,
  placeholder = 'انتخاب کنید',
  onClick,
  error,
  className,
  overlay,
  triggerRef,
}: PickerFieldTriggerProps) {
  return (
    <div className={cn('w-full space-y-2', className)}>
      <label className="block text-sm font-medium text-foreground">{label}</label>
      <div ref={triggerRef} className="relative">
        <button
          type="button"
          onClick={onClick}
          className={cn(
            'flex w-full items-center justify-between gap-3 rounded-2xl border bg-background px-4 py-3.5 text-right shadow-sm shadow-black/[0.02] outline-none transition',
            'hover:border-primary/40 focus:border-primary active:scale-[0.99]',
            error ? 'border-red-500' : 'border-border'
          )}
        >
          <span className="flex min-w-0 items-center gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              {icon}
            </span>
            <span
              className={cn(
                'truncate text-base font-black tracking-wide',
                empty ? 'font-medium text-muted-foreground' : 'text-foreground'
              )}
            >
              {empty ? placeholder : display}
            </span>
          </span>
          <span className="shrink-0 text-xs font-medium text-muted-foreground">انتخاب</span>
        </button>
        {overlay ? (
          <div className="absolute inset-0 z-10 overflow-hidden rounded-2xl">{overlay}</div>
        ) : null}
      </div>
      {error ? (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      ) : null}
    </div>
  )
}
