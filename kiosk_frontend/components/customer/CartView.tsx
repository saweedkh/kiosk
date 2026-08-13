'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { AnimatePresence, motion } from 'framer-motion'
import { ShoppingBag, Trash2, Minus, Plus, TicketPercent, X, UtensilsCrossed, Package } from 'lucide-react'
import { useCartStore } from '@/lib/store/cart-store'
import { couponsApi } from '@/lib/api/dashboard'
import { formatCurrency, formatNumber, cn } from '@/lib/utils'
import { Button } from '@/components/shared/Button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DEFAULT_PACKAGING_TITLE_DINE_IN,
  DEFAULT_PACKAGING_TITLE_TAKEAWAY,
  DEFAULT_SERVICE_TITLE_DINE_IN,
  DEFAULT_SERVICE_TITLE_TAKEAWAY,
} from '@/lib/api/settings'

export type CartLayout = 'side' | 'bottom'

interface CartViewProps {
  onCheckout: (fulfillmentType: 'dine_in' | 'takeaway') => void
  layout?: CartLayout
  serviceFeeDineIn?: number
  serviceFeeTakeaway?: number
  serviceTitleDineIn?: string
  serviceTitleTakeaway?: string
  packagingFeeDineIn?: number
  packagingFeeTakeaway?: number
  packagingTitleDineIn?: string
  packagingTitleTakeaway?: string
  /** When false, hide coupon field and clear any applied discount. */
  couponsEnabled?: boolean
  /** Master: show dine-in / takeaway choice on kiosk at all. */
  fulfillmentChoiceEnabled?: boolean
  dineInEnabled?: boolean
  takeawayEnabled?: boolean
}

