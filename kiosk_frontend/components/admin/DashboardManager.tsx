'use client'

import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { dashboardApi } from '@/lib/api/dashboard'
import { formatCurrency, formatNumber, cn } from '@/lib/utils'
import {
  AdminPageHeader,
  AdminSegmented,
  AdminStatusBadge,
  AdminSurface,
} from '@/components/admin/ui/primitives'
import type { HealthComponent, SystemHealthData } from '@/types'

type RangeDays = '7' | '14' | '30'

const STATUS_FA: Record<string, string> = {
  ok: 'سالم',
  healthy: 'سالم',
  degraded: 'ناپایدار',
  down: 'قطع',
  failed: 'ناموفق',
  error: 'خطا',
  disabled: 'خاموش',
  env_disabled: 'خاموش',
  mock: 'شبیه‌سازی',
  pending: 'در انتظار',
  unknown: 'نامشخص',
  misconfigured: 'ناقص',
  paid: 'پرداخت‌شده',
  cancelled: 'لغو',
  dine_in: 'سالن',
  takeaway: 'بیرون‌بر',
  direct: 'ثبت مستقیم',
}

function fa(status?: string | null) {
  if (!status) return '—'
  return STATUS_FA[status.toLowerCase()] || status
}

function formatClock(iso?: string) {
  if (!iso) return '—'
  try {
    return new Intl.DateTimeFormat('fa-IR', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(iso))
  } catch {
    return '—'
  }
}

function formatDayLabel(iso?: string) {
  if (!iso) return '—'
  try {
    return new Intl.DateTimeFormat('fa-IR', {
      month: 'short',
      day: 'numeric',
    }).format(new Date(`${iso}T12:00:00`))
  } catch {
    return iso
  }
}

function softOk(c?: HealthComponent) {
  if (!c) return false
  return (
    c.ok ||
    c.status === 'mock' ||
    c.status === 'disabled' ||
    c.status === 'env_disabled'
  )
}

function overallTone(overall?: string): 'success' | 'warning' | 'danger' | 'neutral' {
  switch ((overall || '').toLowerCase()) {
    case 'ok':
    case 'healthy':
      return 'success'
    case 'degraded':
      return 'warning'
    case 'down':
    case 'error':
    case 'failed':
      return 'danger'
    default:
      return 'neutral'
  }
}

function Delta({ value }: { value?: number | null }) {
  if (value == null) {
    return <span className="text-xs text-muted-foreground">نسبت به دیروز —</span>
  }
  const up = value > 0
  const flat = value === 0
  return (
    <span
      className={cn(
        'text-xs font-semibold',
        flat && 'text-muted-foreground',
        up && 'text-emerald-700 dark:text-emerald-400',
        !up && !flat && 'text-rose-700 dark:text-rose-400'
      )}
    >
      {flat ? 'بدون تغییر نسبت به دیروز' : `${up ? '+' : ''}${formatNumber(value)}٪ نسبت به دیروز`}
    </span>
  )
}

function paymentTone(status?: string): 'success' | 'warning' | 'danger' | 'neutral' {
  switch ((status || '').toLowerCase()) {
    case 'paid':
    case 'success':
      return 'success'
    case 'pending':
      return 'warning'
    case 'failed':
    case 'cancelled':
      return 'danger'
    default:
      return 'neutral'
  }
}

