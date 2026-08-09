'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import {
  accountsApi,
  type BaleBotHealth,
  type BaleBotPanelSettings,
} from '@/lib/api/accounts'
import { Button } from '@/components/shared/Button'
import { Input } from '@/components/shared/Input'
import { Switch } from '@/components/shared/Switch'
import {
  AdminAlert,
  AdminPageHeader,
  AdminStatusBadge,
  AdminSurface,
} from '@/components/admin/ui/primitives'
import { cn, translateError } from '@/lib/utils'

type RuntimeTone = 'success' | 'warning' | 'danger' | 'neutral'

function runtimeTone(settings?: BaleBotPanelSettings | null): RuntimeTone {
  if (!settings) return 'neutral'
  if (settings.env_enabled === false) return 'danger'
  if (settings.is_runtime_active) return 'success'
  if (!settings.has_token) return 'warning'
  if (!settings.is_enabled) return 'warning'
  return 'neutral'
}

function runtimeLabel(settings?: BaleBotPanelSettings | null, loading?: boolean) {
  if (loading) return 'در حال بارگذاری…'
  if (!settings) return 'نامشخص'
  if (settings.env_enabled === false) return 'خاموش از ENV'
  if (settings.is_runtime_active) return 'در حال اجرا'
  if (!settings.has_token) return 'بدون توکن'
  if (!settings.is_enabled) return 'خاموش در پنل'
  return 'آمادهٔ راه‌اندازی'
}

function healthTone(status?: string): RuntimeTone {
  switch (status) {
    case 'ok':
      return 'success'
    case 'degraded':
    case 'disabled':
      return 'warning'
    case 'env_disabled':
    case 'down':
    case 'misconfigured':
      return 'danger'
    default:
      return 'neutral'
  }
}

function healthLabel(status?: string) {
  switch (status) {
    case 'ok':
      return 'سالم'
    case 'degraded':
      return 'ناپایدار'
    case 'disabled':
      return 'خاموش'
    case 'env_disabled':
      return 'خاموش ENV'
    case 'down':
      return 'قطع'
    case 'misconfigured':
      return 'بدون توکن'
    default:
      return 'نامشخص'
  }
}

function formatPollAge(seconds: number | null | undefined) {
  if (seconds == null) return 'هنوز ثبت نشده'
  if (seconds < 60) return `${seconds} ثانیه پیش`
  const mins = Math.floor(seconds / 60)
  if (mins < 60) return `${mins} دقیقه پیش`
  const hours = Math.floor(mins / 60)
  return `${hours} ساعت پیش`
}

function IconSend({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden>
      <path
        d="M21 5L2.5 11.5l6.2 2.3L17 8l-6.2 7.8 1.1 5.7L21 5z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function IconCheck({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden>
      <path
        d="M5 13l4 4L19 7"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function IconX({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden>
      <path
        d="M6 6l12 12M18 6L6 18"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  )
}

function IconEye({ open }: { open: boolean }) {
  if (open) {
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden>
        <path
          d="M3 3l18 18M10.5 10.7a2.5 2.5 0 003.5 3.5M9.9 5.1A9.8 9.8 0 0112 5c5 0 9 4.5 9.8 7-.3.8-1 2.1-2.2 3.4M6.1 6.2C4.4 7.6 3.3 9.3 2.2 12c.8 2.5 4.8 7 9.8 7 1.4 0 2.7-.3 3.9-.8"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden>
      <path
        d="M2.2 12C3 9.5 7 5 12 5s9 4.5 9.8 7c-.8 2.5-4.8 7-9.8 7s-9-4.5-9.8-7z"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <circle cx="12" cy="12" r="2.8" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  )
}

function StatusDot({ tone }: { tone: RuntimeTone }) {
  const color = {
    success: 'bg-emerald-500',
    warning: 'bg-amber-500',
    danger: 'bg-red-500',
    neutral: 'bg-muted-foreground/50',
  }[tone]
  return (
    <span className="relative flex h-2.5 w-2.5">
      {tone === 'success' ? (
        <span
          className={cn(
            'absolute inline-flex h-full w-full animate-ping rounded-full opacity-60',
            color
          )}
        />
      ) : null}
      <span className={cn('relative inline-flex h-2.5 w-2.5 rounded-full', color)} />
    </span>
  )
}

function ChecklistItem({
  ok,
  warn,
  title,
  detail,
}: {
  ok: boolean
  warn?: boolean
  title: string
  detail: string
}) {
  const tone: RuntimeTone = ok ? 'success' : warn ? 'warning' : 'danger'
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-border/70 bg-background/60 px-3.5 py-3">
      <div
        className={cn(
          'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl',
          tone === 'success' && 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-300',
          tone === 'warning' && 'bg-amber-500/12 text-amber-800 dark:text-amber-300',
          tone === 'danger' && 'bg-red-500/12 text-red-700 dark:text-red-300'
        )}
      >
        {ok ? <IconCheck className="h-4 w-4" /> : <IconX className="h-4 w-4" />}
      </div>
      <div className="min-w-0">
        <p className="text-sm font-bold text-foreground">{title}</p>
        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{detail}</p>
      </div>
    </div>
  )
}

function MetricCard({
  label,
  value,
  hint,
  ok,
}: {
  label: string
  value: ReactNode
  hint?: string
  ok?: boolean
}) {
  return (
    <div className="rounded-2xl border border-border/70 bg-background/50 px-4 py-3.5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        {ok != null ? (
          <span
            className={cn(
              'h-1.5 w-1.5 rounded-full',
              ok ? 'bg-emerald-500' : 'bg-red-500'
            )}
          />
        ) : null}
      </div>
      <p className="mt-1.5 truncate text-sm font-bold text-foreground">{value}</p>
      {hint ? <p className="mt-0.5 text-[11px] text-muted-foreground">{hint}</p> : null}
    </div>
  )
}

