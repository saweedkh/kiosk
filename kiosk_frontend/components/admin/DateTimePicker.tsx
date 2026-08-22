'use client'

import { useState } from 'react'
import { CalendarClock } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PickerFieldTrigger } from '@/components/admin/PickerFieldTrigger'
import {
  formatJalaliDate,
  formatTime,
  JalaliCalendar,
  parseJalaliDate,
  parseTime,
  PersianTimeText,
  snapMinute,
  TimeSelector,
} from '@/components/admin/picker-shared'
import { toPersianDigits, toEnglishDigits } from '@/lib/utils'

type JMoment = any

function formatDisplay(date: string, time: string) {
  if (!date) return null
  const parsed = parseTime(time || '00:00')
  const d = toPersianDigits(toEnglishDigits(date))
  return (
    <>
      {d}
      {' · '}
      <PersianTimeText hour={parsed.hour} minute={parsed.minute} />
    </>
  )
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
  const [tab, setTab] = useState<'date' | 'time'>('date')

  const initial = parseJalaliDate(date)
  const initialTime = parseTime(time || '00:00')

  const [viewMonth, setViewMonth] = useState<JMoment>(initial.clone().startOf('jMonth'))
  const [draftDay, setDraftDay] = useState<JMoment>(initial.clone())
  const [draftHour, setDraftHour] = useState(initialTime.hour)
  const [draftMinute, setDraftMinute] = useState(
    snapMinute(initialTime.minute, minuteStep)
  )

  const openPicker = () => {
    const base = parseJalaliDate(date)
    const t = parseTime(time || '00:00')
    setViewMonth(base.clone().startOf('jMonth'))
    setDraftDay(base.clone())
    setDraftHour(t.hour)
    setDraftMinute(snapMinute(t.minute, minuteStep))
    setTab('date')
    setOpen(true)
  }

  const confirm = () => {
    onChange({
      date: formatJalaliDate(draftDay),
      time: formatTime(draftHour, draftMinute),
    })
    setOpen(false)
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
        <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-md">
          <DialogHeader className="space-y-1 border-b px-5 py-4 text-right">
            <DialogTitle>{label}</DialogTitle>
            <DialogDescription className="flex flex-wrap items-center justify-end gap-1">
              <span>{toPersianDigits(formatJalaliDate(draftDay))}</span>
              <span>·</span>
              <PersianTimeText hour={draftHour} minute={draftMinute} />
            </DialogDescription>
          </DialogHeader>

          <Tabs
            value={tab}
            onValueChange={(value: string) => setTab(value as 'date' | 'time')}
            className="px-5 py-4"
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="date">تاریخ</TabsTrigger>
              <TabsTrigger value="time">ساعت</TabsTrigger>
            </TabsList>

            <TabsContent value="date" className="mt-4">
              <JalaliCalendar
                viewMonth={viewMonth}
                selectedDay={draftDay}
                onViewMonthChange={setViewMonth}
                onSelectDay={setDraftDay}
              />
            </TabsContent>

            <TabsContent value="time" className="mt-4">
              <TimeSelector
                hour={draftHour}
                minute={draftMinute}
                minuteStep={minuteStep}
                onHourChange={setDraftHour}
                onMinuteChange={setDraftMinute}
              />
            </TabsContent>
          </Tabs>

          <DialogFooter className="gap-2 border-t px-5 py-4 sm:justify-stretch">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setOpen(false)}>
              انصراف
            </Button>
            <Button type="button" className="flex-1" onClick={confirm}>
              تایید
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
