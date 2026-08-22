'use client'

import { useEffect, useMemo, useRef } from 'react'
import { cn, toPersianDigits } from '@/lib/utils'

export function pad2(n: number) {
  return String(n).padStart(2, '0')
}

export function parseTime(value: string): { hour: number; minute: number } {
  const [h = '0', m = '0'] = (value || '00:00').split(':')
  return {
    hour: Math.max(0, Math.min(23, Number(h) || 0)),
    minute: Math.max(0, Math.min(59, Number(m) || 0)),
  }
}

export function formatTime(hour: number, minute: number) {
  return `${pad2(hour)}:${pad2(minute)}`
}

export function snapMinute(minute: number, step: number) {
  if (step <= 1) return minute
  return (Math.round(minute / step) * step) % 60
}

export function TouchWheel({
  values,
  selected,
  onSelect,
  label,
  compact,
}: {
  values: number[]
  selected: number
  onSelect: (value: number) => void
  label: string
  compact?: boolean
}) {
  const itemRefs = useRef<Record<number, HTMLButtonElement | null>>({})

  useEffect(() => {
    const node = itemRefs.current[selected]
    if (!node) return
    // 'smooth' can freeze weak kiosk WebViews when several wheels mount at once
    node.scrollIntoView({ block: 'center', behavior: 'auto' })
  }, [selected])

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-2">
      <p className="text-center text-xs font-medium text-muted-foreground">{label}</p>
      <div
        className={cn(
          'relative touch-pan-y overflow-y-auto overscroll-contain rounded-2xl bg-muted/30 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden',
          compact ? 'h-40' : 'h-48'
        )}
      >
        <div className="pointer-events-none absolute inset-x-1.5 top-1/2 z-10 h-14 -translate-y-1/2 rounded-xl bg-primary/10 ring-1 ring-primary/25" />
        <div className={cn('flex flex-col gap-1 px-1.5', compact ? 'py-14' : 'py-[72px]')}>
          {values.map((value) => {
            const active = value === selected
            return (
              <button
                key={value}
                type="button"
                ref={(el) => {
                  itemRefs.current[value] = el
                }}
                onClick={() => onSelect(value)}
                className={cn(
                  'relative z-20 flex h-14 w-full shrink-0 items-center justify-center rounded-xl text-xl font-black transition active:scale-[0.98]',
                  active
                    ? 'bg-primary text-primary-foreground shadow-md'
                    : 'text-foreground/65'
                )}
              >
                {toPersianDigits(pad2(value))}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export function useMinuteOptions(step: number, selected: number) {
  return useMemo(() => {
    const s = Math.max(1, step)
    const list: number[] = []
    for (let m = 0; m < 60; m += s) list.push(m)
    if (!list.includes(selected)) list.push(selected)
    return list.sort((a, b) => a - b)
  }, [step, selected])
}

export const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => i)