export function BaleBotManager() {
  const queryClient = useQueryClient()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [health, setHealth] = useState<BaleBotHealth | null>(null)
  const [showToken, setShowToken] = useState(false)
  const [form, setForm] = useState({
    is_enabled: false,
    bot_token: '',
    api_base: 'https://tapi.bale.ai',
  })
  const [baseline, setBaseline] = useState<{
    is_enabled: boolean
    api_base: string
  } | null>(null)

  const { data: settingsData, isLoading } = useQuery({
    queryKey: ['admin-bale-settings'],
    queryFn: accountsApi.getBaleSettings,
  })
  const settings = settingsData?.result

  useEffect(() => {
    if (!settings) return
    setForm((prev) => ({
      ...prev,
      is_enabled: !!settings.is_enabled,
      api_base: settings.api_base || 'https://tapi.bale.ai',
      bot_token: '',
    }))
    setBaseline({
      is_enabled: !!settings.is_enabled,
      api_base: settings.api_base || 'https://tapi.bale.ai',
    })
  }, [settings])

  const isDirty = useMemo(() => {
    if (!baseline) return false
    return (
      form.is_enabled !== baseline.is_enabled ||
      form.api_base.trim() !== baseline.api_base.trim() ||
      form.bot_token.trim().length > 0
    )
  }, [form, baseline])

  const healthMutation = useMutation({
    mutationFn: accountsApi.checkBaleHealth,
    onSuccess: (data) => {
      setHealth(data.result)
      setError(null)
    },
    onError: (err) => setError(translateError(err) || 'خطا در بررسی اتصال ربات'),
  })

  const saveMutation = useMutation({
    mutationFn: () =>
      accountsApi.updateBaleSettings({
        is_enabled: form.is_enabled,
        bot_token: form.bot_token || undefined,
        api_base: form.api_base,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-bale-settings'] })
      setForm((prev) => ({ ...prev, bot_token: '' }))
      setSuccess('تنظیمات ربات ذخیره شد.')
      setError(null)
      setTimeout(() => setSuccess(null), 4000)
      healthMutation.mutate()
    },
    onError: (err) => setError(translateError(err) || 'خطا در ذخیره تنظیمات ربات'),
  })

  const clearTokenMutation = useMutation({
    mutationFn: () => accountsApi.updateBaleSettings({ clear_token: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-bale-settings'] })
      setSuccess('توکن ربات پاک شد.')
      setTimeout(() => setSuccess(null), 4000)
      healthMutation.mutate()
    },
    onError: (err) => setError(translateError(err) || 'خطا در پاک کردن توکن'),
  })

  useEffect(() => {
    healthMutation.mutate()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-shot probe on mount
  }, [])

  const tone = runtimeTone(settings)
  const envOk = settings?.env_enabled !== false
  const tokenOk = !!settings?.has_token
  const panelOk = !!settings?.is_enabled
  const workerOk = !!settings?.is_runtime_active

  const discard = () => {
    if (!baseline) return
    setForm({
      is_enabled: baseline.is_enabled,
      api_base: baseline.api_base,
      bot_token: '',
    })
    setError(null)
  }

  if (isLoading && !settings) {
    return (
      <div className="space-y-5">
        <div className="h-10 w-48 animate-pulse rounded-xl bg-muted" />
        <div className="h-40 animate-pulse rounded-2xl bg-muted/70" />
        <div className="h-64 animate-pulse rounded-2xl bg-muted/50" />
      </div>
    )
  }

  return (
    <div className="space-y-5 pb-24">
      <AdminPageHeader
        title="ربات بله"
        description="اتصال به بله، وضعیت polling و توکن ربات را از یکجا مدیریت کنید."
        actions={
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => healthMutation.mutate()}
            isLoading={healthMutation.isPending}
          >
            بررسی اتصال
          </Button>
        }
      />

      <AnimatePresence>
        {error ? (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <AdminAlert tone="danger" onClose={() => setError(null)}>
              {error}
            </AdminAlert>
          </motion.div>
        ) : null}
        {success ? (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <AdminAlert tone="success" onClose={() => setSuccess(null)}>
              {success}
            </AdminAlert>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* Runtime hero */}
      <AdminSurface className="relative overflow-hidden" padded={false}>
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              tone === 'success'
                ? 'radial-gradient(70% 80% at 100% 0%, rgba(16,185,129,0.14), transparent 55%)'
                : tone === 'danger'
                  ? 'radial-gradient(70% 80% at 100% 0%, rgba(239,68,68,0.12), transparent 55%)'
                  : 'radial-gradient(70% 80% at 100% 0%, rgba(225,113,0,0.12), transparent 55%)',
          }}
        />
        <div className="relative grid gap-6 p-5 sm:p-6 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
          <div className="flex items-start gap-4">
            <div
              className={cn(
                'flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl shadow-sm',
                tone === 'success' && 'bg-emerald-500 text-white shadow-emerald-500/25',
                tone === 'warning' && 'bg-amber-500 text-white shadow-amber-500/25',
                tone === 'danger' && 'bg-red-500 text-white shadow-red-500/25',
                tone === 'neutral' && 'bg-primary text-white shadow-primary/25'
              )}
            >
              <IconSend className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <StatusDot tone={tone} />
                <h3 className="text-lg font-black tracking-tight text-foreground">
                  {runtimeLabel(settings, isLoading)}
                </h3>
                <AdminStatusBadge tone={tone === 'neutral' ? 'primary' : tone}>
                  {healthMutation.isPending && !health
                    ? 'در حال سنجش…'
                    : health
                      ? healthLabel(health.status)
                      : 'وضعیت سرویس'}
                </AdminStatusBadge>
              </div>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
                {health?.message ||
                  (workerOk
                    ? 'سرویس polling فعال است و پیام‌ها را دریافت می‌کند.'
                    : 'برای شروع، توکن را ذخیره کنید و سوییچ پنل را روشن نگه دارید.')}
              </p>
              {settings?.token_masked ? (
                <p className="mt-3 font-mono text-xs text-muted-foreground">
                  توکن · {settings.token_masked}
                </p>
              ) : null}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <ChecklistItem
              ok={envOk}
              title="ENV"
              detail={envOk ? 'BALE_BOT_ENABLED فعال' : 'در .env خاموش است'}
            />
            <ChecklistItem
              ok={tokenOk}
              warn={!tokenOk}
              title="توکن"
              detail={tokenOk ? 'توکن ذخیره شده' : 'هنوز تنظیم نشده'}
            />
            <ChecklistItem
              ok={panelOk && envOk}
              warn={envOk && !panelOk}
              title="سوییچ پنل"
              detail={
                !envOk
                  ? 'ابتدا ENV را روشن کنید'
                  : panelOk
                    ? 'فعال در پنل'
                    : 'خاموش در پنل'
              }
            />
            <ChecklistItem
              ok={workerOk}
              warn={tokenOk && panelOk && envOk && !workerOk}
              title="Worker"
              detail={
                workerOk
                  ? 'Polling در حال اجرا'
                  : 'هنوز poll نمی‌کند'
              }
            />
          </div>
        </div>
      </AdminSurface>

      {!envOk ? (
        <AdminAlert tone="info">
          ربات با <code className="font-mono text-[12px]">BALE_BOT_ENABLED=False</code> در{' '}
          <code className="font-mono text-[12px]">.env</code> کاملاً خاموش است. مقدار را{' '}
          <code className="font-mono text-[12px]">True</code> کنید و سرویس{' '}
          <code className="font-mono text-[12px]">bale_bot</code> را دوباره بالا بیاورید.
        </AdminAlert>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        {/* Connection form */}
        <AdminSurface className="space-y-5">
          <div>
            <h3 className="text-base font-bold text-foreground">تنظیمات اتصال</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              توکن BotFather را وارد کنید؛ سرویس بدون ری‌استارت تنظیمات را می‌خواند.
            </p>
          </div>

          <div
            className={cn(
              'flex items-center justify-between gap-4 rounded-2xl border px-4 py-3.5 transition-colors',
              form.is_enabled
                ? 'border-primary/30 bg-primary/[0.06]'
                : 'border-border/80 bg-muted/30',
              !envOk && 'opacity-70'
            )}
          >
            <div className="min-w-0">
              <p className="text-sm font-bold text-foreground">فعال‌سازی از پنل</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {!envOk
                  ? 'تا وقتی ENV خاموش است اثری ندارد'
                  : form.is_enabled
                    ? 'ربات مجاز به polling است'
                    : 'ربات از پنل خاموش است'}
              </p>
            </div>
            <Switch
              checked={form.is_enabled}
              onChange={(checked) => setForm({ ...form, is_enabled: checked })}
              disabled={!envOk}
              label="فعال‌سازی ربات بله"
            />
          </div>

          <div className="space-y-4">
            <div>
              <div className="mb-2 flex items-center justify-between gap-2">
                <label className="text-sm font-medium text-foreground">توکن ربات</label>
                {settings?.has_token ? (
                  <AdminStatusBadge tone="success">ذخیره‌شده</AdminStatusBadge>
                ) : (
                  <AdminStatusBadge tone="warning">لازم است</AdminStatusBadge>
                )}
              </div>
              <div className="relative">
                <Input
                  type={showToken ? 'text' : 'password'}
                  value={form.bot_token}
                  onChange={(e) => setForm({ ...form, bot_token: e.target.value })}
                  placeholder={
                    settings?.has_token
                      ? 'برای تعویض، توکن جدید را وارد کنید'
                      : 'مثلاً 123456789:AbCdEf...'
                  }
                  className="pe-12 font-mono text-sm"
                  autoComplete="off"
                />
                <button
                  type="button"
                  onClick={() => setShowToken((v) => !v)}
                  className="absolute end-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  aria-label={showToken ? 'مخفی کردن توکن' : 'نمایش توکن'}
                >
                  <IconEye open={showToken} />
                </button>
              </div>
              {settings?.has_token ? (
                <p className="mt-1.5 text-xs text-muted-foreground">
                  فعلی: <span className="font-mono">{settings.token_masked}</span>
                </p>
              ) : null}
            </div>

            <Input
              label="آدرس API"
              value={form.api_base}
              onChange={(e) => setForm({ ...form, api_base: e.target.value })}
              placeholder="https://tapi.bale.ai"
              dir="ltr"
              className="text-left font-mono text-sm"
            />
          </div>

          {settings?.has_token ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/70 bg-muted/20 px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-foreground">توکن ذخیره‌شده</p>
                <p className="text-xs text-muted-foreground">
                  در صورت نشت یا تعویض ربات، توکن را پاک کنید.
                </p>
              </div>
              <Button
                type="button"
                variant="danger"
                size="sm"
                onClick={() => {
                  if (confirm('توکن ذخیره‌شده پاک شود؟ این کار polling را متوقف می‌کند.')) {
                    clearTokenMutation.mutate()
                  }
                }}
                isLoading={clearTokenMutation.isPending}
              >
                پاک کردن توکن
              </Button>
            </div>
          ) : null}
        </AdminSurface>

        {/* Live diagnostics */}
        <AdminSurface className="flex flex-col gap-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-foreground">تشخیص زنده</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                آخرین نتیجهٔ بررسی اتصال به API بله
              </p>
            </div>
            {health ? (
              <AdminStatusBadge tone={healthTone(health.status)}>
                {healthLabel(health.status)}
              </AdminStatusBadge>
            ) : null}
          </div>

          {healthMutation.isPending && !health ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 py-10 text-center">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <p className="text-sm text-muted-foreground">در حال بررسی اتصال…</p>
            </div>
          ) : health ? (
            <motion.div
              key={health.checked_at}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2"
            >
              <MetricCard
                label="API بله"
                ok={health.api_ok}
                value={health.api_ok ? 'متصل' : 'قطع'}
                hint={
                  health.latency_ms != null ? `تأخیر ${health.latency_ms}ms` : undefined
                }
              />
              <MetricCard
                label="هویت ربات"
                value={
                  health.bot_username
                    ? `@${health.bot_username}`
                    : health.bot_name || '—'
                }
                hint={health.bot_id != null ? `ID ${health.bot_id}` : undefined}
              />
              <MetricCard
                label="Worker polling"
                ok={health.worker_ok}
                value={health.worker_ok ? 'فعال' : 'غیرفعال / قدیمی'}
              />
              <MetricCard
                label="آخرین poll"
                value={formatPollAge(health.last_poll_age_seconds)}
                hint={
                  health.last_poll_error
                    ? health.last_poll_error.slice(0, 48)
                    : undefined
                }
              />
            </motion.div>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border/80 py-12 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                <IconSend className="h-5 w-5" />
              </div>
              <p className="text-sm font-semibold text-foreground">هنوز سنجشی انجام نشده</p>
              <p className="max-w-xs text-xs text-muted-foreground">
                با دکمه «بررسی اتصال» وضعیت API و worker را ببینید.
              </p>
            </div>
          )}

          {health?.last_poll_error ? (
            <div className="rounded-xl border border-amber-500/25 bg-amber-500/8 px-3 py-2.5 text-xs leading-relaxed text-amber-900 dark:text-amber-200">
              آخرین خطا: {health.last_poll_error}
            </div>
          ) : null}
        </AdminSurface>
      </div>

      <AdminSurface className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-foreground">دسترسی کاربران</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            chat_id و فعال‌سازی هر کاربر از منوی کاربران تنظیم می‌شود.
          </p>
        </div>
        <AdminStatusBadge tone="neutral">منوی کاربران</AdminStatusBadge>
      </AdminSurface>

      {/* Save dock */}
      <AnimatePresence>
        {isDirty ? (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 420, damping: 32 }}
            className="pointer-events-none fixed bottom-4 z-40 start-3 end-3 sm:bottom-6 sm:start-6 sm:end-6 lg:start-[calc(248px+1.5rem)]"
          >
            <div className="pointer-events-auto mx-auto flex max-w-lg items-center gap-3 rounded-2xl border border-border/80 bg-card/95 px-3 py-2.5 shadow-2xl shadow-black/10 backdrop-blur-xl sm:px-4 dark:border-border-dark dark:bg-card-dark/95">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary">
                <IconSend className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-foreground">تغییرات ذخیره‌نشده</p>
                <p className="truncate text-xs text-muted-foreground">
                  {[
                    form.bot_token.trim() && 'توکن جدید',
                    form.is_enabled !== baseline?.is_enabled && 'سوییچ پنل',
                    form.api_base.trim() !== baseline?.api_base.trim() && 'آدرس API',
                  ]
                    .filter(Boolean)
                    .join(' · ') || 'تنظیمات ربات'}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={discard}
                  disabled={saveMutation.isPending}
                  className="text-muted-foreground"
                >
                  لغو
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={() => saveMutation.mutate()}
                  isLoading={saveMutation.isPending}
                  className="min-w-[6.5rem] shadow-md shadow-primary/25"
                >
                  ذخیره
                </Button>
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}
