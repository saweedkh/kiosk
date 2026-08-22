'use client'

import { useMemo, useState } from 'react'
import moment from 'moment-jalaali'
import { CalendarClock, ChevronLeft, ChevronRight } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/shared/Button'
import { PickerFieldTrigger } from '@/components/admin/PickerFieldTrigger'
import {
  formatTime,
  HOUR_OPTIONS,
  parseTime,
  snapMinute,
  TouchWheel,
  useMinuteOptions,
} from '@/components/admin/picker-shared'
import { cn, toEnglishDigits, toPersianDigits } from '@/lib/utils'

const WEEKDAYS = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج']

type JMoment = any

function parseJalaliDate(value?: string): JMoment {
  const raw = toEnglishDigits(value || '').trim()
  const m = moment(raw, 'jYYYY/jMM/jDD') as JMoment
  return m?.isValid?.() ? m : moment()
}

function formatJalaliDate(m: JMoment) {
  return m.format('jYYYY/jMM/jDD')
}

function formatDisplay(date: string, time: string) {
  if (!date) return ''
  const d = toPersianDigits(toEnglishDigits(date))
  const t = toPersianDigits(time || '00:00')
  return `${d}  ·  ${t}`
}

interface DateTimePickerProps {
  label: string
  date: string
  time: string
  onChange: (next: { date: string; time: string }) => void
  minuteStep?: number
  error?: string
  className?: string
  placeholder?: string
}

export function DateTimePicker({
  label,
  date,
  time,
  onChange,
  minuteStep = 5,
  error,
  className,
  placeholder = 'تاریخ و ساعت را انتخاب کنید',
}: DateTimePickerProps) {
  const [open, setOpen] = useState(false)
  const initial = parseJalaliDate(date)
  const initialTime = parseTime(time || '00:00')

  const [viewMonth, setViewMonth] = useState<JMoment>(initial.clone().startOf('jMonth'))
  const [draftDay, setDraftDay] = useState<JMoment>(initial.clone())
  const [draftHour, setDraftHour] = useState(initialTime.hour)
  const [draftMinute, setDraftMinute] = useState(
    snapMinute(initialTime.minute, minuteStep)
  )

  const minutes = useMinuteOptions(minuteStep, draftMinute)

  const cells = useMemo(() => {
    const start = viewMonth.clone().startOf('jMonth')
    // jDaysInMonth is static: moment.jDaysInMonth(jYear, jMonth) — not an instance method
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

  const openPicker = () => {
    const base = parseJalaliDate(date)
    const t = parseTime(time || '00:00')
    setViewMonth(base.clone().startOf('jMonth'))
    setDraftDay(base.clone())
    setDraftHour(t.hour)
    setDraftMinute(snapMinute(t.minute, minuteStep))
    setOpen(true)
  }

  const empty = !date
  const display = formatDisplay(date, time || '00:00')

  return (
    <>
      <PickerFieldTrigger
        label={label}
        icon={<CalendarClock className="h-4 w-4" />}
        display={display}
        empty={empty}
        placeholder={placeholder}
        error={error}
        className={className}
        onClick={openPicker}
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[92vh] overflow-y-auto border-border/80 p-0 sm:max-w-lg">
          <div className="border-b border-border/70 bg-gradient-to-l from-primary/[0.08] via-card to-card px-5 py-4">
            <DialogHeader className="space-y-1">
              <DialogTitle className="text-right text-lg">{label}</DialogTitle>
              <DialogDescription className="text-right text-sm">
                تاریخ و ساعت را با لمس انتخاب کنید.
              </DialogDescription>
            </DialogHeader>
            <div className="mt-3 rounded-2xl bg-background/80 px-4 py-3 text-center ring-1 ring-border/60">
              <p className="text-xs text-muted-foreground">انتخاب فعلی</p>
              <p className="mt-1 text-2xl font-black tracking-wide text-primary">
                {toPersianDigits(formatJalaliDate(draftDay))} ·{' '}
                {toPersianDigits(formatTime(draftHour, draftMinute))}
              </p>
            </div>
          </div>

          <div className="space-y-5 px-5 py-5">
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  className="flex h-11 w-11 items-center justify-center rounded-xl bg-muted/60 active:bg-muted"
                  onClick={() => setViewMonth((m: JMoment) => m.clone().subtract(1, 'jMonth'))}
                  aria-label="ماه قبل"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
                <p className="text-base font-black text-foreground">
                  {toPersianDigits(viewMonth.format('jMMMM jYYYY'))}
                </p>
                <button
                  type="button"
                  className="flex h-11 w-11 items-center justify-center rounded-xl bg-muted/60 active:bg-muted"
                  onClick={() => setViewMonth((m: JMoment) => m.clone().add(1, 'jMonth'))}
                  aria-label="ماه بعد"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
              </div>

              <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted-foreground">
                {WEEKDAYS.map((d) => (
                  <div key={d} className="py-1">
                    {d}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1">
                {cells.map((cell) => {
                  if (cell.day == null || !cell.moment) {
                    return <div key={cell.key} className="h-11" />
                  }
                  const selected = cell.moment.isSame(draftDay, 'day')
                  const isToday = cell.moment.isSame(moment(), 'day')
                  return (
                    <button
                      key={cell.key}
                      type="button"
                      onClick={() => setDraftDay(cell.moment!.clone())}
                      className={cn(
                        'flex h-11 items-center justify-center rounded-xl text-sm font-bold transition active:scale-95',
                        selected
                          ? 'bg-primary text-primary-foreground shadow-sm'
                          : isToday
                            ? 'bg-primary/10 text-primary'
                            : 'bg-muted/40 text-foreground active:bg-muted'
                      )}
                    >
                      {toPersianDigits(String(cell.day))}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="rounded-2xl bg-muted/20 p-3">
              <p className="mb-3 text-center text-xs font-medium text-muted-foreground">ساعت</p>
              <div className="flex gap-2">
                <TouchWheel
                  compact
                  label="ساعت"
                  values={HOUR_OPTIONS}
                  selected={draftHour}
                  onSelect={setDraftHour}
                />
                <TouchWheel
                  compact
                  label="دقیقه"
                  values={minutes}
                  selected={draftMinute}
                  onSelect={setDraftMinute}
                />
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="h-12 flex-1" onClick={() => setOpen(false)}>
                انصراف
              </Button>
              <Button
                variant="primary"
                className="h-12 flex-1"
                onClick={() => {
                  onChange({
                    date: formatJalaliDate(draftDay),
                    time: formatTime(draftHour, draftMinute),
                  })
                  setOpen(false)
                }}
              >
                تایید
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
