'use client'

import { useMemo, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import {
  reportsApi,
  SALES_PRESET_LABELS,
  formatReportDateTime,
  type SalesPreset,
} from '@/lib/api/reports'
import { ordersApi } from '@/lib/api/orders'
import { Button } from '@/components/shared/Button'
import { DateTimePicker } from '@/components/admin/DateTimePicker'
import { OrderDetailsDialog } from '@/components/admin/OrderDetailsDialog'
import { DragScrollArea } from '@/components/shared/DragScrollArea'
import {
  AdminPageHeader,
  AdminSegmented,
  AdminSurface,
} from '@/components/admin/ui/primitives'
import { cn, formatCurrency, formatNumber, toEnglishDigits } from '@/lib/utils'
import { formatJalaliDateTime, convertJalaliToMiladi } from '@/lib/utils/date'
import moment from 'moment-jalaali'
import { useAuthStore } from '@/lib/store/auth-store'
import { hasPermission } from '@/lib/auth/permissions'

type ReportTab = 'sales' | 'products' | 'stock'

const ORDER_STATUS_LABELS: Record<string, string> = {
  pending: 'در انتظار',
  processing: 'در حال پردازش',
  paid: 'پرداخت‌شده',
  completed: 'تکمیل‌شده',
  cancelled: 'لغو‌شده',
}

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  pending: 'در انتظار',
  processing: 'در حال پردازش',
  paid: 'پرداخت‌شده',
  success: 'موفق',
  failed: 'ناموفق',
  cancelled: 'لغو‌شده',
}

function labelOf(map: Record<string, string>, value?: string | null) {
  if (!value) return 'نامشخص'
  return map[value.toLowerCase()] || value
}

