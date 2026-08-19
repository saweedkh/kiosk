'use client'

import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ordersApi } from '@/lib/api/orders'
import { Button } from '@/components/shared/Button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { DragScrollArea } from '@/components/shared/DragScrollArea'
import { formatCurrency, formatNumber, cn, translateError } from '@/lib/utils'
import { formatJalaliDateTime } from '@/lib/utils/date'
import type { Order, OrderStatus } from '@/types'

const STATUS_LABELS: Record<string, string> = {
  pending: 'در انتظار',
  processing: 'در حال پردازش',
  paid: 'پرداخت شده',
  completed: 'تکمیل شده',
  cancelled: 'لغو شده',
  success: 'موفق',
  failed: 'ناموفق',
}

function statusLabel(value?: string | null) {
  if (!value) return 'نامشخص'
  return STATUS_LABELS[value.toLowerCase()] || value
}

function statusTone(value?: string | null) {
  const key = (value || '').toLowerCase()
  if (key === 'paid' || key === 'success' || key === 'completed') {
    return 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-300'
  }
  if (key === 'pending' || key === 'processing') {
    return 'bg-amber-500/12 text-amber-700 dark:text-amber-300'
  }
  if (key === 'cancelled' || key === 'failed') {
    return 'bg-red-500/12 text-red-700 dark:text-red-300'
  }
  return 'bg-muted text-muted-foreground'
}

function MetaRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-border/60 py-2.5 last:border-b-0">
      <span className="shrink-0 text-sm text-muted-foreground">{label}</span>
      <span className="text-left text-sm font-medium text-foreground">{value}</span>
    </div>
  )
}

interface OrderDetailsDialogProps {
  orderId: number | null
  orderNumber?: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onReprint?: (orderNumber: string) => void
  canReprint?: boolean
  canEditStatus?: boolean
}

