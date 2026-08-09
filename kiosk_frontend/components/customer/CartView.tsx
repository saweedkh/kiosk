'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { AnimatePresence, motion } from 'framer-motion'
import { ShoppingBag, Trash2, Minus, Plus, TicketPercent, X } from 'lucide-react'
import { useCartStore } from '@/lib/store/cart-store'
import { couponsApi } from '@/lib/api/dashboard'
import { formatCurrency, formatNumber, cn } from '@/lib/utils'
import { Button } from '@/components/shared/Button'

export type CartLayout = 'side' | 'bottom'

interface CartViewProps {
  onCheckout: (fulfillmentType: 'dine_in' | 'takeaway') => void
  layout?: CartLayout
  serviceFee?: number
  serviceFeeOnDineIn?: boolean
  serviceFeeOnTakeaway?: boolean
  /** When false, hide coupon field and clear any applied discount. */
  couponsEnabled?: boolean
}

export function CartView({
  onCheckout,
  layout = 'side',
  serviceFee = 0,
  serviceFeeOnDineIn = true,
  serviceFeeOnTakeaway = true,
  couponsEnabled = true,
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
  const grandTotal = Math.max(itemsTotal + fee - (discountAmount || 0), 0)
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
          layout === 'side' ? 'flex h-full flex-col' : 'h-24 w-full border-t'
        )}
      />
    )
  }

  if (layout === 'bottom') {
    return (
      <BottomCart
        items={items}
        itemCount={itemCount}
        grandTotal={grandTotal}
        fee={fee}
        discountAmount={discountAmount}
        couponCode={couponCode}
        couponInput={couponInput}
        couponMsg={couponMsg}
        couponLoading={couponLoading}
        fulfillmentType={fulfillmentType}
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
      />
    )
  }

  return (
    <SideCart
      items={items}
      itemCount={itemCount}
      grandTotal={grandTotal}
      fee={fee}
      discountAmount={discountAmount}
      couponCode={couponCode}
      couponInput={couponInput}
      couponMsg={couponMsg}
      couponLoading={couponLoading}
      fulfillmentType={fulfillmentType}
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
  couponCode: string
  couponInput: string
  couponMsg: string
  couponLoading: boolean
  fulfillmentType: 'dine_in' | 'takeaway' | null
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
}: {
  value: 'dine_in' | 'takeaway' | null
  onChange: (v: 'dine_in' | 'takeaway') => void
  compact?: boolean
}) {
  const opts = [
    { id: 'dine_in' as const, label: 'داخل سالن' },
    { id: 'takeaway' as const, label: 'بیرون‌بر' },
  ]
  return (
    <div
      className={cn(
        'grid grid-cols-2 gap-1.5 rounded-2xl bg-muted/60 p-1',
        compact && 'gap-1 p-0.5'
      )}
    >
      {opts.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => onChange(o.id)}
          className={cn(
            'rounded-xl font-bold transition-all',
            compact ? 'px-2.5 py-2 text-xs' : 'px-3 py-2.5 text-sm',
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
            {empty ? 'هنوز چیزی اضافه نشده' : `${formatNumber(props.itemCount)} قلم انتخاب‌شده`}
          </p>
        </div>
        {!empty ? (
          <span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-bold text-primary">
            {formatNumber(props.itemCount)}
          </span>
        ) : null}
      </div>

      <div className="kiosk-scroll relative z-[1] min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-4 py-4">
        {empty ? (
          <div className="flex h-full flex-col items-center justify-center px-6 text-center">
            <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-3xl bg-muted/80">
              <ShoppingBag className="h-9 w-9 text-muted-foreground/50" />
            </div>
            <p className="font-bold text-foreground">سبد خالی است</p>
            <p className="mt-1 text-sm text-muted-foreground">
              محصول را از منو لمس کنید تا اینجا دیده شود
            </p>
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
                          <p className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground">
                            {item.selectedOptions.map((o) => o.name).join(' · ')}
                          </p>
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
      </div>

      {!empty ? (
        <div className="relative z-[1] space-y-3 border-t border-border/70 bg-card/95 px-4 py-4 backdrop-blur">
          <FulfillmentToggle value={props.fulfillmentType} onChange={props.onFulfillment} />

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
  }
) {
  const empty = props.items.length === 0

  return (
    <div className="relative z-40 w-full flex-shrink-0 border-t border-border/80 bg-card/95 shadow-[0_-12px_40px_rgba(0,0,0,0.08)] backdrop-blur-xl dark:shadow-[0_-12px_40px_rgba(0,0,0,0.35)]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-16 h-16 bg-gradient-to-t from-card/80 to-transparent"
      />

      <AnimatePresence>
        {props.expanded && !empty ? (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-b border-border/60"
          >
            <div className="space-y-3 px-4 py-3 sm:px-6">
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold">جزئیات سفارش</p>
                <button
                  type="button"
                  onClick={props.onCollapse}
                  className="flex h-9 w-9 items-center justify-center rounded-xl hover:bg-muted"
                  aria-label="بستن"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <FulfillmentToggle
                value={props.fulfillmentType}
                onChange={props.onFulfillment}
                compact
              />
              <div className="flex gap-2">
                <input
                  value={props.couponInput}
                  onChange={(e) => props.onCouponInput(e.target.value)}
                  placeholder="کد تخفیف"
                  className="min-w-0 flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm"
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
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                {props.fee > 0 ? (
                  <span className="text-muted-foreground">
                    سرویس: {formatCurrency(props.fee)}
                  </span>
                ) : null}
                {props.discountAmount > 0 ? (
                  <span className="text-emerald-600">
                    تخفیف: -{formatCurrency(props.discountAmount)}
                  </span>
                ) : null}
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <div className="flex items-stretch gap-3 px-3 py-3 sm:gap-4 sm:px-5 sm:py-4">
        {/* CTA cluster */}
        <div className="flex w-[min(280px,34%)] flex-shrink-0 flex-col justify-center gap-2">
          <div className="flex items-baseline justify-between gap-2 px-1">
            <span className="text-xs text-muted-foreground">جمع</span>
            <span className="text-lg font-black text-primary sm:text-xl">
              {empty ? formatCurrency(0) : formatCurrency(props.grandTotal)}
            </span>
          </div>
          {!empty ? (
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="flex-1 rounded-xl"
                onClick={props.expanded ? props.onCollapse : props.onExpand}
              >
                {props.expanded ? 'بستن' : 'جزئیات'}
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                className="flex-[1.4] rounded-xl font-black shadow-md shadow-primary/20"
                disabled={!props.fulfillmentType}
                onClick={() => {
                  if (!props.fulfillmentType) {
                    props.onExpand()
                    return
                  }
                  props.onCheckout()
                }}
              >
                پرداخت
              </Button>
            </div>
          ) : (
            <div className="rounded-xl bg-muted/60 px-3 py-2 text-center text-xs text-muted-foreground">
              محصولی اضافه کنید
            </div>
          )}
        </div>

        {/* Horizontal items */}
        <div className="kiosk-scroll min-w-0 flex-1 overflow-x-auto overscroll-x-contain">
          {empty ? (
            <div className="flex h-full min-h-[88px] items-center gap-3 rounded-2xl border border-dashed border-border/80 bg-muted/30 px-5">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <ShoppingBag className="h-5 w-5" />
              </div>
              <div>
                <p className="font-bold">سبد خرید افقی</p>
                <p className="text-xs text-muted-foreground">
                  آیتم‌ها اینجا به‌صورت ردیفی نمایش داده می‌شوند
                </p>
              </div>
            </div>
          ) : (
            <div className="flex h-full items-stretch gap-2.5 pe-2">
              {props.items.map((item) => {
                const unit = props.getLineUnitPrice(item)
                return (
                  <motion.div
                    key={item.key}
                    layout
                    className="flex w-[200px] flex-shrink-0 gap-2.5 rounded-2xl border border-border/70 bg-gradient-to-br from-background to-muted/40 p-2.5 shadow-sm"
                  >
                    <div className="relative h-[72px] w-[72px] flex-shrink-0 overflow-hidden rounded-xl bg-muted">
                      {item.product.image ? (
                        <Image
                          src={item.product.image}
                          alt={item.product.name}
                          fill
                          className="object-cover"
                          sizes="72px"
                          unoptimized={
                            item.product.image.startsWith('http://') ||
                            item.product.image.startsWith('https://')
                          }
                        />
                      ) : null}
                      <span className="absolute bottom-1 start-1 rounded-md bg-black/65 px-1.5 py-0.5 text-[10px] font-bold text-white">
                        ×{formatNumber(item.quantity)}
                      </span>
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col">
                      <div className="flex items-start justify-between gap-1">
                        <p className="line-clamp-2 text-xs font-bold leading-snug">
                          {item.product.name}
                        </p>
                        <button
                          type="button"
                          onClick={() => props.onRemove(item.key)}
                          className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <p className="mt-auto text-xs font-black text-primary">
                        {formatCurrency(unit * item.quantity)}
                      </p>
                      <div className="mt-1 inline-flex items-center gap-0.5 self-start rounded-lg border border-border bg-background/80 p-0.5">
                        <button
                          type="button"
                          className="flex h-7 w-7 items-center justify-center"
                          onClick={() => props.onQuantity(item.key, item.quantity - 1)}
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="min-w-[1.25rem] text-center text-[11px] font-bold">
                          {formatNumber(item.quantity)}
                        </span>
                        <button
                          type="button"
                          className="flex h-7 w-7 items-center justify-center disabled:opacity-40"
                          disabled={item.quantity >= item.product.stock_quantity}
                          onClick={() => props.onQuantity(item.key, item.quantity + 1)}
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          )}
        </div>

        {!empty ? (
          <div className="hidden w-28 flex-shrink-0 flex-col justify-center gap-1.5 lg:flex">
            <span className="text-center text-[11px] font-medium text-muted-foreground">
              {formatNumber(props.itemCount)} قلم
            </span>
            <FulfillmentToggle
              value={props.fulfillmentType}
              onChange={props.onFulfillment}
              compact
            />
          </div>
        ) : null}
      </div>
    </div>
  )
}
