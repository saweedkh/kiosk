'use client'

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { writeCachedSettings } from '@/lib/kiosk-persist'
import { publishSettingsToCustomer } from '@/lib/publish-settings'
import { withMediaCacheBust } from '@/lib/media-url'
import { adminApi } from '@/lib/api/admin'
import { dashboardApi } from '@/lib/api/dashboard'
import { Button } from '@/components/shared/Button'
import { Input } from '@/components/shared/Input'
import { Switch } from '@/components/shared/Switch'
import {
  LandingLivePreview,
  LandingThemePickerThumb,
} from '@/components/admin/LandingLivePreview'
import {
  ReceiptLivePreview,
  ReceiptTemplateThumb,
} from '@/components/admin/ReceiptTemplateThumb'
import {
  AdminPageHeader,
  AdminSegmented,
  AdminStatusBadge,
  AdminSurface,
} from '@/components/admin/ui/primitives'
import { CartLayoutThumb } from '@/components/admin/CartLayoutThumb'
import { TimePicker, timeFromParts, partsFromTime } from '@/components/admin/TimePicker'
import { translateError, cn, formatCurrency, formatNumber, toPersianDigits } from '@/lib/utils'
import type { Settings } from '@/types'
import type { CartLayout } from '@/components/customer/CartView'
import { useThemeStore } from '@/lib/store/theme-store'
import { applyBrandTheme } from '@/lib/theme/brand-palette'
import {
  DEFAULT_PACKAGING_TITLE_DINE_IN,
  DEFAULT_PACKAGING_TITLE_TAKEAWAY,
  DEFAULT_SERVICE_TITLE_DINE_IN,
  DEFAULT_SERVICE_TITLE_TAKEAWAY,
} from '@/lib/api/settings'
import {
  DEFAULT_ACCENT,
  DEFAULT_BG,
  DEFAULT_LANDING_CTA,
  DEFAULT_MUTED,
  DEFAULT_TEXT,
  LANDING_PALETTE_PRESETS,
  LANDING_THEMES,
  resolveHex,
  type LandingPalette,
  type LandingThemeId,
} from '@/components/customer/landing/types'

type SettingsTab = 'brand' | 'landing' | 'cart' | 'service' | 'receipt' | 'reports' | 'hardware'

/** Fields that require an explicit save (theme / copy-mode patch instantly). */
const DIRTY_FIELDS = [
  'site_name',
  'copyright_text',
  'contact_phone',
  'description',
  'landing_cta_text',
  'landing_accent_color',
  'landing_bg_color',
  'landing_text_color',
  'landing_muted_color',
  'receipt_header',
  'receipt_footer',
  'receipt_template',
  'receipt_template_mode',
  'receipt_number_mode',
  'service_enabled',
  'service_title_dine_in',
  'service_title_takeaway',
  'service_fee_dine_in_amount',
  'service_fee_takeaway_amount',
  'service_fee_dine_in',
  'service_fee_takeaway',
  'packaging_enabled',
  'packaging_title_dine_in',
  'packaging_title_takeaway',
  'packaging_fee_dine_in_amount',
  'packaging_fee_takeaway_amount',
  'packaging_fee_dine_in',
  'packaging_fee_takeaway',
  'fulfillment_choice_enabled',
  'dine_in_enabled',
  'takeaway_enabled',
  'pos_payment_mode',
  'mock_payment_delay',
  'mock_payment_success_rate',
  'pos_ip',
  'pos_port',
  'kiosk_payment_cancel_enabled',
  'business_day_start_hour',
  'business_day_start_minute',
  'printer_enabled',
  'printer_ip',
  'printer_port',
] as const

const DIRTY_FIELD_LABELS: Record<(typeof DIRTY_FIELDS)[number] | 'logo' | 'landing_background', string> = {
  site_name: 'نام سایت',
  copyright_text: 'کپی‌رایت',
  contact_phone: 'تماس',
  description: 'توضیحات',
  landing_cta_text: 'متن دکمه',
  landing_accent_color: 'رنگ اصلی سایت',
  landing_bg_color: 'پس‌زمینه سایت',
  landing_text_color: 'متن سایت',
  landing_muted_color: 'متن ثانویه سایت',
  receipt_header: 'سربرگ فیش',
  receipt_footer: 'پاورقی فیش',
  receipt_template: 'قالب فیش',
  receipt_template_mode: 'حالت قالب',
  receipt_number_mode: 'شماره‌گذاری',
  service_enabled: 'سرویس',
  service_title_dine_in: 'عنوان سرویس داخل سالن',
  service_title_takeaway: 'عنوان سرویس بیرون‌بر',
  service_fee_dine_in_amount: 'مبلغ سرویس داخل سالن',
  service_fee_takeaway_amount: 'مبلغ سرویس بیرون‌بر',
  service_fee_dine_in: 'هزینه سرویس حضوری',
  service_fee_takeaway: 'هزینه سرویس بیرون‌بر',
  packaging_enabled: 'بسته‌بندی',
  packaging_title_dine_in: 'عنوان بسته‌بندی داخل سالن',
  packaging_title_takeaway: 'عنوان بسته‌بندی بیرون‌بر',
  packaging_fee_dine_in_amount: 'مبلغ بسته‌بندی داخل سالن',
  packaging_fee_takeaway_amount: 'مبلغ بسته‌بندی بیرون‌بر',
  packaging_fee_dine_in: 'بسته‌بندی حضوری',
  packaging_fee_takeaway: 'بسته‌بندی بیرون‌بر',
  fulfillment_choice_enabled: 'انتخاب نوع سفارش',
  dine_in_enabled: 'داخل سالن',
  takeaway_enabled: 'بیرون‌بر',
  pos_payment_mode: 'حالت پرداخت',
  mock_payment_delay: 'تأخیر Mock',
  mock_payment_success_rate: 'نرخ موفقیت Mock',
  pos_ip: 'آی‌پی کارتخوان',
  pos_port: 'پورت کارتخوان',
  kiosk_payment_cancel_enabled: 'لغو پرداخت در کیوسک',
  business_day_start_hour: 'شروع روز کاری (ساعت)',
  business_day_start_minute: 'شروع روز کاری (دقیقه)',
  printer_enabled: 'چاپگر',
  printer_ip: 'آی‌پی چاپگر',
  printer_port: 'پورت چاپگر',
  logo: 'لوگو',
  landing_background: 'پس‌زمینه',
}

function norm(value: unknown): string {
  if (typeof value === 'boolean') return value ? '1' : '0'
  if (typeof value === 'number') return String(value)
  return String(value ?? '').trim()
}

function getDirtyLabels(current: Settings, baseline: Settings | null): string[] {
  if (!baseline) return []
  const labels: string[] = []
  for (const key of DIRTY_FIELDS) {
    let a: unknown = current[key]
    let b: unknown = baseline[key]
    if (key === 'service_fee_dine_in_amount') {
      a = Number(a ?? current.service_fee ?? 0)
      b = Number(b ?? baseline.service_fee ?? 0)
    }
    if (key === 'service_fee_takeaway_amount') {
      a = Number(a ?? current.service_fee ?? 0)
      b = Number(b ?? baseline.service_fee ?? 0)
    }
    if (key === 'service_title_dine_in') {
      a = String(a || '').trim() || DEFAULT_SERVICE_TITLE_DINE_IN
      b = String(b || '').trim() || DEFAULT_SERVICE_TITLE_DINE_IN
    }
    if (key === 'service_title_takeaway') {
      a = String(a || '').trim() || DEFAULT_SERVICE_TITLE_TAKEAWAY
      b = String(b || '').trim() || DEFAULT_SERVICE_TITLE_TAKEAWAY
    }
    if (key === 'packaging_title_dine_in') {
      a = String(a || '').trim() || DEFAULT_PACKAGING_TITLE_DINE_IN
      b = String(b || '').trim() || DEFAULT_PACKAGING_TITLE_DINE_IN
    }
    if (key === 'packaging_title_takeaway') {
      a = String(a || '').trim() || DEFAULT_PACKAGING_TITLE_TAKEAWAY
      b = String(b || '').trim() || DEFAULT_PACKAGING_TITLE_TAKEAWAY
    }
    if (key === 'packaging_fee_dine_in_amount' || key === 'packaging_fee_takeaway_amount') {
      a = Number(a ?? 0)
      b = Number(b ?? 0)
    }
    if (key === 'service_fee_dine_in' || key === 'service_fee_takeaway') {
      a = a !== false
      b = b !== false
    }
    if (key === 'packaging_fee_dine_in' || key === 'packaging_fee_takeaway') {
      a = a !== false
      b = b !== false
    }
    if (key === 'dine_in_enabled' || key === 'takeaway_enabled') {
      a = a !== false
      b = b !== false
    }
    if (key === 'fulfillment_choice_enabled') {
      a = a !== false
      b = b !== false
    }
    if (key === 'service_enabled' || key === 'packaging_enabled') {
      a = Boolean(a)
      b = Boolean(b)
    }
    if (key === 'printer_enabled') {
      a = a !== false
      b = b !== false
    }
    if (key === 'kiosk_payment_cancel_enabled') {
      a = a === true
      b = b === true
    }
    if (key === 'business_day_start_hour') {
      a = Number(a ?? 7)
      b = Number(b ?? 7)
    }
    if (key === 'business_day_start_minute') {
      a = Number(a ?? 0)
      b = Number(b ?? 0)
    }
    if (key === 'pos_port' || key === 'printer_port') {
      a = Number(a || 0)
      b = Number(b || 0)
    }
    if (key === 'mock_payment_delay' || key === 'mock_payment_success_rate') {
      a = Number(a || 0)
      b = Number(b || 0)
    }
    if (key === 'pos_payment_mode') {
      a = a === 'mock' ? 'mock' : 'real'
      b = b === 'mock' ? 'mock' : 'real'
    }
    if (norm(a) !== norm(b)) labels.push(DIRTY_FIELD_LABELS[key])
  }
  if (current.logo_file instanceof File) labels.push(DIRTY_FIELD_LABELS.logo)
  if (current.landing_background_file instanceof File) {
    labels.push(DIRTY_FIELD_LABELS.landing_background)
  }
  return labels
}

function stripLocalFiles(s: Settings): Settings {
  const next = { ...s }
  delete next.logo_file
  delete next.logo_preview
  delete next.landing_background_file
  delete next.landing_background_preview
  return next
}

const TABS: { id: SettingsTab; label: string; hint: string }[] = [
  { id: 'brand', label: 'برند', hint: 'نام، لوگو، رنگ‌ها' },
  { id: 'landing', label: 'لندینگ', hint: 'تم صفحه خوش‌آمد' },
  { id: 'cart', label: 'سبد', hint: 'چیدمان و نوع سفارش' },
  { id: 'service', label: 'سرویس', hint: 'سرویس و بسته‌بندی' },
  { id: 'receipt', label: 'فیش', hint: 'چاپ و شمارنده' },
  { id: 'reports', label: 'گزارشات', hint: 'روز کاری و گزارش' },
  { id: 'hardware', label: 'سخت‌افزار', hint: 'POS و پرینتر' },
]

