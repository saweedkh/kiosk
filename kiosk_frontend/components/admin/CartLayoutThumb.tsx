'use client'

import { cn } from '@/lib/utils'
import type { CartLayout } from '@/components/customer/CartView'

export function CartLayoutThumb({
  layout,
  selected,
  title,
  description,
  onSelect,
  disabled,
}: {
  layout: CartLayout
  selected: boolean
  title: string
  description: string
  onSelect: () => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onSelect}
      className={cn(
        'group overflow-hidden rounded-2xl border text-start transition-all',
        selected
          ? 'border-primary ring-2 ring-primary/25 shadow-md shadow-primary/10'
          : 'border-border/80 hover:border-primary/40 hover:shadow-sm',
        disabled && 'opacity-60'
      )}
    >
      <div className="relative aspect-[16/10] bg-[hsl(30_40%_96%)] p-3 dark:bg-[hsl(0_0%_12%)]">
        {layout === 'side' ? (
          <div className="flex h-full gap-2">
            <div className="flex flex-[2] flex-col gap-1.5 rounded-lg bg-white/80 p-2 dark:bg-white/5">
              <div className="h-2 w-1/3 rounded bg-primary/30" />
              <div className="grid flex-1 grid-cols-2 gap-1">
                <div className="rounded bg-muted" />
                <div className="rounded bg-muted" />
                <div className="rounded bg-muted" />
                <div className="rounded bg-muted" />
              </div>
            </div>
            <div className="flex flex-1 flex-col rounded-lg border border-primary/40 bg-gradient-to-b from-primary/15 to-white/80 p-2 dark:to-white/5">
              <div className="mb-1 h-2 w-2/3 rounded bg-primary/50" />
              <div className="space-y-1">
                <div className="h-5 rounded bg-primary/20" />
                <div className="h-5 rounded bg-primary/20" />
              </div>
              <div className="mt-auto h-4 rounded-md bg-primary" />
            </div>
          </div>
        ) : (
          <div className="flex h-full flex-col gap-1.5">
            <div className="flex flex-1 flex-col gap-1.5 rounded-lg bg-white/80 p-2 dark:bg-white/5">
              <div className="h-2 w-1/4 rounded bg-primary/30" />
              <div className="grid flex-1 grid-cols-4 gap-1">
                <div className="rounded bg-muted" />
                <div className="rounded bg-muted" />
                <div className="rounded bg-muted" />
                <div className="rounded bg-muted" />
              </div>
            </div>
            <div className="flex h-[38%] items-center gap-1.5 rounded-lg border border-primary/40 bg-gradient-to-r from-primary/20 via-white/90 to-primary/10 px-2 dark:via-white/5">
              <div className="h-7 w-14 rounded-md bg-primary" />
              <div className="h-7 flex-1 rounded-md bg-primary/25" />
              <div className="h-7 flex-1 rounded-md bg-primary/25" />
              <div className="h-7 w-10 rounded-md bg-primary/40" />
            </div>
          </div>
        )}
        {selected ? (
          <span className="absolute end-2 top-2 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">
            فعال
          </span>
        ) : null}
      </div>
      <div className="border-t border-border/60 bg-card px-3 py-3">
        <p className="font-bold text-foreground">{title}</p>
        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
          {description}
        </p>
      </div>
    </button>
  )
}