export function DashboardManager() {
  const [days, setDays] = useState<RangeDays>('7')

  const dashQuery = useQuery({
    queryKey: ['admin-dashboard-live', days],
    queryFn: () => dashboardApi.getLive(Number(days)),
    refetchInterval: 30_000,
  })

  const healthQuery = useQuery({
    queryKey: ['admin-system-health'],
    queryFn: () => dashboardApi.getHealth(),
    refetchInterval: 45_000,
  })

  const live = dashQuery.data?.live
  const heatmap = dashQuery.data?.heatmap
  const trend = dashQuery.data?.trend
  const topProducts = dashQuery.data?.top_products || []
  const recentOrders = dashQuery.data?.recent_orders || []
  const health = healthQuery.data as SystemHealthData | undefined

  const hours = useMemo(
    () =>
      heatmap?.hours ||
      Array.from({ length: 24 }, (_, hour) => ({
        hour,
        orders: 0,
        sales: 0,
        intensity: 0,
      })),
    [heatmap]
  )

  const peak = useMemo(() => {
    if (!hours.length) return null
    return hours.reduce((best, cell) => (cell.orders > best.orders ? cell : best))
  }, [hours])

  const maxHourOrders = useMemo(
    () => Math.max(...hours.map((h) => h.orders), 1),
    [hours]
  )

  const maxTrendSales = useMemo(
    () => Math.max(...(trend?.points || []).map((p) => p.sales), 1),
    [trend]
  )

  const healthItems = [
    { key: 'pos', title: 'کارتخوان', component: health?.components.pos },
    { key: 'printer', title: 'چاپگر', component: health?.components.printer },
    { key: 'bale', title: 'ربات بله', component: health?.components.bale },
  ] as const

  const downCount = healthItems.filter((h) => h.component && !softOk(h.component)).length
  const refreshing = dashQuery.isFetching || healthQuery.isFetching
  const loading = dashQuery.isLoading && !live

  const refreshAll = () => {
    void dashQuery.refetch()
    void healthQuery.refetch()
  }

  return (
    <div className="space-y-5">
      <AdminPageHeader
        title="داشبورد"
        description="وضعیت امروز کیوسک، سفارش‌ها و سلامت دستگاه‌ها."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <AdminSegmented
              value={days}
              onChange={setDays}
              options={[
                { id: '7', label: '۷ روز' },
                { id: '14', label: '۱۴ روز' },
                { id: '30', label: '۳۰ روز' },
              ]}
            />
            <button
              type="button"
              onClick={refreshAll}
              disabled={refreshing}
              className="inline-flex h-11 items-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-semibold hover:bg-muted/50 disabled:opacity-60"
            >
              {refreshing ? 'در حال بروزرسانی…' : 'بروزرسانی'}
            </button>
          </div>
        }
      />

      {/* System status strip */}
      <AdminSurface className="!p-3 sm:!p-4">
        <div className="flex flex-wrap items-center gap-2">
          <AdminStatusBadge tone={overallTone(health?.overall)}>
            سیستم · {fa(health?.overall || 'unknown')}
          </AdminStatusBadge>
          {healthItems.map((item) => {
            const ok = softOk(item.component)
            return (
              <span
                key={item.key}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold',
                  ok
                    ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300'
                    : 'border-rose-500/30 bg-rose-500/10 text-rose-800 dark:text-rose-300'
                )}
                title={item.component?.message || ''}
              >
                <span
                  className={cn(
                    'h-1.5 w-1.5 rounded-full',
                    ok ? 'bg-emerald-500' : 'bg-rose-500'
                  )}
                />
                {item.title}
                <span className="font-medium opacity-80">{fa(item.component?.status)}</span>
              </span>
            )
          })}
          {downCount > 0 ? (
            <span className="text-xs font-semibold text-rose-700 dark:text-rose-300">
              {formatNumber(downCount)} مورد نیاز به بررسی
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">
              آخرین چک {formatClock(health?.checked_at)}
            </span>
          )}
        </div>
      </AdminSurface>

      {loading ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl bg-muted/70" />
          ))}
        </div>
      ) : live ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <AdminSurface>
            <p className="text-sm text-muted-foreground">فروش امروز</p>
            <p className="mt-2 text-2xl font-black tracking-tight text-foreground">
              {formatCurrency(live.sales_today)}
            </p>
            <div className="mt-2">
              <Delta value={live.sales_delta_pct} />
            </div>
          </AdminSurface>

          <AdminSurface>
            <p className="text-sm text-muted-foreground">سفارش موفق</p>
            <p className="mt-2 text-2xl font-black tracking-tight text-foreground">
              {formatNumber(live.orders_today)}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
              <Delta value={live.orders_delta_pct} />
              <span className="text-xs text-muted-foreground">
                سالن {formatNumber(live.dine_in_orders || 0)} · بیرون‌بر{' '}
                {formatNumber(live.takeaway_orders || 0)}
              </span>
            </div>
          </AdminSurface>

          <AdminSurface>
            <p className="text-sm text-muted-foreground">میانگین سبد</p>
            <p className="mt-2 text-2xl font-black tracking-tight text-foreground">
              {formatCurrency(live.avg_basket)}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              دیروز: {formatCurrency(live.sales_yesterday || 0)} فروش
            </p>
          </AdminSurface>

          <AdminSurface
            className={cn(
              live.pending_payments > 0 || live.cancel_rate >= 20
                ? 'border-amber-500/35'
                : undefined
            )}
          >
            <p className="text-sm text-muted-foreground">پرداخت‌ها</p>
            <p className="mt-2 text-2xl font-black tracking-tight text-foreground">
              {formatNumber(live.pending_payments)}
              <span className="ms-2 text-base font-bold text-muted-foreground">در انتظار</span>
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              لغو/ناموفق {formatNumber(live.cancel_rate)}٪ ({formatNumber(live.cancelled_payments)} از{' '}
              {formatNumber(live.payment_attempts)})
            </p>
          </AdminSurface>
        </div>
      ) : (
        <AdminSurface className="py-10 text-center text-muted-foreground">
          داده فروش امروز در دسترس نیست.
        </AdminSurface>
      )}

      <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        {/* Hourly */}
        <AdminSurface>
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h3 className="text-base font-black tracking-tight">ساعات شلوغ</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                سفارش‌های موفق {heatmap?.days ?? Number(days)} روز اخیر
              </p>
            </div>
            {peak && peak.orders > 0 ? (
              <p className="text-sm font-semibold text-foreground">
                اوج {String(peak.hour).padStart(2, '0')}:00
                <span className="ms-2 text-primary">
                  {formatNumber(peak.orders)} سفارش
                </span>
              </p>
            ) : null}
          </div>

          <div className="flex h-44 items-stretch gap-1">
            {hours.map((cell) => {
              const heightPct =
                cell.orders > 0
                  ? Math.max((cell.orders / maxHourOrders) * 100, 10)
                  : 0
              const isPeak = peak && cell.hour === peak.hour && peak.orders > 0
              return (
                <div
                  key={cell.hour}
                  className="group relative flex h-full min-w-0 flex-1 flex-col justify-end"
                  title={`${String(cell.hour).padStart(2, '0')}:00 — ${formatNumber(cell.orders)} سفارش · ${formatCurrency(cell.sales)}`}
                >
                  {cell.orders > 0 ? (
                    <div className="pointer-events-none absolute bottom-[calc(100%+4px)] z-10 hidden whitespace-nowrap rounded-md bg-foreground px-1.5 py-0.5 text-[10px] font-semibold text-background group-hover:block">
                      {formatNumber(cell.orders)}
                    </div>
                  ) : null}
                  <div
                    className={cn(
                      'w-full rounded-t-md transition-colors',
                      cell.orders
                        ? isPeak
                          ? 'bg-primary'
                          : 'bg-primary/40 group-hover:bg-primary/65'
                        : 'bg-muted/70'
                    )}
                    style={{ height: cell.orders ? `${heightPct}%` : '3px' }}
                  />
                </div>
              )
            })}
          </div>
          <div className="mt-2 flex gap-1">
            {hours.map((cell) => (
              <div
                key={`lbl-${cell.hour}`}
                className="min-w-0 flex-1 text-center text-[9px] text-muted-foreground"
              >
                {cell.hour % 4 === 0 ? String(cell.hour).padStart(2, '0') : ''}
              </div>
            ))}
          </div>
        </AdminSurface>

        {/* Trend */}
        <AdminSurface>
          <div className="mb-4">
            <h3 className="text-base font-black tracking-tight">روند فروش روزانه</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {trend?.days ?? Number(days)} روز اخیر
            </p>
          </div>
          {(trend?.points || []).length ? (
            <>
              <div className="flex h-44 items-stretch gap-1.5">
                {(trend?.points || []).map((point) => {
                  const heightPct =
                    point.sales > 0
                      ? Math.max((point.sales / maxTrendSales) * 100, 10)
                      : 0
                  return (
                    <div
                      key={point.date}
                      className="group relative flex h-full min-w-0 flex-1 flex-col justify-end"
                      title={`${formatDayLabel(point.date)} — ${formatCurrency(point.sales)} · ${formatNumber(point.orders)} سفارش`}
                    >
                      {point.sales > 0 ? (
                        <div className="pointer-events-none absolute bottom-[calc(100%+4px)] z-10 hidden whitespace-nowrap rounded-md bg-foreground px-1.5 py-0.5 text-[10px] font-semibold text-background group-hover:block">
                          {formatCurrency(point.sales)}
                        </div>
                      ) : null}
                      <div
                        className={cn(
                          'w-full rounded-t-md transition-colors',
                          point.sales
                            ? 'bg-foreground/80 group-hover:bg-primary dark:bg-foreground/60'
                            : 'bg-muted/70'
                        )}
                        style={{ height: point.sales ? `${heightPct}%` : '3px' }}
                      />
                    </div>
                  )
                })}
              </div>
              <div className="mt-2 flex gap-1.5">
                {(trend?.points || []).map((point, idx, arr) => (
                  <div
                    key={`t-${point.date}`}
                    className="min-w-0 flex-1 text-center text-[9px] text-muted-foreground"
                  >
                    {idx === 0 || idx === arr.length - 1 || idx === Math.floor(arr.length / 2)
                      ? formatDayLabel(point.date)
                      : ''}
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex h-44 items-center justify-center text-sm text-muted-foreground">
              هنوز سفارشی در این بازه نیست
            </div>
          )}
        </AdminSurface>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {/* Top products */}
        <AdminSurface padded={false}>
          <div className="border-b border-border/70 px-5 py-4">
            <h3 className="text-base font-black tracking-tight">پرفروش امروز</h3>
            <p className="mt-1 text-sm text-muted-foreground">بر اساس تعداد فروش</p>
          </div>
          {topProducts.length ? (
            <ul className="divide-y divide-border/60">
              {topProducts.map((p, idx) => (
                <li
                  key={`${p.product_id ?? p.name}-${idx}`}
                  className="flex items-center justify-between gap-3 px-5 py-3.5"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-sm font-bold text-muted-foreground">
                      {formatNumber(idx + 1)}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-foreground">{p.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatCurrency(p.revenue)} فروش
                      </p>
                    </div>
                  </div>
                  <span className="shrink-0 text-sm font-bold text-primary">
                    {formatNumber(p.quantity)} عدد
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="px-5 py-10 text-center text-sm text-muted-foreground">
              امروز هنوز فروش موفقی ثبت نشده
            </div>
          )}
        </AdminSurface>

        {/* Recent orders */}
        <AdminSurface padded={false}>
          <div className="border-b border-border/70 px-5 py-4">
            <h3 className="text-base font-black tracking-tight">آخرین سفارش‌های امروز</h3>
            <p className="mt-1 text-sm text-muted-foreground">جدیدترین ثبت‌ها</p>
          </div>
          {recentOrders.length ? (
            <ul className="divide-y divide-border/60">
              {recentOrders.map((o) => (
                <li
                  key={o.id}
                  className="flex items-center justify-between gap-3 px-5 py-3.5"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-bold text-foreground">{o.order_number}</p>
                      <AdminStatusBadge tone={paymentTone(o.payment_status)}>
                        {fa(o.payment_status)}
                      </AdminStatusBadge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatClock(o.created_at)} · {fa(o.fulfillment_type)}
                    </p>
                  </div>
                  <p className="shrink-0 text-sm font-bold tabular-nums text-foreground">
                    {formatCurrency(o.total_amount)}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <div className="px-5 py-10 text-center text-sm text-muted-foreground">
              سفارشی برای امروز نیست
            </div>
          )}
        </AdminSurface>
      </div>
    </div>
  )
}
