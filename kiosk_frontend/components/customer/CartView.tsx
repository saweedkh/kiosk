'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { AnimatePresence, motion } from 'framer-motion'
import { ShoppingBag, Trash2, Minus, Plus, TicketPercent, X } from 'lucide-react'
import { useCartStore } from '@/lib/store/cart-store'
import { couponsApi } from '@/lib/api/dashboard'
import { formatCurrency, formatNumber, cn } from '@/lib/utils'
import { Button } from '@/components/shared/Button'
import { KioskScroll } from '@/components/shared/KioskScroll'

export type CartLayout = 'side' | 'bottom'

interface CartViewProps {
  onCheckout: (fulfillmentType: 'dine_in' | 'takeaway') => void
  layout?: CartLayout
  serviceFee?: number
  serviceFeeOnDineIn?: boolean
  serviceFeeOnTakeaway?: boolean
  /** When false, hide coupon field and clear any applied discount. */
  couponsEnabled?: boolean
  /** Master: show dine-in / takeaway choice on kiosk at all. */
  fulfillmentChoiceEnabled?: boolean
  dineInEnabled?: boolean
  takeawayEnabled?: boolean
  /** Compact copyright line inside bottom cart (not used for side layout). */
  footerCopyright?: string
  footerPhone?: string
}

