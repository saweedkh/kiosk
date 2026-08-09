'use client'

import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import { Check, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn, formatCurrency } from '@/lib/utils'
import type { CartSelectedOption } from '@/lib/store/cart-store'
import type { Product, ProductOptionGroup } from '@/types'

interface ProductOptionsDialogProps {
  product: Product
  groups: ProductOptionGroup[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (selected: CartSelectedOption[]) => void
}

function activeOptions(group: ProductOptionGroup) {
  return (group.options || []).filter((o) => o.is_active !== false)
}

function groupHint(group: ProductOptionGroup) {
  const maxSel = group.max_select || 1
  const minSel = group.min_select || 0
  if (group.is_required || minSel > 0) {
    if (maxSel <= 1) return 'یک گزینه را انتخاب کنید'
    if (minSel === maxSel) return `${minSel} گزینه را انتخاب کنید`
    return `حداقل ${minSel} و حداکثر ${maxSel} گزینه`
  }
  if (maxSel <= 1) return 'اختیاری'
  return `اختیاری — تا ${maxSel} گزینه`
}

function defaultSelection(groups: ProductOptionGroup[]): Record<number, number[]> {
  const draft: Record<number, number[]> = {}
  for (const group of groups) {
    const opts = activeOptions(group)
    const needsDefault =
      (group.is_required || (group.min_select || 0) > 0) &&
      (group.max_select || 1) <= 1 &&
      opts.length > 0
    draft[group.id] = needsDefault ? [opts[0].id] : []
  }
  return draft
}

export function ProductOptionsDialog({
  product,
  groups,
  open,
  onOpenChange,
  onConfirm,
}: ProductOptionsDialogProps) {
  const [selectedByGroup, setSelectedByGroup] = useState<Record<number, number[]>>({})
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    setSelectedByGroup(defaultSelection(groups))
    setError('')
  }, [open, groups])

  const selectedFlat = useMemo((): CartSelectedOption[] => {
    const selected: CartSelectedOption[] = []
    for (const group of groups) {
      for (const id of selectedByGroup[group.id] || []) {
        const opt = activeOptions(group).find((o) => o.id === id)
        if (!opt) continue
        selected.push({
          id: opt.id,
          name: opt.name,
          group_id: group.id,
          group_name: group.name,
          price_delta: opt.price_delta || 0,
        })
      }
    }
    return selected
  }, [groups, selectedByGroup])

  const extras = selectedFlat.reduce((s, o) => s + Number(o.price_delta || 0), 0)
  const unitTotal = product.price + extras

  const validate = (draft: Record<number, number[]>) => {
    for (const group of groups) {
      const count = (draft[group.id] || []).length
      const minSel = group.min_select || 0
      const maxSel = group.max_select || 1
      if (group.is_required && count < Math.max(minSel, 1)) {
        return `انتخاب «${group.name}» اجباری است`
      }
      if (count < minSel) return `حداقل ${minSel} گزینه برای «${group.name}»`
      if (count > maxSel) return `حداکثر ${maxSel} گزینه برای «${group.name}»`
    }
    return ''
  }

  const toggleOption = (group: ProductOptionGroup, optionId: number) => {
    setSelectedByGroup((prev) => {
      const current = prev[group.id] || []
      const maxSel = group.max_select || 1
      let next: number[]
      if (current.includes(optionId)) {
        next = current.filter((id) => id !== optionId)
      } else if (maxSel <= 1) {
        next = [optionId]
      } else if (current.length >= maxSel) {
        next = [...current.slice(1), optionId]
      } else {
        next = [...current, optionId]
      }
      const draft = { ...prev, [group.id]: next }
      setError(validate(draft))
      return draft
    })
  }

  const handleConfirm = () => {
    const err = validate(selectedByGroup)
    if (err) {
      setError(err)
      return
    }
    onConfirm(selectedFlat)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          'flex max-h-[min(92vh,920px)] w-[min(96vw,42rem)] max-w-none flex-col gap-0 overflow-hidden rounded-3xl border-border/60 bg-background p-0 shadow-2xl',
          '[&>button]:end-5 [&>button]:top-5 [&>button]:flex [&>button]:h-11 [&>button]:w-11 [&>button]:items-center [&>button]:justify-center [&>button]:rounded-full [&>button]:bg-muted/80 [&>button]:opacity-100 [&>button]:hover:bg-muted [&>button>svg]:h-5 [&>button>svg]:w-5'
        )}
      >
        <DialogHeader className="shrink-0 space-y-0 border-b border-border/50 bg-gradient-to-b from-primary/10 to-transparent px-6 pb-5 pt-6 pe-16 text-start">
          <div className="flex items-start gap-4">
            <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-muted">
              {product.image ? (
                <Image
                  src={product.image}
                  alt={product.name}
                  fill
                  className="object-cover"
                  sizes="80px"
                  unoptimized={
                    product.image.startsWith('http://localhost') ||
                    product.image.startsWith('http://')
                  }
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
                  بدون تصویر
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1 space-y-1.5">
              <DialogTitle className="text-2xl font-bold leading-tight tracking-normal">
                {product.name}
              </DialogTitle>
              <DialogDescription className="text-base text-muted-foreground">
                گزینه‌های موردنظر را انتخاب کنید
              </DialogDescription>
              <p className="text-lg font-bold text-primary">
                از {formatCurrency(product.price)}
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-6 py-5">
          {groups.map((group) => {
            const selectedIds = selectedByGroup[group.id] || []
            const multi = (group.max_select || 1) > 1
            return (
              <section key={group.id} className="space-y-3">
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-bold text-foreground">
                      {group.name}
                      {group.is_required ? (
                        <span className="ms-1 text-primary" aria-hidden>
                          *
                        </span>
                      ) : null}
                    </h3>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      {groupHint(group)}
                    </p>
                  </div>
                  {group.is_required ? (
                    <span className="shrink-0 rounded-md bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                      اجباری
                    </span>
                  ) : (
                    <span className="shrink-0 rounded-md bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                      اختیاری
                    </span>
                  )}
                </div>

                <div className="grid gap-2.5">
                  {activeOptions(group).map((opt) => {
                    const selected = selectedIds.includes(opt.id)
                    const delta = Number(opt.price_delta || 0)
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => toggleOption(group, opt.id)}
                        className={cn(
                          'flex min-h-16 w-full items-center gap-4 rounded-2xl border px-4 py-3.5 text-start transition-colors',
                          'active:scale-[0.99] touch-manipulation',
                          selected
                            ? 'border-primary bg-primary/10 shadow-[inset_0_0_0_1px] shadow-primary'
                            : 'border-border/70 bg-card hover:border-primary/40 hover:bg-muted/40'
                        )}
                      >
                        <span
                          className={cn(
                            'flex h-8 w-8 shrink-0 items-center justify-center border-2 transition-colors',
                            multi ? 'rounded-md' : 'rounded-full',
                            selected
                              ? 'border-primary bg-primary text-primary-foreground'
                              : 'border-muted-foreground/35 bg-background text-transparent'
                          )}
                          aria-hidden
                        >
                          <Check className="h-4 w-4" strokeWidth={3} />
                        </span>

                        <span className="min-w-0 flex-1 text-base font-semibold text-foreground">
                          {opt.name}
                        </span>

                        <span
                          className={cn(
                            'shrink-0 text-sm font-bold tabular-nums',
                            delta === 0
                              ? 'text-muted-foreground'
                              : delta > 0
                                ? 'text-primary'
                                : 'text-emerald-700'
                          )}
                        >
                          {delta === 0
                            ? 'بدون هزینه'
                            : `${delta > 0 ? '+' : '−'}${formatCurrency(Math.abs(delta))}`}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </section>
            )
          })}
        </div>

        <div className="shrink-0 space-y-3 border-t border-border/50 bg-background/95 px-6 py-4 backdrop-blur">
          {error ? (
            <p className="rounded-xl bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
              {error}
            </p>
          ) : null}

          <div className="flex items-center justify-between gap-3 text-base">
            <span className="text-muted-foreground">مبلغ این آیتم</span>
            <span className="text-xl font-bold text-foreground tabular-nums">
              {formatCurrency(unitTotal)}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="h-14 rounded-2xl text-base"
              onClick={() => onOpenChange(false)}
            >
              انصراف
            </Button>
            <Button
              type="button"
              size="lg"
              className="h-14 rounded-2xl text-base font-bold"
              onClick={handleConfirm}
            >
              <Plus className="h-5 w-5" />
              افزودن به سبد
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
