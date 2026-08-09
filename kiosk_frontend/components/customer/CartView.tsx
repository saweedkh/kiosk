'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useCartStore } from '@/lib/store/cart-store'
import { couponsApi } from '@/lib/api/dashboard'
import { formatCurrency, formatNumber } from '@/lib/utils'
import { Button } from '@/components/shared/Button'
import { ProductThumb } from '@/components/customer/ProductThumb'

interface CartViewProps {
  onCheckout: (fulfillmentType: 'dine_in' | 'takeaway') => void
  serviceFee?: number
  serviceFeeOnDineIn?: boolean
  serviceFeeOnTakeaway?: boolean
}

export function CartView({
  onCheckout,
  serviceFee = 0,
  serviceFeeOnDineIn = true,
  serviceFeeOnTakeaway = true,
}: CartViewProps) {
  const [isMounted, setIsMounted] = useState(false)
  const [fulfillmentType, setFulfillmentType] = useState<'dine_in' | 'takeaway' | null>(null)
  const [couponInput, setCouponInput] = useState('')
  const [couponMsg, setCouponMsg] = useState('')
  const [couponLoading, setCouponLoading] = useState(false)
  const {
    items,
    removeItem,
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

  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    setCouponInput(couponCode || '')
  }, [couponCode])

  const applyCoupon = async () => {
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

  if (!isMounted) {
    return (
      <div className="h-full flex flex-col bg-card dark:bg-card-dark border border-border dark:border-border-dark rounded-2xl shadow-lg">
        <div className="p-6 border-b">
          <h2 className="text-xl font-bold">سبد خرید</h2>
        </div>
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          در حال بارگذاری...
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-card dark:bg-card-dark border border-border dark:border-border-dark shadow-lg min-h-0">
      <div className="p-6 border-b border-border dark:border-border-dark">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold">سبد خرید</h2>
          {items.length > 0 && (
            <div className="mr-auto px-3 py-1 bg-primary/10 rounded-full">
              <span className="text-sm font-medium text-primary">
                {formatNumber(getTotalItems())} عدد
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="kiosk-scroll min-h-0 flex-1 overflow-y-auto overscroll-y-contain p-4">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-8">
            <p className="text-sm text-muted-foreground">سبد خرید شما خالی است</p>
          </div>
        ) : (
          <div className="space-y-4">
            {items.map((item, index) => {
              const unit = getLineUnitPrice(item)
              return (
                <motion.div
                  key={item.key}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="rounded-lg border border-border bg-card overflow-hidden"
                >
                  <div className="flex gap-4 p-4">
                    <ProductThumb
                      src={item.product.image}
                      alt={item.product.name}
                      sizes="96px"
                      className="h-24 w-24 flex-shrink-0 rounded-xl"
                    />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-lg truncate">{item.product.name}</h4>
                      {item.selectedOptions?.length ? (
                        <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                          {item.selectedOptions
                            .map((o) => `${o.group_name}: ${o.name}`)
                            .join(' · ')}
                        </p>
                      ) : null}
                      <p className="mt-2 text-sm font-semibold text-primary">
                        {formatCurrency(unit)} × {formatNumber(item.quantity)} ={' '}
                        {formatCurrency(unit * item.quantity)}
                      </p>
                    </div>
                    <button
                      onClick={() => removeItem(item.key)}
                      className="min-w-[56px] min-h-[56px] p-4 flex items-center justify-center bg-red-50 text-red-600 rounded-xl"
                      aria-label="حذف"
                    >
                      حذف
                    </button>
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>

      {items.length > 0 && (
        <div className="p-4 border-t border-border space-y-3">
          <div>
            <p className="text-sm font-medium mb-2">کد تخفیف:</p>
            <div className="flex gap-2">
              <input
                value={couponInput}
                onChange={(e) => setCouponInput(e.target.value)}
                className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm"
                placeholder="مثلاً OFF10"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={couponLoading}
                onClick={applyCoupon}
              >
                اعمال
              </Button>
            </div>
            {couponMsg ? (
              <p className="mt-1 text-xs text-muted-foreground">{couponMsg}</p>
            ) : null}
          </div>

          <div>
            <p className="text-sm font-medium mb-2">نوع سفارش را انتخاب کنید:</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setFulfillmentType('dine_in')}
                className={`rounded-xl border-2 px-3 py-3 text-sm font-bold ${
                  fulfillmentType === 'dine_in'
                    ? 'border-primary bg-primary text-white'
                    : 'border-border hover:border-primary'
                }`}
              >
                داخل سالن
              </button>
              <button
                type="button"
                onClick={() => setFulfillmentType('takeaway')}
                className={`rounded-xl border-2 px-3 py-3 text-sm font-bold ${
                  fulfillmentType === 'takeaway'
                    ? 'border-primary bg-primary text-white'
                    : 'border-border hover:border-primary'
                }`}
              >
                بیرون‌بر
              </button>
            </div>
          </div>

          <div className="space-y-2">
            {fee > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">سرویس:</span>
                <span>{formatCurrency(fee)}</span>
              </div>
            )}
            {discountAmount > 0 && (
              <div className="flex items-center justify-between text-sm text-emerald-600">
                <span>تخفیف{couponCode ? ` (${couponCode})` : ''}:</span>
                <span>-{formatCurrency(discountAmount)}</span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-base font-medium">جمع کل:</span>
              <span className="text-xl font-bold text-primary">
                {formatCurrency(grandTotal)}
              </span>
            </div>
          </div>
          <Button
            variant="primary"
            size="md"
            className="w-full"
            disabled={!fulfillmentType}
            onClick={() => fulfillmentType && onCheckout(fulfillmentType)}
          >
            تکمیل سفارش
          </Button>
        </div>
      )}
    </div>
  )
}