export function CartView({
  onCheckout,
  layout = 'side',
  serviceFeeDineIn = 0,
  serviceFeeTakeaway = 0,
  serviceTitleDineIn = DEFAULT_SERVICE_TITLE_DINE_IN,
  serviceTitleTakeaway = DEFAULT_SERVICE_TITLE_TAKEAWAY,
  packagingFeeDineIn = 0,
  packagingFeeTakeaway = 0,
  packagingTitleDineIn = DEFAULT_PACKAGING_TITLE_DINE_IN,
  packagingTitleTakeaway = DEFAULT_PACKAGING_TITLE_TAKEAWAY,
  couponsEnabled = true,
  fulfillmentChoiceEnabled = true,
  dineInEnabled = true,
  takeawayEnabled = true,
}: CartViewProps) {
  const [isMounted, setIsMounted] = useState(false)
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [modalFulfillment, setModalFulfillment] = useState<
    'dine_in' | 'takeaway' | null
  >(null)
  const [confirmLoading, setConfirmLoading] = useState(false)
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

  const dineInFee = Math.max(0, Math.round(Number(serviceFeeDineIn) || 0))
  const takeawayFee = Math.max(0, Math.round(Number(serviceFeeTakeaway) || 0))
  const dineInPackaging = Math.max(0, Math.round(Number(packagingFeeDineIn) || 0))
  const takeawayPackaging = Math.max(
    0,
    Math.round(Number(packagingFeeTakeaway) || 0)
  )
  const itemsTotal = getTotalPrice()
  const itemCount = getTotalItems()

  useEffect(() => setIsMounted(true), [])
  useEffect(() => setCouponInput(couponCode || ''), [couponCode])
  useEffect(() => {
    if (items.length === 0) {
      setBottomExpanded(false)
      setCheckoutOpen(false)
    }
  }, [items.length])
  useEffect(() => {
    if (!couponsEnabled) {
      clearCoupon()
      setCouponInput('')
      setCouponMsg('')
    }
  }, [couponsEnabled, clearCoupon])

  const showFulfillmentChoice = fulfillmentChoiceEnabled !== false
  const effectiveDineIn = showFulfillmentChoice && dineInEnabled !== false
  const effectiveTakeaway = showFulfillmentChoice && takeawayEnabled !== false
  const bothFulfillmentOptions = effectiveDineIn && effectiveTakeaway
  const noFulfillmentOption =
    showFulfillmentChoice && !effectiveDineIn && !effectiveTakeaway

  const feesFor = (type: 'dine_in' | 'takeaway') => {
    const service =
      type === 'takeaway' ? takeawayFee : dineInFee
    const packaging =
      type === 'takeaway' ? takeawayPackaging : dineInPackaging
    const serviceTitle =
      type === 'takeaway' ? serviceTitleTakeaway : serviceTitleDineIn
    const packagingTitle =
      type === 'takeaway' ? packagingTitleTakeaway : packagingTitleDineIn
    return { service, packaging, serviceTitle, packagingTitle }
  }

  const applyCoupon = async (serviceFee = 0, packagingFee = 0) => {
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
        service_fee: serviceFee,
        packaging_fee: packagingFee,
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
  /** Cart strip total (fees applied after fulfillment choice). */
  const cartDisplayTotal = Math.max(itemsTotal - effectiveDiscount, 0)

  const modalFees = modalFulfillment ? feesFor(modalFulfillment) : null
  const modalGrandTotal = modalFulfillment
    ? Math.max(
        itemsTotal +
          (modalFees?.service || 0) +
          (modalFees?.packaging || 0) -
          effectiveDiscount,
        0
      )
    : cartDisplayTotal

  const startCheckout = (type: 'dine_in' | 'takeaway') => {
    setCheckoutOpen(false)
    onCheckout(type)
  }

  const handlePayClick = () => {
    if (items.length === 0 || noFulfillmentOption) return
    if (!showFulfillmentChoice) {
      startCheckout('dine_in')
      return
    }
    if (bothFulfillmentOptions) {
      setModalFulfillment(null)
      setCheckoutOpen(true)
      return
    }
    startCheckout(effectiveDineIn ? 'dine_in' : 'takeaway')
  }

  const handleConfirmModalPay = async () => {
    if (!modalFulfillment) return
    setConfirmLoading(true)
    try {
      const { service, packaging } = feesFor(modalFulfillment)
      if (couponsEnabled && couponCode) {
        try {
          const preview = await couponsApi.validate({
            code: couponCode,
            items_total: itemsTotal,
            service_fee: service,
            packaging_fee: packaging,
          })
          setCoupon(preview.code, preview.discount_amount)
        } catch {
          /* keep current discount if revalidate fails */
        }
      }
      startCheckout(modalFulfillment)
    } finally {
      setConfirmLoading(false)
    }
  }

  if (!isMounted) {
    return (
      <div
        className={cn(
          'bg-card',
          layout === 'side'
            ? 'flex h-full flex-col'
            : 'min-h-[7.5rem] w-full border-t portrait:min-h-[22vh]'
        )}
      />
    )
  }

  const shared = {
    items,
    itemCount,
    cartTotal: cartDisplayTotal,
    discountAmount: effectiveDiscount,
    couponsEnabled,
    couponCode,
    couponInput,
    couponMsg,
    couponLoading,
    payDisabled: noFulfillmentOption,
    getLineUnitPrice,
    onCouponInput: setCouponInput,
    onApplyCoupon: () => void applyCoupon(0, 0),
    onClearCoupon: () => {
      clearCoupon()
      setCouponInput('')
      setCouponMsg('')
    },
    onRemove: (key: string) => removeItem(key),
    onQuantity: (key: string, qty: number) => updateQuantity(key, qty),
    onPay: handlePayClick,
  }

  return (
    <>
      {layout === 'bottom' ? (
        <BottomCart
          {...shared}
          expanded={bottomExpanded}
          onExpand={() => setBottomExpanded(true)}
          onCollapse={() => setBottomExpanded(false)}
        />
      ) : (
        <SideCart {...shared} />
      )}

      <FulfillmentCheckoutModal
        open={checkoutOpen}
        onOpenChange={setCheckoutOpen}
        fulfillment={modalFulfillment}
        onSelectFulfillment={setModalFulfillment}
        dineInEnabled={effectiveDineIn}
        takeawayEnabled={effectiveTakeaway}
        dineInFee={dineInFee}
        takeawayFee={takeawayFee}
        dineInPackaging={dineInPackaging}
        takeawayPackaging={takeawayPackaging}
        serviceTitleDineIn={serviceTitleDineIn}
        serviceTitleTakeaway={serviceTitleTakeaway}
        packagingTitleDineIn={packagingTitleDineIn}
        packagingTitleTakeaway={packagingTitleTakeaway}
        itemsTotal={itemsTotal}
        discountAmount={effectiveDiscount}
        couponCode={couponCode}
        grandTotal={modalGrandTotal}
        confirmLoading={confirmLoading}
        onConfirm={() => void handleConfirmModalPay()}
      />
    </>
  )
}

type CartSharedProps = {
  items: ReturnType<typeof useCartStore.getState>['items']
  itemCount: number
  cartTotal: number
  discountAmount: number
  couponsEnabled: boolean
  couponCode: string
  couponInput: string
  couponMsg: string
  couponLoading: boolean
  payDisabled: boolean
  getLineUnitPrice: (item: any) => number
  onCouponInput: (v: string) => void
  onApplyCoupon: () => void
  onClearCoupon: () => void
  onRemove: (key: string) => void
  onQuantity: (key: string, qty: number) => void
  onPay: () => void
}

function FulfillmentCheckoutModal({
  open,
  onOpenChange,
  fulfillment,
  onSelectFulfillment,
  dineInEnabled,
  takeawayEnabled,
  dineInFee,
  takeawayFee,
  dineInPackaging,
  takeawayPackaging,
  serviceTitleDineIn,
  serviceTitleTakeaway,
  packagingTitleDineIn,
  packagingTitleTakeaway,
  itemsTotal,
  discountAmount,
  couponCode,
  grandTotal,
  confirmLoading,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  fulfillment: 'dine_in' | 'takeaway' | null
  onSelectFulfillment: (v: 'dine_in' | 'takeaway') => void
  dineInEnabled: boolean
  takeawayEnabled: boolean
  dineInFee: number
  takeawayFee: number
  dineInPackaging: number
  takeawayPackaging: number
  serviceTitleDineIn: string
  serviceTitleTakeaway: string
  packagingTitleDineIn: string
  packagingTitleTakeaway: string
  itemsTotal: number
  discountAmount: number
  couponCode: string
  grandTotal: number
  confirmLoading: boolean
  onConfirm: () => void
}) {
  const options = [
    {
      id: 'dine_in' as const,
      label: 'داخل سالن',
      hint: 'سرو در محل',
      icon: UtensilsCrossed,
      enabled: dineInEnabled,
      service: dineInFee,
      packaging: dineInPackaging,
      serviceTitle: serviceTitleDineIn,
      packagingTitle: packagingTitleDineIn,
    },
    {
      id: 'takeaway' as const,
      label: 'بیرون‌بر',
      hint: 'تحویل برای بیرون',
      icon: Package,
      enabled: takeawayEnabled,
      service: takeawayFee,
      packaging: takeawayPackaging,
      serviceTitle: serviceTitleTakeaway,
      packagingTitle: packagingTitleTakeaway,
    },
  ].filter((o) => o.enabled)

  const selected = options.find((o) => o.id === fulfillment)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        hideCloseButton
        className={cn(
          'flex max-h-[92vh] w-[min(960px,94vw)] max-w-none flex-col gap-0 overflow-hidden p-0 sm:rounded-3xl',
          'top-[50%] translate-y-[-50%]'
        )}
      >
        <div className="relative border-b border-border/70 bg-gradient-to-l from-primary/10 via-background to-background px-6 py-5 pe-28 sm:px-8 sm:py-6 sm:pe-36">
          <DialogClose
            type="button"
            className={cn(
              'absolute end-4 top-1/2 z-10 flex -translate-y-1/2 items-center justify-center gap-2',
              'h-14 min-w-[7.5rem] rounded-2xl border-2 border-border bg-card px-4',
              'text-base font-black text-foreground shadow-md',
              'hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
              'sm:h-16 sm:min-w-[8.5rem] sm:text-lg'
            )}
            aria-label="بستن"
          >
            <X className="h-7 w-7 sm:h-8 sm:w-8" strokeWidth={2.5} />
            بستن
          </DialogClose>
          <DialogHeader className="space-y-2 text-right">
            <DialogTitle className="text-2xl font-black tracking-tight sm:text-3xl">
              نحوه دریافت سفارش
            </DialogTitle>
            <DialogDescription className="text-base text-muted-foreground sm:text-lg">
              داخل سالن یا بیرون‌بر را انتخاب کنید، سپس پرداخت را بزنید
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="kiosk-scroll min-h-0 flex-1 space-y-6 overflow-y-auto px-6 py-6 sm:px-8">
          <div
            className={cn(
              'grid gap-4',
              options.length > 1 ? 'sm:grid-cols-2' : 'grid-cols-1'
            )}
          >
            {options.map((opt) => {
              const Icon = opt.icon
              const active = fulfillment === opt.id
              const optionTotal = opt.service + opt.packaging
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => onSelectFulfillment(opt.id)}
                  className={cn(
                    'relative flex min-h-[11rem] flex-col rounded-3xl border-2 p-5 text-right transition-all sm:min-h-[12.5rem] sm:p-6',
                    active
                      ? 'border-primary bg-primary/10 shadow-lg shadow-primary/15 scale-[1.01]'
                      : 'border-border/80 bg-card hover:border-primary/40 hover:bg-muted/40'
                  )}
                >
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div
                      className={cn(
                        'flex h-14 w-14 items-center justify-center rounded-2xl sm:h-16 sm:w-16',
                        active
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground'
                      )}
                    >
                      <Icon className="h-7 w-7 sm:h-8 sm:w-8" strokeWidth={2} />
                    </div>
                    {active ? (
                      <span className="rounded-full bg-primary px-3 py-1 text-xs font-bold text-primary-foreground">
                        انتخاب شده
                      </span>
                    ) : null}
                  </div>
                  <p className="text-xl font-black sm:text-2xl">{opt.label}</p>
                  <p className="mt-1 text-sm text-muted-foreground sm:text-base">
                    {opt.hint}
                  </p>
                  <div className="mt-auto space-y-1 pt-4 text-sm">
                    {opt.service > 0 ? (
                      <div className="flex justify-between gap-3 text-muted-foreground">
                        <span>{opt.serviceTitle}</span>
                        <span className="font-semibold tabular-nums">
                          {formatCurrency(opt.service)}
                        </span>
                      </div>
                    ) : null}
                    {opt.packaging > 0 ? (
                      <div className="flex justify-between gap-3 text-muted-foreground">
                        <span>{opt.packagingTitle}</span>
                        <span className="font-semibold tabular-nums">
                          {formatCurrency(opt.packaging)}
                        </span>
                      </div>
                    ) : null}
                    {optionTotal === 0 ? (
                      <p className="text-muted-foreground">بدون هزینه اضافه</p>
                    ) : null}
                  </div>
                </button>
              )
            })}
          </div>

          <div className="rounded-3xl border border-border/80 bg-muted/40 px-5 py-5 sm:px-6 sm:py-6">
            <p className="mb-4 text-base font-bold sm:text-lg">جمع‌بندی پرداخت</p>
            <div className="space-y-3 text-base sm:text-lg">
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">جمع محصولات</span>
                <span className="font-bold tabular-nums">
                  {formatCurrency(itemsTotal)}
                </span>
              </div>
              {selected && selected.service > 0 ? (
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">
                    {selected.serviceTitle}
                  </span>
                  <span className="font-bold tabular-nums">
                    {formatCurrency(selected.service)}
                  </span>
                </div>
              ) : null}
              {selected && selected.packaging > 0 ? (
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">
                    {selected.packagingTitle}
                  </span>
                  <span className="font-bold tabular-nums">
                    {formatCurrency(selected.packaging)}
                  </span>
                </div>
              ) : null}
              {discountAmount > 0 ? (
                <div className="flex justify-between gap-4 text-emerald-600">
                  <span>
                    تخفیف{couponCode ? ` (${couponCode})` : ''}
                  </span>
                  <span className="font-bold tabular-nums">
                    -{formatCurrency(discountAmount)}
                  </span>
                </div>
              ) : null}
              <div className="flex items-center justify-between gap-4 border-t border-border/70 pt-4">
                <span className="text-lg font-black sm:text-xl">مبلغ نهایی</span>
                <span className="text-2xl font-black text-primary sm:text-3xl tabular-nums">
                  {fulfillment
                    ? formatCurrency(grandTotal)
                    : '—'}
                </span>
              </div>
              {!fulfillment ? (
                <p className="text-sm text-muted-foreground">
                  برای دیدن مبلغ نهایی، نوع سفارش را انتخاب کنید
                </p>
              ) : null}
            </div>
          </div>
        </div>

        <div className="border-t border-border/70 bg-card px-6 py-5 sm:px-8 sm:py-6">
          <Button
            type="button"
            variant="primary"
            disabled={!fulfillment || confirmLoading}
            isLoading={confirmLoading}
            onClick={onConfirm}
            className="h-16 w-full rounded-2xl text-xl font-black shadow-xl shadow-primary/25 sm:h-[4.5rem] sm:text-2xl"
          >
            پرداخت و ادامه
          </Button>
        </div>
      </DialogContent>
    </Dialog>
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
            {empty
              ? 'سبد خالی است'
              : `${formatNumber(props.itemCount)} قلم انتخاب‌شده`}
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
                          <h4 className="truncate font-bold leading-snug">
                            {item.product.name}
                          </h4>
                          <button
                            type="button"
                            onClick={() => props.onRemove(item.key)}
                            className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl text-destructive hover:bg-destructive/10"
                            aria-label="حذف"
                          >
                            <Trash2 className="h-6 w-6" strokeWidth={2.25} />
                          </button>
                        </div>
                        {item.selectedOptions?.length ? (
                          <div className="mt-1.5 flex flex-wrap gap-1">
                            {item.selectedOptions.map((o) => (
                              <span
                                key={`${item.key}-${o.id}`}
                                className="rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground"
                              >
                                {o.group_name
                                  ? `${o.group_name}: ${o.name}`
                                  : o.name}
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
                            onClick={() =>
                              props.onQuantity(item.key, item.quantity - 1)
                            }
                          >
                            <Minus className="h-4 w-4" />
                          </button>
                          <span className="min-w-[1.75rem] text-center text-sm font-bold">
                            {formatNumber(item.quantity)}
                          </span>
                          <button
                            type="button"
                            className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-background disabled:opacity-40"
                            disabled={
                              item.quantity >= item.product.stock_quantity
                            }
                            onClick={() =>
                              props.onQuantity(item.key, item.quantity + 1)
                            }
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
            {props.discountAmount > 0 ? (
              <div className="flex justify-between text-emerald-600">
                <span>
                  تخفیف{props.couponCode ? ` (${props.couponCode})` : ''}
                </span>
                <span>-{formatCurrency(props.discountAmount)}</span>
              </div>
            ) : null}
            <div className="flex items-center justify-between pt-1">
              <span className="font-medium">جمع سبد</span>
              <span className="text-xl font-black text-primary">
                {formatCurrency(props.cartTotal)}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              هزینه سرویس و بسته‌بندی در مرحله پرداخت مشخص می‌شود
            </p>
          </div>

          <Button
            variant="primary"
            disabled={props.payDisabled}
            onClick={props.onPay}
            className="h-16 w-full rounded-2xl text-xl font-black shadow-xl shadow-primary/25"
          >
            پرداخت
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
    <div
      className={cn(
        'relative z-40 w-full flex-shrink-0 border-t border-border/80 bg-card/95 shadow-[0_-12px_40px_rgba(0,0,0,0.08)] backdrop-blur-xl dark:shadow-[0_-12px_40px_rgba(0,0,0,0.35)]',
        'min-h-[7.5rem] sm:min-h-[8.25rem]',
        'portrait:min-h-[22vh] portrait:max-h-[38vh] sm:portrait:min-h-[24vh]'
      )}
    >
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
            <div className="space-y-3 px-4 py-3 sm:px-6 portrait:px-5 portrait:py-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold portrait:text-base">
                  جزئیات سفارش
                </p>
                <button
                  type="button"
                  onClick={props.onCollapse}
                  className="flex h-9 w-9 items-center justify-center rounded-xl hover:bg-muted portrait:h-11 portrait:w-11"
                  aria-label="بستن"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              {props.couponsEnabled ? (
                <div className="space-y-1.5">
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
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={props.onClearCoupon}
                      >
                        حذف کد
                      </Button>
                    ) : null}
                  </div>
                  {props.couponMsg ? (
                    <p className="text-xs text-muted-foreground">
                      {props.couponMsg}
                    </p>
                  ) : null}
                </div>
              ) : null}
              {props.discountAmount > 0 ? (
                <div className="text-sm text-emerald-600">
                  تخفیف: -{formatCurrency(props.discountAmount)}
                </div>
              ) : null}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <div
        className={cn(
          'flex h-full min-h-[inherit] items-stretch gap-3 px-3 py-3 sm:gap-4 sm:px-5 sm:py-4',
          'portrait:gap-4 portrait:px-4 portrait:py-4'
        )}
      >
        <div
          className={cn(
            'flex w-[min(340px,42%)] flex-shrink-0 flex-col justify-center gap-2',
            'portrait:w-[min(380px,46%)] portrait:gap-3'
          )}
        >
          <div className="flex items-baseline justify-between gap-2 px-1">
            <span className="text-xs text-muted-foreground portrait:text-sm">
              جمع سبد
            </span>
            <span className="text-lg font-black text-primary sm:text-xl portrait:text-2xl">
              {empty ? formatCurrency(0) : formatCurrency(props.cartTotal)}
            </span>
          </div>
          {!empty ? (
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="flex-1 rounded-xl portrait:h-14 portrait:text-base"
                onClick={props.expanded ? props.onCollapse : props.onExpand}
              >
                {props.expanded ? 'بستن' : 'جزئیات'}
              </Button>
              <Button
                type="button"
                variant="primary"
                disabled={props.payDisabled}
                onClick={props.onPay}
                className="h-14 flex-[1.8] rounded-2xl text-lg font-black shadow-lg shadow-primary/25 portrait:h-16 portrait:text-xl"
              >
                پرداخت
              </Button>
            </div>
          ) : null}
        </div>

        <div className="kiosk-scroll min-w-0 flex-1 overflow-x-auto overscroll-x-contain">
          {empty ? (
            <div className="flex h-full min-h-[5.5rem] items-center justify-center rounded-2xl border border-dashed border-border/80 bg-muted/25 px-5 portrait:min-h-[12vh]">
              <p className="text-base font-bold text-muted-foreground portrait:text-lg">
                سبد خالی است
              </p>
            </div>
          ) : (
            <div className="flex h-full items-stretch gap-2.5 pe-2 portrait:gap-3">
              {props.items.map((item) => {
                const unit = props.getLineUnitPrice(item)
                return (
                  <motion.div
                    key={item.key}
                    layout
                    className={cn(
                      'flex w-[200px] flex-shrink-0 gap-2.5 rounded-2xl border border-border/70 bg-gradient-to-br from-background to-muted/40 p-2.5 shadow-sm',
                      'portrait:w-[240px] portrait:gap-3 portrait:p-3'
                    )}
                  >
                    <div className="relative h-[72px] w-[72px] flex-shrink-0 overflow-hidden rounded-xl bg-muted portrait:h-24 portrait:w-24">
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
                      ) : null}
                      <span className="absolute bottom-1 start-1 rounded-md bg-black/65 px-1.5 py-0.5 text-[10px] font-bold text-white portrait:text-xs">
                        ×{formatNumber(item.quantity)}
                      </span>
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col">
                      <div className="flex items-start justify-between gap-1">
                        <p className="line-clamp-2 text-xs font-bold leading-snug portrait:text-sm">
                          {item.product.name}
                        </p>
                        <button
                          type="button"
                          onClick={() => props.onRemove(item.key)}
                          className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg text-destructive hover:bg-destructive/10 portrait:h-11 portrait:w-11"
                          aria-label="حذف"
                        >
                          <Trash2 className="h-6 w-6" strokeWidth={2.25} />
                        </button>
                      </div>
                      <p className="mt-auto text-xs font-black text-primary portrait:text-sm">
                        {formatCurrency(unit * item.quantity)}
                      </p>
                      <div className="mt-1 inline-flex items-center gap-0.5 self-start rounded-lg border border-border bg-background/80 p-0.5 portrait:mt-2">
                        <button
                          type="button"
                          className="flex h-7 w-7 items-center justify-center portrait:h-9 portrait:w-9"
                          onClick={() =>
                            props.onQuantity(item.key, item.quantity - 1)
                          }
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="min-w-[1.25rem] text-center text-[11px] font-bold portrait:min-w-[1.5rem] portrait:text-sm">
                          {formatNumber(item.quantity)}
                        </span>
                        <button
                          type="button"
                          className="flex h-7 w-7 items-center justify-center disabled:opacity-40 portrait:h-9 portrait:w-9"
                          disabled={
                            item.quantity >= item.product.stock_quantity
                          }
                          onClick={() =>
                            props.onQuantity(item.key, item.quantity + 1)
                          }
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
          <div className="hidden w-28 flex-shrink-0 flex-col justify-center gap-1.5 lg:flex portrait:w-32">
            <span className="text-center text-[11px] font-medium text-muted-foreground portrait:text-xs">
              {formatNumber(props.itemCount)} قلم
            </span>
          </div>
        ) : null}
      </div>
    </div>
  )
}
