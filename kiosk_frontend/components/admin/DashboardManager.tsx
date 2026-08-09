'use client'

import { useQuery } from '@tanstack/react-query'
import { dashboardApi } from '@/lib/api/dashboard'
import { formatCurrency, formatNumber } from '@/lib/utils'
import {
  AdminPageHeader,
  AdminSurface,
} from '@/components/admin/ui/primitives'
import { cn } from '@/lib/utils'

const THEME_LABELS: Record<string, string> = {
  cinema: 'سینمایی',
  neon: 'نئون',
  fresh: 'روشن',
  editorial: 'تحریریه',
}

function StatCard({
  label,
  value,
  hint,
  tone = 'default',
}: {
  label: string
  value: string
  hint?: string
  tone?: 'default' | 'warn' | 'ok'
}) {
  return (
    <AdminSurface
      className={cn(
        'min-w-0',
        tone === 'warn' && 'border-amber-500/40',
        tone === 'ok' && 'border-emerald-500/30'
      )}
    >
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-black tracking-tight text-foreground sm:text-3xl">
        {value}
      </p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </AdminSurface>
  )
}

function HealthBadge({
  title,
  ok,
  status,
  message,
  latency,
}: {
  title: string
  ok: boolean
  status: string
  message?: string
  latency?: number | null
}) {
  const softOk =
    ok || status === 'mock' || status === 'disabled' || status === 'env_disabled'
  return (
    <AdminSurface
      className={cn(
        softOk ? 'border-emerald-500/25' : 'border-destructive/40 bg-destructive/5'
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-bold text-foreground">{title}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {message || status}
          </p>
        </div>
        <span
          className={cn(
            'rounded-lg px-2.5 py-1 text-xs font-bold',
            softOk
              ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
              : 'bg-destructive/15 text-destructive'
          )}
        >
          {status}
        </span>
      </div>
      {latency != null ? (
        <p className="mt-3 text-xs text-muted-foreground">
          تأخیر: {formatNumber(latency)} ms
        </p>
      ) : null}
    </AdminSurface>
  )
}

export function DashboardManager() {
  const dashQuery = useQuery({
    queryKey: ['admin-dashboard-live'],
    queryFn: () => dashboardApi.getLive(7),
    refetchInterval: 30_000,
  })

  const healthQuery = useQuery({
    queryKey: ['admin-system-health'],
    queryFn: () => dashboardApi.getHealth(),
    refetchInterval: 45_000,
  })

  const live = dashQuery.data?.live
  const heatmap = dashQuery.data?.heatmap
  const ab = dashQuery.data?.landing_ab
  const health = healthQuery.data

  return (
    <div>
      <AdminPageHeader
        title="داشبورد زنده"
        description="فروش امروز، ساعات شلوغ، نرخ شروع سفارش تم‌های لندینگ، و سلامت دستگاه‌ها."
        actions={
          <button
            type="button"
            onClick={() => {
              dashQuery.refetch()
              healthQuery.refetch()
            }}
            className="rounded-xl border border-border bg-card px-3 py-2 text-sm font-semibold hover:bg-muted/60"
          >
            بروزرسانی
          </button>
        }
      />

      {(dashQuery.isLoading || !live) && (
        <AdminSurface className="py-12 text-center text-muted-foreground">
          در حال بارگذاری داشبورد…
        </AdminSurface>
      )}

      {live ? (
        <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="فروش امروز"
            value={formatCurrency(live.sales_today)}
            hint={`${formatNumber(live.orders_today)} سفارش موفق`}
            tone="ok"
          />
          <StatCard
            label="میانگین سبد"
            value={formatCurrency(live.avg_basket)}
          />
          <StatCard
            label="نرخ لغو پرداخت"
            value={`${formatNumber(live.cancel_rate)}٪`}
            hint={`${formatNumber(live.cancelled_payments)} از ${formatNumber(live.payment_attempts)} تلاش`}
            tone={live.cancel_rate >= 25 ? 'warn' : 'default'}
          />
          <StatCard
            label="در انتظار پرداخت"
            value={formatNumber(live.pending_payments)}
          />
        </div>
      ) : null}

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <AdminSurface>
          <h3 className="mb-1 text-base font-bold">گرمای زمانی فروش</h3>
          <p className="mb-4 text-sm text-muted-foreground">
            سفارش‌های موفق {heatmap?.days ?? 7} روز اخیر بر اساس ساعت
          </p>
          <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-8 md:grid-cols-12">
            {(heatmap?.hours || Array.from({ length: 24 }, (_, hour) => ({
              hour,
              orders: 0,
              sales: 0,
              intensity: 0,
            }))).map((cell) => (
              <div
                key={cell.hour}
                title={`${cell.hour}:00 — ${cell.orders} سفارش`}
                className="flex flex-col items-center gap-1"
              >
                <div
                  className="h-10 w-full rounded-md border border-border/60"
                  style={{
                    backgroundColor: `rgba(225, 113, 0, ${0.08 + cell.intensity * 0.85})`,
                  }}
                />
                <span className="text-[10px] text-muted-foreground">
                  {String(cell.hour).padStart(2, '0')}
                </span>
              </div>
            ))}
          </div>
        </AdminSurface>

        <AdminSurface>
          <h3 className="mb-1 text-base font-bold">A/B تم لندینگ</h3>
          <p className="mb-4 text-sm text-muted-foreground">
            نرخ شروع سفارش نسبت به نمایش تم
            {ab?.ab_enabled ? ' (فعال)' : ' (غیرفعال — فقط آمار ثبت‌شده)'}
          </p>
          <div className="space-y-3">
            {(ab?.variants || []).map((v) => (
              <div
                key={v.theme}
                className="rounded-xl border border-border/70 bg-muted/30 px-3 py-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="font-bold">
                    {THEME_LABELS[v.theme] || v.theme}
                  </p>
                  <p className="text-lg font-black text-primary">
                    {formatNumber(v.start_rate)}٪
                  </p>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {formatNumber(v.starts)} شروع از {formatNumber(v.impressions)} نمایش
                </p>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${Math.min(v.start_rate, 100)}%` }}
                  />
                </div>
              </div>
            ))}
            {!ab?.variants?.length ? (
              <p className="text-sm text-muted-foreground">هنوز رویدادی ثبت نشده است.</p>
            ) : null}
          </div>
        </AdminSurface>
      </div>

      <AdminPageHeader
        title="مانیتورینگ سلامت"
        description="وضعیت کارتخوان، چاپگر شبکه و ربات بله."
      />
      {healthQuery.isLoading && !health ? (
        <AdminSurface className="py-8 text-center text-muted-foreground">
          در حال بررسی…
        </AdminSurface>
      ) : (
        <div className="grid gap-3 md:grid-cols-3">
          <HealthBadge
            title="کارتخوان (POS)"
            ok={!!health?.components.pos.ok}
            status={health?.components.pos.status || '—'}
            message={health?.components.pos.message}
            latency={health?.components.pos.latency_ms}
          />
          <HealthBadge
            title="چاپگر"
            ok={!!health?.components.printer.ok}
            status={health?.components.printer.status || '—'}
            message={health?.components.printer.message}
            latency={health?.components.printer.latency_ms}
          />
          <HealthBadge
            title="ربات بله"
            ok={!!health?.components.bale.ok}
            status={health?.components.bale.status || '—'}
            message={health?.components.bale.message}
            latency={health?.components.bale.latency_ms}
          />
        </div>
      )}
    </div>
  )
}
