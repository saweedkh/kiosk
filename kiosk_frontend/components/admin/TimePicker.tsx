'use client'

import { useState } from 'react'
import { Clock } from 'lucide-react'
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
import { toPersianDigits } from '@/lib/utils'

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
  const minutes = useMinuteOptions(minuteStep, draftMinute)

  const empty = !value
  const display = toPersianDigits(formatTime(parsed.hour, parsed.minute))

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
        <DialogContent className="border-border/80 p-0 sm:max-w-md">
          <div className="border-b border-border/70 bg-gradient-to-l from-primary/[0.08] via-card to-card px-5 py-4">
            <DialogHeader className="space-y-1">
              <DialogTitle className="text-right text-lg">{label}</DialogTitle>
              <DialogDescription className="text-right text-sm">
                با لمس یا اسکرول، ساعت و دقیقه را انتخاب کنید.
              </DialogDescription>
            </DialogHeader>
            <div className="mt-3 rounded-2xl bg-background/80 px-4 py-3 text-center ring-1 ring-border/60">
              <p className="text-xs text-muted-foreground">زمان انتخاب‌شده</p>
              <p className="mt-1 text-3xl font-black tracking-wide text-primary">
                {toPersianDigits(formatTime(draftHour, draftMinute))}
              </p>
            </div>
          </div>

          <div className="space-y-5 px-5 py-5">
            <div className="flex gap-2 rounded-2xl bg-muted/20 p-3">
              <TouchWheel
                label="ساعت"
                values={HOUR_OPTIONS}
                selected={draftHour}
                onSelect={setDraftHour}
              />
              <TouchWheel
                label="دقیقه"
                values={minutes}
                selected={draftMinute}
                onSelect={setDraftMinute}
              />
            </div>

            <div className="flex gap-2">
              <Button variant="outline" className="h-12 flex-1" onClick={() => setOpen(false)}>
                انصراف
              </Button>
              <Button
                variant="primary"
                className="h-12 flex-1"
                onClick={() => {
                  onChange(formatTime(draftHour, draftMinute))
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

export function timeFromParts(hour?: number | null, minute?: number | null) {
  return formatTime(Number(hour ?? 0), Number(minute ?? 0))
}

export function partsFromTime(value: string) {
  return parseTime(value)
}
