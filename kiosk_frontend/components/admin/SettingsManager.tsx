'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { adminApi } from '@/lib/api/admin'
import { Button } from '@/components/shared/Button'
import { Input } from '@/components/shared/Input'
import { translateError } from '@/lib/utils'
import type { Settings } from '@/types'

export function SettingsManager() {
  const [settings, setSettings] = useState<Settings>({})
  const [apiErrors, setApiErrors] = useState<Record<string, string[]>>({})
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const queryClient = useQueryClient()

  const { data: settingsData, isLoading } = useQuery({
    queryKey: ['admin-settings'],
    queryFn: () => adminApi.getSettings(),
  })

  const updateMutation = useMutation({
    mutationFn: (data: Settings) => adminApi.updateSettings(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-settings'] })
      queryClient.invalidateQueries({ queryKey: ['settings'] }) // برای صفحه customer
      setApiErrors({})
      setSuccessMessage('تنظیمات با موفقیت به‌روزرسانی شد.')
      // پاک کردن پیام موفقیت بعد از 5 ثانیه
      setTimeout(() => {
        setSuccessMessage(null)
      }, 5000)
    },
    onError: (error: any) => {
      const responseData = error.response?.data
      if (responseData?.messages) {
        setApiErrors(responseData.messages)
      } else {
        const errorMessage = translateError(error)
        setApiErrors({ general: [errorMessage || 'خطا در به‌روزرسانی تنظیمات. لطفا دوباره تلاش کنید.'] })
      }
    },
  })

  const patchMutation = useMutation({
    mutationFn: (data: Settings) => adminApi.patchSettings(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-settings'] })
      queryClient.invalidateQueries({ queryKey: ['settings'] }) // برای صفحه customer
      setApiErrors({})
    },
    onError: (error: any) => {
      const responseData = error.response?.data
      if (responseData?.messages) {
        setApiErrors(responseData.messages)
      } else {
        const errorMessage = translateError(error)
        setApiErrors({ general: [errorMessage || 'خطا در به‌روزرسانی تنظیمات. لطفا دوباره تلاش کنید.'] })
      }
    },
  })

  const resetReceiptMutation = useMutation({
    mutationFn: () => adminApi.resetReceiptNumber(0),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['admin-settings'] })
      if (response?.result) {
        setSettings((prev) => ({
          ...prev,
          ...response.result,
        }))
      }
      setSuccessMessage('شماره فیش با موفقیت ریست شد. فیش بعدی از ۱ شروع می‌شود.')
      setTimeout(() => setSuccessMessage(null), 5000)
    },
    onError: (error: any) => {
      const errorMessage = translateError(error)
      setApiErrors({
        general: [errorMessage || 'خطا در ریست شماره فیش. لطفا دوباره تلاش کنید.'],
      })
    },
  })

  useEffect(() => {
    if (settingsData?.result) {
      setSettings(settingsData.result)
    }
  }, [settingsData])

  const handleChange = (field: string, value: string | number | boolean) => {
    setSettings((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleReceiptCopyModeChange = async (mode: 'single' | 'dual') => {
    const previous = (settings.receipt_copy_mode as 'single' | 'dual' | undefined) || 'dual'
    handleChange('receipt_copy_mode', mode)
    setApiErrors({})
    try {
      const response = await patchMutation.mutateAsync({ receipt_copy_mode: mode })
      if (response?.result) {
        setSettings((prev) => ({ ...prev, ...response.result }))
      }
      setSuccessMessage(
        mode === 'single'
          ? 'حالت چاپ روی تک فیش ذخیره شد.'
          : 'حالت چاپ روی دو فیش ذخیره شد.'
      )
      setTimeout(() => setSuccessMessage(null), 4000)
    } catch {
      handleChange('receipt_copy_mode', previous)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setApiErrors({})
    setSuccessMessage(null)
    
    // ارسال همه فیلدها (حتی اگر خالی باشند)
    const data: any = {
      site_name: settings.site_name || '',
      copyright_text: settings.copyright_text || '',
      contact_phone: settings.contact_phone || '',
      receipt_header: settings.receipt_header || '',
      receipt_footer: settings.receipt_footer || '',
      receipt_template: settings.receipt_template || 'modern',
      receipt_template_mode: settings.receipt_template_mode || 'normal',
      receipt_copy_mode: settings.receipt_copy_mode || 'dual',
      receipt_number_mode: settings.receipt_number_mode || 'manual',
      service_enabled: Boolean(settings.service_enabled),
      service_fee: Number(settings.service_fee || 0),
    }
    
    // Add logo if it's a File (اگر لوگو جدید انتخاب شده)
    if (settings.logo_file instanceof File) {
      data.logo = settings.logo_file
    }
    // اگر لوگو از قبل وجود دارد و فایل جدید انتخاب نشده، لوگوی موجود را نگه دار
    // (backend باید لوگوی موجود را نگه دارد اگر فایل جدید ارسال نشود)
    
    await updateMutation.mutateAsync(data)
  }


  if (isLoading) {
    return (
      <div className="bg-card dark:bg-card-dark rounded-2xl p-8 border border-border dark:border-border-dark">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
          <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
          <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-text dark:text-text-dark">
          تنظیمات سایت
        </h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card dark:bg-card-dark rounded-2xl p-6 border border-border dark:border-border-dark"
        >
          <h3 className="text-xl font-bold text-text dark:text-text-dark mb-6">
            اطلاعات عمومی
          </h3>

          {/* نمایش پیام موفقیت */}
          {successMessage && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-green-800 dark:text-green-200">
                  {successMessage}
                </p>
                <button
                  onClick={() => setSuccessMessage(null)}
                  className="text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-200"
                >
                  ✕
                </button>
              </div>
            </div>
          )}

          {/* نمایش ارورهای کلی API */}
          {Object.keys(apiErrors).length > 0 && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
              <p className="text-sm font-medium text-red-800 dark:text-red-200 mb-2">
                خطاهای اعتبارسنجی:
              </p>
              <ul className="list-disc list-inside space-y-1">
                {Object.entries(apiErrors).map(([field, messages]) => (
                  <li key={field} className="text-sm text-red-700 dark:text-red-300">
                    {Array.isArray(messages) ? messages.join(', ') : messages}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="space-y-6">
            <Input
              label="نام سایت"
              value={settings.site_name || ''}
              onChange={(e) => handleChange('site_name', e.target.value)}
              error={apiErrors.site_name?.[0]}
              placeholder="نام سایت را وارد کنید"
            />

            <Input
              label="متن کپی‌رایت"
              value={settings.copyright_text || ''}
              onChange={(e) => handleChange('copyright_text', e.target.value)}
              error={apiErrors.copyright_text?.[0]}
              placeholder="متن کپی‌رایت را وارد کنید"
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
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.03 }}
          className="bg-card dark:bg-card-dark rounded-2xl p-6 border border-border dark:border-border-dark"
        >
          <h3 className="text-xl font-bold text-text dark:text-text-dark mb-2">
            سرویس
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            مبلغ سرویس را اینجا مشخص کنید. اعمال روی فاکتور فقط وقتی است که حداقل یک محصول سفارش تیک «اعمال هزینه سرویس» داشته باشد؛ در آن صورت مبلغ یک‌بار به کل فاکتور اضافه می‌شود.
          </p>

          <div className="space-y-4">
            <label className="flex items-start gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={Boolean(settings.service_enabled)}
                onChange={(e) => handleChange('service_enabled', e.target.checked)}
                className="mt-1 h-5 w-5 rounded border-border text-primary focus:ring-primary"
              />
              <span>
                <span className="block font-medium text-text dark:text-text-dark">
                  فعال‌سازی هزینه سرویس
                </span>
                <span className="block text-sm text-gray-500 dark:text-gray-400 mt-1">
                  با روشن بودن، مبلغ زیر برای سفارش‌هایی که محصول مشمول سرویس دارند یک‌بار اعمال می‌شود.
                </span>
              </span>
            </label>
            {apiErrors.service_enabled?.[0] && (
              <p className="text-sm text-red-600 dark:text-red-400">
                {apiErrors.service_enabled[0]}
              </p>
            )}

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
                const n = Math.max(0, Math.floor(Number(raw) || 0))
                handleChange('service_fee', n)
              }}
              error={apiErrors.service_fee?.[0]}
              placeholder="مثلاً 50000"
            />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.04 }}
          className="bg-card dark:bg-card-dark rounded-2xl p-6 border border-border dark:border-border-dark"
        >
          <h3 className="text-xl font-bold text-text dark:text-text-dark mb-2">
            تعداد فیش چاپی
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            بعد از پرداخت موفق، چند برگ فیش چاپ شود؟ انتخاب بلافاصله ذخیره می‌شود.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              {
                id: 'single' as const,
                title: 'تک فیش',
                desc: 'فقط یک برگ فیش چاپ می‌شود.',
              },
              {
                id: 'dual' as const,
                title: 'دو فیش',
                desc: 'فاکتور مشتری و فاکتور فروشنده جداگانه چاپ می‌شوند.',
              },
            ].map((mode) => {
              const selected = (settings.receipt_copy_mode || 'dual') === mode.id
              return (
                <button
                  key={mode.id}
                  type="button"
                  disabled={patchMutation.isPending}
                  onClick={() => handleReceiptCopyModeChange(mode.id)}
                  className={`text-right rounded-xl border p-4 transition-colors disabled:opacity-60 ${
                    selected
                      ? 'border-primary bg-primary/5 ring-2 ring-primary/30'
                      : 'border-border dark:border-border-dark hover:border-primary/40'
                  }`}
                >
                  <p className="font-bold text-text dark:text-text-dark">{mode.title}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{mode.desc}</p>
                </button>
              )
            })}
          </div>
          {apiErrors.receipt_copy_mode?.[0] && (
            <p className="mt-3 text-sm text-red-600 dark:text-red-400">
              {apiErrors.receipt_copy_mode[0]}
            </p>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-card dark:bg-card-dark rounded-2xl p-6 border border-border dark:border-border-dark"
        >
          <h3 className="text-xl font-bold text-text dark:text-text-dark mb-2">
            متن فیش چاپی
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            عنوان، متن پایین و نوع طرح چاپ فیش را تنظیم کنید.
          </p>

          <div className="space-y-6">
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

            <div>
              <label className="block mb-3 text-sm font-medium text-text dark:text-text-dark">
                حالت نوع فیش
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                {[
                  {
                    id: 'normal',
                    title: 'عادی',
                    desc: 'یک طرح را انتخاب می‌کنید و همان همیشه چاپ می‌شود.',
                  },
                  {
                    id: 'random',
                    title: 'رندوم',
                    desc: 'هر روز به‌صورت خودکار نوع فیش عوض می‌شود.',
                  },
                ].map((mode) => {
                  const selected = (settings.receipt_template_mode || 'normal') === mode.id
                  return (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => handleChange('receipt_template_mode', mode.id)}
                      className={`text-right rounded-xl border p-4 transition-colors ${
                        selected
                          ? 'border-primary bg-primary/5 ring-2 ring-primary/30'
                          : 'border-border dark:border-border-dark hover:border-primary/40'
                      }`}
                    >
                      <p className="font-bold text-text dark:text-text-dark">{mode.title}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{mode.desc}</p>
                    </button>
                  )
                })}
              </div>
              {apiErrors.receipt_template_mode?.[0] && (
                <p className="mb-3 text-sm text-red-600 dark:text-red-400">
                  {apiErrors.receipt_template_mode[0]}
                </p>
              )}

              <label className="block mb-3 text-sm font-medium text-text dark:text-text-dark">
                نوع فیش
                {(settings.receipt_template_mode || 'normal') === 'random' && (
                  <span className="mr-2 font-normal text-gray-500 dark:text-gray-400">
                    (امروز:{' '}
                    {{
                      modern: 'مدرن',
                      classic: 'کلاسیک',
                      minimal: 'ساده',
                      elegant: 'شیک',
                      bold: 'پررنگ',
                      ticket: 'بلیطی',
                      market: 'بازاری',
                      banner: 'بنری',
                    }[settings.active_receipt_template || ''] ||
                      settings.active_receipt_template ||
                      '—'}
                    )
                  </span>
                )}
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  {
                    id: 'modern',
                    title: 'مدرن',
                    desc: 'شماره فیش بزرگ در مرکز + نوار مشکی مبلغ',
                  },
                  {
                    id: 'classic',
                    title: 'کلاسیک',
                    desc: 'فاکتور جدولی با سرستون مشکی و شماره بالای ساعت',
                  },
                  {
                    id: 'minimal',
                    title: 'ساده',
                    desc: 'چیدمان خلوت فارسی با برچسب تعداد و مبلغ',
                  },
                  {
                    id: 'elegant',
                    title: 'شیک',
                    desc: 'سربرگ مشکی + آیتم‌های راست‌چین و کادر دوطبقه مبلغ',
                  },
                  {
                    id: 'bold',
                    title: 'پررنگ',
                    desc: 'خطوط خیلی ضخیم + شماره برجسته + نوار تمام‌عرض مبلغ',
                  },
                  {
                    id: 'ticket',
                    title: 'بلیطی',
                    desc: 'لبه سوراخ‌دار مثل بلیط نوبت',
                  },
                  {
                    id: 'market',
                    title: 'بازاری',
                    desc: 'فاکتور فشرده فروشگاهی با ستون کالا / تعداد / مبلغ',
                  },
                  {
                    id: 'banner',
                    title: 'بنری',
                    desc: 'سر و ته نوار مشکی پهن + ردیف‌های راه‌راه',
                  },
                ].map((tpl) => {
                  const isRandom = (settings.receipt_template_mode || 'normal') === 'random'
                  const selected = isRandom
                    ? (settings.active_receipt_template || '') === tpl.id
                    : (settings.receipt_template || 'modern') === tpl.id
                  return (
                    <button
                      key={tpl.id}
                      type="button"
                      disabled={isRandom}
                      onClick={() => {
                        if (!isRandom) {
                          handleChange('receipt_template', tpl.id)
                        }
                      }}
                      className={`text-right rounded-xl border p-4 transition-colors ${
                        selected
                          ? 'border-primary bg-primary/5 ring-2 ring-primary/30'
                          : 'border-border dark:border-border-dark hover:border-primary/40'
                      } ${isRandom ? 'opacity-70 cursor-not-allowed' : ''}`}
                    >
                      <p className="font-bold text-text dark:text-text-dark">{tpl.title}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{tpl.desc}</p>
                    </button>
                  )
                })}
              </div>
              {apiErrors.receipt_template?.[0] && (
                <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                  {apiErrors.receipt_template[0]}
                </p>
              )}
            </div>

            <div className="rounded-xl border border-border dark:border-border-dark p-4 space-y-4">
              <div>
                <p className="text-sm font-medium text-text dark:text-text-dark mb-3">
                  حالت شماره فیش
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    {
                      id: 'manual',
                      title: 'دستی',
                      desc: 'شماره ادامه پیدا می‌کند تا خودتان ریست کنید و از ۱ شروع شود.',
                    },
                    {
                      id: 'automatic',
                      title: 'اتوماتیک',
                      desc: 'با عوض شدن روز (از نیمه‌شب به وقت تهران) دوباره از ۱ شروع می‌شود.',
                    },
                  ].map((mode) => {
                    const selected = (settings.receipt_number_mode || 'manual') === mode.id
                    return (
                      <button
                        key={mode.id}
                        type="button"
                        onClick={() => handleChange('receipt_number_mode', mode.id)}
                        className={`text-right rounded-xl border p-4 transition-colors ${
                          selected
                            ? 'border-primary bg-primary/5 ring-2 ring-primary/30'
                            : 'border-border dark:border-border-dark hover:border-primary/40'
                        }`}
                      >
                        <p className="font-bold text-text dark:text-text-dark">{mode.title}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{mode.desc}</p>
                      </button>
                    )
                  })}
                </div>
                {apiErrors.receipt_number_mode?.[0] && (
                  <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                    {apiErrors.receipt_number_mode[0]}
                  </p>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-border dark:border-border-dark">
                <div>
                  <p className="text-sm font-medium text-text dark:text-text-dark">
                    شمارنده فعلی
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    آخرین شماره: {settings.last_receipt_number ?? 0} — فیش بعدی:{' '}
                    {settings.next_receipt_number ?? (settings.last_receipt_number ?? 0) + 1}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  isLoading={resetReceiptMutation.isPending}
                  onClick={() => {
                    const confirmed = window.confirm(
                      'آیا مطمئن هستید؟ شماره فیش ریست می‌شود و فیش بعدی از ۱ شروع می‌شود.'
                    )
                    if (confirmed) {
                      resetReceiptMutation.mutate()
                    }
                  }}
                >
                  ریست شماره فیش
                </Button>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-card dark:bg-card-dark rounded-2xl p-6 border border-border dark:border-border-dark"
        >
          <h3 className="text-xl font-bold text-text dark:text-text-dark mb-2">
            لوگوی سایت و فیش
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            این لوگو در سایت نمایش داده می‌شود.
          </p>

          <div className="space-y-6">
            <div>
              <label className="block mb-2 text-sm font-medium text-text dark:text-text-dark">
                آپلود لوگو
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) {
                    // Create preview
                    const reader = new FileReader()
                    reader.onloadend = () => {
                      setSettings((prev) => ({
                        ...prev,
                        logo_file: file,
                        logo_preview: reader.result as string,
                      }))
                    }
                    reader.readAsDataURL(file)
                  }
                }}
                className="w-full px-4 py-3 rounded-lg border border-border dark:border-border-dark bg-card dark:bg-card-dark text-text dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary"
              />
              {(settings.logo || settings.logo_preview) && (
                <div className="mt-4">
                  <img
                    src={settings.logo_preview || settings.logo || ''}
                    alt="لوگو فعلی"
                    className="w-32 h-32 object-contain rounded-lg border border-border dark:border-border-dark"
                  />
                </div>
              )}
              {apiErrors.logo?.[0] && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                  {apiErrors.logo[0]}
                </p>
              )}
            </div>
          </div>

          <div className="flex gap-4 mt-6">
            <Button
              type="submit"
              variant="primary"
              isLoading={updateMutation.isPending}
            >
              ذخیره تغییرات
            </Button>
          </div>
        </motion.div>
      </form>
    </div>
  )
}

