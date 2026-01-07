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

  useEffect(() => {
    if (settingsData?.result) {
      setSettings(settingsData.result)
    }
  }, [settingsData])

  const handleChange = (field: string, value: string) => {
    setSettings((prev) => ({
      ...prev,
      [field]: value,
    }))
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

            <div>
              <label className="block mb-2 text-sm font-medium text-text dark:text-text-dark">
                لوگو
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

