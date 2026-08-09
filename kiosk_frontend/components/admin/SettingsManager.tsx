'use client'

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { writeCachedSettings } from '@/lib/kiosk-persist'
import { adminApi } from '@/lib/api/admin'
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
  AdminSurface,
} from '@/components/admin/ui/primitives'
import { translateError, cn, formatNumber } from '@/lib/utils'
import type { Settings } from '@/types'
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

type SettingsTab = 'brand' | 'landing' | 'service' | 'receipt'

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
  'service_fee',
  'service_fee_dine_in',
  'service_fee_takeaway',
] as const

const DIRTY_FIELD_LABELS: Record<(typeof DIRTY_FIELDS)[number] | 'logo' | 'landing_background', string> = {
  site_name: 'نام سایت',
  copyright_text: 'کپی‌رایت',
  contact_phone: 'تماس',
  description: 'توضیحات',
  landing_cta_text: 'متن دکمه',
  landing_accent_color: 'رنگ اکسنت',
  landing_bg_color: 'رنگ پس‌زمینه',
  landing_text_color: 'رنگ متن',
  landing_muted_color: 'رنگ متن ثانویه',
  receipt_header: 'سربرگ فیش',
  receipt_footer: 'پاورقی فیش',
  receipt_template: 'قالب فیش',
  receipt_template_mode: 'حالت قالب',
  receipt_number_mode: 'شماره‌گذاری',
  service_enabled: 'سرویس',
  service_fee: 'هزینه سرویس',
  service_fee_dine_in: 'سرویس حضوری',
  service_fee_takeaway: 'سرویس بیرون‌بر',
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
    if (key === 'service_fee') {
      a = Number(a || 0)
      b = Number(b || 0)
    }
    if (key === 'service_fee_dine_in' || key === 'service_fee_takeaway') {
      a = a !== false
      b = b !== false
    }
    if (key === 'service_enabled') {
      a = Boolean(a)
      b = Boolean(b)
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
  { id: 'brand', label: 'برند', hint: 'نام، لوگو، تماس' },
  { id: 'landing', label: 'لندینگ', hint: 'تم صفحه خوش‌آمد' },
  { id: 'service', label: 'سرویس', hint: 'هزینه سرویس' },
  { id: 'receipt', label: 'فیش', hint: 'چاپ و شمارنده' },
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
  return (
    <div>
      <p className="mb-2 text-sm font-medium text-foreground">{label}</p>
      <label className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-background/60 px-4 py-6 transition-colors hover:border-primary/50 dark:border-border-dark dark:bg-background-dark/40">
        {previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={previewUrl}
            alt={label}
            className={cn(
              'rounded-xl border border-border object-cover dark:border-border-dark',
              previewClassName || 'h-24 w-24 object-contain bg-white'
            )}
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
  const queryClient = useQueryClient()
  const dirtyRef = useRef(false)
  const justSavedTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { data: settingsData, isLoading } = useQuery({
    queryKey: ['admin-settings'],
    queryFn: () => adminApi.getSettings(),
  })

  const applyServerSettings = (result: Settings, opts?: { keepLocalFiles?: boolean }) => {
    writeCachedSettings(result)
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
      queryClient.invalidateQueries({ queryKey: ['settings'] })
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
      queryClient.invalidateQueries({ queryKey: ['settings'] })
      if (response?.result) {
        writeCachedSettings(response.result)
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

  useEffect(() => {
    if (!settingsData?.result) return
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
      service_fee: Number(settings.service_fee || 0),
      service_fee_dine_in: settings.service_fee_dine_in !== false,
      service_fee_takeaway: settings.service_fee_takeaway !== false,
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

  const logoPreview =
    settings.logo_preview ||
    settings.logo_url ||
    (typeof settings.logo === 'string' ? settings.logo : '') ||
    null

  const bgPreview =
    settings.landing_background_preview ||
    settings.landing_background_url ||
    null

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
            <div>
              <SectionHeader
                title="هویت برند"
                description="نام، تماس و لوگویی که روی کیوسک و فیش دیده می‌شود."
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
            </div>
          )}

          {tab === 'landing' && (
            <div>
              <SectionHeader
                title="صفحه لندینگ کیوسک"
                description="پیش‌نمایش دقیقاً همان صفحه واقعی کیوسک عمودی است. با انتخاب تم، بلافاصله روی دستگاه اعمال می‌شود."
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

                  <AdminSurface className="!shadow-none">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="font-bold">تست A/B تم لندینگ</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          بین تم اصلی و تم B به‌صورت تصادفی تقسیم می‌شود؛ نرخ شروع در داشبورد دیده می‌شود.
                        </p>
                      </div>
                      <label className="flex items-center gap-2 text-sm font-semibold">
                        <input
                          type="checkbox"
                          checked={!!settings.landing_ab_enabled}
                          onChange={async (e) => {
                            const enabled = e.target.checked
                            handleChange('landing_ab_enabled', enabled)
                            try {
                              await patchMutation.mutateAsync({
                                landing_ab_enabled: enabled,
                              })
                            } catch {
                              handleChange('landing_ab_enabled', !enabled)
                            }
                          }}
                        />
                        فعال
                      </label>
                    </div>
                    {settings.landing_ab_enabled ? (
                      <div className="mt-4 grid gap-4 sm:grid-cols-2">
                        <div>
                          <p className="mb-2 text-sm font-medium">تم B</p>
                          <select
                            className="w-full rounded-xl border border-border bg-background px-3 py-2"
                            value={(settings.landing_theme_b as string) || 'neon'}
                            onChange={async (e) => {
                              const themeB = e.target.value
                              handleChange('landing_theme_b', themeB)
                              try {
                                await patchMutation.mutateAsync({
                                  landing_theme_b: themeB,
                                })
                              } catch {
                                /* ignore */
                              }
                            }}
                          >
                            {LANDING_THEMES.map((t) => (
                              <option key={t.id} value={t.id}>
                                {t.title}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <p className="mb-2 text-sm font-medium">
                            درصد نمایش تم A ({settings.landing_ab_split ?? 50}٪)
                          </p>
                          <input
                            type="range"
                            min={0}
                            max={100}
                            value={Number(settings.landing_ab_split ?? 50)}
                            onChange={(e) =>
                              handleChange('landing_ab_split', Number(e.target.value))
                            }
                            onMouseUp={async (e) => {
                              const split = Number((e.target as HTMLInputElement).value)
                              try {
                                await patchMutation.mutateAsync({
                                  landing_ab_split: split,
                                })
                              } catch {
                                /* ignore */
                              }
                            }}
                            className="w-full"
                          />
                        </div>
                      </div>
                    ) : null}
                  </AdminSurface>

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

                  <div className="space-y-4 rounded-2xl border border-border/80 bg-muted/30 p-4 dark:border-border-dark/80">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-bold text-foreground">پالت رنگی تم</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          رنگ‌ها روی همه تم‌ها اعمال می‌شوند و در پیش‌نمایش زنده دیده می‌شوند.
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
                            label: 'اکسنت',
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

          {tab === 'service' && (
            <div>
              <SectionHeader
                title="هزینه سرویس"
                description="فقط وقتی روی فاکتور می‌آید که حداقل یک محصول سفارش تیک سرویس داشته باشد؛ مبلغ یک‌بار به کل فاکتور اضافه می‌شود."
              />

              <div className="space-y-6">
                <div className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-background/50 px-4 py-4 dark:border-border-dark dark:bg-background-dark/40">
                  <div>
                    <p className="font-bold text-foreground">
                      فعال‌سازی سرویس
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      روشن بودن یعنی مبلغ زیر برای سفارش‌های مشمول اعمال شود.
                    </p>
                  </div>
                  <Switch
                    checked={Boolean(settings.service_enabled)}
                    onChange={(v) => handleChange('service_enabled', v)}
                    label="فعال‌سازی هزینه سرویس"
                  />
                </div>
                {apiErrors.service_enabled?.[0] ? (
                  <p className="text-sm text-red-600 dark:text-red-400">
                    {apiErrors.service_enabled[0]}
                  </p>
                ) : null}

                <Input
                  label="مبلغ سرویس (ریال)"
                  type="number"
                  min={0}
                  step={1}
                  disabled={!settings.service_enabled}
                  value={
                    settings.service_fee === undefined || settings.service_fee === null
                      ? ''
                      : String(settings.service_fee)
                  }
                  onChange={(e) => {
                    const raw = e.target.value
                    if (raw === '') {
                      handleChange('service_fee', 0)
                      return
                    }
                    handleChange('service_fee', Math.max(0, Math.floor(Number(raw) || 0)))
                  }}
                  error={apiErrors.service_fee?.[0]}
                  placeholder="مثلاً ۵۰۰۰۰"
                />
                {settings.service_enabled && Number(settings.service_fee) > 0 ? (
                  <p className="text-sm text-muted-foreground">
                    مبلغ نمایشی:{' '}
                    <span className="font-bold text-primary">
                      {formatNumber(Number(settings.service_fee))} ریال
                    </span>
                  </p>
                ) : null}

                <div
                  className={cn(
                    'grid gap-3 sm:grid-cols-2',
                    !settings.service_enabled && 'pointer-events-none opacity-45'
                  )}
                >
                  <ChoiceCard
                    selected={settings.service_fee_dine_in !== false}
                    title="داخل سالن"
                    desc="اعمال روی سفارش داخل سالن"
                    onClick={() =>
                      handleChange(
                        'service_fee_dine_in',
                        !(settings.service_fee_dine_in !== false)
                      )
                    }
                    disabled={!settings.service_enabled}
                  />
                  <ChoiceCard
                    selected={settings.service_fee_takeaway !== false}
                    title="بیرون‌بر"
                    desc="اعمال روی سفارش بیرون‌بر"
                    onClick={() =>
                      handleChange(
                        'service_fee_takeaway',
                        !(settings.service_fee_takeaway !== false)
                      )
                    }
                    disabled={!settings.service_enabled}
                  />
                </div>
                {(apiErrors.service_fee_dine_in?.[0] ||
                  apiErrors.service_fee_takeaway?.[0]) && (
                  <p className="text-sm text-red-600 dark:text-red-400">
                    {apiErrors.service_fee_dine_in?.[0] ||
                      apiErrors.service_fee_takeaway?.[0]}
                  </p>
                )}
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