function badgeClass(status?: string | null) {
  const key = (status || '').toLowerCase()
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

function StatCard({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone?: 'default' | 'good' | 'bad'
}) {
  return (
    <div className="rounded-2xl border border-border/70 bg-gradient-to-b from-card to-muted/20 p-4">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p
        className={cn(
          'mt-2 text-xl font-black tracking-tight',
          tone === 'good' && 'text-emerald-600 dark:text-emerald-400',
          tone === 'bad' && 'text-red-600 dark:text-red-400',
          (!tone || tone === 'default') && 'text-foreground'
        )}
      >
        {value}
      </p>
    </div>
  )
}

function Pagination({
  page,
  setPage,
  count,
  pageSize,
  hasNext,
}: {
  page: number
  setPage: (page: number) => void
  count?: number
  pageSize: number
  hasNext?: boolean
}) {
  const totalPages = count
    ? Math.max(1, Math.ceil(count / pageSize))
    : hasNext
      ? page + 1
      : page
  if (totalPages <= 1) return null

  return (
    <div className="flex items-center justify-center gap-2 pt-2">
      <Button
        variant="outline"
        size="sm"
        disabled={page <= 1}
        onClick={() => setPage(Math.max(1, page - 1))}
      >
        قبلی
      </Button>
      <span className="min-w-[4.5rem] text-center text-sm text-muted-foreground">
        {formatNumber(page)} / {formatNumber(totalPages)}
      </span>
      <Button
        variant="outline"
        size="sm"
        disabled={page >= totalPages}
        onClick={() => setPage(Math.min(totalPages, page + 1))}
      >
        بعدی
      </Button>
    </div>
  )
}

export function ReportsManager() {
  const { user } = useAuthStore()
  const canReprint = hasPermission(user, 'view_orders')
  const canEditStatus = hasPermission(user, 'change_orders')
  const canViewDetails =
    hasPermission(user, 'view_orders') || hasPermission(user, 'view_reports')

  const [tab, setTab] = useState<ReportTab>('sales')
  const [preset, setPreset] = useState<SalesPreset | ''>('today')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [startTime, setStartTime] = useState('00:00')
  const [endTime, setEndTime] = useState('23:59')
  const [salesPage, setSalesPage] = useState(1)
  const [productsPage, setProductsPage] = useState(1)
  const [stockPage, setStockPage] = useState(1)
  const [exportMessage, setExportMessage] = useState<string | null>(null)
  const [detailsOrderId, setDetailsOrderId] = useState<number | null>(null)
  const [detailsOrderNumber, setDetailsOrderNumber] = useState('')
  const pageSize = 20

  const todayJalali = useMemo(() => moment().format('jYYYY/jMM/jDD'), [])

  const rangeValid = useMemo(() => {
    if (preset) return true
    if (!startDate || !endDate) return false
    const start = moment(
      `${toEnglishDigits(startDate)} ${startTime || '00:00'}`,
      'jYYYY/jMM/jDD HH:mm'
    )
    const end = moment(
      `${toEnglishDigits(endDate)} ${endTime || '23:59'}`,
      'jYYYY/jMM/jDD HH:mm'
    )
    if (!start.isValid() || !end.isValid()) return false
    return !end.isBefore(start)
  }, [preset, startDate, endDate, startTime, endTime])

  const customRangeParams = useMemo(() => {
    if (preset) return {}
    const startMiladi = startDate ? convertJalaliToMiladi(startDate) : undefined
    const endMiladi = endDate ? convertJalaliToMiladi(endDate) : undefined
    if (!startMiladi || !endMiladi) return {}
    return {
      start_date: startMiladi,
      end_date: endMiladi,
      start_time: startTime || '00:00',
      end_time: endTime || '23:59',
    }
  }, [preset, startDate, endDate, startTime, endTime])

  const { data: salesData, isLoading: salesLoading } = useQuery({
    queryKey: ['sales-report', preset || 'custom', customRangeParams, salesPage, pageSize],
    queryFn: () =>
      reportsApi.getSalesReport({
        preset: preset || undefined,
        ...customRangeParams,
        page: salesPage,
        page_size: pageSize,
      }),
    enabled: tab === 'sales' && rangeValid,
    staleTime: 0,
    gcTime: 0,
  })

  const { data: productsData, isLoading: productsLoading } = useQuery({
    queryKey: ['products-report', preset || 'custom', customRangeParams, productsPage, pageSize],
    queryFn: () =>
      reportsApi.getProductReport({
        preset: preset || undefined,
        ...customRangeParams,
        page: productsPage,
        page_size: pageSize,
      }),
    enabled: tab === 'products' && rangeValid,
    staleTime: 0,
    gcTime: 0,
  })

  const { data: stockData, isLoading: stockLoading } = useQuery({
    queryKey: ['stock-report', stockPage, pageSize],
    queryFn: () => reportsApi.getStockReport({ page: stockPage, page_size: pageSize }),
    enabled: tab === 'stock',
    staleTime: 0,
    gcTime: 0,
  })

  const exportMutation = useMutation({
    mutationFn: async () => {
      if (tab === 'sales') {
        return reportsApi.exportSalesReport({
          preset: preset || undefined,
          ...customRangeParams,
        })
      }
      if (tab === 'products') {
        return reportsApi.exportProductReport({
          preset: preset || undefined,
          ...customRangeParams,
        })
      }
      return reportsApi.exportStockReport()
    },
    onSuccess: (fileUrl) => {
      if (!fileUrl) {
        setExportMessage('فایل Excel ایجاد نشد.')
        return
      }
      window.open(fileUrl, '_blank', 'noopener,noreferrer')
      setExportMessage('فایل Excel آماده شد.')
    },
    onError: () => setExportMessage('خطا در ایجاد فایل Excel'),
  })

  const loading = salesLoading || productsLoading || stockLoading
  const salesSummary = salesData?.result?.summary
  const productsSummary = productsData?.result?.summary
  const stockThreshold =
    stockData?.result?.summary?.low_stock_threshold ??
    productsSummary?.low_stock_threshold ??
    5
  const showDateFilters = tab === 'sales' || tab === 'products'
  const appliedRange =
    tab === 'sales'
      ? {
          start: salesSummary?.range_start_jalali,
          end: salesSummary?.range_end_jalali,
        }
      : tab === 'products'
        ? {
            start: productsSummary?.range_start_jalali,
            end: productsSummary?.range_end_jalali,
          }
        : null

  const resetPagedFilters = () => {
    setSalesPage(1)
    setProductsPage(1)
  }

  const selectCustomRange = () => {
    setPreset('')
    setStartDate((prev) => prev || todayJalali)
    setEndDate((prev) => prev || todayJalali)
    setStartTime((prev) => prev || '00:00')
    setEndTime((prev) => prev || '23:59')
    resetPagedFilters()
  }

  return (
    <div className="space-y-5">
      <AdminPageHeader
        title="گزارشات"
        description="فروش و محصولات با فیلتر تاریخ/ساعت؛ موجودی وضعیت لحظه‌ای انبار."
        actions={
          <Button
            variant="outline"
            size="sm"
            isLoading={exportMutation.isPending}
            disabled={showDateFilters && !rangeValid}
            onClick={() => exportMutation.mutate()}
          >
            دانلود Excel
          </Button>
        }
      />

      <AdminSurface className="space-y-4">
        <AdminSegmented
          value={tab}
          onChange={(next) => {
            setTab(next)
            setExportMessage(null)
          }}
          options={[
            { id: 'sales', label: 'فروش' },
            { id: 'products', label: 'محصولات' },
            { id: 'stock', label: 'موجودی' },
          ]}
        />

        {showDateFilters ? (
          <div className="space-y-4 border-t border-border/60 pt-4">
            <p className="text-xs text-muted-foreground">
              {tab === 'products'
                ? 'فروش و درآمد فقط از سفارش‌های با وضعیت پرداخت‌شده یا تکمیل‌شده در بازه انتخابی محاسبه می‌شود.'
                : 'فروش فقط از سفارش‌های با وضعیت پرداخت‌شده یا تکمیل‌شده در بازه انتخابی محاسبه می‌شود.'}
            </p>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(SALES_PRESET_LABELS) as SalesPreset[]).map((key) => (
                <Button
                  key={key}
                  size="sm"
                  variant={preset === key ? 'primary' : 'outline'}
                  onClick={() => {
                    setPreset(key)
                    resetPagedFilters()
                  }}
                >
                  {SALES_PRESET_LABELS[key]}
                </Button>
              ))}
              <Button
                size="sm"
                variant={!preset ? 'primary' : 'outline'}
                onClick={selectCustomRange}
              >
                بازه دلخواه
              </Button>
            </div>

            {!preset ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <DateTimePicker
                  label="از تاریخ و ساعت"
                  date={startDate}
                  time={startTime}
                  minuteStep={5}
                  onChange={({ date, time }) => {
                    setStartDate(date)
                    setStartTime(time)
                    resetPagedFilters()
                  }}
                />
                <DateTimePicker
                  label="تا تاریخ و ساعت"
                  date={endDate}
                  time={endTime}
                  minuteStep={5}
                  error={!rangeValid ? 'پایان باید بعد از شروع باشد' : undefined}
                  onChange={({ date, time }) => {
                    setEndDate(date)
                    setEndTime(time)
                    resetPagedFilters()
                  }}
                />
              </div>
            ) : null}

            {(appliedRange?.start || appliedRange?.end) && (
              <p className="text-xs text-muted-foreground">
                بازه: {appliedRange.start || '—'}
                {' — '}
                {appliedRange.end || '—'}
              </p>
            )}
          </div>
        ) : null}

        {tab === 'stock' ? (
          <p className="border-t border-border/60 pt-4 text-xs text-muted-foreground">
            وضعیت موجودی لحظه‌ای است (بدون فیلتر تاریخ). ناموجود: صفر یا کمتر — کم‌موجود: ۱ تا{' '}
            {formatNumber(stockThreshold)} — عادی: بیشتر از {formatNumber(stockThreshold)}.
          </p>
        ) : null}

        {exportMessage ? (
          <p className="text-sm text-muted-foreground">{exportMessage}</p>
        ) : null}
      </AdminSurface>

      {loading ? (
        <AdminSurface className="py-16 text-center text-muted-foreground">
          در حال بارگذاری...
        </AdminSurface>
      ) : null}

      {!loading && showDateFilters && !rangeValid ? (
        <AdminSurface className="py-12 text-center text-sm text-muted-foreground">
          تاریخ شروع و پایان را انتخاب کنید.
        </AdminSurface>
      ) : null}

      {!loading && tab === 'sales' && salesData?.result ? (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="فروش (وضعیت پرداخت‌شده/تکمیل)"
              value={formatCurrency(salesSummary?.total_sales || 0)}
            />
            <StatCard
              label="سفارش پرداخت‌شده/تکمیل"
              value={formatNumber(salesSummary?.paid_orders || 0)}
              tone="good"
            />
            <StatCard
              label="کل سفارش‌ها"
              value={formatNumber(salesSummary?.total_orders || 0)}
            />
            <StatCard
              label="میانگین سبد"
              value={formatCurrency(salesSummary?.average_order_value || 0)}
            />
            <StatCard
              label="تراکنش موفق (وضعیت سفارش)"
              value={formatNumber(salesSummary?.successful_transactions || 0)}
              tone="good"
            />
            <StatCard
              label="تراکنش لغو‌شده"
              value={formatNumber(salesSummary?.failed_transactions || 0)}
              tone="bad"
            />
          </div>

          <AdminSurface padded={false} className="overflow-hidden">
            <div className="border-b border-border/70 px-5 py-4">
              <p className="text-sm font-bold text-foreground">لیست سفارش‌ها</p>
            </div>
            {(salesData.result.results || []).length === 0 ? (
              <p className="px-5 py-10 text-center text-sm text-muted-foreground">
                سفارشی در این بازه نیست.
              </p>
            ) : (
              <DragScrollArea axis="x">
                <table className="w-full min-w-[760px]">
                  <thead>
                    <tr className="border-b border-border/70 bg-muted/35 text-xs text-muted-foreground">
                      <th className="px-4 py-3 text-right font-bold">شماره</th>
                      <th className="px-4 py-3 text-right font-bold">مبلغ</th>
                      <th className="px-4 py-3 text-right font-bold">وضعیت سفارش</th>
                      <th className="px-4 py-3 text-right font-bold">وضعیت پرداخت</th>
                      <th className="px-4 py-3 text-right font-bold">تاریخ و ساعت</th>
                      <th className="px-4 py-3 text-center font-bold">جزئیات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {salesData.result.results.map((order) => (
                      <tr key={order.id} className="hover:bg-muted/30">
                        <td className="px-4 py-3 text-sm font-medium">{order.order_number}</td>
                        <td className="px-4 py-3 text-sm">
                          {formatCurrency(order.total_amount)}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={cn(
                              'rounded-full px-2.5 py-1 text-xs font-bold',
                              badgeClass(order.status)
                            )}
                          >
                            {labelOf(ORDER_STATUS_LABELS, order.status)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={cn(
                              'rounded-full px-2.5 py-1 text-xs font-bold',
                              badgeClass(order.payment_status)
                            )}
                          >
                            {labelOf(PAYMENT_STATUS_LABELS, order.payment_status)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {formatReportDateTime(order.created_at, order.created_at_jalali) ||
                            formatJalaliDateTime(order.created_at)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {canViewDetails && order.id ? (
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-xs"
                              onClick={() => {
                                setDetailsOrderId(order.id)
                                setDetailsOrderNumber(order.order_number)
                              }}
                            >
                              جزئیات
                            </Button>
                          ) : (
                            '—'
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </DragScrollArea>
            )}
            <div className="px-5 pb-5">
              <Pagination
                page={salesPage}
                setPage={setSalesPage}
                count={salesData.result.count}
                pageSize={pageSize}
                hasNext={!!salesData.result.next}
              />
            </div>
          </AdminSurface>
        </div>
      ) : null}

      {!loading && tab === 'products' && productsData?.result ? (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <StatCard
              label="درآمد بازه"
              value={formatCurrency(productsSummary?.total_revenue || 0)}
              tone="good"
            />
            <StatCard
              label="تعداد فروش بازه"
              value={formatNumber(productsSummary?.total_sold_units || 0)}
            />
            <StatCard
              label="کل محصولات"
              value={formatNumber(productsSummary?.total_products || 0)}
            />
            <StatCard
              label="فعال"
              value={formatNumber(productsSummary?.active_products || 0)}
              tone="good"
            />
            <StatCard
              label="کم‌موجود"
              value={formatNumber(productsSummary?.low_stock_count || 0)}
              tone="bad"
            />
            <StatCard
              label="ناموجود"
              value={formatNumber(productsSummary?.out_of_stock_count || 0)}
              tone="bad"
            />
          </div>

          <AdminSurface padded={false} className="overflow-hidden">
            <DragScrollArea axis="x">
              <table className="w-full min-w-[860px]">
                <thead>
                  <tr className="border-b border-border/70 bg-muted/35 text-xs text-muted-foreground">
                    <th className="px-4 py-3 text-right font-bold">محصول</th>
                    <th className="px-4 py-3 text-right font-bold">دسته</th>
                    <th className="px-4 py-3 text-right font-bold">قیمت</th>
                    <th className="px-4 py-3 text-right font-bold">موجودی</th>
                    <th className="px-4 py-3 text-right font-bold">وضعیت موجودی</th>
                    <th className="px-4 py-3 text-right font-bold">فروش بازه</th>
                    <th className="px-4 py-3 text-right font-bold">درآمد بازه</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {(productsData.result.results || []).map((product) => (
                    <tr key={product.id} className="hover:bg-muted/30">
                      <td className="px-4 py-3 text-sm font-medium">{product.name}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {product.category_name || '—'}
                      </td>
                      <td className="px-4 py-3 text-sm">{formatCurrency(product.price)}</td>
                      <td className="px-4 py-3 text-sm">{formatNumber(product.stock_quantity)}</td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            'rounded-full px-2.5 py-1 text-xs font-bold',
                            product.is_out_of_stock
                              ? badgeClass('failed')
                              : product.is_low_stock
                                ? badgeClass('pending')
                                : badgeClass('paid')
                          )}
                        >
                          {product.is_out_of_stock
                            ? 'ناموجود'
                            : product.is_low_stock
                              ? 'کم‌موجود'
                              : 'عادی'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">{formatNumber(product.total_sold || 0)}</td>
                      <td className="px-4 py-3 text-sm">
                        {formatCurrency(product.total_revenue || 0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </DragScrollArea>
            <div className="px-5 pb-5">
              <Pagination
                page={productsPage}
                setPage={setProductsPage}
                count={productsData.result.count}
                pageSize={pageSize}
                hasNext={!!productsData.result.next}
              />
            </div>
          </AdminSurface>
        </div>
      ) : null}

      {!loading && tab === 'stock' && stockData?.result ? (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="ارزش موجودی"
              value={formatCurrency(stockData.result.summary?.total_stock_value || 0)}
            />
            <StatCard
              label="تعداد اقلام"
              value={formatNumber(stockData.result.summary?.total_items || 0)}
            />
            <StatCard
              label="کم‌موجود"
              value={formatNumber(stockData.result.summary?.low_stock_count || 0)}
              tone="bad"
            />
            <StatCard
              label="ناموجود"
              value={formatNumber(stockData.result.summary?.out_of_stock_count || 0)}
              tone="bad"
            />
          </div>

          <AdminSurface padded={false} className="overflow-hidden">
            <DragScrollArea axis="x">
              <table className="w-full min-w-[680px]">
                <thead>
                  <tr className="border-b border-border/70 bg-muted/35 text-xs text-muted-foreground">
                    <th className="px-4 py-3 text-right font-bold">محصول</th>
                    <th className="px-4 py-3 text-right font-bold">دسته</th>
                    <th className="px-4 py-3 text-right font-bold">موجودی</th>
                    <th className="px-4 py-3 text-right font-bold">قیمت</th>
                    <th className="px-4 py-3 text-right font-bold">ارزش</th>
                    <th className="px-4 py-3 text-right font-bold">وضعیت</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {(stockData.result.results || []).map((item) => (
                    <tr key={item.id} className="hover:bg-muted/30">
                      <td className="px-4 py-3 text-sm font-medium">{item.name}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {item.category_name || '—'}
                      </td>
                      <td className="px-4 py-3 text-sm">{formatNumber(item.stock_quantity)}</td>
                      <td className="px-4 py-3 text-sm">{formatCurrency(item.price)}</td>
                      <td className="px-4 py-3 text-sm">{formatCurrency(item.stock_value)}</td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            'rounded-full px-2.5 py-1 text-xs font-bold',
                            item.is_out_of_stock
                              ? badgeClass('failed')
                              : item.is_low_stock
                                ? badgeClass('pending')
                                : badgeClass('paid')
                          )}
                        >
                          {item.is_out_of_stock
                            ? 'ناموجود'
                            : item.is_low_stock
                              ? 'کم‌موجود'
                              : 'عادی'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </DragScrollArea>
            <div className="px-5 pb-5">
              <Pagination
                page={stockPage}
                setPage={setStockPage}
                count={stockData.result.count}
                pageSize={pageSize}
                hasNext={!!stockData.result.next}
              />
            </div>
          </AdminSurface>
        </div>
      ) : null}

      <OrderDetailsDialog
        orderId={detailsOrderId}
        orderNumber={detailsOrderNumber}
        open={detailsOrderId != null}
        onOpenChange={(open) => {
          if (!open) {
            setDetailsOrderId(null)
            setDetailsOrderNumber('')
          }
        }}
        canReprint={canReprint}
        canEditStatus={canEditStatus}
        onReprint={async (orderNumber) => {
          await ordersApi.reprintReceipt(orderNumber)
        }}
      />
    </div>
  )
}
