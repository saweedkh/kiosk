'use client'

import { useState } from 'react'
import { Clock } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { PickerFieldTrigger } from '@/components/admin/PickerFieldTrigger'
import {
  formatTime,
  parseTime,
  PersianTimeText,
  snapMinute,
  TimeSelector,
} from '@/components/admin/picker-shared'

interface TimePickerProps {
  label: string
  value: string
  onChange: (value: string) => void
  minuteStep?: number
  error?: string
  className?: string
}

export function TimePicker({
  label,
  value,
  onChange,
  minuteStep = 5,
  error,
  className,
}: TimePickerProps) {
  const parsed = parseTime(value)
  const [open, setOpen] = useState(false)
  const [draftHour, setDraftHour] = useState(parsed.hour)
  const [draftMinute, setDraftMinute] = useState(snapMinute(parsed.minute, minuteStep))

  const empty = !value
  const display = <PersianTimeText hour={parsed.hour} minute={parsed.minute} />

  return (
    <>
      <PickerFieldTrigger
        label={label}
        icon={<Clock className="h-4 w-4" />}
        display={display}
        empty={empty}
        placeholder="ساعت را انتخاب کنید"
        error={error}
        className={className}
        onClick={() => {
          const next = parseTime(value)
          setDraftHour(next.hour)
          setDraftMinute(snapMinute(next.minute, minuteStep))
          setOpen(true)
        }}
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-sm">
          <DialogHeader className="space-y-1 border-b px-5 py-4 text-right">
            <DialogTitle>{label}</DialogTitle>
            <DialogDescription>
              <PersianTimeText hour={draftHour} minute={draftMinute} className="text-base" />
            </DialogDescription>
          </DialogHeader>

          <div className="px-5 py-6">
            <TimeSelector
              hour={draftHour}
              minute={draftMinute}
              minuteStep={minuteStep}
              onHourChange={setDraftHour}
              onMinuteChange={setDraftMinute}
            />
          </div>

          <DialogFooter className="gap-2 border-t px-5 py-4 sm:justify-stretch">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setOpen(false)}>
              انصراف
            </Button>
            <Button
              type="button"
              className="flex-1"
              onClick={() => {
                onChange(formatTime(draftHour, draftMinute))
                setOpen(false)
              }}
            >
              تایید
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

export function timeFromParts(hour?: number | null, minute?: number | null) {
  return formatTime(Number(hour ?? 0), Number(minute ?? 0))
}

export function partsFromTime(value: string) {
  return parseTime(value)
}
