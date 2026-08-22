'use client'

import type { ReactNode, Ref } from 'react'
import { ChevronLeft } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PickerFieldTriggerProps {
  label: string
  icon: ReactNode
  display: ReactNode
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
    <div className={cn('w-full space-y-1.5', className)}>
      <label className="block text-sm font-medium text-foreground">{label}</label>
      <div ref={triggerRef} className="relative">
        <button
          type="button"
          onClick={onClick}
          className={cn(
            'flex w-full items-center justify-between gap-3 rounded-lg border bg-background px-3 py-2.5 text-right shadow-sm outline-none transition-colors',
            'hover:bg-accent/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            error ? 'border-destructive' : 'border-input'
          )}
        >
          <span className="flex min-w-0 items-center gap-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
              {icon}
            </span>
            <span
              className={cn(
                'truncate text-sm',
                empty ? 'text-muted-foreground' : 'font-medium text-foreground'
              )}
            >
              {empty ? placeholder : display}
            </span>
          </span>
          <ChevronLeft className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
        </button>
        {overlay ? (
          <div className="absolute inset-0 z-10 overflow-hidden rounded-lg">{overlay}</div>
        ) : null}
      </div>
      {error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : null}
    </div>
  )
}