const RECEIPT_TEMPLATES = [
  { id: 'modern', title: 'مدرن', desc: 'شماره بزرگ + نوار مبلغ' },
  { id: 'classic', title: 'کلاسیک', desc: 'جدول با سرستون' },
  { id: 'minimal', title: 'ساده', desc: 'چیدمان خلوت' },
  { id: 'elegant', title: 'شیک', desc: 'سربرگ مشکی' },
  { id: 'bold', title: 'پررنگ', desc: 'خطوط ضخیم' },
  { id: 'ticket', title: 'بلیطی', desc: 'لبه سوراخ‌دار' },
  { id: 'market', title: 'بازاری', desc: 'فشرده فروشگاهی' },
  { id: 'banner', title: 'بنری', desc: 'نوار مشکی پهن' },
] as const

const RECEIPT_TEMPLATE_LABELS: Record<string, string> = Object.fromEntries(
  RECEIPT_TEMPLATES.map((t) => [t.id, t.title])
)

function SectionHeader({
  title,
  description,
  action,
}: {
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h3 className="text-lg font-bold text-foreground">{title}</h3>
        {description ? (
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      {action}
    </div>
  )
}

function ServiceChannelCard({
  heading,
  hint,
  enabled,
  onEnabled,
  title,
  onTitle,
  amount,
  onAmount,
  disabled,
  titleError,
  amountError,
  icon,
}: {
  heading: string
  hint: string
  enabled: boolean
  onEnabled: (v: boolean) => void
  title: string
  onTitle: (v: string) => void
  amount: number
  onAmount: (v: number) => void
  disabled: boolean
  titleError?: string
  amountError?: string
  icon: ReactNode
}) {
  return (
    <AdminSurface
      className={cn(
        '!shadow-none',
        enabled ? 'border-primary/30 bg-primary/[0.04]' : 'bg-muted/20'
      )}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div
            className={cn(
              'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
              enabled ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'
            )}
          >
            {icon}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-foreground">{heading}</p>
            <p className="text-xs text-muted-foreground">{hint}</p>
          </div>
        </div>
        <Switch
          checked={enabled}
          onChange={onEnabled}
          disabled={disabled}
          label={enabled ? 'با هزینه' : 'بدون هزینه'}
        />
      </div>

      <label className="mb-3 block">
        <span className="mb-1.5 block text-xs font-medium text-muted-foreground">
          عنوان روی فاکتور
        </span>
        <input
          type="text"
          maxLength={80}
          disabled={disabled}
          value={title}
          onChange={(e) => onTitle(e.target.value)}
          placeholder={heading}
          className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm font-medium outline-none transition-shadow focus:ring-2 focus:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-70"
        />
        {titleError ? (
          <p className="mt-1.5 text-sm text-red-600 dark:text-red-400">{titleError}</p>
        ) : null}
      </label>

      <label className="block">
        <span className="mb-1.5 block text-xs font-medium text-muted-foreground">مبلغ</span>
        <div
          className={cn(
            'flex h-12 items-stretch overflow-hidden rounded-xl border border-border bg-background transition-shadow focus-within:ring-2 focus-within:ring-primary/30',
            disabled && 'cursor-not-allowed opacity-70'
          )}
        >
          <input
            type="number"
            min={0}
            step={1}
            disabled={disabled}
            value={amount === 0 ? '0' : String(amount)}
            onChange={(e) => {
              const raw = e.target.value
              if (raw === '') {
                onAmount(0)
                return
              }
              onAmount(Math.max(0, Math.floor(Number(raw) || 0)))
            }}
            placeholder="50000"
            className="min-w-0 flex-1 border-0 bg-transparent px-4 text-base font-bold tabular-nums outline-none disabled:cursor-not-allowed"
            dir="ltr"
          />
          <span className="flex shrink-0 items-center border-s border-border bg-muted/40 px-3 text-sm font-medium text-muted-foreground">
            ریال
          </span>
        </div>
        {amountError ? (
          <p className="mt-1.5 text-sm text-red-600 dark:text-red-400">{amountError}</p>
        ) : null}
      </label>

      <div className="mt-4 rounded-2xl border border-dashed border-border/80 bg-muted/30 px-4 py-3">
        <p className="text-[11px] font-medium text-muted-foreground">پیش‌نمایش روی فاکتور</p>
        {enabled && amount > 0 ? (
          <p className="mt-1 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
            <span className="text-sm font-bold text-foreground">
              {(title || '').trim() || heading}
            </span>
            <span className="text-base font-black tabular-nums text-primary" dir="ltr">
              {formatNumber(amount)}{' '}
              <span className="text-xs font-semibold text-muted-foreground">ریال</span>
            </span>
          </p>
        ) : (
          <p className="mt-1 text-sm text-muted-foreground">اعمال نمی‌شود</p>
        )}
      </div>
    </AdminSurface>
  )
}

function ChoiceCard({
  selected,
  title,
  desc,
  onClick,
  disabled,
  compact,
}: {
  selected: boolean
  title: string
  desc?: string
  onClick: () => void
  disabled?: boolean
  compact?: boolean
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'group relative text-right transition-all disabled:cursor-not-allowed disabled:opacity-55',
        compact ? 'rounded-xl border px-3 py-3' : 'rounded-2xl border p-4',
        selected
          ? 'border-primary bg-primary/[0.07] shadow-[0_0_0_1px_rgba(225,113,0,0.25)]'
          : 'border-border dark:border-border-dark hover:border-primary/40 hover:bg-primary/[0.03]'
      )}
    >
      {selected ? (
        <span className="absolute start-3 top-3 h-2 w-2 rounded-full bg-primary" />
      ) : null}
      <p className="font-bold text-foreground">{title}</p>
      {desc ? (
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground sm:text-sm">
          {desc}
        </p>
      ) : null}
    </button>
  )
}

function UploadTile({
  label,
  hint,
  accept,
  previewUrl,
  previewClassName,
  onFile,
  error,
}: {
  label: string
  hint: string
  accept: string
  previewUrl?: string | null
  previewClassName?: string
  onFile: (file: File) => void
  error?: string
}) {
  const [broken, setBroken] = useState(false)
  useEffect(() => {
    setBroken(false)
  }, [previewUrl])

  return (
    <div>
      <p className="mb-2 text-sm font-medium text-foreground">{label}</p>
      <label className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-background/60 px-4 py-6 transition-colors hover:border-primary/50 dark:border-border-dark dark:bg-background-dark/40">
        {previewUrl && !broken ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={previewUrl}
            src={previewUrl}
            alt={label}
            className={cn(
              'rounded-xl border border-border object-cover dark:border-border-dark',
              previewClassName || 'h-24 w-24 object-contain bg-white'
            )}
            onError={() => setBroken(true)}
          />
        ) : (
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" aria-hidden>
              <path
                d="M12 16V8m0 0l-3 3m3-3l3 3M4 16.5V18a2 2 0 002 2h12a2 2 0 002-2v-1.5"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        )}
        {previewUrl && broken ? (
          <p className="text-center text-xs text-amber-600 dark:text-amber-400">
            پیش‌نمایش لود نشد — صفحه را رفرش کنید یا دوباره آپلود کنید
          </p>
        ) : null}
        <div className="text-center">
          <p className="text-sm font-semibold text-foreground">
            انتخاب فایل
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
        </div>
        <input
          type="file"
          accept={accept}
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) onFile(file)
          }}
        />
      </label>
      {error ? (
        <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>
      ) : null}
    </div>
  )
}