export function CartView({
  onCheckout,
  layout = 'side',
  serviceFee = 0,
  serviceFeeOnDineIn = true,
  serviceFeeOnTakeaway = true,
  couponsEnabled = true,
  fulfillmentChoiceEnabled = true,
  dineInEnabled = true,
  takeawayEnabled = true,
  footerCopyright,
  footerPhone,
}: CartViewProps) {
  const [isMounted, setIsMounted] = useState(false)
  const [fulfillmentType, setFulfillmentType] = useState<'dine_in' | 'takeaway' | null>(null)
  const [couponInput, setCouponInput] = useState('')
  const [couponMsg, setCouponMsg] = useState('')
  const [couponLoading, setCouponLoading] = useState(false)
  const [bottomExpanded, setBottomExpanded] = useState(false)
  const {
    items,
    removeItem,
    updateQuantity,
    getTotalPrice,
    getTotalItems,
    getLineUnitPrice,
    couponCode,
    discountAmount,
    setCoupon,
    clearCoupon,
  } = useCartStore()

  const baseFee = Math.max(0, Math.round(Number(serviceFee) || 0))
  const feeApplies =
    fulfillmentType === 'takeaway'
      ? serviceFeeOnTakeaway
      : fulfillmentType === 'dine_in'
        ? serviceFeeOnDineIn
        : false
  const fee = feeApplies ? baseFee : 0
  const itemsTotal = getTotalPrice()
  const itemCount = getTotalItems()

  useEffect(() => setIsMounted(true), [])
  useEffect(() => setCouponInput(couponCode || ''), [couponCode])
  useEffect(() => {
    if (items.length === 0) setBottomExpanded(false)
  }, [items.length])
  useEffect(() => {
    if (!couponsEnabled) {
      clearCoupon()
      setCouponInput('')
      setCouponMsg('')
    }
  }, [couponsEnabled, clearCoupon])
  useEffect(() => {
    const choiceOn = fulfillmentChoiceEnabled !== false
    const dineOk = choiceOn && dineInEnabled !== false
    const takeOk = choiceOn && takeawayEnabled !== false
    setFulfillmentType((prev) => {
      if (!choiceOn) return 'dine_in'
      if (prev === 'dine_in' && dineOk) return prev
      if (prev === 'takeaway' && takeOk) return prev
      if (dineOk) return 'dine_in'
      if (takeOk) return 'takeaway'
      return null
    })
  }, [fulfillmentChoiceEnabled, dineInEnabled, takeawayEnabled])

  const showFulfillmentChoice = fulfillmentChoiceEnabled !== false
  const effectiveDineIn = showFulfillmentChoice && dineInEnabled !== false
  const effectiveTakeaway = showFulfillmentChoice && takeawayEnabled !== false

  const applyCoupon = async () => {
    if (!couponsEnabled) return
    const code = couponInput.trim()
    if (!code) {
      clearCoupon()
      setCouponMsg('')
      return
    }
    setCouponLoading(true)
    setCouponMsg('')
    try {
      const preview = await couponsApi.validate({
        code,
        items_total: itemsTotal,
        service_fee: fee,
      })
      setCoupon(preview.code, preview.discount_amount)
      setCouponMsg(`تخفیف ${formatCurrency(preview.discount_amount)} اعمال شد`)
    } catch (err: any) {
      clearCoupon()
      setCouponMsg(
        err?.response?.data?.detail ||
          err?.response?.data?.messages?.detail?.[0] ||
          'کد تخفیف نامعتبر است'
      )
    } finally {
      setCouponLoading(false)
    }
  }

  const effectiveDiscount = couponsEnabled ? discountAmount : 0
  const effectiveGrandTotal = Math.max(itemsTotal + fee - effectiveDiscount, 0)

  if (!isMounted) {
    return (
      <div
        className={cn(
          'bg-card',
          layout === 'side'
            ? 'flex h-full flex-col'
            : 'min-h-[11rem] w-full border-t portrait:min-h-[30vh]'
        )}
      />
    )
  }

  if (layout === 'bottom') {
    return (
      <BottomCart
        items={items}
        itemCount={itemCount}
        grandTotal={effectiveGrandTotal}
        fee={fee}
        discountAmount={effectiveDiscount}
        couponsEnabled={couponsEnabled}
        couponCode={couponCode}
        couponInput={couponInput}
        couponMsg={couponMsg}
        couponLoading={couponLoading}
        fulfillmentType={fulfillmentType}
        showFulfillmentChoice={showFulfillmentChoice}
        dineInEnabled={effectiveDineIn}
        takeawayEnabled={effectiveTakeaway}
        expanded={bottomExpanded}
        getLineUnitPrice={getLineUnitPrice}
        onExpand={() => setBottomExpanded(true)}
        onCollapse={() => setBottomExpanded(false)}
        onFulfillment={setFulfillmentType}
        onCouponInput={setCouponInput}
        onApplyCoupon={() => void applyCoupon()}
        onClearCoupon={() => {
          clearCoupon()
          setCouponInput('')
          setCouponMsg('')
        }}
        onRemove={(key) => removeItem(key)}
        onQuantity={(key, qty) => updateQuantity(key, qty)}
        onCheckout={() => fulfillmentType && onCheckout(fulfillmentType)}
        footerCopyright={footerCopyright}
        footerPhone={footerPhone}
      />
    )
  }

  return (
    <SideCart
      items={items}
      itemCount={itemCount}
      grandTotal={effectiveGrandTotal}
      fee={fee}
      discountAmount={effectiveDiscount}
      couponsEnabled={couponsEnabled}
      couponCode={couponCode}
      couponInput={couponInput}
      couponMsg={couponMsg}
      couponLoading={couponLoading}
      fulfillmentType={fulfillmentType}
      showFulfillmentChoice={showFulfillmentChoice}
      dineInEnabled={effectiveDineIn}
      takeawayEnabled={effectiveTakeaway}
      getLineUnitPrice={getLineUnitPrice}
      onFulfillment={setFulfillmentType}
      onCouponInput={setCouponInput}
      onApplyCoupon={() => void applyCoupon()}
      onClearCoupon={() => {
        clearCoupon()
        setCouponInput('')
        setCouponMsg('')
      }}
      onRemove={(key) => removeItem(key)}
      onQuantity={(key, qty) => updateQuantity(key, qty)}
      onCheckout={() => fulfillmentType && onCheckout(fulfillmentType)}
    />
  )
}

