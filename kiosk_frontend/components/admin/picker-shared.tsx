'use client'

import { useMemo } from 'react'
import moment from 'moment-jalaali'
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn, toEnglishDigits, toPersianDigits } from '@/lib/utils'

type JMoment = any

export const WEEKDAYS = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج']

export const JALALI_MONTH_NAMES = [
  'فروردین',
  'اردیبهشت',
  'خرداد',
  'تیر',
  'مرداد',
  'شهریور',
  'مهر',
  'آبان',
  'آذر',
  'دی',
  'بهمن',
  'اسفند',
] as const

/** Keep HH:mm left-to-right so Persian digits don't mirror in RTL layout. */
export function PersianTimeText({
  hour,
  minute,
  className,
}: {
  hour: number
  minute: number
  className?: string
}) {
  return (
    <span dir="ltr" className={cn('inline-block tabular-nums', className)}>
      {toPersianDigits(formatTime(hour, minute))}
    </span>
  )
}

export function formatJalaliMonthYear(m: JMoment) {
  const month = JALALI_MONTH_NAMES[m.jMonth()] ?? ''
  return `${month} ${toPersianDigits(m.format('jYYYY'))}`
}

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

function stepInList(list: number[], current: number, delta: number) {
  const idx = list.indexOf(current)
  const base = idx >= 0 ? idx : 0
  const next = (base + delta + list.length) % list.length
  return list[next]
}

interface TimeSelectorProps {
  hour: number
  minute: number
  onHourChange: (hour: number) => void
  onMinuteChange: (minute: number) => void
  minuteStep?: number
}

export function TimeSelector({
  hour,
  minute,
  onHourChange,
  onMinuteChange,
  minuteStep = 5,
}: TimeSelectorProps) {
  const minutes = useMinuteOptions(minuteStep, minute)

  const presets = [
    { hour: 0, minute: 0 },
    { hour: 8, minute: 0 },
    { hour: 12, minute: 0 },
    { hour: 18, minute: 0 },
    { hour: 23, minute: 59 },
  ]

  return (
    <div className="space-y-5">
      <div dir="ltr" className="flex items-center justify-center gap-4">
        <TimeColumn
          label="ساعت"
          display={toPersianDigits(pad2(hour))}
          onUp={() => onHourChange(stepInList(HOUR_OPTIONS, hour, 1))}
          onDown={() => onHourChange(stepInList(HOUR_OPTIONS, hour, -1))}
        />
        <span className="pb-6 text-3xl font-light text-muted-foreground">:</span>
        <TimeColumn
          label="دقیقه"
          display={toPersianDigits(pad2(minute))}
          onUp={() => onMinuteChange(stepInList(minutes, minute, 1))}
          onDown={() => onMinuteChange(stepInList(minutes, minute, -1))}
        />
      </div>

      <div className="flex flex-wrap justify-center gap-2">
        {presets.map((preset) => {
          const active = hour === preset.hour && minute === preset.minute
          return (
            <Button
              key={`${preset.hour}-${preset.minute}`}
              type="button"
              size="sm"
              variant={active ? 'default' : 'outline'}
              className="min-w-[4.5rem] font-medium"
              onClick={() => {
                onHourChange(preset.hour)
                onMinuteChange(preset.minute)
              }}
            >
              <PersianTimeText hour={preset.hour} minute={preset.minute} />
            </Button>
          )
        })}
      </div>
    </div>
  )
}

function TimeColumn({
  label,
  display,
  onUp,
  onDown,
}: {
  label: string
  display: string
  onUp: () => void
  onDown: () => void
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-9 w-9 rounded-full"
        onClick={onUp}
        aria-label={`افزایش ${label}`}
      >
        <ChevronUp className="h-4 w-4" />
      </Button>
      <div
        dir="ltr"
        className="flex h-16 w-20 items-center justify-center rounded-xl border bg-card text-3xl font-semibold tabular-nums tracking-wide"
      >
        {display}
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-9 w-9 rounded-full"
        onClick={onDown}
        aria-label={`کاهش ${label}`}
      >
        <ChevronDown className="h-4 w-4" />
      </Button>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  )
}

interface JalaliCalendarProps {
  viewMonth: JMoment
  selectedDay: JMoment
  onViewMonthChange: (month: JMoment) => void
  onSelectDay: (day: JMoment) => void
}

export function JalaliCalendar({
  viewMonth,
  selectedDay,
  onViewMonthChange,
  onSelectDay,
}: JalaliCalendarProps) {
  const cells = useMemo(() => {
    const start = viewMonth.clone().startOf('jMonth')
    const daysInMonth = start.clone().endOf('jMonth').jDate()
    const offset = (start.day() + 1) % 7
    const items: Array<{ key: string; day: number | null; moment?: JMoment }> = []
    for (let i = 0; i < offset; i++) {
      items.push({ key: `e-${i}`, day: null })
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const m = start.clone().jDate(d)
      items.push({ key: m.format('jYYYY/jMM/jDD'), day: d, moment: m })
    }
    return items
  }, [viewMonth])

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => onViewMonthChange(viewMonth.clone().subtract(1, 'jMonth'))}
          aria-label="ماه قبل"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <p className="text-sm font-semibold">{formatJalaliMonthYear(viewMonth)}</p>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => onViewMonthChange(viewMonth.clone().add(1, 'jMonth'))}
          aria-label="ماه بعد"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-7 gap-0.5 text-center text-xs font-medium text-muted-foreground">
        {WEEKDAYS.map((d) => (
          <div key={d} className="py-1.5">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((cell) => {
          if (cell.day == null || !cell.moment) {
            return <div key={cell.key} className="h-9" />
          }
          const selected = cell.moment.isSame(selectedDay, 'day')
          const isToday = cell.moment.isSame(moment(), 'day')
          return (
            <button
              key={cell.key}
              type="button"
              onClick={() => onSelectDay(cell.moment!.clone())}
              className={cn(
                'flex h-9 w-full items-center justify-center rounded-md text-sm font-medium transition-colors',
                selected
                  ? 'bg-primary text-primary-foreground'
                  : isToday
                    ? 'bg-accent text-accent-foreground'
                    : 'text-foreground hover:bg-muted'
              )}
            >
              {toPersianDigits(String(cell.day))}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function parseJalaliDate(value?: string): JMoment {
  const raw = toEnglishDigits(value || '').trim()
  const m = moment(raw, 'jYYYY/jMM/jDD') as JMoment
  return m?.isValid?.() ? m : moment()
}

export function formatJalaliDate(m: JMoment) {
  return m.format('jYYYY/jMM/jDD')
}