export function SettingsManager() {
  const [settings, setSettings] = useState<Settings>({})
  const [baseline, setBaseline] = useState<Settings | null>(null)
  const [apiErrors, setApiErrors] = useState<Record<string, string[]>>({})
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [justSaved, setJustSaved] = useState(false)
  const [tab, setTab] = useState<SettingsTab>('brand')
  const [posTest, setPosTest] = useState<{
    ok: boolean
    busy?: boolean
    message: string
  } | null>(null)
  const queryClient = useQueryClient()
  const dirtyRef = useRef(false)
  const justSavedTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { data: settingsData, isLoading } = useQuery({
    queryKey: ['admin-settings'],
    queryFn: () => adminApi.getSettings(),
  })

  const applyServerSettings = (result: Settings, opts?: { keepLocalFiles?: boolean }) => {
    publishSettingsToCustomer(queryClient, result)
    setBaseline(stripLocalFiles(result))
    setSettings((prev) => {
      if (opts?.keepLocalFiles) {
        return {
          ...result,
          logo_file: prev.logo_file,
          logo_preview: prev.logo_preview,
          landing_background_file: prev.landing_background_file,
          landing_background_preview: prev.landing_background_preview,
        }
      }
      return stripLocalFiles(result)
    })
  }

  const updateMutation = useMutation({
    mutationFn: (data: Settings) => adminApi.updateSettings(data),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['admin-settings'] })
      queryClient.invalidateQueries({ queryKey: ['brand-theme-settings'] })
      if (response?.result) applyServerSettings(response.result)
      setApiErrors({})
      setSuccessMessage('تنظیمات با موفقیت ذخیره شد.')
      setJustSaved(true)
      if (justSavedTimer.current) clearTimeout(justSavedTimer.current)
      justSavedTimer.current = setTimeout(() => setJustSaved(false), 2200)
      setTimeout(() => setSuccessMessage(null), 4000)
    },
    onError: (error: any) => {
      const responseData = error.response?.data
      if (responseData?.messages) setApiErrors(responseData.messages)
      else {
        setApiErrors({
          general: [
            translateError(error) ||
              'خطا در به‌روزرسانی تنظیمات. لطفا دوباره تلاش کنید.',
          ],
        })
      }
    },
  })

  const patchMutation = useMutation({
    mutationFn: (data: Settings) => adminApi.patchSettings(data),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['admin-settings'] })
      queryClient.invalidateQueries({ queryKey: ['brand-theme-settings'] })
      if (response?.result) {
        publishSettingsToCustomer(queryClient, response.result)
        setBaseline((prev) =>
          prev ? { ...prev, ...stripLocalFiles(response.result) } : stripLocalFiles(response.result)
        )
      }
      setApiErrors({})
    },
    onError: (error: any) => {
      const responseData = error.response?.data
      if (responseData?.messages) setApiErrors(responseData.messages)
      else {
        setApiErrors({
          general: [
            translateError(error) ||
              'خطا در به‌روزرسانی تنظیمات. لطفا دوباره تلاش کنید.',
          ],
        })
      }
    },
  })

  const resetReceiptMutation = useMutation({
    mutationFn: () => adminApi.resetReceiptNumber(0),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['admin-settings'] })
      if (response?.result) {
        setSettings((prev) => ({ ...prev, ...response.result }))
        setBaseline((prev) =>
          prev ? { ...prev, ...stripLocalFiles(response.result) } : stripLocalFiles(response.result)
        )
      }
      setSuccessMessage('شماره فیش ریست شد. فیش بعدی از ۱ شروع می‌شود.')
      setTimeout(() => setSuccessMessage(null), 4000)
    },
    onError: (error: any) => {
      setApiErrors({
        general: [
          translateError(error) || 'خطا در ریست شماره فیش. لطفا دوباره تلاش کنید.',
        ],
      })
    },
  })

  const posTestMutation = useMutation({
    mutationFn: () =>
      dashboardApi.testPosConnection({
        pos_ip: settings.pos_ip,
        pos_port: settings.pos_port,
      }),
    onSuccess: (result) => {
      const timedOut = Boolean(result.timed_out)
      const busy = Boolean(result.busy) && !timedOut
      setPosTest({
        ok: Boolean(result.ok ?? result.success) && !busy && !timedOut,
        busy,
        message:
          result.message ||
          (timedOut
            ? 'تست اتصال زمان‌بر شد'
            : result.ok
              ? 'اتصال برقرار شد'
              : 'اتصال برقرار نشد'),
      })
    },
    onError: (error: any) => {
      setPosTest({
        ok: false,
        message:
          translateError(error) || 'خطا در بررسی اتصال کارتخوان. لطفا دوباره تلاش کنید.',
      })
    },
  })

  const posResetMutation = useMutation({
    mutationFn: () => dashboardApi.resetPosConnection(),
    onSuccess: (result) => {
      const timedOut = Boolean(result.timed_out)
      const busy = Boolean(result.busy) && !timedOut
      setPosTest({
        ok: Boolean(result.ok ?? result.success) && !busy && !timedOut,
        busy,
        message: result.message || 'اتصال DLL بازنشانی شد',
      })
    },
    onError: (error: any) => {
      setPosTest({
        ok: false,
        message:
          translateError(error) || 'خطا در بازنشانی اتصال کارتخوان. لطفا دوباره تلاش کنید.',
      })
    },
  })

  useEffect(() => {
    if (!settingsData?.result) return
    // Don't force-publish while admin is editing (would fight dirty form);
    // still seed localStorage for the customer kiosk.
    writeCachedSettings(settingsData.result)
    if (!baseline) {
      applyServerSettings(settingsData.result)
      return
    }
    if (!dirtyRef.current) {
      applyServerSettings(settingsData.result)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-sync when server payload changes
  }, [settingsData])

  useEffect(() => {
    return () => {
      if (justSavedTimer.current) clearTimeout(justSavedTimer.current)
    }
  }, [])

  const dirtyLabels = useMemo(
    () => getDirtyLabels(settings, baseline),
    [settings, baseline]
  )
  const isDirty = dirtyLabels.length > 0
  dirtyRef.current = isDirty

  const handleChange = (field: string, value: string | number | boolean) => {
    setSettings((prev) => ({ ...prev, [field]: value }))
  }

  const handleDiscard = () => {
    if (!baseline) return
    setApiErrors({})
    setSettings(stripLocalFiles(baseline))
  }

  const handleReceiptCopyModeChange = async (mode: 'single' | 'dual') => {
    const previous =
      (settings.receipt_copy_mode as 'single' | 'dual' | undefined) || 'dual'
    handleChange('receipt_copy_mode', mode)
    setApiErrors({})
    try {
      const response = await patchMutation.mutateAsync({ receipt_copy_mode: mode })
      if (response?.result) setSettings((prev) => ({ ...prev, ...response.result }))
      setSuccessMessage(
        mode === 'single'
          ? 'حالت چاپ: تک فیش'
          : 'حالت چاپ: دو فیش'
      )
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch {
      handleChange('receipt_copy_mode', previous)
    }
  }

  const handleLandingThemeChange = async (themeId: LandingThemeId) => {
    const previous = (settings.landing_theme || 'cinema') as string
    if (previous === themeId) return
    handleChange('landing_theme', themeId)
    setApiErrors({})
    try {
      const response = await patchMutation.mutateAsync({ landing_theme: themeId })
      if (response?.result) {
        setSettings((prev) => ({
          ...prev,
          ...response.result,
          landing_background_file: prev.landing_background_file,
          landing_background_preview: prev.landing_background_preview,
          logo_file: prev.logo_file,
          logo_preview: prev.logo_preview,
        }))
      }
      setSuccessMessage('تم لندینگ روی کیوسک اعمال شد.')
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch {
      handleChange('landing_theme', previous)
    }
  }

  const handleCartLayoutChange = async (layout: CartLayout) => {
    const previous = ((settings.cart_layout as CartLayout) || 'side') as CartLayout
    if (previous === layout) return
    handleChange('cart_layout', layout)
    setApiErrors({})
    try {
      const response = await patchMutation.mutateAsync({ cart_layout: layout })
      if (response?.result) setSettings((prev) => ({ ...prev, ...response.result }))
      setSuccessMessage(
        layout === 'bottom'
          ? 'سبد خرید پایین صفحه (افقی) فعال شد.'
          : 'سبد خرید کناری (عمودی) فعال شد.'
      )
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch {
      handleChange('cart_layout', previous)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setApiErrors({})
    setSuccessMessage(null)

    const data: Record<string, unknown> = {
      site_name: settings.site_name || '',
      copyright_text: settings.copyright_text || '',
      contact_phone: settings.contact_phone || '',
      description: settings.description || '',
      landing_theme: settings.landing_theme || 'cinema',
      landing_cta_text: settings.landing_cta_text || DEFAULT_LANDING_CTA,
      landing_accent_color: settings.landing_accent_color || '',
      landing_bg_color: settings.landing_bg_color || '',
      landing_text_color: settings.landing_text_color || '',
      landing_muted_color: settings.landing_muted_color || '',
      receipt_header: settings.receipt_header || '',
      receipt_footer: settings.receipt_footer || '',
      receipt_template: settings.receipt_template || 'modern',
      receipt_template_mode: settings.receipt_template_mode || 'normal',
      receipt_copy_mode: settings.receipt_copy_mode || 'dual',
      receipt_number_mode: settings.receipt_number_mode || 'manual',
      service_enabled: Boolean(settings.service_enabled),
      service_title_dine_in:
        (settings.service_title_dine_in || '').trim() || DEFAULT_SERVICE_TITLE_DINE_IN,
      service_title_takeaway:
        (settings.service_title_takeaway || '').trim() || DEFAULT_SERVICE_TITLE_TAKEAWAY,
      service_fee_dine_in_amount: Number(
        settings.service_fee_dine_in_amount ?? settings.service_fee ?? 0
      ),
      service_fee_takeaway_amount: Number(
        settings.service_fee_takeaway_amount ?? settings.service_fee ?? 0
      ),
      service_fee: Number(settings.service_fee_dine_in_amount ?? settings.service_fee ?? 0),
      service_fee_dine_in: settings.service_fee_dine_in !== false,
      service_fee_takeaway: settings.service_fee_takeaway !== false,
      packaging_enabled: Boolean(settings.packaging_enabled),
      packaging_title_dine_in:
        (settings.packaging_title_dine_in || '').trim() || DEFAULT_PACKAGING_TITLE_DINE_IN,
      packaging_title_takeaway:
        (settings.packaging_title_takeaway || '').trim() || DEFAULT_PACKAGING_TITLE_TAKEAWAY,
      packaging_fee_dine_in_amount: Number(settings.packaging_fee_dine_in_amount ?? 0),
      packaging_fee_takeaway_amount: Number(settings.packaging_fee_takeaway_amount ?? 0),
      packaging_fee_dine_in: settings.packaging_fee_dine_in !== false,
      packaging_fee_takeaway: settings.packaging_fee_takeaway !== false,
      fulfillment_choice_enabled: settings.fulfillment_choice_enabled !== false,
      dine_in_enabled: settings.dine_in_enabled !== false,
      takeaway_enabled: settings.takeaway_enabled !== false,
      pos_payment_mode: settings.pos_payment_mode === 'mock' ? 'mock' : 'real',
      mock_payment_delay: Number(settings.mock_payment_delay ?? 3),
      mock_payment_success_rate: Number(settings.mock_payment_success_rate ?? 100),
      pos_ip: settings.pos_ip || '192.168.1.102',
      pos_port: Number(settings.pos_port || 1362),
      kiosk_payment_cancel_enabled: settings.kiosk_payment_cancel_enabled === true,
      business_day_start_hour: Number(settings.business_day_start_hour ?? 7),
      business_day_start_minute: Number(settings.business_day_start_minute ?? 0),
      printer_enabled: settings.printer_enabled !== false,
      printer_ip: settings.printer_ip || '192.168.1.100',
      printer_port: Number(settings.printer_port || 9100),
    }

    if (settings.logo_file instanceof File) data.logo = settings.logo_file
    if (settings.landing_background_file instanceof File) {
      data.landing_background = settings.landing_background_file
    }

    await updateMutation.mutateAsync(data as Settings)
  }

  const activeTheme = (settings.landing_theme || 'cinema') as LandingThemeId
  const accentPreview = resolveHex(settings.landing_accent_color, DEFAULT_ACCENT)
  const bgPreviewColor = resolveHex(settings.landing_bg_color, DEFAULT_BG)
  const textPreviewColor = resolveHex(settings.landing_text_color, DEFAULT_TEXT)
  const mutedPreviewColor = resolveHex(settings.landing_muted_color, DEFAULT_MUTED)
  const serviceOn = Boolean(settings.service_enabled)
  const dineInTitle =
    settings.service_title_dine_in === undefined
      ? DEFAULT_SERVICE_TITLE_DINE_IN
      : String(settings.service_title_dine_in)
  const takeawayTitle =
    settings.service_title_takeaway === undefined
      ? DEFAULT_SERVICE_TITLE_TAKEAWAY
      : String(settings.service_title_takeaway)
  const dineInAmount = Math.max(
    0,
    Math.floor(Number(settings.service_fee_dine_in_amount ?? settings.service_fee) || 0)
  )
  const takeawayAmount = Math.max(
    0,
    Math.floor(Number(settings.service_fee_takeaway_amount ?? settings.service_fee) || 0)
  )
  const serviceDineInOn = settings.service_fee_dine_in !== false
  const serviceTakeawayOn = settings.service_fee_takeaway !== false
  const dineApplies = serviceDineInOn && dineInAmount > 0
  const takeawayApplies = serviceTakeawayOn && takeawayAmount > 0
  const serviceAppliesNowhere = serviceOn && !dineApplies && !takeawayApplies
  const packagingOn = Boolean(settings.packaging_enabled)
  const packagingDineInTitle =
    settings.packaging_title_dine_in === undefined
      ? DEFAULT_PACKAGING_TITLE_DINE_IN
      : String(settings.packaging_title_dine_in)
  const packagingTakeawayTitle =
    settings.packaging_title_takeaway === undefined
      ? DEFAULT_PACKAGING_TITLE_TAKEAWAY
      : String(settings.packaging_title_takeaway)
  const packagingDineInAmount = Math.max(
    0,
    Math.floor(Number(settings.packaging_fee_dine_in_amount) || 0)
  )
  const packagingTakeawayAmount = Math.max(
    0,
    Math.floor(Number(settings.packaging_fee_takeaway_amount) || 0)
  )
  const packagingDineInOn = settings.packaging_fee_dine_in !== false
  const packagingTakeawayOn = settings.packaging_fee_takeaway !== false
  const packagingDineApplies = packagingDineInOn && packagingDineInAmount > 0
  const packagingTakeawayApplies = packagingTakeawayOn && packagingTakeawayAmount > 0
  const packagingAppliesNowhere = packagingOn && !packagingDineApplies && !packagingTakeawayApplies
  const printerOn = settings.printer_enabled !== false
  const paymentCancelOn = settings.kiosk_payment_cancel_enabled === true
  const posMockMode = settings.pos_payment_mode === 'mock'

  const applyPalette = (palette: LandingPalette) => {
    setSettings((prev) => ({
      ...prev,
      landing_bg_color: palette.bg,
      landing_text_color: palette.text,
      landing_muted_color: palette.muted,
      landing_accent_color: palette.accent,
    }))
  }

  const resetPalette = () => {
    setSettings((prev) => ({
      ...prev,
      landing_bg_color: '',
      landing_text_color: '',
      landing_muted_color: '',
      landing_accent_color: '',
    }))
  }

  const colorMode = useThemeStore((s) => s.theme)

  // Live site-wide preview while editing palette in admin
  useEffect(() => {
    applyBrandTheme(
      {
        accent: settings.landing_accent_color,
        bg: settings.landing_bg_color,
        text: settings.landing_text_color,
        muted: settings.landing_muted_color,
      },
      { mode: colorMode === 'dark' ? 'dark' : 'light' }
    )
  }, [
    settings.landing_accent_color,
    settings.landing_bg_color,
    settings.landing_text_color,
    settings.landing_muted_color,
    colorMode,
  ])

  const logoPreview = (() => {
    // Fresh local pick (data URL) — keep as-is
    if (settings.logo_preview) return settings.logo_preview
    const raw =
      settings.logo_url ||
      (typeof settings.logo === 'string' ? settings.logo : '') ||
      ''
    if (!raw) return null
    // Absolute media URL for Tauri/desktop (relative /media breaks after remount)
    return (
      withMediaCacheBust(
        raw,
        settings.updated_at || settings.catalog_revision || settings.logo_url
      ) || raw
    )
  })()

  const bgPreview = (() => {
    if (settings.landing_background_preview) return settings.landing_background_preview
    const raw = settings.landing_background_url || ''
    if (!raw) return null
    return (
      withMediaCacheBust(
        raw,
        settings.updated_at || settings.catalog_revision || settings.landing_background_url
      ) || raw
    )
  })()

  const toast = useMemo(() => {
    if (successMessage) {
      return { tone: 'ok' as const, text: successMessage }
    }
    if (Object.keys(apiErrors).length > 0) {
      const first = Object.entries(apiErrors)[0]
      const msg = Array.isArray(first?.[1]) ? first[1].join('، ') : String(first?.[1] || '')
      return { tone: 'err' as const, text: msg || 'خطا در ذخیره تنظیمات' }
    }
    return null
  }, [successMessage, apiErrors])

  if (isLoading) {
    return (
      <div className="overflow-hidden rounded-3xl border border-border bg-card dark:border-border-dark dark:bg-card-dark">
        <div className="animate-pulse space-y-4 p-8">
          <div className="h-8 w-1/3 rounded-xl bg-gray-200 dark:bg-gray-700" />
          <div className="h-12 rounded-2xl bg-gray-200 dark:bg-gray-700" />
          <div className="h-40 rounded-2xl bg-gray-200 dark:bg-gray-700" />
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 pb-24">
      <AdminPageHeader
        title="تنظیمات فروشگاه"
        description="برند، لندینگ کیوسک، سرویس و فیش را از یکجا مدیریت کنید."
        actions={
          <div className="rounded-xl border border-border/80 bg-card px-3 py-2 text-sm shadow-sm">
            <span className="text-muted-foreground">فعال: </span>
            <span className="font-bold text-foreground">{settings.site_name || '—'}</span>
          </div>
        }
      />

      <AdminSurface padded={false}>
        <div className="p-2 sm:p-3">
          <AdminSegmented
            value={tab}
            onChange={setTab}
            options={TABS.map((t) => ({ id: t.id, label: t.label }))}
          />
        </div>
      </AdminSurface>

      {/* Toast */}
      <AnimatePresence>
        {toast ? (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className={cn(
              'flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-sm font-medium',
              toast.tone === 'ok'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-900/25 dark:text-emerald-200'
                : 'border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-900/25 dark:text-red-200'
            )}
          >
            <span>{toast.text}</span>
            <button
              type="button"
              className="opacity-70 hover:opacity-100"
              onClick={() => {
                setSuccessMessage(null)
                setApiErrors({})
              }}
            >
              بستن
            </button>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.2 }}
          className="rounded-3xl border border-border bg-card p-5 sm:p-7 dark:border-border-dark dark:bg-card-dark"
        >
          {tab === 'brand' && (
            <div className="space-y-8">
              <SectionHeader
                title="هویت برند"
                description="نام، لوگو و پالت رنگی که روی کل کیوسک و پنل ادمین اعمال می‌شود."
              />
              <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
                <div className="space-y-5">
                  <Input
                    label="نام سایت"
                    value={settings.site_name || ''}
                    onChange={(e) => handleChange('site_name', e.target.value)}
                    error={apiErrors.site_name?.[0]}
                    placeholder="نام فروشگاه"
                  />
                  <Input
                    label="متن کپی‌رایت"
                    value={settings.copyright_text || ''}
                    onChange={(e) => handleChange('copyright_text', e.target.value)}
                    error={apiErrors.copyright_text?.[0]}
                    placeholder="© تمامی حقوق محفوظ است"
                  />
                  <Input
                    label="شماره تماس"
                    type="tel"
                    value={settings.contact_phone || ''}
                    onChange={(e) => handleChange('contact_phone', e.target.value)}
                    error={apiErrors.contact_phone?.[0]}
                    placeholder="09123456789"
                  />
                </div>
                <UploadTile
                  label="لوگوی سایت و فیش"
                  hint="PNG، JPG، WebP یا SVG"
                  accept="image/*"
                  previewUrl={logoPreview}
                  onFile={(file) => {
                    const reader = new FileReader()
                    reader.onloadend = () => {
                      setSettings((prev) => ({
                        ...prev,
                        logo_file: file,
                        logo_preview: reader.result as string,
                      }))
                    }
                    reader.readAsDataURL(file)
                  }}
                  error={apiErrors.logo?.[0]}
                />
              </div>

              <div className="space-y-4 rounded-2xl border border-border/80 bg-muted/30 p-4 dark:border-border-dark/80">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-foreground">پالت رنگی سایت</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      روی منوی مشتری، لندینگ، دکمه‌ها و پنل ادمین اعمال می‌شود. پیش‌نمایش همین‌جا زنده است.
                    </p>
                  </div>
                  <Button type="button" variant="ghost" size="sm" onClick={resetPalette}>
                    بازگشت به پیش‌فرض
                  </Button>
                </div>

                <div className="flex flex-wrap gap-2">
                  {LANDING_PALETTE_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => applyPalette(preset.palette)}
                      className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold transition hover:border-primary/50 dark:border-border-dark dark:bg-card-dark"
                    >
                      <span className="flex -space-x-1 space-x-reverse">
                        {[
                          preset.palette.bg,
                          preset.palette.accent,
                          preset.palette.text,
                        ].map((c) => (
                          <span
                            key={c}
                            className="inline-block h-3.5 w-3.5 rounded-full ring-1 ring-black/10"
                            style={{ background: c }}
                          />
                        ))}
                      </span>
                      {preset.title}
                    </button>
                  ))}
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  {(
                    [
                      {
                        key: 'landing_bg_color' as const,
                        label: 'پس‌زمینه',
                        value: bgPreviewColor,
                        raw: settings.landing_bg_color || '',
                        fallback: DEFAULT_BG,
                      },
                      {
                        key: 'landing_text_color' as const,
                        label: 'متن اصلی',
                        value: textPreviewColor,
                        raw: settings.landing_text_color || '',
                        fallback: DEFAULT_TEXT,
                      },
                      {
                        key: 'landing_muted_color' as const,
                        label: 'متن ثانویه',
                        value: mutedPreviewColor,
                        raw: settings.landing_muted_color || '',
                        fallback: DEFAULT_MUTED,
                      },
                      {
                        key: 'landing_accent_color' as const,
                        label: 'رنگ اصلی (دکمه‌ها)',
                        value: accentPreview,
                        raw: settings.landing_accent_color || '',
                        fallback: DEFAULT_ACCENT,
                      },
                    ] as const
                  ).map((row) => (
                    <div key={row.key}>
                      <p className="mb-2 text-sm font-medium text-foreground">
                        {row.label}
                      </p>
                      <div className="flex items-center gap-3">
                        <input
                          type="color"
                          value={row.value}
                          onChange={(e) => handleChange(row.key, e.target.value)}
                          className="h-12 w-14 cursor-pointer rounded-xl border border-border bg-transparent p-1 dark:border-border-dark"
                        />
                        <div className="min-w-0 flex-1">
                          <Input
                            value={row.raw}
                            onChange={(e) => handleChange(row.key, e.target.value)}
                            error={apiErrors[row.key]?.[0]}
                            placeholder={row.fallback}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  <span className="rounded-xl bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground">
                    دکمه نمونه
                  </span>
                  <span className="rounded-xl border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground">
                    پس‌زمینه
                  </span>
                  <span className="rounded-xl bg-muted px-3 py-1.5 text-xs text-muted-foreground">
                    متن ثانویه
                  </span>
                </div>
              </div>
            </div>
          )}

          {tab === 'landing' && (
            <div>
              <SectionHeader
                title="صفحه لندینگ کیوسک"
                description="چیدمان صفحه خوش‌آمد. رنگ‌بندی کل سایت از تب «برند» تنظیم می‌شود."
                action={
                  <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                    اعمال آنی تم
                  </span>
                }
              />

              <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_minmax(240px,300px)] xl:items-start">
                <div className="space-y-7">
                  <div>
                    <p className="mb-3 text-sm font-medium text-foreground">
                      انتخاب تم
                    </p>
                    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                      {LANDING_THEMES.map((theme) => (
                        <LandingThemePickerThumb
                          key={theme.id}
                          theme={theme.id}
                          title={theme.title}
                          desc={theme.desc}
                          selected={activeTheme === theme.id}
                          disabled={patchMutation.isPending}
                          onSelect={() => handleLandingThemeChange(theme.id)}
                          siteName={settings.site_name || 'کیوسک'}
                          logoUrl={logoPreview}
                          tagline={settings.description}
                          ctaText={
                            settings.landing_cta_text || DEFAULT_LANDING_CTA
                          }
                          accentColor={accentPreview}
                          bgColor={bgPreviewColor}
                          textColor={textPreviewColor}
                          mutedColor={mutedPreviewColor}
                          backgroundUrl={bgPreview}
                        />
                      ))}
                    </div>
                    {apiErrors.landing_theme?.[0] ? (
                      <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                        {apiErrors.landing_theme[0]}
                      </p>
                    ) : null}
                  </div>

                  <div className="grid gap-5 sm:grid-cols-2">
                    <Input
                      label="تگ‌لاین"
                      value={settings.description || ''}
                      onChange={(e) => handleChange('description', e.target.value)}
                      error={apiErrors.description?.[0]}
                      placeholder="منوی روز منتظر شماست"
                    />
                    <Input
                      label="متن دعوت به لمس"
                      value={settings.landing_cta_text ?? DEFAULT_LANDING_CTA}
                      onChange={(e) =>
                        handleChange('landing_cta_text', e.target.value)
                      }
                      error={apiErrors.landing_cta_text?.[0]}
                      placeholder={DEFAULT_LANDING_CTA}
                    />
                  </div>

                  <UploadTile
                    label="پس‌زمینه لندینگ (تصویر)"
                    hint="اختیاری — تمام‌صفحه عمودی، JPG / PNG / WebP"
                    accept="image/jpeg,image/png,image/webp"
                    previewUrl={bgPreview}
                    previewClassName="h-28 w-20 object-cover"
                    onFile={(file) => {
                      const reader = new FileReader()
                      reader.onloadend = () => {
                        setSettings((prev) => ({
                          ...prev,
                          landing_background_file: file,
                          landing_background_preview: reader.result as string,
                        }))
                      }
                      reader.readAsDataURL(file)
                    }}
                    error={apiErrors.landing_background?.[0]}
                  />
                </div>

                {/* Real kiosk preview — same components as device */}
                <div className="mx-auto w-full max-w-[300px] xl:sticky xl:top-24 xl:mx-0">
                  <p className="mb-3 text-center text-xs font-medium text-muted-foreground">
                    پیش‌نمایش واقعی · ۱۰۸۰×۱۹۲۰
                  </p>
                  <LandingLivePreview
                    theme={activeTheme}
                    siteName={settings.site_name || 'کیوسک'}
                    logoUrl={logoPreview}
                    tagline={settings.description}
                    ctaText={settings.landing_cta_text || DEFAULT_LANDING_CTA}
                    accentColor={accentPreview}
                    bgColor={bgPreviewColor}
                    textColor={textPreviewColor}
                    mutedColor={mutedPreviewColor}
                    backgroundUrl={bgPreview}
                    caption={
                      LANDING_THEMES.find((t) => t.id === activeTheme)?.title
                    }
                  />
                </div>
              </div>
            </div>
          )}

          {tab === 'cart' && (
            <div>
              <SectionHeader
                title="چیدمان سبد خرید"
                description="محل نمایش سبد روی کیوسک را انتخاب کنید. تغییر بلافاصله روی دستگاه اعمال می‌شود (نیاز به دسترسی تغییر تنظیمات)."
                action={
                  <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                    اعمال آنی
                  </span>
                }
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <CartLayoutThumb
                  layout="side"
                  title="کناری (عمودی)"
                  description="سبد در یک‌سوم صفحه، کنار منو — مناسب لمس ایستاده و سبد بلند."
                  selected={(settings.cart_layout || 'side') === 'side'}
                  disabled={patchMutation.isPending}
                  onSelect={() => void handleCartLayoutChange('side')}
                />
                <CartLayoutThumb
                  layout="bottom"
                  title="پایین صفحه (افقی)"
                  description="نوار سبد پایین صفحه با اسکرول افقی آیتم‌ها — منوی تمام‌عرض."
                  selected={settings.cart_layout === 'bottom'}
                  disabled={patchMutation.isPending}
                  onSelect={() => void handleCartLayoutChange('bottom')}
                />
              </div>

              {apiErrors.cart_layout?.[0] ? (
                <p className="mt-3 text-sm text-red-600 dark:text-red-400">
                  {apiErrors.cart_layout[0]}
                </p>
              ) : null}

              <AdminSurface className="mt-6 !shadow-none">
                <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-foreground">انتخاب نوع سفارش</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      اگر خاموش باشد، داخل‌سالن/بیرون‌بر در سبد کیوسک اصلاً نمایش داده نمی‌شود
                    </p>
                  </div>
                  <Switch
                    checked={settings.fulfillment_choice_enabled !== false}
                    onChange={(v) => {
                      setApiErrors({})
                      handleChange('fulfillment_choice_enabled', v)
                    }}
                    label={
                      settings.fulfillment_choice_enabled !== false ? 'نمایش در کیوسک' : 'مخفی'
                    }
                  />
                </div>

                <div
                  className={cn(
                    'grid gap-3 sm:grid-cols-2',
                    settings.fulfillment_choice_enabled === false &&
                      'pointer-events-none opacity-45'
                  )}
                >
                  <div
                    className={cn(
                      'flex items-center justify-between gap-3 rounded-2xl border px-4 py-3.5',
                      settings.dine_in_enabled !== false
                        ? 'border-primary/30 bg-primary/[0.06]'
                        : 'border-border/80 bg-muted/25'
                    )}
                  >
                    <div>
                      <p className="text-sm font-bold">داخل سالن</p>
                      <p className="text-xs text-muted-foreground">گزینه حضوری برای مشتری</p>
                    </div>
                    <Switch
                      checked={settings.dine_in_enabled !== false}
                      disabled={settings.fulfillment_choice_enabled === false}
                      onChange={(v) => {
                        if (!v && settings.takeaway_enabled === false) {
                          setApiErrors({
                            dine_in_enabled: ['حداقل یکی از انواع سفارش باید فعال باشد'],
                          })
                          return
                        }
                        setApiErrors({})
                        handleChange('dine_in_enabled', v)
                      }}
                      label={settings.dine_in_enabled !== false ? 'فعال' : 'غیرفعال'}
                    />
                  </div>
                  <div
                    className={cn(
                      'flex items-center justify-between gap-3 rounded-2xl border px-4 py-3.5',
                      settings.takeaway_enabled !== false
                        ? 'border-primary/30 bg-primary/[0.06]'
                        : 'border-border/80 bg-muted/25'
                    )}
                  >
                    <div>
                      <p className="text-sm font-bold">بیرون‌بر</p>
                      <p className="text-xs text-muted-foreground">گزینه بیرون بردن برای مشتری</p>
                    </div>
                    <Switch
                      checked={settings.takeaway_enabled !== false}
                      disabled={settings.fulfillment_choice_enabled === false}
                      onChange={(v) => {
                        if (!v && settings.dine_in_enabled === false) {
                          setApiErrors({
                            takeaway_enabled: ['حداقل یکی از انواع سفارش باید فعال باشد'],
                          })
                          return
                        }
                        setApiErrors({})
                        handleChange('takeaway_enabled', v)
                      }}
                      label={settings.takeaway_enabled !== false ? 'فعال' : 'غیرفعال'}
                    />
                  </div>
                </div>
                {(apiErrors.fulfillment_choice_enabled?.[0] ||
                  apiErrors.dine_in_enabled?.[0] ||
                  apiErrors.takeaway_enabled?.[0]) && (
                  <p className="mt-3 text-sm text-red-600 dark:text-red-400">
                    {apiErrors.fulfillment_choice_enabled?.[0] ||
                      apiErrors.dine_in_enabled?.[0] ||
                      apiErrors.takeaway_enabled?.[0]}
                  </p>
                )}
              </AdminSurface>

              <AdminSurface className="mt-6 !shadow-none">
                <p className="text-sm leading-relaxed text-muted-foreground">
                  در حالت افقی، دکمه‌های «جزئیات» برای انتخاب نوع سفارش فعال و کد تخفیف باز می‌شود.
                  در حالت کناری همه کنترل‌ها همیشه در همان ستون دیده می‌شوند.
                </p>
              </AdminSurface>
            </div>
          )}

          {tab === 'service' && (
            <div>
              <SectionHeader
                title="هزینه سرویس و بسته‌بندی"
                description="عنوان و مبلغ جدا برای داخل سالن و بیرون‌بر — فقط اگر حداقل یک محصول سفارش تیک «اعمال هزینه سرویس و بسته‌بندی» داشته باشد، هر کدام یک‌بار اضافه می‌شود."
              />

              <div className="space-y-5">
                <AdminSurface
                  className={cn(
                    'overflow-hidden',
                    serviceOn
                      ? 'border-primary/25 bg-gradient-to-l from-primary/[0.07] via-card to-card'
                      : 'bg-muted/20'
                  )}
                >
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex min-w-0 items-start gap-3">
                      <div
                        className={cn(
                          'flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl',
                          serviceOn
                            ? 'bg-primary text-primary-foreground shadow-md shadow-primary/25'
                            : 'bg-muted text-muted-foreground'
                        )}
                      >
                        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" aria-hidden>
                          <path
                            d="M4 11h16v2H4v-2zm2-6h2v5H6V5zm4 0h2v5h-2V5zm4 0h2v5h-2V5zM7 15h10v1a3 3 0 01-3 3h-4a3 3 0 01-3-3v-1z"
                            fill="currentColor"
                          />
                        </svg>
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-base font-black text-foreground">
                            فعال‌سازی سرویس
                          </p>
                          <AdminStatusBadge tone={serviceOn ? 'success' : 'neutral'}>
                            {serviceOn ? 'فعال' : 'غیرفعال'}
                          </AdminStatusBadge>
                        </div>
                        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                          {serviceOn
                            ? 'عنوان و مبلغ را جداگانه برای داخل سالن و بیرون‌بر تنظیم کنید.'
                            : 'هیچ هزینه سرویسی به فاکتور اضافه نمی‌شود.'}
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={serviceOn}
                      onChange={(v) => handleChange('service_enabled', v)}
                      label={serviceOn ? 'روشن' : 'خاموش'}
                    />
                  </div>
                  {apiErrors.service_enabled?.[0] ? (
                    <p className="mt-3 text-sm text-red-600 dark:text-red-400">
                      {apiErrors.service_enabled[0]}
                    </p>
                  ) : null}
                </AdminSurface>

                <div
                  className={cn(
                    'grid gap-4 transition-opacity lg:grid-cols-2',
                    !serviceOn && 'pointer-events-none opacity-45'
                  )}
                >
                  <ServiceChannelCard
                    heading="داخل سالن"
                    hint="عنوان و مبلغ روی فاکتور حضوری"
                    enabled={serviceDineInOn}
                    onEnabled={(v) => handleChange('service_fee_dine_in', v)}
                    title={dineInTitle}
                    onTitle={(v) => handleChange('service_title_dine_in', v)}
                    amount={dineInAmount}
                    onAmount={(v) => handleChange('service_fee_dine_in_amount', v)}
                    disabled={!serviceOn}
                    titleError={apiErrors.service_title_dine_in?.[0]}
                    amountError={apiErrors.service_fee_dine_in_amount?.[0]}
                    icon={
                      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden>
                        <path
                          d="M4 10h16v9a2 2 0 01-2 2H6a2 2 0 01-2-2v-9z"
                          stroke="currentColor"
                          strokeWidth="1.7"
                        />
                        <path
                          d="M8 10V7a4 4 0 018 0v3"
                          stroke="currentColor"
                          strokeWidth="1.7"
                          strokeLinecap="round"
                        />
                      </svg>
                    }
                  />
                  <ServiceChannelCard
                    heading="بیرون‌بر"
                    hint="عنوان و مبلغ روی فاکتور بیرون‌بر"
                    enabled={serviceTakeawayOn}
                    onEnabled={(v) => handleChange('service_fee_takeaway', v)}
                    title={takeawayTitle}
                    onTitle={(v) => handleChange('service_title_takeaway', v)}
                    amount={takeawayAmount}
                    onAmount={(v) => handleChange('service_fee_takeaway_amount', v)}
                    disabled={!serviceOn}
                    titleError={apiErrors.service_title_takeaway?.[0]}
                    amountError={apiErrors.service_fee_takeaway_amount?.[0]}
                    icon={
                      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden>
                        <path
                          d="M5 8h14l-1.2 10.2A2 2 0 0115.81 20H8.19a2 2 0 01-1.99-1.8L5 8z"
                          stroke="currentColor"
                          strokeWidth="1.7"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M9 8V6.5A3 3 0 0112 3.5 3 3 0 0115 6.5V8"
                          stroke="currentColor"
                          strokeWidth="1.7"
                          strokeLinecap="round"
                        />
                      </svg>
                    }
                  />
                </div>
                {(apiErrors.service_fee_dine_in?.[0] ||
                  apiErrors.service_fee_takeaway?.[0]) && (
                  <p className="text-sm text-red-600 dark:text-red-400">
                    {apiErrors.service_fee_dine_in?.[0] ||
                      apiErrors.service_fee_takeaway?.[0]}
                  </p>
                )}

                <AdminSurface
                  className={cn(
                    '!shadow-none',
                    serviceAppliesNowhere
                      ? 'border-amber-500/30 bg-amber-500/[0.06]'
                      : 'bg-muted/20'
                  )}
                >
                  <div className="flex flex-wrap items-start gap-3">
                    <div
                      className={cn(
                        'mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl',
                        serviceAppliesNowhere
                          ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
                          : 'bg-background text-muted-foreground'
                      )}
                    >
                      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden>
                        <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.7" />
                        <path
                          d="M12 8v4.5M12 16.2h.01"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                        />
                      </svg>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-foreground">خلاصه اعمال</p>
                      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                        {!serviceOn
                          ? 'سرویس خاموش است؛ روی هیچ سفارشی اعمال نمی‌شود.'
                          : serviceAppliesNowhere
                            ? 'هشدار: برای هیچ نوع سفارشی مبلغ فعالی تنظیم نشده — سرویس عملاً اعمال نمی‌شود.'
                            : [
                                dineApplies
                                  ? `داخل سالن «${(dineInTitle || '').trim() || DEFAULT_SERVICE_TITLE_DINE_IN}» ${formatCurrency(dineInAmount)}`
                                  : null,
                                takeawayApplies
                                  ? `بیرون‌بر «${(takeawayTitle || '').trim() || DEFAULT_SERVICE_TITLE_TAKEAWAY}» ${formatCurrency(takeawayAmount)}`
                                  : null,
                              ]
                                .filter(Boolean)
                                .join(' — ') +
                              '؛ در صورت داشتن محصول مشمول یک‌بار به فاکتور اضافه می‌شود.'}
                      </p>
                      <p className="mt-2 text-xs text-muted-foreground">
                        برای هر محصول در بخش محصولات می‌توانید تیک «اعمال هزینه سرویس و بسته‌بندی» را جداگانه بزنید.
                      </p>
                    </div>
                  </div>
                </AdminSurface>

                <AdminSurface
                  className={cn(
                    'overflow-hidden',
                    packagingOn
                      ? 'border-primary/25 bg-gradient-to-l from-primary/[0.07] via-card to-card'
                      : 'bg-muted/20'
                  )}
                >
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex min-w-0 items-start gap-3">
                      <div
                        className={cn(
                          'flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl',
                          packagingOn
                            ? 'bg-primary text-primary-foreground shadow-md shadow-primary/25'
                            : 'bg-muted text-muted-foreground'
                        )}
                      >
                        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" aria-hidden>
                          <path
                            d="M4 8.5L12 4l8 4.5v7L12 20l-8-4.5v-7z"
                            stroke="currentColor"
                            strokeWidth="1.7"
                            strokeLinejoin="round"
                          />
                          <path
                            d="M12 20V12M4 8.5L12 12l8-3.5"
                            stroke="currentColor"
                            strokeWidth="1.7"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-base font-black text-foreground">
                            فعال‌سازی بسته‌بندی
                          </p>
                          <AdminStatusBadge tone={packagingOn ? 'success' : 'neutral'}>
                            {packagingOn ? 'فعال' : 'غیرفعال'}
                          </AdminStatusBadge>
                        </div>
                        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                          {packagingOn
                            ? 'عنوان و مبلغ را جداگانه برای داخل سالن و بیرون‌بر تنظیم کنید.'
                            : 'هیچ هزینه بسته‌بندی به فاکتور اضافه نمی‌شود.'}
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={packagingOn}
                      onChange={(v) => handleChange('packaging_enabled', v)}
                      label={packagingOn ? 'روشن' : 'خاموش'}
                    />
                  </div>
                  {apiErrors.packaging_enabled?.[0] ? (
                    <p className="mt-3 text-sm text-red-600 dark:text-red-400">
                      {apiErrors.packaging_enabled[0]}
                    </p>
                  ) : null}
                </AdminSurface>

                <div
                  className={cn(
                    'grid gap-4 transition-opacity lg:grid-cols-2',
                    !packagingOn && 'pointer-events-none opacity-45'
                  )}
                >
                  <ServiceChannelCard
                    heading="داخل سالن"
                    hint="عنوان و مبلغ بسته‌بندی روی فاکتور حضوری"
                    enabled={packagingDineInOn}
                    onEnabled={(v) => handleChange('packaging_fee_dine_in', v)}
                    title={packagingDineInTitle}
                    onTitle={(v) => handleChange('packaging_title_dine_in', v)}
                    amount={packagingDineInAmount}
                    onAmount={(v) => handleChange('packaging_fee_dine_in_amount', v)}
                    disabled={!packagingOn}
                    titleError={apiErrors.packaging_title_dine_in?.[0]}
                    amountError={apiErrors.packaging_fee_dine_in_amount?.[0]}
                    icon={
                      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden>
                        <path
                          d="M4 10h16v9a2 2 0 01-2 2H6a2 2 0 01-2-2v-9z"
                          stroke="currentColor"
                          strokeWidth="1.7"
                        />
                        <path
                          d="M8 10V7a4 4 0 018 0v3"
                          stroke="currentColor"
                          strokeWidth="1.7"
                          strokeLinecap="round"
                        />
                      </svg>
                    }
                  />
                  <ServiceChannelCard
                    heading="بیرون‌بر"
                    hint="عنوان و مبلغ بسته‌بندی روی فاکتور بیرون‌بر"
                    enabled={packagingTakeawayOn}
                    onEnabled={(v) => handleChange('packaging_fee_takeaway', v)}
                    title={packagingTakeawayTitle}
                    onTitle={(v) => handleChange('packaging_title_takeaway', v)}
                    amount={packagingTakeawayAmount}
                    onAmount={(v) => handleChange('packaging_fee_takeaway_amount', v)}
                    disabled={!packagingOn}
                    titleError={apiErrors.packaging_title_takeaway?.[0]}
                    amountError={apiErrors.packaging_fee_takeaway_amount?.[0]}
                    icon={
                      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden>
                        <path
                          d="M5 8h14l-1.2 10.2A2 2 0 0115.81 20H8.19a2 2 0 01-1.99-1.8L5 8z"
                          stroke="currentColor"
                          strokeWidth="1.7"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M9 8V6.5A3 3 0 0112 3.5 3 3 0 0115 6.5V8"
                          stroke="currentColor"
                          strokeWidth="1.7"
                          strokeLinecap="round"
                        />
                      </svg>
                    }
                  />
                </div>
                {(apiErrors.packaging_fee_dine_in?.[0] ||
                  apiErrors.packaging_fee_takeaway?.[0]) && (
                  <p className="text-sm text-red-600 dark:text-red-400">
                    {apiErrors.packaging_fee_dine_in?.[0] ||
                      apiErrors.packaging_fee_takeaway?.[0]}
                  </p>
                )}

                <AdminSurface
                  className={cn(
                    '!shadow-none',
                    packagingAppliesNowhere
                      ? 'border-amber-500/30 bg-amber-500/[0.06]'
                      : 'bg-muted/20'
                  )}
                >
                  <div className="flex flex-wrap items-start gap-3">
                    <div
                      className={cn(
                        'mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl',
                        packagingAppliesNowhere
                          ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
                          : 'bg-background text-muted-foreground'
                      )}
                    >
                      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden>
                        <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.7" />
                        <path
                          d="M12 8v4.5M12 16.2h.01"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                        />
                      </svg>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-foreground">خلاصه بسته‌بندی</p>
                      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                        {!packagingOn
                          ? 'بسته‌بندی خاموش است؛ روی هیچ سفارشی اعمال نمی‌شود.'
                          : packagingAppliesNowhere
                            ? 'هشدار: برای هیچ نوع سفارشی مبلغ فعالی تنظیم نشده — بسته‌بندی عملاً اعمال نمی‌شود.'
                            : [
                                packagingDineApplies
                                  ? `داخل سالن «${(packagingDineInTitle || '').trim() || DEFAULT_PACKAGING_TITLE_DINE_IN}» ${formatCurrency(packagingDineInAmount)}`
                                  : null,
                                packagingTakeawayApplies
                                  ? `بیرون‌بر «${(packagingTakeawayTitle || '').trim() || DEFAULT_PACKAGING_TITLE_TAKEAWAY}» ${formatCurrency(packagingTakeawayAmount)}`
                                  : null,
                              ]
                                .filter(Boolean)
                                .join(' — ') +
                              '؛ در صورت داشتن محصول مشمول یک‌بار به فاکتور اضافه می‌شود.'}
                      </p>
                    </div>
                  </div>
                </AdminSurface>
              </div>
            </div>
          )}

          {tab === 'receipt' && (
            <div className="space-y-6">
              <div className="grid gap-6 xl:grid-cols-[1fr_220px]">
                <div className="space-y-6">
                  {/* Copy mode */}
                  <div>
                    <SectionHeader
                      title="تعداد فیش چاپی"
                      description="بعد از پرداخت موفق — انتخاب بلافاصله ذخیره می‌شود."
                      action={
                        <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-bold text-primary">
                          ذخیره آنی
                        </span>
                      }
                    />
                    <div className="grid gap-3 sm:grid-cols-2">
                      {[
                        {
                          id: 'single' as const,
                          title: 'تک فیش',
                          desc: 'یک برگ بعد از پرداخت',
                          icon: (
                            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden>
                              <rect x="7" y="3" width="10" height="18" rx="1.5" stroke="currentColor" strokeWidth="1.7" />
                              <path d="M9.5 7h5M9.5 10h5M9.5 13h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                            </svg>
                          ),
                        },
                        {
                          id: 'dual' as const,
                          title: 'دو فیش',
                          desc: 'فاکتور مشتری + فروشنده',
                          icon: (
                            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden>
                              <rect x="4" y="4" width="9" height="16" rx="1.5" stroke="currentColor" strokeWidth="1.7" />
                              <rect x="11" y="4" width="9" height="16" rx="1.5" stroke="currentColor" strokeWidth="1.7" fill="var(--card, #fff)" />
                              <path d="M13.5 9h4M13.5 12h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                            </svg>
                          ),
                        },
                      ].map((mode) => {
                        const selected =
                          (settings.receipt_copy_mode || 'dual') === mode.id
                        return (
                          <button
                            key={mode.id}
                            type="button"
                            disabled={patchMutation.isPending}
                            onClick={() => handleReceiptCopyModeChange(mode.id)}
                            className={cn(
                              'flex items-start gap-3 rounded-2xl border p-4 text-right transition-all disabled:opacity-60',
                              selected
                                ? 'border-primary bg-primary/[0.07] shadow-[0_8px_24px_rgba(225,113,0,0.12)]'
                                : 'border-border/80 hover:border-primary/35'
                            )}
                          >
                            <span
                              className={cn(
                                'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
                                selected
                                  ? 'bg-primary text-white'
                                  : 'bg-muted text-muted-foreground'
                              )}
                            >
                              {mode.icon}
                            </span>
                            <span>
                              <span className="block font-bold text-foreground">
                                {mode.title}
                              </span>
                              <span className="mt-0.5 block text-xs text-muted-foreground">
                                {mode.desc}
                              </span>
                            </span>
                          </button>
                        )
                      })}
                    </div>
                    {apiErrors.receipt_copy_mode?.[0] ? (
                      <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                        {apiErrors.receipt_copy_mode[0]}
                      </p>
                    ) : null}
                  </div>

                  {/* Texts */}
                  <div>
                    <SectionHeader title="متن فیش" description="روی پیش‌نمایش سمت چپ زنده دیده می‌شود." />
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Input
                        label="عنوان بالای فیش"
                        value={settings.receipt_header || ''}
                        onChange={(e) => handleChange('receipt_header', e.target.value)}
                        error={apiErrors.receipt_header?.[0]}
                        placeholder="مثلاً نانوایی ستاره سرخ"
                      />
                      <Input
                        label="متن پایین فیش"
                        value={settings.receipt_footer || ''}
                        onChange={(e) => handleChange('receipt_footer', e.target.value)}
                        error={apiErrors.receipt_footer?.[0]}
                        placeholder="ممنون از خرید شما"
                      />
                    </div>
                  </div>

                  {/* Template mode */}
                  <div>
                    <SectionHeader title="حالت طرح" />
                    <div className="inline-flex w-full max-w-md rounded-2xl border border-border/80 bg-muted/40 p-1">
                      {[
                        { id: 'normal', title: 'ثابت', desc: 'همیشه همان طرح' },
                        { id: 'random', title: 'چرخش روزانه', desc: 'هر روز یک طرح' },
                      ].map((mode) => {
                        const selected =
                          (settings.receipt_template_mode || 'normal') === mode.id
                        return (
                          <button
                            key={mode.id}
                            type="button"
                            onClick={() =>
                              handleChange('receipt_template_mode', mode.id)
                            }
                            className={cn(
                              'flex-1 rounded-xl px-3 py-2.5 text-center transition-all',
                              selected
                                ? 'bg-card text-foreground shadow-sm'
                                : 'text-muted-foreground hover:text-foreground'
                            )}
                          >
                            <span className="block text-sm font-bold">{mode.title}</span>
                            <span className="mt-0.5 block text-[11px] opacity-70">
                              {mode.desc}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                    {apiErrors.receipt_template_mode?.[0] ? (
                      <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                        {apiErrors.receipt_template_mode[0]}
                      </p>
                    ) : null}
                  </div>

                  {/* Templates gallery */}
                  <div>
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                      <p className="text-sm font-bold text-foreground">گالری طرح فیش</p>
                      {(settings.receipt_template_mode || 'normal') === 'random' && (
                        <span className="rounded-full bg-amber-500/15 px-2.5 py-0.5 text-[11px] font-semibold text-amber-800 dark:text-amber-200">
                          امروز:{' '}
                          {RECEIPT_TEMPLATE_LABELS[
                            settings.active_receipt_template || ''
                          ] ||
                            settings.active_receipt_template ||
                            '—'}
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      {RECEIPT_TEMPLATES.map((tpl) => {
                        const isRandom =
                          (settings.receipt_template_mode || 'normal') === 'random'
                        const selected = isRandom
                          ? (settings.active_receipt_template || '') === tpl.id
                          : (settings.receipt_template || 'modern') === tpl.id
                        return (
                          <button
                            key={tpl.id}
                            type="button"
                            disabled={isRandom}
                            onClick={() => {
                              if (!isRandom) handleChange('receipt_template', tpl.id)
                            }}
                            className={cn(
                              'group overflow-hidden rounded-2xl border text-right transition-all disabled:cursor-not-allowed disabled:opacity-55',
                              selected
                                ? 'border-primary shadow-[0_10px_28px_rgba(225,113,0,0.16)] ring-2 ring-primary/25'
                                : 'border-border/80 hover:border-primary/40'
                            )}
                          >
                            <div className="aspect-[3/4] bg-[#ebe6df] p-2.5">
                              <div className="h-full overflow-hidden rounded-md shadow-sm ring-1 ring-black/5">
                                <ReceiptTemplateThumb template={tpl.id} />
                              </div>
                            </div>
                            <div className="border-t border-border/60 px-2.5 py-2">
                              <p className="text-sm font-bold text-foreground">
                                {tpl.title}
                              </p>
                              <p className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground">
                                {tpl.desc}
                              </p>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                    {apiErrors.receipt_template?.[0] ? (
                      <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                        {apiErrors.receipt_template[0]}
                      </p>
                    ) : null}
                  </div>

                  {/* Number mode */}
                  <div>
                    <SectionHeader title="شماره‌گذاری فیش" />
                    <div className="grid gap-3 sm:grid-cols-2">
                      {[
                        {
                          id: 'manual',
                          title: 'دستی',
                          desc: 'ادامه تا ریست دستی',
                        },
                        {
                          id: 'automatic',
                          title: 'اتوماتیک روزانه',
                          desc: 'از نیمه‌شب از ۱',
                        },
                      ].map((mode) => {
                        const selected =
                          (settings.receipt_number_mode || 'manual') === mode.id
                        return (
                          <button
                            key={mode.id}
                            type="button"
                            onClick={() =>
                              handleChange('receipt_number_mode', mode.id)
                            }
                            className={cn(
                              'rounded-2xl border p-4 text-right transition-all',
                              selected
                                ? 'border-primary bg-primary/[0.06]'
                                : 'border-border/80 hover:border-primary/35'
                            )}
                          >
                            <p className="font-bold text-foreground">{mode.title}</p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {mode.desc}
                            </p>
                          </button>
                        )
                      })}
                    </div>
                    {apiErrors.receipt_number_mode?.[0] ? (
                      <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                        {apiErrors.receipt_number_mode[0]}
                      </p>
                    ) : null}

                    <div className="mt-4 overflow-hidden rounded-2xl border border-border/80 bg-gradient-to-l from-primary/[0.07] to-transparent">
                      <div className="flex flex-wrap items-center justify-between gap-4 p-4 sm:p-5">
                        <div className="flex items-center gap-4">
                          <div className="flex h-14 w-14 flex-col items-center justify-center rounded-2xl bg-primary text-white shadow-lg shadow-primary/25">
                            <span className="text-[10px] font-medium opacity-80">
                              بعدی
                            </span>
                            <span className="text-lg font-black leading-none">
                              {formatNumber(
                                settings.next_receipt_number ??
                                  (settings.last_receipt_number ?? 0) + 1
                              )}
                            </span>
                          </div>
                          <div>
                            <p className="text-sm font-bold text-foreground">
                              شمارنده فیش
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              آخرین چاپ‌شده:{' '}
                              <span className="font-semibold text-foreground">
                                {formatNumber(settings.last_receipt_number ?? 0)}
                              </span>
                            </p>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          isLoading={resetReceiptMutation.isPending}
                          onClick={() => {
                            const confirmed = window.confirm(
                              'آیا مطمئن هستید؟ شماره فیش ریست می‌شود و فیش بعدی از ۱ شروع می‌شود.'
                            )
                            if (confirmed) resetReceiptMutation.mutate()
                          }}
                        >
                          ریست شمارنده
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Sticky-ish live preview */}
                <div className="xl:sticky xl:top-24 xl:self-start">
                  <p className="mb-3 text-center text-xs font-medium text-muted-foreground">
                    پیش‌نمایش فیش
                  </p>
                  <ReceiptLivePreview
                    template={
                      (settings.receipt_template_mode || 'normal') === 'random'
                        ? settings.active_receipt_template ||
                          settings.receipt_template ||
                          'modern'
                        : settings.receipt_template || 'modern'
                    }
                    header={settings.receipt_header}
                    footer={settings.receipt_footer}
                    siteName={settings.site_name}
                    nextNumber={
                      settings.next_receipt_number ??
                      (settings.last_receipt_number ?? 0) + 1
                    }
                    copyMode={settings.receipt_copy_mode || 'dual'}
                  />
                  <p className="mt-3 text-center text-[11px] text-muted-foreground">
                    {
                      RECEIPT_TEMPLATE_LABELS[
                        ((settings.receipt_template_mode || 'normal') === 'random'
                          ? settings.active_receipt_template
                          : settings.receipt_template) || 'modern'
                      ]
                    }
                  </p>
                </div>
              </div>
            </div>
          )}

          {tab === 'reports' && (
            <div className="space-y-8">
              <SectionHeader
                title="گزارشات"
                description="مرز روز کاری برای گزارش فروش (presetها) و ربات بله. بعد از ذخیره برای همه گزارش‌ها اعمال می‌شود."
              />

              <AdminSurface className="overflow-hidden p-0">
                <div className="border-b border-border/70 bg-gradient-to-l from-primary/[0.08] via-card to-card px-5 py-5 sm:px-6">
                  <div className="flex flex-wrap items-end justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">شروع روز کاری</p>
                      <p className="mt-1 text-3xl font-black tracking-wide text-primary">
                        {toPersianDigits(
                          timeFromParts(
                            settings.business_day_start_hour,
                            settings.business_day_start_minute
                          )
                        )}
                      </p>
                    </div>
                    <AdminStatusBadge tone="neutral">Asia/Tehran</AdminStatusBadge>
                  </div>
                  <p className="mt-3 text-sm text-muted-foreground">
                    هر «روز» از این ساعت تا همین ساعت روز بعد حساب می‌شود.
                  </p>
                </div>

                <div className="space-y-5 p-5 sm:p-6">
                  <TimePicker
                    label="ساعت شروع روز کاری"
                    value={timeFromParts(
                      settings.business_day_start_hour,
                      settings.business_day_start_minute
                    )}
                    minuteStep={5}
                    onChange={(value) => {
                      const { hour, minute } = partsFromTime(value)
                      handleChange('business_day_start_hour', hour)
                      handleChange('business_day_start_minute', minute)
                    }}
                  />

                  <div className="rounded-2xl border border-dashed border-border/80 bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
                    مثال: اگر{' '}
                    <span className="font-bold text-foreground">
                      {toPersianDigits(
                        timeFromParts(
                          settings.business_day_start_hour,
                          settings.business_day_start_minute
                        )
                      )}
                    </span>{' '}
                    باشد، گزارش «امروز» از همین ساعت تا فردا همین ساعت است.
                  </div>

                  {apiErrors.business_day_start_hour?.[0] ? (
                    <p className="text-sm text-red-600 dark:text-red-400">
                      {apiErrors.business_day_start_hour[0]}
                    </p>
                  ) : null}
                  {apiErrors.business_day_start_minute?.[0] ? (
                    <p className="text-sm text-red-600 dark:text-red-400">
                      {apiErrors.business_day_start_minute[0]}
                    </p>
                  ) : null}
                </div>
              </AdminSurface>
            </div>
          )}

          {tab === 'hardware' && (
            <div className="space-y-8">
              <SectionHeader
                title="سخت‌افزار کیوسک"
                description="حالت پرداخت، آدرس کارتخوان و پرینتر فیش. پس از ذخیره، تراکنش‌های بعدی از همین مقادیر استفاده می‌کنند."
              />

              <AdminSurface className="space-y-5">
                <SectionHeader
                  title="حالت پرداخت"
                  description="در حالت آزمایشی مبلغ به کارتخوان واقعی ارسال نمی‌شود؛ برای تست منو و چاپ مناسب است."
                />
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <AdminSegmented
                    value={posMockMode ? 'mock' : 'real'}
                    onChange={(v) => handleChange('pos_payment_mode', v)}
                    options={[
                      { id: 'real', label: 'واقعی (کارتخوان)' },
                      { id: 'mock', label: 'آزمایشی (Mock)' },
                    ]}
                  />
                  {posMockMode ? (
                    <AdminStatusBadge tone="warning">بدون POS واقعی</AdminStatusBadge>
                  ) : (
                    <AdminStatusBadge tone="success">ارسال به دستگاه</AdminStatusBadge>
                  )}
                </div>
                {apiErrors.pos_payment_mode?.[0] ? (
                  <p className="text-sm text-red-600 dark:text-red-400">
                    {apiErrors.pos_payment_mode[0]}
                  </p>
                ) : null}
                <div
                  className={cn(
                    'grid gap-4 sm:grid-cols-2 transition-opacity',
                    !posMockMode && 'pointer-events-none opacity-45'
                  )}
                >
                  <Input
                    label="تأخیر شبیه‌سازی (ثانیه)"
                    type="number"
                    min={1}
                    max={60}
                    dir="ltr"
                    disabled={!posMockMode}
                    value={
                      settings.mock_payment_delay === undefined ||
                      settings.mock_payment_delay === null
                        ? ''
                        : String(settings.mock_payment_delay)
                    }
                    onChange={(e) =>
                      handleChange('mock_payment_delay', Number(e.target.value) || 3)
                    }
                    error={apiErrors.mock_payment_delay?.[0]}
                    placeholder="3"
                  />
                  <Input
                    label="نرخ موفقیت (٪)"
                    type="number"
                    min={0}
                    max={100}
                    dir="ltr"
                    disabled={!posMockMode}
                    value={
                      settings.mock_payment_success_rate === undefined ||
                      settings.mock_payment_success_rate === null
                        ? ''
                        : String(settings.mock_payment_success_rate)
                    }
                    onChange={(e) =>
                      handleChange(
                        'mock_payment_success_rate',
                        Math.min(100, Math.max(0, Number(e.target.value) || 100))
                      )
                    }
                    error={apiErrors.mock_payment_success_rate?.[0]}
                    placeholder="100"
                  />
                </div>
              </AdminSurface>

              <AdminSurface className="space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="text-base font-black text-foreground">لغو پرداخت در کیوسک</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      نمایش دکمه «لغو پرداخت» در مودال انتظار کارتخوان. پیش‌فرض خاموش است؛
                      مبلغ روی دستگاه با لغو کیوسک پاک نمی‌شود.
                    </p>
                  </div>
                  <Switch
                    checked={paymentCancelOn}
                    onChange={(v) => handleChange('kiosk_payment_cancel_enabled', v)}
                    label={paymentCancelOn ? 'فعال' : 'غیرفعال'}
                  />
                </div>
                {apiErrors.kiosk_payment_cancel_enabled?.[0] ? (
                  <p className="text-sm text-red-600 dark:text-red-400">
                    {apiErrors.kiosk_payment_cancel_enabled[0]}
                  </p>
                ) : null}
              </AdminSurface>

              <AdminSurface className="space-y-5">
                <SectionHeader
                  title="کارتخوان (POS)"
                  description={
                    posMockMode
                      ? 'در حالت آزمایشی استفاده نمی‌شود؛ برای بازگشت به پرداخت واقعی ذخیره کنید.'
                      : 'بررسی اتصال DLL را تست می‌کند. اگر کارتخوان گیر کرد، بازنشانی اتصال را بزنید؛ نیازی به ری‌استارت بک‌اند نیست.'
                  }
                  action={
                    posMockMode ? null : (
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          isLoading={posTestMutation.isPending}
                          disabled={posResetMutation.isPending}
                          onClick={() => posTestMutation.mutate()}
                        >
                          بررسی اتصال
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          isLoading={posResetMutation.isPending}
                          disabled={posTestMutation.isPending}
                          onClick={() => posResetMutation.mutate()}
                        >
                          بازنشانی اتصال
                        </Button>
                      </div>
                    )
                  }
                />
                <div
                  className={cn(
                    'grid gap-4 sm:grid-cols-2 transition-opacity',
                    posMockMode && 'pointer-events-none opacity-45'
                  )}
                >
                  <Input
                    label="آی‌پی کارتخوان"
                    dir="ltr"
                    disabled={posMockMode}
                    value={settings.pos_ip || ''}
                    onChange={(e) => {
                      setPosTest(null)
                      handleChange('pos_ip', e.target.value)
                    }}
                    error={apiErrors.pos_ip?.[0]}
                    placeholder="192.168.1.102"
                  />
                  <Input
                    label="پورت کارتخوان"
                    type="number"
                    min={1}
                    max={65535}
                    dir="ltr"
                    disabled={posMockMode}
                    value={
                      settings.pos_port === undefined || settings.pos_port === null
                        ? ''
                        : String(settings.pos_port)
                    }
                    onChange={(e) => {
                      setPosTest(null)
                      handleChange('pos_port', Number(e.target.value) || 1362)
                    }}
                    error={apiErrors.pos_port?.[0]}
                    placeholder="1362"
                  />
                </div>
                {posTest ? (
                  <p
                    className={cn(
                      'rounded-xl border px-3 py-2 text-sm font-medium',
                      posTest.busy
                        ? 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-900/25 dark:text-amber-200'
                        : posTest.ok
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-900/25 dark:text-emerald-200'
                          : 'border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-900/25 dark:text-red-200'
                    )}
                  >
                    {posTest.message}
                  </p>
                ) : null}
              </AdminSurface>

              <AdminSurface className="space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="text-base font-black text-foreground">چاپگر فیش</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      پرینتر حرارتی ESC/POS روی پورت 9100
                    </p>
                  </div>
                  <Switch
                    checked={printerOn}
                    onChange={(v) => handleChange('printer_enabled', v)}
                    label={printerOn ? 'فعال' : 'غیرفعال'}
                  />
                </div>
                {apiErrors.printer_enabled?.[0] ? (
                  <p className="text-sm text-red-600 dark:text-red-400">
                    {apiErrors.printer_enabled[0]}
                  </p>
                ) : null}
                <div
                  className={cn(
                    'grid gap-4 sm:grid-cols-2 transition-opacity',
                    !printerOn && 'pointer-events-none opacity-45'
                  )}
                >
                  <Input
                    label="آی‌پی چاپگر"
                    dir="ltr"
                    disabled={!printerOn}
                    value={settings.printer_ip || ''}
                    onChange={(e) => handleChange('printer_ip', e.target.value)}
                    error={apiErrors.printer_ip?.[0]}
                    placeholder="192.168.1.100"
                  />
                  <Input
                    label="پورت چاپگر"
                    type="number"
                    min={1}
                    max={65535}
                    dir="ltr"
                    disabled={!printerOn}
                    value={
                      settings.printer_port === undefined ||
                      settings.printer_port === null
                        ? ''
                        : String(settings.printer_port)
                    }
                    onChange={(e) =>
                      handleChange('printer_port', Number(e.target.value) || 9100)
                    }
                    error={apiErrors.printer_port?.[0]}
                    placeholder="9100"
                  />
                </div>
              </AdminSurface>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Floating save dock — only when dirty or just saved */}
      <AnimatePresence>
        {isDirty || justSaved ? (
          <motion.div
            initial={{ opacity: 0, y: 28, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 420, damping: 32 }}
            className="pointer-events-none fixed bottom-4 z-40 start-3 end-3 sm:bottom-6 sm:start-6 sm:end-6 lg:start-[calc(248px+1.5rem)]"
          >
            <div
              className={cn(
                'pointer-events-auto mx-auto flex max-w-xl items-center gap-3 rounded-2xl border px-3 py-2.5 shadow-2xl shadow-black/10 backdrop-blur-xl sm:px-4',
                justSaved && !isDirty
                  ? 'border-emerald-500/30 bg-emerald-50/95 dark:bg-emerald-950/90'
                  : 'border-border/80 bg-card/95 dark:border-border-dark dark:bg-card-dark/95'
              )}
              role="status"
              aria-live="polite"
            >
              {justSaved && !isDirty ? (
                <>
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden>
                      <path
                        d="M5 13l4 4L19 7"
                        stroke="currentColor"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-emerald-800 dark:text-emerald-200">
                      ذخیره شد
                    </p>
                    <p className="truncate text-xs text-emerald-700/80 dark:text-emerald-300/80">
                      تغییرات روی کیوسک اعمال می‌شود
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary">
                    <span className="absolute -top-0.5 -end-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-black text-white">
                      {dirtyLabels.length}
                    </span>
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden>
                      <path
                        d="M12 8v4l2.5 2.5M12 21a9 9 0 100-18 9 9 0 000 18z"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-foreground">
                      {dirtyLabels.length === 1
                        ? '۱ تغییر ذخیره‌نشده'
                        : `${dirtyLabels.length} تغییر ذخیره‌نشده`}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {dirtyLabels.slice(0, 3).join('، ')}
                      {dirtyLabels.length > 3
                        ? ` و ${dirtyLabels.length - 3} مورد دیگر`
                        : ''}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleDiscard}
                      disabled={updateMutation.isPending}
                      className="text-muted-foreground"
                      aria-label="لغو تغییرات"
                    >
                      <span className="sm:hidden">لغو</span>
                      <span className="hidden sm:inline">لغو تغییرات</span>
                    </Button>
                    <Button
                      type="submit"
                      variant="primary"
                      size="sm"
                      isLoading={updateMutation.isPending}
                      className="min-w-[6.5rem] shadow-md shadow-primary/25 sm:min-w-[7.5rem]"
                    >
                      ذخیره
                    </Button>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </form>
  )
}