type CartSharedProps = {
  items: ReturnType<typeof useCartStore.getState>['items']
  itemCount: number
  grandTotal: number
  fee: number
  discountAmount: number
  couponsEnabled: boolean
  couponCode: string
  couponInput: string
  couponMsg: string
  couponLoading: boolean
  fulfillmentType: 'dine_in' | 'takeaway' | null
  showFulfillmentChoice: boolean
  dineInEnabled: boolean
  takeawayEnabled: boolean
  getLineUnitPrice: (item: any) => number
  onFulfillment: (v: 'dine_in' | 'takeaway') => void
  onCouponInput: (v: string) => void
  onApplyCoupon: () => void
  onClearCoupon: () => void
  onRemove: (key: string) => void
  onQuantity: (key: string, qty: number) => void
  onCheckout: () => void
}

function FulfillmentToggle({
  value,
  onChange,
  compact = false,
  large = false,
  dineInEnabled = true,
  takeawayEnabled = true,
}: {
  value: 'dine_in' | 'takeaway' | null
  onChange: (v: 'dine_in' | 'takeaway') => void
  compact?: boolean
  /** Bigger hit targets for bottom cart strip */
  large?: boolean
  dineInEnabled?: boolean
  takeawayEnabled?: boolean
}) {
  const opts = [
    { id: 'dine_in' as const, label: 'داخل سالن', enabled: dineInEnabled },
    { id: 'takeaway' as const, label: 'بیرون‌بر', enabled: takeawayEnabled },
  ].filter((o) => o.enabled)

  if (opts.length === 0) {
    return (
      <div className="rounded-2xl bg-destructive/10 px-3 py-2 text-center text-xs font-semibold text-destructive">
        هیچ نوع سفارشی فعال نیست
      </div>
    )
  }

  if (opts.length === 1) {
    return (
      <div
        className={cn(
          'rounded-2xl bg-primary/10 px-3 text-center font-bold text-primary',
          large ? 'py-3 text-sm' : compact ? 'py-2 text-xs' : 'py-2.5 text-sm'
        )}
      >
        {opts[0].label}
      </div>
    )
  }

  return (
    <div
      className={cn(
        'grid grid-cols-2 gap-1.5 rounded-2xl bg-muted/60 p-1',
        compact && !large && 'gap-1 p-0.5',
        large && 'gap-1.5 p-1.5'
      )}
    >
      {opts.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => onChange(o.id)}
          className={cn(
            'rounded-xl font-bold transition-all',
            large
              ? 'min-h-12 px-3 py-3 text-sm portrait:min-h-14 portrait:text-base'
              : compact
                ? 'px-2.5 py-2 text-xs'
                : 'px-3 py-2.5 text-sm',
            value === o.id
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

function SideCart(props: CartSharedProps) {
  const empty = props.items.length === 0
  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden border-s border-border/80 bg-gradient-to-b from-[hsl(30_50%_98%)] via-card to-card dark:from-[hsl(0_0%_10%)] dark:via-card dark:to-card">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(80%_60%_at_50%_0%,rgba(225,113,0,0.14),transparent)]"
      />

      <div className="relative z-[1] flex items-center gap-3 border-b border-border/60 px-5 py-5">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md shadow-primary/25">
          <ShoppingBag className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-black tracking-tight">سبد خرید</h2>
          <p className="text-xs text-muted-foreground">
            {empty ? 'سبد خالی است' : `${formatNumber(props.itemCount)} قلم انتخاب‌شده`}
          </p>
        </div>
        {!empty ? (
          <span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-bold text-primary">
            {formatNumber(props.itemCount)}
          </span>
        ) : null}
      </div>

      <KioskScroll
        className="relative z-[1] min-h-0 flex-1"
        contentClassName="px-4 py-4"
      >
        {empty ? (
          <div className="flex h-full flex-col items-center justify-center px-6 text-center">
            <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-3xl bg-muted/80">
              <ShoppingBag className="h-9 w-9 text-muted-foreground/50" />
            </div>
            <p className="text-base font-bold text-foreground">سبد خالی است</p>
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence initial={false}>
              {props.items.map((item) => {
                const unit = props.getLineUnitPrice(item)
                return (
                  <motion.div
                    key={item.key}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    className="overflow-hidden rounded-2xl border border-border/70 bg-card/90 shadow-sm"
                  >
                    <div className="flex gap-3 p-3">
                      <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-xl bg-muted">
                        {item.product.image ? (
                          <Image
                            src={item.product.image}
                            alt={item.product.name}
                            fill
                            className="object-cover"
                            sizes="80px"
                            unoptimized={
                              item.product.image.startsWith('http://') ||
                              item.product.image.startsWith('https://')
                            }
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-[10px] text-muted-foreground">
                            بدون تصویر
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="truncate font-bold leading-snug">{item.product.name}</h4>
                          <button
                            type="button"
                            onClick={() => props.onRemove(item.key)}
                            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl text-destructive hover:bg-destructive/10"
                            aria-label="حذف"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                        {item.selectedOptions?.length ? (
                          <div className="mt-1.5 flex flex-wrap gap-1">
                            {item.selectedOptions.map((o) => (
                              <span
                                key={`${item.key}-${o.id}`}
                                className="rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground"
                              >
                                {o.group_name ? `${o.group_name}: ${o.name}` : o.name}
                              </span>
                            ))}
                          </div>
                        ) : null}
                        <p className="mt-1 text-sm font-bold text-primary">
                          {formatCurrency(unit * item.quantity)}
                        </p>
                        <div className="mt-2 inline-flex items-center gap-1 rounded-xl border border-border bg-muted/40 p-0.5">
                          <button
                            type="button"
                            className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-background"
                            onClick={() => props.onQuantity(item.key, item.quantity - 1)}
                          >
                            <Minus className="h-4 w-4" />
                          </button>
                          <span className="min-w-[1.75rem] text-center text-sm font-bold">
                            {formatNumber(item.quantity)}
                          </span>
                          <button
                            type="button"
                            className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-background disabled:opacity-40"
                            disabled={item.quantity >= item.product.stock_quantity}
                            onClick={() => props.onQuantity(item.key, item.quantity + 1)}
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        )}
      </KioskScroll>

      {!empty ? (
        <div className="relative z-[1] space-y-3 border-t border-border/70 bg-card/95 px-4 py-4 backdrop-blur">
          {props.showFulfillmentChoice ? (
            <FulfillmentToggle
              value={props.fulfillmentType}
              onChange={props.onFulfillment}
              dineInEnabled={props.dineInEnabled}
              takeawayEnabled={props.takeawayEnabled}
            />
          ) : null}

          {props.couponsEnabled ? (
            <div className="space-y-1.5">
              <div className="flex gap-2">
                <div className="relative min-w-0 flex-1">
                  <TicketPercent className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    value={props.couponInput}
                    onChange={(e) => props.onCouponInput(e.target.value)}
                    placeholder="کد تخفیف"
                    className="w-full rounded-xl border border-border bg-background py-2.5 pe-3 ps-9 text-sm"
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={props.couponLoading}
                  onClick={props.onApplyCoupon}
                >
                  اعمال
                </Button>
              </div>
              {props.couponMsg ? (
                <p className="text-xs text-muted-foreground">{props.couponMsg}</p>
              ) : null}
            </div>
          ) : null}

          <div className="space-y-1 rounded-2xl bg-muted/50 px-3 py-2.5 text-sm">
            {props.fee > 0 ? (
              <div className="flex justify-between text-muted-foreground">
                <span>سرویس</span>
                <span>{formatCurrency(props.fee)}</span>
              </div>
            ) : null}
            {props.discountAmount > 0 ? (
              <div className="flex justify-between text-emerald-600">
                <span>تخفیف{props.couponCode ? ` (${props.couponCode})` : ''}</span>
                <span>-{formatCurrency(props.discountAmount)}</span>
              </div>
            ) : null}
            <div className="flex items-center justify-between pt-1">
              <span className="font-medium">جمع کل</span>
              <span className="text-xl font-black text-primary">
                {formatCurrency(props.grandTotal)}
              </span>
            </div>
          </div>

          <Button
            variant="primary"
            size="lg"
            className="w-full rounded-2xl text-base font-black shadow-lg shadow-primary/20"
            disabled={!props.fulfillmentType}
            onClick={props.onCheckout}
          >
            تکمیل سفارش
          </Button>
        </div>
      ) : null}
    </div>
  )
}

function BottomCart(
  props: CartSharedProps & {
    expanded: boolean
    onExpand: () => void
    onCollapse: () => void
    footerCopyright?: string
    footerPhone?: string
  }
) {
  const empty = props.items.length === 0
  const year = new Date().getFullYear()
  const copyright = (props.footerCopyright || '').trim()
  const phone = (props.footerPhone || '').trim()
  const footerBits = [
    `© ${year}${copyright ? ` ${copyright}` : ''}`,
    phone || null,
  ].filter(Boolean)

  return (
    <div
      className={cn(
        'relative z-40 flex w-full flex-shrink-0 flex-col overflow-hidden',
        'border-t border-border/70 bg-gradient-to-t from-card via-card to-[hsl(30_55%_97%)]',
        'shadow-[0_-8px_32px_rgba(225,113,0,0.08)] dark:to-[hsl(0_0%_11%)] dark:shadow-[0_-8px_32px_rgba(0,0,0,0.4)]',
        'min-h-[11rem] sm:min-h-[12rem]',
        'portrait:min-h-[30vh] portrait:max-h-[42vh] sm:portrait:min-h-[32vh]'
      )}
    >
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-l from-primary via-primary/70 to-transparent"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-10 h-20 bg-[radial-gradient(60%_80%_at_50%_0%,rgba(225,113,0,0.12),transparent)]"
      />

      <AnimatePresence>
        {props.expanded && !empty && props.couponsEnabled ? (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="relative z-[1] overflow-hidden border-b border-border/50 bg-muted/30"
          >
            <div className="flex flex-col gap-3 px-4 py-3 sm:px-6 portrait:px-5 portrait:py-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-bold portrait:text-base">کد تخفیف</p>
                <button
                  type="button"
                  onClick={props.onCollapse}
                  className="flex size-9 items-center justify-center rounded-xl bg-background/80 hover:bg-muted portrait:size-11"
                  aria-label="بستن"
                >
                  <X className="size-4" />
                </button>
              </div>
              <div className="flex flex-col gap-1.5">
                <div className="flex gap-2">
                  <input
                    value={props.couponInput}
                    onChange={(e) => props.onCouponInput(e.target.value)}
                    placeholder="کد تخفیف"
                    className="min-w-0 flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm portrait:py-3 portrait:text-base"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={props.couponLoading}
                    onClick={props.onApplyCoupon}
                  >
                    اعمال
                  </Button>
                  {props.couponCode ? (
                    <Button type="button" variant="ghost" size="sm" onClick={props.onClearCoupon}>
                      حذف کد
                    </Button>
                  ) : null}
                </div>
                {props.couponMsg ? (
                  <p className="text-xs text-muted-foreground">{props.couponMsg}</p>
                ) : null}
              </div>
              {(props.fee > 0 || props.discountAmount > 0) && (
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                  {props.fee > 0 ? (
                    <span className="text-muted-foreground">
                      سرویس: {formatCurrency(props.fee)}
                    </span>
                  ) : null}
                  {props.discountAmount > 0 ? (
                    <span className="font-medium text-emerald-600">
                      تخفیف: -{formatCurrency(props.discountAmount)}
                    </span>
                  ) : null}
                </div>
              )}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* RTL: first = right (items), last = left (big pay) */}
      <div
        className={cn(
          'relative z-[1] flex min-h-0 flex-1 items-stretch gap-3 px-3 py-3 sm:gap-4 sm:px-5 sm:py-4',
          'portrait:gap-4 portrait:px-4 portrait:py-4'
        )}
      >
        {/* Items strip — right side (no fat rail; it was crushing cart height) */}
        <div className="relative min-h-0 min-w-0 flex-1 self-stretch">
          <div
            className={cn(
              'kiosk-scroll-pane flex h-full min-h-0 items-stretch overflow-x-auto overflow-y-hidden overscroll-x-contain',
              'touch-pan-x pe-1'
            )}
          >
            {empty ? (
              <div className="flex h-full min-h-[7.5rem] w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border/60 bg-muted/20 px-6 portrait:min-h-[14vh] portrait:gap-3">
                <div className="flex size-12 items-center justify-center rounded-2xl bg-muted/80 portrait:size-14">
                  <ShoppingBag className="size-5 text-muted-foreground/55 portrait:size-6" />
                </div>
                <p className="text-sm font-bold text-muted-foreground portrait:text-base">
                  سبد خالی است
                </p>
              </div>
            ) : (
              <div className="flex h-full min-h-[7.5rem] items-stretch gap-3 pe-2 portrait:min-h-[14vh] portrait:gap-3.5">
                <AnimatePresence initial={false}>
                  {props.items.map((item) => {
                    const unit = props.getLineUnitPrice(item)
                    return (
                      <motion.div
                        key={item.key}
                        layout
                        initial={{ opacity: 0, x: 12 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, scale: 0.96 }}
                        className={cn(
                          'flex w-[210px] flex-shrink-0 gap-2.5 rounded-2xl border border-border/60 bg-card/90 p-2.5 shadow-sm',
                          'ring-1 ring-black/[0.03] dark:ring-white/[0.04]',
                          'portrait:w-[248px] portrait:gap-3 portrait:p-3'
                        )}
                      >
                        <div className="relative size-[4.75rem] flex-shrink-0 overflow-hidden rounded-xl bg-muted portrait:size-24">
                          {item.product.image ? (
                            <Image
                              src={item.product.image}
                              alt={item.product.name}
                              fill
                              className="object-cover"
                              sizes="96px"
                              unoptimized={
                                item.product.image.startsWith('http://') ||
                                item.product.image.startsWith('https://')
                              }
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center text-[10px] text-muted-foreground">
                              —
                            </div>
                          )}
                        </div>
                        <div className="flex min-w-0 flex-1 flex-col gap-1">
                          <div className="flex items-start justify-between gap-1">
                            <p className="line-clamp-2 text-xs font-bold leading-snug portrait:text-sm">
                              {item.product.name}
                            </p>
                            <button
                              type="button"
                              onClick={() => props.onRemove(item.key)}
                              className="flex size-7 flex-shrink-0 items-center justify-center rounded-lg text-destructive/80 hover:bg-destructive/10 hover:text-destructive portrait:size-9"
                              aria-label="حذف"
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          </div>
                          {item.selectedOptions?.length ? (
                            <p className="truncate text-[10px] text-muted-foreground portrait:text-[11px]">
                              {item.selectedOptions.map((o) => o.name).join(' · ')}
                            </p>
                          ) : null}
                          <p className="mt-auto text-xs font-black tabular-nums text-primary portrait:text-sm">
                            {formatCurrency(unit * item.quantity)}
                          </p>
                          <div className="inline-flex items-center self-start rounded-full border border-border/80 bg-muted/40 p-0.5">
                            <button
                              type="button"
                              className="flex size-7 items-center justify-center rounded-full hover:bg-background portrait:size-8"
                              onClick={() => props.onQuantity(item.key, item.quantity - 1)}
                              aria-label="کاهش"
                            >
                              <Minus className="size-3" />
                            </button>
                            <span className="min-w-[1.35rem] text-center text-[11px] font-bold tabular-nums portrait:min-w-[1.6rem] portrait:text-sm">
                              {formatNumber(item.quantity)}
                            </span>
                            <button
                              type="button"
                              className="flex size-7 items-center justify-center rounded-full hover:bg-background disabled:opacity-40 portrait:size-8"
                              disabled={item.quantity >= item.product.stock_quantity}
                              onClick={() => props.onQuantity(item.key, item.quantity + 1)}
                              aria-label="افزایش"
                            >
                              <Plus className="size-3" />
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )
                  })}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>

        {/* Total + fulfillment — middle */}
        <div
          className={cn(
            'flex w-[min(220px,26%)] flex-shrink-0 flex-col justify-center gap-2.5 rounded-2xl border border-border/60 bg-card/80 p-3',
            'portrait:w-[min(260px,28%)] portrait:gap-3 portrait:p-3.5'
          )}
        >
          <div className="flex items-center gap-2">
            <div className="flex size-9 flex-shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary portrait:size-11">
              <ShoppingBag className="size-4 portrait:size-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-medium text-muted-foreground portrait:text-xs">
                {empty ? 'سبد خرید' : `${formatNumber(props.itemCount)} قلم`}
              </p>
              <p className="truncate text-base font-black tabular-nums tracking-tight text-primary sm:text-lg portrait:text-xl">
                {empty ? formatCurrency(0) : formatCurrency(props.grandTotal)}
              </p>
            </div>
          </div>

          {!empty && props.showFulfillmentChoice ? (
            <FulfillmentToggle
              value={props.fulfillmentType}
              onChange={props.onFulfillment}
              large
              dineInEnabled={props.dineInEnabled}
              takeawayEnabled={props.takeawayEnabled}
            />
          ) : null}

          {!empty && props.couponsEnabled ? (
            <button
              type="button"
              onClick={props.expanded ? props.onCollapse : props.onExpand}
              className="text-center text-[11px] font-semibold text-primary underline-offset-2 hover:underline portrait:text-xs"
            >
              {props.expanded ? 'بستن کد تخفیف' : 'کد تخفیف'}
              {props.discountAmount > 0 ? ` (−${formatCurrency(props.discountAmount)})` : ''}
            </button>
          ) : empty ? (
            <p className="text-center text-[11px] text-muted-foreground portrait:text-xs">
              محصول را از منو اضافه کنید
            </p>
          ) : null}
        </div>

        {/* Big pay — left side (visual end in RTL) */}
        <div className="flex w-[min(200px,24%)] flex-shrink-0 self-stretch portrait:w-[min(240px,26%)]">
          <button
            type="button"
            disabled={empty || !props.fulfillmentType}
            className={cn(
              'flex h-full min-h-[7.5rem] w-full flex-col items-center justify-center gap-1 rounded-2xl',
              'bg-primary px-3 text-lg font-black text-primary-foreground shadow-lg shadow-primary/30',
              'transition hover:brightness-105 active:scale-[0.98]',
              'portrait:min-h-[14vh] portrait:text-xl',
              'disabled:cursor-not-allowed disabled:opacity-45 disabled:shadow-none'
            )}
            onClick={() => {
              if (empty || !props.fulfillmentType) return
              props.onCheckout()
            }}
          >
            <span>پرداخت</span>
            {!empty ? (
              <span className="text-sm font-bold opacity-90 portrait:text-base">
                {formatCurrency(props.grandTotal)}
              </span>
            ) : null}
          </button>
        </div>
      </div>

      <footer className="relative z-[1] flex h-6 flex-shrink-0 items-center justify-center border-t border-border/40 bg-muted/20 px-3">
        <p className="truncate text-[10px] leading-none text-muted-foreground/80">
          {footerBits.join(' · ')}
        </p>
      </footer>
    </div>
  )
}