export function OrderDetailsDialog({
  orderId,
  orderNumber,
  open,
  onOpenChange,
  onReprint,
  canReprint = false,
  canEditStatus = false,
}: OrderDetailsDialogProps) {
  const queryClient = useQueryClient()
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['admin-order', orderId],
    queryFn: async () => {
      if (!orderId) throw new Error('order id missing')
      const response = await ordersApi.getAdminOrder(orderId)
      return (response.result ?? response) as Order
    },
    enabled: open && !!orderId,
    staleTime: 30_000,
  })

  const order = data
  const [nextStatus, setNextStatus] = useState<OrderStatus>('pending')
  const items = order?.items || []
  const itemsSubtotal = items.reduce(
    (sum, item) => sum + Number(item.subtotal ?? item.quantity * item.unit_price),
    0
  )
  const serviceFee = Math.max(0, Number(order?.service_fee || 0))
  const packagingFee = Math.max(0, Number(order?.packaging_fee || 0))
  const discount = Math.max(0, Number(order?.discount_amount || 0))
  const canShowReprint =
    canReprint &&
    !!order?.order_number &&
    (order.status === 'paid' ||
      order.payment_status === 'paid' ||
      order.payment_status === 'success')

  useEffect(() => {
    if (order?.status) {
      setNextStatus(order.status)
    }
  }, [order?.status])

  const updateStatusMutation = useMutation({
    mutationFn: async (status: OrderStatus) => {
      if (!orderId) throw new Error('order id missing')
      return ordersApi.updateAdminOrderStatus(orderId, status)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin-order', orderId] })
      await queryClient.invalidateQueries({ queryKey: ['sales-report'] })
      await queryClient.invalidateQueries({ queryKey: ['daily-report'] })
      await queryClient.invalidateQueries({ queryKey: ['hourly-report'] })
    },
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col overflow-hidden p-0 sm:max-w-2xl">
        <DragScrollArea className="max-h-[90vh] space-y-4 p-6">
        <DialogHeader>
          <DialogTitle className="text-right text-xl font-black">
            جزئیات سفارش
          </DialogTitle>
          <DialogDescription className="text-right">
            {orderNumber || order?.order_number || '—'}
          </DialogDescription>
        </DialogHeader>

        {isLoading || (isFetching && !order) ? (
          <div className="flex min-h-[12rem] items-center justify-center">
            <div className="h-9 w-9 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : isError ? (
          <div className="space-y-4 rounded-2xl border border-red-500/20 bg-red-500/5 p-5 text-center">
            <p className="text-sm text-red-700 dark:text-red-300">
              {(error as any)?.response?.data?.messages?.detail?.[0] ||
                (error as Error)?.message ||
                'بارگذاری جزئیات سفارش ناموفق بود'}
            </p>
            <Button variant="outline" size="sm" onClick={() => void refetch()}>
              تلاش مجدد
            </Button>
          </div>
        ) : order ? (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={cn(
                  'rounded-full px-3 py-1 text-xs font-bold',
                  statusTone(order.status)
                )}
              >
                وضعیت: {statusLabel(order.status)}
              </span>
              <span
                className={cn(
                  'rounded-full px-3 py-1 text-xs font-bold',
                  statusTone(order.payment_status)
                )}
              >
                پرداخت: {statusLabel(order.payment_status)}
              </span>
              <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
                {order.fulfillment_type === 'takeaway' ? 'بیرون‌بر' : 'داخل سالن'}
              </span>
            </div>

            <div className="rounded-2xl border border-border/80 bg-muted/25 px-4">
              <MetaRow
                label="شماره سفارش"
                value={
                  <span className="font-mono text-sm">{order.order_number}</span>
                }
              />
              {order.receipt_number != null && Number(order.receipt_number) > 0 ? (
                <MetaRow label="شماره فیش" value={formatNumber(order.receipt_number)} />
              ) : null}
              <MetaRow
                label="تاریخ"
                value={formatJalaliDateTime(order.created_at)}
              />
              {order.transaction_id ? (
                <MetaRow
                  label="کد تراکنش"
                  value={
                    <span className="break-all font-mono text-xs">
                      {order.transaction_id}
                    </span>
                  }
                />
              ) : null}
              {order.gateway_name || order.payment_method ? (
                <MetaRow
                  label="درگاه"
                  value={[order.gateway_name, order.payment_method]
                    .filter(Boolean)
                    .join(' · ')}
                />
              ) : null}
            </div>

            <div className="overflow-hidden rounded-2xl border border-border/80">
              <div className="border-b border-border/80 bg-muted/40 px-4 py-3">
                <p className="text-sm font-bold text-foreground">اقلام سفارش</p>
              </div>
              {items.length === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                  آیتمی ثبت نشده است
                </p>
              ) : (
                <div className="divide-y divide-border/70">
                  {items.map((item) => {
                    const optionNames = (item.selected_options || [])
                      .map((o) => o.name)
                      .filter(Boolean)
                    return (
                      <div
                        key={item.id}
                        className="flex items-start justify-between gap-3 px-4 py-3"
                      >
                        <div className="min-w-0">
                          <p className="font-bold text-foreground">
                            {item.product_name || 'محصول'}
                          </p>
                          {optionNames.length > 0 ? (
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              {optionNames.join('، ')}
                            </p>
                          ) : null}
                          <p className="mt-1 text-xs text-muted-foreground">
                            {formatNumber(item.quantity)} ×{' '}
                            {formatCurrency(item.unit_price)}
                          </p>
                        </div>
                        <p className="shrink-0 text-sm font-black text-foreground">
                          {formatCurrency(
                            item.subtotal ?? item.quantity * item.unit_price
                          )}
                        </p>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-border/80 bg-gradient-to-l from-primary/[0.06] via-card to-card px-4 py-3">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>جمع اقلام</span>
                  <span>{formatCurrency(itemsSubtotal)}</span>
                </div>
                {serviceFee > 0 ? (
                  <div className="flex justify-between text-muted-foreground">
                    <span>هزینه سرویس</span>
                    <span>{formatCurrency(serviceFee)}</span>
                  </div>
                ) : null}
                {packagingFee > 0 ? (
                  <div className="flex justify-between text-muted-foreground">
                    <span>هزینه بسته‌بندی</span>
                    <span>{formatCurrency(packagingFee)}</span>
                  </div>
                ) : null}
                {discount > 0 ? (
                  <div className="flex justify-between text-emerald-600">
                    <span>
                      تخفیف
                      {order.coupon_code ? ` (${order.coupon_code})` : ''}
                    </span>
                    <span>-{formatCurrency(discount)}</span>
                  </div>
                ) : null}
                <div className="flex items-center justify-between border-t border-border/70 pt-2">
                  <span className="font-bold text-foreground">مبلغ کل</span>
                  <span className="text-xl font-black text-primary">
                    {formatCurrency(order.total_amount)}
                  </span>
                </div>
              </div>
            </div>

            {canEditStatus ? (
              <div className="space-y-3 rounded-2xl border border-border/80 bg-muted/20 p-4">
                <p className="text-sm font-bold text-foreground">تغییر وضعیت سفارش</p>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <select
                    value={nextStatus}
                    onChange={(e) => setNextStatus(e.target.value as OrderStatus)}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary sm:max-w-xs"
                    disabled={updateStatusMutation.isPending}
                  >
                    <option value="pending">در انتظار</option>
                    <option value="processing">در حال پردازش</option>
                    <option value="paid">پرداخت شده</option>
                    <option value="completed">تکمیل شده</option>
                    <option value="cancelled">لغو شده</option>
                  </select>
                  <Button
                    variant="primary"
                    size="sm"
                    disabled={
                      updateStatusMutation.isPending ||
                      !order ||
                      nextStatus === order.status
                    }
                    onClick={() => updateStatusMutation.mutate(nextStatus)}
                  >
                    {updateStatusMutation.isPending ? 'در حال ذخیره...' : 'ذخیره وضعیت'}
                  </Button>
                </div>
                {updateStatusMutation.isError ? (
                  <p className="text-xs text-red-600 dark:text-red-400">
                    {translateError(updateStatusMutation.error) || 'به‌روزرسانی وضعیت ناموفق بود'}
                  </p>
                ) : null}
                {updateStatusMutation.isSuccess ? (
                  <p className="text-xs text-emerald-700 dark:text-emerald-300">
                    وضعیت سفارش با موفقیت به‌روزرسانی شد.
                  </p>
                ) : null}
              </div>
            ) : null}

            {canShowReprint && onReprint ? (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => onReprint(order.order_number)}
              >
                چاپ مجدد فیش
              </Button>
            ) : null}
          </div>
        ) : null}
        </DragScrollArea>
      </DialogContent>
    </Dialog>
  )
}
