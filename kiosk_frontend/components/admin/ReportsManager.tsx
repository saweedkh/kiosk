'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  reportsApi,
  SALES_PRESET_LABELS,
  formatReportDateTime,
  type SalesPreset,
  type ReportBreakdown,
} from '@/lib/api/reports'
import { adminApi } from '@/lib/api/admin'
import { ordersApi } from '@/lib/api/orders'
import { Button } from '@/components/shared/Button'
import { DatePicker } from '@/components/admin/DatePicker'
import { OrderDetailsDialog } from '@/components/admin/OrderDetailsDialog'
import { DragScrollArea } from '@/components/shared/DragScrollArea'
import {
  AdminPageHeader,
  AdminSegmented,
  AdminSurface,
} from '@/components/admin/ui/primitives'
import { formatCurrency, formatNumber, toEnglishDigits } from '@/lib/utils'
import { formatJalaliDate, formatJalaliDateTime, getTodayJalali, convertJalaliToMiladi } from '@/lib/utils/date'
import moment from 'moment-jalaali'
import type { SalesReport, ProductReport, StockReport, DailyReport, HourlyReport } from '@/lib/api/reports'
import { useAuthStore } from '@/lib/store/auth-store'
import { hasPermission } from '@/lib/auth/permissions'

export function ReportsManager() {
  const { user } = useAuthStore()
  const canReprint = hasPermission(user, 'view_orders')
  const canEditStatus = hasPermission(user, 'change_orders')
  const canViewDetails =
    hasPermission(user, 'view_orders') || hasPermission(user, 'view_reports')
  const [activeReport, setActiveReport] = useState<
    'sales' | 'products' | 'stock' | 'daily' | 'hourly' | 'exceptions'
  >('sales')
  const [salesPreset, setSalesPreset] = useState<SalesPreset | ''>('')
  const [exportMessage, setExportMessage] = useState<string | null>(null)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [dailyDate, setDailyDate] = useState(getTodayJalali())
  const [businessDayStartHour, setBusinessDayStartHour] = useState('7')
  const [businessDayStartMinute, setBusinessDayStartMinute] = useState('0')
  const [detailsOrderId, setDetailsOrderId] = useState<number | null>(null)
  const [detailsOrderNumber, setDetailsOrderNumber] = useState('')
  
  // Pagination states for each report
  const [salesPage, setSalesPage] = useState(1)
  const [productsPage, setProductsPage] = useState(1)
  const [stockPage, setStockPage] = useState(1)
  const [dailyPage, setDailyPage] = useState(1)
  const [hourlyPage, setHourlyPage] = useState(1)
  const [pageSize] = useState(20) // Items per page

  const { data: adminSettingsData } = useQuery({
    queryKey: ['admin-settings-business-day'],
    queryFn: () => adminApi.getSettings(),
    staleTime: 60_000,
  })

  useEffect(() => {
    const hour = adminSettingsData?.result?.business_day_start_hour
    const minute = adminSettingsData?.result?.business_day_start_minute
    if (hour !== undefined && hour !== null && !Number.isNaN(Number(hour))) {
      setBusinessDayStartHour(String(hour))
    }
    if (minute !== undefined && minute !== null && !Number.isNaN(Number(minute))) {
      setBusinessDayStartMinute(String(minute))
    }
  }, [
    adminSettingsData?.result?.business_day_start_hour,
    adminSettingsData?.result?.business_day_start_minute,
  ])

  const businessDayStartParams = {
    business_day_start_hour: Number(businessDayStartHour),
    business_day_start_minute: Number(businessDayStartMinute),
  }

  const businessDayStartLabel = `${businessDayStartHour.padStart(2, '0')}:${businessDayStartMinute.padStart(2, '0')}`

  // بررسی validation تاریخ‌ها
  const isDateRangeValid = (): boolean => {
    if (!startDate || !endDate) return true // اگر یکی از تاریخ‌ها خالی باشد， validation نداریم
    try {
      const start = toEnglishDigits(startDate)
      const end = toEnglishDigits(endDate)
      if (start && end) {
        // استفاده از moment-jalaali برای مقایسه دقیق
        const startMoment = moment(start, 'jYYYY/jMM/jDD')
        const endMoment = moment(end, 'jYYYY/jMM/jDD')
        
        if (!startMoment.isValid() || !endMoment.isValid()) {
          return false
        }
        
        // تاریخ پایان باید بزرگ‌تر باشد
        return endMoment.isAfter(startMoment)
      }
    } catch (error) {
      console.error('Error validating dates:', error)
    }
    return true // در صورت خطا، اجازه می‌دهیم query اجرا شود
  }

  const dateRangeIsValid = isDateRangeValid()

  // گزارش فروش
  const { data: salesData, isLoading: salesLoading } = useQuery({
    queryKey: [
      'sales-report',
      salesPreset || 'custom',
      startDate || 'empty',
      endDate || 'empty',
      businessDayStartHour,
      businessDayStartMinute,
      salesPage,
      pageSize,
    ],
    queryFn: () => {
      const startDateMiladi = startDate && startDate.trim() !== ''
        ? convertJalaliToMiladi(startDate)
        : undefined
      const endDateMiladi = endDate && endDate.trim() !== ''
        ? convertJalaliToMiladi(endDate)
        : undefined

      return reportsApi.getSalesReport({
        preset: salesPreset || undefined,
        start_date: salesPreset
          ? undefined
          : (startDateMiladi && startDateMiladi.trim() !== '') ? startDateMiladi : undefined,
        end_date: salesPreset
          ? undefined
          : (endDateMiladi && endDateMiladi.trim() !== '') ? endDateMiladi : undefined,
        ...businessDayStartParams,
        page: salesPage,
        page_size: pageSize,
      })
    },
    enabled: activeReport === 'sales' && dateRangeIsValid,
    staleTime: 0,
    gcTime: 0, // cacheTime in older versions
    refetchOnMount: true,
  })

  // گزارش محصولات
  const { data: productsData, isLoading: productsLoading } = useQuery({
    queryKey: ['products-report', productsPage, pageSize],
    queryFn: () => reportsApi.getProductReport({
      page: productsPage,
      page_size: pageSize,
    }),
    enabled: activeReport === 'products',
    staleTime: 0,
    gcTime: 0, // cacheTime in older versions
    refetchOnMount: true,
  })

  // گزارش موجودی
  const { data: stockData, isLoading: stockLoading } = useQuery({
    queryKey: ['stock-report', stockPage, pageSize],
    queryFn: () => reportsApi.getStockReport({
      page: stockPage,
      page_size: pageSize,
    }),
    enabled: activeReport === 'stock',
    staleTime: 0,
    gcTime: 0, // cacheTime in older versions
    refetchOnMount: true,
  })

  // گزارش روزانه
  const { data: dailyData, isLoading: dailyLoading } = useQuery({
    queryKey: ['daily-report', dailyDate, dailyPage, pageSize],
    queryFn: () => {
      const miladiDate = convertJalaliToMiladi(dailyDate)
      return reportsApi.getDailyReport({
        date: miladiDate || undefined,
        ...businessDayStartParams,
        page: dailyPage,
        page_size: pageSize,
      })
    },
    enabled: activeReport === 'daily',
    staleTime: 0,
    gcTime: 0, // cacheTime in older versions
    refetchOnMount: true,
  })

  // گزارش ساعتی
  const { data: hourlyData, isLoading: hourlyLoading } = useQuery({
    queryKey: ['hourly-report', dailyDate, businessDayStartHour, businessDayStartMinute, hourlyPage, pageSize],
    queryFn: () => {
      const miladiDate = convertJalaliToMiladi(dailyDate)
      return reportsApi.getHourlyReport({
        date: miladiDate || undefined,
        ...businessDayStartParams,
        page: hourlyPage,
        page_size: pageSize,
      })
    },
    enabled: activeReport === 'hourly',
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: true,
  })

  const { data: exceptionData, isLoading: exceptionLoading } = useQuery({
    queryKey: ['exception-report', businessDayStartHour, businessDayStartMinute],
    queryFn: () =>
      reportsApi.getExceptionReport({
        ...businessDayStartParams,
      }),
    enabled: activeReport === 'exceptions',
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: true,
  })

  const exportMutation = useMutation({
    mutationFn: async () => {
      switch (activeReport) {
        case 'sales': {
          const startDateMiladi = startDate ? convertJalaliToMiladi(startDate) : undefined
          const endDateMiladi = endDate ? convertJalaliToMiladi(endDate) : undefined
          return reportsApi.exportSalesReport({
            preset: salesPreset || undefined,
            start_date: salesPreset ? undefined : startDateMiladi || undefined,
            end_date: salesPreset ? undefined : endDateMiladi || undefined,
            ...businessDayStartParams,
          })
        }
        case 'products':
          return reportsApi.exportProductReport()
        case 'stock':
          return reportsApi.exportStockReport()
        case 'daily':
          return reportsApi.exportDailyReport({
            date: convertJalaliToMiladi(dailyDate) || undefined,
            ...businessDayStartParams,
          })
        case 'hourly':
          return reportsApi.exportHourlyReport({
            date: convertJalaliToMiladi(dailyDate) || undefined,
            ...businessDayStartParams,
          })
        default:
          return ''
      }
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

  const isLoading =
    salesLoading ||
    productsLoading ||
    stockLoading ||
    dailyLoading ||
    hourlyLoading ||
    exceptionLoading

  // Reset page when report type changes
  const handleReportChange = (
    report: 'sales' | 'products' | 'stock' | 'daily' | 'hourly' | 'exceptions'
  ) => {
    setActiveReport(report)
    setSalesPage(1)
    setProductsPage(1)
    setStockPage(1)
    setDailyPage(1)
    setHourlyPage(1)
  }

  const businessDayHourOptions = Array.from({ length: 24 }, (_, hour) => ({
    value: String(hour),
    label: String(hour).padStart(2, '0'),
  }))

  const businessDayMinuteOptions = Array.from({ length: 60 }, (_, minute) => ({
    value: String(minute),
    label: String(minute).padStart(2, '0'),
  }))

  // Helper function to render pagination
  const renderPagination = (
    currentPage: number,
    setPage: (page: number) => void,
    totalCount?: number,
    hasNext?: boolean
  ) => {
    // If count is available, use it. Otherwise, check if there's a next page
    if (!totalCount && !hasNext) return null
    if (totalCount && totalCount <= pageSize) return null
    
    const totalPages = totalCount ? Math.ceil(totalCount / pageSize) : (hasNext ? currentPage + 1 : currentPage)
    if (totalPages <= 1) return null

    return (
      <div className="flex items-center justify-center gap-2 mt-6">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPage(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
        >
          قبلی
        </Button>
        
        <div className="flex items-center gap-1">
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            let pageNum: number
            if (totalPages <= 5) {
              pageNum = i + 1
            } else if (currentPage <= 3) {
              pageNum = i + 1
            } else if (currentPage >= totalPages - 2) {
              pageNum = totalPages - 4 + i
            } else {
              pageNum = currentPage - 2 + i
            }
            
            return (
              <Button
                key={pageNum}
                variant={currentPage === pageNum ? "primary" : "outline"}
                size="sm"
                onClick={() => setPage(pageNum)}
                className="min-w-[40px]"
              >
                {pageNum}
              </Button>
            )
          })}
        </div>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPage(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
        >
          بعدی
        </Button>
      </div>
    )
  }

  // Helper function to translate order status
  const translateOrderStatus = (status: string | undefined | null): string => {
    if (!status) return 'نامشخص'
    const statusMap: Record<string, string> = {
      'pending': 'در انتظار',
      'processing': 'در حال پردازش',
      'paid': 'پرداخت شده',
      'completed': 'تکمیل شده',
      'cancelled': 'لغو شده',
    }
    return statusMap[status.toLowerCase()] || status
  }

  // Helper function to translate payment status
  const translatePaymentStatus = (status: string | undefined | null): string => {
    if (!status) return 'نامشخص'
    const statusMap: Record<string, string> = {
      'pending': 'در انتظار',
      'processing': 'در حال پردازش',
      'success': 'موفق',
      'paid': 'پرداخت شده',
      'failed': 'ناموفق',
      'cancelled': 'لغو شده',
    }
    return statusMap[status.toLowerCase()] || status
  }

  // Handle reprint receipt
  const handleReprintReceipt = async (orderNumber: string) => {
    try {
      await ordersApi.reprintReceipt(orderNumber)
      // You can add a toast notification here if needed
      console.log('Receipt reprinted successfully for order:', orderNumber)
    } catch (error) {
      console.error('Error reprinting receipt:', error)
      // You can add error notification here
    }
  }

  const openOrderDetails = (order: { id?: number; order_number: string }) => {
    if (!order.id) return
    setDetailsOrderId(order.id)
    setDetailsOrderNumber(order.order_number)
  }

  const renderBreakdown = (summary?: ReportBreakdown | null) => {
    if (!summary) return null
    const payment = summary.payment_status_breakdown || {}
    const order = summary.order_status_breakdown || {}
    const hasPayment = Object.keys(payment).length > 0
    const hasOrder = Object.keys(order).length > 0
    const hasFees =
      (summary.total_service_fee || 0) > 0 ||
      (summary.total_packaging_fee || 0) > 0 ||
      (summary.total_discount || 0) > 0 ||
      (summary.coupon_usage_count || 0) > 0

    if (!hasPayment && !hasOrder && !hasFees && !(summary.gateway_breakdown?.length)) {
      return null
    }

    return (
      <AdminSurface className="space-y-3 text-sm">
        <p className="font-bold text-foreground">جزئیات تکمیلی</p>
        <div className="grid gap-4 md:grid-cols-2">
          {hasPayment ? (
            <div>
              <p className="mb-2 text-muted-foreground">وضعیت پرداخت</p>
              <ul className="space-y-1">
                {Object.entries(payment).map(([key, count]) => (
                  <li key={key}>
                    {translatePaymentStatus(key)}: {formatNumber(count)}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {hasOrder ? (
            <div>
              <p className="mb-2 text-muted-foreground">وضعیت سفارش</p>
              <ul className="space-y-1">
                {Object.entries(order).map(([key, count]) => (
                  <li key={key}>
                    {translateOrderStatus(key)}: {formatNumber(count)}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
        {hasFees ? (
          <div className="flex flex-wrap gap-4 text-muted-foreground">
            {(summary.total_service_fee || 0) > 0 ? (
              <span>سرویس: {formatCurrency(summary.total_service_fee || 0)}</span>
            ) : null}
            {(summary.total_packaging_fee || 0) > 0 ? (
              <span>بسته‌بندی: {formatCurrency(summary.total_packaging_fee || 0)}</span>
            ) : null}
            {(summary.total_discount || 0) > 0 ? (
              <span>تخفیف: {formatCurrency(summary.total_discount || 0)}</span>
            ) : null}
            {(summary.coupon_usage_count || 0) > 0 ? (
              <span>کوپن: {formatNumber(summary.coupon_usage_count || 0)}</span>
            ) : null}
          </div>
        ) : null}
      </AdminSurface>
    )
  }

  const canExport = activeReport !== 'exceptions'

  return (
    <div className="space-y-5">
      <AdminPageHeader
        title="گزارشات"
        description="فروش، محصولات، موجودی، روزانه، ساعتی و استثناها — تاریخ و ساعت جلالی (تهران)."
      />

      <AdminSurface>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <AdminSegmented
            value={activeReport}
            onChange={handleReportChange}
            options={[
              { id: 'sales', label: 'فروش' },
              { id: 'products', label: 'محصولات' },
              { id: 'stock', label: 'موجودی' },
              { id: 'daily', label: 'روزانه' },
              { id: 'hourly', label: 'ساعتی' },
              { id: 'exceptions', label: 'استثناها' },
            ]}
          />
          {canExport ? (
            <Button
              variant="outline"
              size="sm"
              isLoading={exportMutation.isPending}
              onClick={() => exportMutation.mutate()}
            >
              دانلود Excel
            </Button>
          ) : null}
        </div>
        {exportMessage ? (
          <p className="mb-3 text-sm text-muted-foreground">{exportMessage}</p>
        ) : null}

        {/* Date Filters */}
        {activeReport === 'sales' && (
          <div className="mb-6 space-y-4">
            <div className="flex flex-wrap gap-2">
              {(Object.keys(SALES_PRESET_LABELS) as SalesPreset[]).map((preset) => (
                <Button
                  key={preset}
                  variant={salesPreset === preset ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setSalesPreset(preset)
                    setStartDate('')
                    setEndDate('')
                    setSalesPage(1)
                  }}
                >
                  {SALES_PRESET_LABELS[preset]}
                </Button>
              ))}
              <Button
                variant={!salesPreset ? 'primary' : 'outline'}
                size="sm"
                onClick={() => {
                  setSalesPreset('')
                  setSalesPage(1)
                }}
              >
                بازه دلخواه
              </Button>
            </div>
            {!salesPreset ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <DatePicker
              label="از تاریخ"
              value={startDate}
              placeholder="تاریخ را انتخاب کنید"
              onChange={(e) => {
                setStartDate(e.target.value)
                setSalesPage(1)
                // اگر تاریخ پایان کمتر یا مساوی تاریخ شروع باشد، آن را پاک کن
                if (endDate && e.target.value) {
                  const start = toEnglishDigits(e.target.value)
                  const end = toEnglishDigits(endDate)
                  if (start && end) {
                    try {
                      const [startYear, startMonth, startDay] = start.split('/').map(Number)
                      const [endYear, endMonth, endDay] = end.split('/').map(Number)
                      // استفاده از PersianDate برای مقایسه دقیق
                      // @ts-ignore
                      const startPersian = new PersianDate([startYear, startMonth - 1, startDay])
                      // @ts-ignore
                      const endPersian = new PersianDate([endYear, endMonth - 1, endDay])
                      const startTime = startPersian.toDate().getTime()
                      const endTime = endPersian.toDate().getTime()
                      // تاریخ پایان باید بزرگ‌تر باشد (نه مساوی)
                      if (endTime <= startTime) {
                        setEndDate('')
                      }
                    } catch (error) {
                      console.error('Error comparing dates:', error)
                    }
                  }
                }
              }}
            />
            <DatePicker
              label="تا تاریخ"
              value={endDate}
              placeholder="تاریخ را انتخاب کنید"
              error={
                startDate && endDate
                  ? (() => {
                      try {
                        const start = toEnglishDigits(startDate)
                        const end = toEnglishDigits(endDate)
                        if (start && end) {
                          // استفاده از moment-jalaali برای مقایسه دقیق
                          const startMoment = moment(start, 'jYYYY/jMM/jDD')
                          const endMoment = moment(end, 'jYYYY/jMM/jDD')
                          
                          if (startMoment.isValid() && endMoment.isValid()) {
                            // تاریخ پایان باید بزرگ‌تر باشد (نه مساوی و نه کوچکتر)
                            if (!endMoment.isAfter(startMoment)) {
                              return 'تاریخ پایان باید بزرگ‌تر از تاریخ شروع باشد'
                            }
                          }
                        }
                      } catch (error) {
                        console.error('Error validating dates:', error)
                      }
                      return undefined
                    })()
                  : undefined
              }
              onChange={(e) => {
                const newEndDate = e.target.value
                setEndDate(newEndDate)
                setSalesPage(1)
              }}
            />
          </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                بازه روز کاری: {SALES_PRESET_LABELS[salesPreset]} (شروع روز از {businessDayStartLabel})
              </p>
            )}
          </div>
        )}

        {(activeReport === 'daily' || activeReport === 'hourly' || activeReport === 'exceptions') && (
          <div className="mb-2 grid grid-cols-1 gap-4 md:grid-cols-2">
            {(activeReport === 'daily' || activeReport === 'hourly') && (
              <DatePicker
                label="تاریخ"
                value={dailyDate}
                onChange={(e) => {
                  setDailyDate(e.target.value)
                  setDailyPage(1)
                  setHourlyPage(1)
                }}
              />
            )}
            {activeReport === 'exceptions' ? (
              <div className="text-sm text-muted-foreground md:col-span-2">
                گزارش استثناها برای «امروز» بر اساس روز کاری زیر محاسبه می‌شود.
              </div>
            ) : null}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-foreground">شروع روز کاری</label>
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={businessDayStartHour}
                  onChange={(e) => {
                    setBusinessDayStartHour(e.target.value)
                    setDailyPage(1)
                    setHourlyPage(1)
                  }}
                  className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none transition focus:border-primary"
                >
                  {businessDayHourOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <select
                  value={businessDayStartMinute}
                  onChange={(e) => {
                    setBusinessDayStartMinute(e.target.value)
                    setDailyPage(1)
                    setHourlyPage(1)
                  }}
                  className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none transition focus:border-primary"
                >
                  {businessDayMinuteOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <p className="text-xs text-muted-foreground">
                {activeReport === 'exceptions'
                  ? `بازه روز کاری امروز از ${businessDayStartLabel} تا ${businessDayStartLabel} فردا.`
                  : `گزارش روزانه و ساعتی بر اساس بازه ۲۴ ساعته از ${businessDayStartLabel} محاسبه می‌شود. پیش‌فرض از تنظیمات → گزارشات.`}
              </p>
            </div>
          </div>
        )}
      </AdminSurface>

      {/* Report Content */}
      {isLoading ? (
        <AdminSurface className="py-12 text-center">
          <p className="text-muted-foreground">در حال بارگذاری...</p>
        </AdminSurface>
      ) : (
        <>
          {/* Sales Report */}
          {activeReport === 'sales' && salesData?.result && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-5"
            >
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-6">
                <AdminSurface>
                  <p className="mb-2 text-sm text-muted-foreground">فروش پرداخت‌شده</p>
                  <p className="text-2xl font-black text-foreground">
                    {formatCurrency(salesData.result.summary?.total_sales || 0)}
                  </p>
                </AdminSurface>
                <AdminSurface>
                  <p className="mb-2 text-sm text-muted-foreground">سفارش پرداخت‌شده</p>
                  <p className="text-2xl font-black text-foreground">
                    {formatNumber(salesData.result.summary?.paid_orders || 0)}
                  </p>
                </AdminSurface>
                <AdminSurface>
                  <p className="mb-2 text-sm text-muted-foreground">کل سفارشات</p>
                  <p className="text-2xl font-black text-foreground">
                    {formatNumber(salesData.result.summary?.total_orders || 0)}
                  </p>
                </AdminSurface>
                <AdminSurface>
                  <p className="mb-2 text-sm text-muted-foreground">میانگین سبد</p>
                  <p className="text-2xl font-black text-foreground">
                    {formatCurrency(salesData.result.summary?.average_order_value || 0)}
                  </p>
                </AdminSurface>
                <AdminSurface>
                  <p className="mb-2 text-sm text-muted-foreground">تراکنش موفق</p>
                  <p className="text-2xl font-black text-green-600 dark:text-green-400">
                    {formatNumber(salesData.result.summary?.successful_transactions || 0)}
                  </p>
                </AdminSurface>
                <AdminSurface>
                  <p className="mb-2 text-sm text-muted-foreground">تراکنش ناموفق</p>
                  <p className="text-2xl font-black text-red-600 dark:text-red-400">
                    {formatNumber(salesData.result.summary?.failed_transactions || 0)}
                  </p>
                </AdminSurface>
              </div>

              {(salesData.result.summary?.range_start_jalali ||
                salesData.result.summary?.start_date_jalali) && (
                <AdminSurface className="text-sm text-muted-foreground">
                  بازه (جلالی):{' '}
                  {salesData.result.summary.range_start_jalali ||
                    salesData.result.summary.start_date_jalali}{' '}
                  تا{' '}
                  {salesData.result.summary.range_end_jalali ||
                    salesData.result.summary.end_date_jalali}
                </AdminSurface>
              )}

              {renderBreakdown(salesData.result.summary)}

              {salesData.result.results && salesData.result.results.length > 0 && (
                <>
                  <AdminSurface padded={false} className="overflow-hidden">
                    <DragScrollArea axis="x">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-border/80 bg-muted/40">
                            <th className="px-5 py-3.5 text-right text-xs font-bold text-muted-foreground">شماره سفارش</th>
                            <th className="px-5 py-3.5 text-right text-xs font-bold text-muted-foreground">مبلغ</th>
                            <th className="px-5 py-3.5 text-right text-xs font-bold text-muted-foreground">وضعیت پرداخت</th>
                            <th className="px-5 py-3.5 text-right text-xs font-bold text-muted-foreground">تاریخ (جلالی)</th>
                            <th className="px-5 py-3.5 text-center text-xs font-bold text-muted-foreground">عملیات</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/70">
                          {salesData.result.results.map((order) => (
                            <tr key={order.id} className="hover:bg-muted/40">
                              <td className="px-5 py-3.5 text-sm font-medium text-foreground">{order.order_number}</td>
                              <td className="px-5 py-3.5 text-sm text-foreground">{formatCurrency(order.total_amount)}</td>
                              <td className="px-5 py-3.5 text-sm">
                                <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                                  order.payment_status === 'paid' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 
                                  order.payment_status === 'pending' || order.payment_status === 'processing' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                                  order.payment_status === 'failed' || order.payment_status === 'cancelled' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                                  'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                                }`}>
                                  {translatePaymentStatus(order.payment_status)}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-sm text-foreground">
                                {formatReportDateTime(order.created_at, order.created_at_jalali) ||
                                  formatJalaliDateTime(order.created_at)}
                              </td>
                              <td className="px-6 py-4 text-sm">
                                <div className="flex flex-wrap items-center justify-center gap-2">
                                  {canViewDetails && order.id ? (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => openOrderDetails(order)}
                                      className="text-xs"
                                    >
                                      جزئیات
                                    </Button>
                                  ) : null}
                                  {canReprint &&
                                  (order.status === 'paid' || order.payment_status === 'paid') ? (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleReprintReceipt(order.order_number)}
                                      className="text-xs"
                                    >
                                      چاپ مجدد
                                    </Button>
                                  ) : null}
                                  {!canViewDetails &&
                                  !(
                                    canReprint &&
                                    (order.status === 'paid' || order.payment_status === 'paid')
                                  ) ? (
                                    <span className="text-lg text-muted-foreground">-</span>
                                  ) : null}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </DragScrollArea>
                  </AdminSurface>
                  {renderPagination(salesPage, setSalesPage, salesData.result.count, !!salesData.result.next)}
                </>
              )}
            </motion.div>
          )}

          {/* Products Report */}
          {activeReport === 'products' && productsData?.result && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm shadow-black/[0.02]">
                  <p className="text-sm text-muted-foreground mb-2">کل محصولات</p>
                  <p className="text-2xl font-bold text-foreground">
                    {formatNumber(productsData.result.summary?.total_products || 0)}
                  </p>
                </div>
                <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm shadow-black/[0.02]">
                  <p className="text-sm text-muted-foreground mb-2">محصولات فعال</p>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {formatNumber(productsData.result.summary?.active_products || 0)}
                  </p>
                </div>
                <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm shadow-black/[0.02]">
                  <p className="text-sm text-muted-foreground mb-2">موجودی کم</p>
                  <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                    {formatNumber(productsData.result.summary?.low_stock_count || 0)}
                  </p>
                </div>
                <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm shadow-black/[0.02]">
                  <p className="text-sm text-muted-foreground mb-2">ناموجود</p>
                  <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                    {formatNumber(productsData.result.summary?.out_of_stock_count || 0)}
                  </p>
                </div>
              </div>

              {productsData.result.results && productsData.result.results.length > 0 && (
                <>
                  <div className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm shadow-black/[0.02]">
                    <DragScrollArea axis="x">
                      <table className="w-full">
                        <thead className="bg-muted/40">
                          <tr>
                            <th className="px-6 py-4 text-right text-sm font-bold text-foreground">نام محصول</th>
                            <th className="px-6 py-4 text-right text-sm font-bold text-foreground">دسته‌بندی</th>
                            <th className="px-6 py-4 text-right text-sm font-bold text-foreground">قیمت</th>
                            <th className="px-6 py-4 text-right text-sm font-bold text-foreground">موجودی</th>
                            <th className="px-6 py-4 text-right text-sm font-bold text-foreground">تعداد فروخته شده</th>
                            <th className="px-6 py-4 text-right text-sm font-bold text-foreground">درآمد کل</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/70">
                          {productsData.result.results.map((product) => (
                            <tr key={product.id} className="hover:bg-muted/40">
                              <td className="px-6 py-4 text-sm text-foreground">{product.name}</td>
                              <td className="px-6 py-4 text-sm text-foreground">{product.category_name}</td>
                              <td className="px-6 py-4 text-sm text-foreground">{formatCurrency(product.price)}</td>
                              <td className="px-6 py-4 text-sm text-foreground">{formatNumber(product.stock_quantity)}</td>
                              <td className="px-6 py-4 text-sm text-foreground">{formatNumber(product.total_sold)}</td>
                              <td className="px-6 py-4 text-sm text-foreground">{formatCurrency(product.total_revenue)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </DragScrollArea>
                  </div>
                  {renderPagination(productsPage, setProductsPage, productsData.result.count, !!productsData.result.next)}
                </>
              )}
            </motion.div>
          )}

          {/* Stock Report */}
          {activeReport === 'stock' && stockData?.result && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm shadow-black/[0.02]">
                  <p className="text-sm text-muted-foreground mb-2">ارزش کل موجودی</p>
                  <p className="text-2xl font-bold text-foreground">
                    {formatCurrency(stockData.result.summary?.total_stock_value || 0)}
                  </p>
                </div>
                <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm shadow-black/[0.02]">
                  <p className="text-sm text-muted-foreground mb-2">تعداد کل آیتم‌ها</p>
                  <p className="text-2xl font-bold text-foreground">
                    {formatNumber(stockData.result.summary?.total_items || 0)}
                  </p>
                </div>
                <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm shadow-black/[0.02]">
                  <p className="text-sm text-muted-foreground mb-2">موجودی کم</p>
                  <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                    {formatNumber(stockData.result.summary?.low_stock_count || 0)}
                  </p>
                </div>
                <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm shadow-black/[0.02]">
                  <p className="text-sm text-muted-foreground mb-2">ناموجود</p>
                  <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                    {formatNumber(stockData.result.summary?.out_of_stock_count || 0)}
                  </p>
                </div>
              </div>

              {stockData.result.results && stockData.result.results.length > 0 && (
                <>
                  <div className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm shadow-black/[0.02]">
                    <DragScrollArea axis="x">
                      <table className="w-full">
                        <thead className="bg-muted/40">
                          <tr>
                            <th className="px-6 py-4 text-right text-sm font-bold text-foreground">نام محصول</th>
                            <th className="px-6 py-4 text-right text-sm font-bold text-foreground">موجودی</th>
                            <th className="px-6 py-4 text-right text-sm font-bold text-foreground">قیمت</th>
                            <th className="px-6 py-4 text-right text-sm font-bold text-foreground">ارزش موجودی</th>
                            <th className="px-6 py-4 text-right text-sm font-bold text-foreground">وضعیت</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/70">
                          {stockData.result.results.map((item) => (
                            <tr key={item.id} className="hover:bg-muted/40">
                              <td className="px-6 py-4 text-sm text-foreground">{item.name}</td>
                              <td className="px-6 py-4 text-sm text-foreground">{formatNumber(item.stock_quantity)}</td>
                              <td className="px-6 py-4 text-sm text-foreground">{formatCurrency(item.price)}</td>
                              <td className="px-6 py-4 text-sm text-foreground">{formatCurrency(item.stock_value)}</td>
                              <td className="px-6 py-4 text-sm">
                                {item.is_out_of_stock ? (
                                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                                    تمام شده
                                  </span>
                                ) : item.is_low_stock ? (
                                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                                    موجودی کم
                                  </span>
                                ) : (
                                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                    موجود
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </DragScrollArea>
                  </div>
                  {renderPagination(stockPage, setStockPage, stockData.result.count, !!stockData.result.next)}
                </>
              )}
            </motion.div>
          )}

          {/* Daily Report */}
          {activeReport === 'daily' && dailyData?.result && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm shadow-black/[0.02]">
                  <p className="text-sm text-muted-foreground mb-2">مجموع فروش</p>
                  <p className="text-2xl font-bold text-foreground">
                    {formatCurrency(dailyData.result.summary?.total_sales || 0)}
                  </p>
                </div>
                <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm shadow-black/[0.02]">
                  <p className="text-sm text-muted-foreground mb-2">تعداد سفارشات</p>
                  <p className="text-2xl font-bold text-foreground">
                    {formatNumber(dailyData.result.summary?.total_orders || 0)}
                  </p>
                </div>
                <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm shadow-black/[0.02]">
                  <p className="text-sm text-muted-foreground mb-2">تعداد تراکنش‌ها</p>
                  <p className="text-2xl font-bold text-foreground">
                    {formatNumber(dailyData.result.summary?.total_transactions || 0)}
                  </p>
                </div>
              </div>

              <AdminSurface className="text-sm text-muted-foreground">
                تاریخ: {dailyData.result.summary?.date_jalali || formatJalaliDate(dailyDate)}
                <br />
                بازه (جلالی):{' '}
                {dailyData.result.summary?.range_start_jalali ||
                  formatJalaliDateTime(dailyData.result.summary?.range_start || '')}{' '}
                تا{' '}
                {dailyData.result.summary?.range_end_jalali ||
                  formatJalaliDateTime(dailyData.result.summary?.range_end || '')}
              </AdminSurface>

              {renderBreakdown(dailyData.result.summary)}

              {dailyData.result.results && dailyData.result.results.length > 0 && (
                <>
                  <div className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm shadow-black/[0.02]">
                    <DragScrollArea axis="x">
                      <table className="w-full">
                        <thead className="bg-muted/40">
                          <tr>
                            <th className="px-6 py-4 text-right text-sm font-bold text-foreground">شماره سفارش</th>
                            <th className="px-6 py-4 text-right text-sm font-bold text-foreground">مبلغ</th>
                            <th className="px-6 py-4 text-right text-sm font-bold text-foreground">وضعیت</th>
                            <th className="px-6 py-4 text-right text-sm font-bold text-foreground">تاریخ</th>
                            <th className="px-6 py-4 text-center text-sm font-bold text-foreground">عملیات</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/70">
                          {dailyData.result.results.map((order, index) => {
                            // Use payment_status if status is not available
                            const status = order.status || order.payment_status
                            return (
                              <tr key={order.id || `order-${index}-${order.order_number}`} className="hover:bg-muted/40">
                                <td className="px-6 py-4 text-sm text-foreground">{order.order_number}</td>
                                <td className="px-6 py-4 text-sm text-foreground">{formatCurrency(order.total_amount)}</td>
                                <td className="px-6 py-4 text-sm">
                                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                                    status === 'paid' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 
                                    status === 'pending' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                                    status === 'cancelled' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                                    'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                                  }`}>
                                    {translatePaymentStatus(status)}
                                  </span>
                                </td>
                                <td className="px-6 py-4 text-sm text-foreground">
                                  {formatReportDateTime(order.created_at, order.created_at_jalali) ||
                                    formatJalaliDateTime(order.created_at)}
                                </td>
                                <td className="px-6 py-4 text-sm">
                                  <div className="flex flex-wrap items-center justify-center gap-2">
                                    {canViewDetails && order.id ? (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => openOrderDetails(order)}
                                        className="text-xs"
                                      >
                                        جزئیات
                                      </Button>
                                    ) : null}
                                    {canReprint &&
                                    (status === 'paid' || order.payment_status === 'paid') ? (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleReprintReceipt(order.order_number)}
                                        className="text-xs"
                                      >
                                        چاپ مجدد
                                      </Button>
                                    ) : null}
                                    {!canViewDetails &&
                                    !(
                                      canReprint &&
                                      (status === 'paid' || order.payment_status === 'paid')
                                    ) ? (
                                      <span className="text-lg text-muted-foreground">-</span>
                                    ) : null}
                                  </div>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </DragScrollArea>
                  </div>
                  {renderPagination(dailyPage, setDailyPage, dailyData.result.count, !!dailyData.result.next)}
                </>
              )}
            </motion.div>
          )}

          {/* Hourly Report */}
          {activeReport === 'hourly' && hourlyData?.result && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
                <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm shadow-black/[0.02]">
                  <p className="mb-2 text-sm text-muted-foreground">مجموع فروش موفق</p>
                  <p className="text-2xl font-bold text-foreground">
                    {formatCurrency(hourlyData.result.summary?.total_sales || 0)}
                  </p>
                </div>
                <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm shadow-black/[0.02]">
                  <p className="mb-2 text-sm text-muted-foreground">کل سفارشات</p>
                  <p className="text-2xl font-bold text-foreground">
                    {formatNumber(hourlyData.result.summary?.total_orders || 0)}
                  </p>
                </div>
                <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm shadow-black/[0.02]">
                  <p className="mb-2 text-sm text-muted-foreground">سفارشات موفق</p>
                  <p className="text-2xl font-bold text-foreground">
                    {formatNumber(hourlyData.result.summary?.successful_orders || 0)}
                  </p>
                </div>
                <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm shadow-black/[0.02]">
                  <p className="mb-2 text-sm text-muted-foreground">تراکنش‌ها</p>
                  <p className="text-2xl font-bold text-foreground">
                    {formatNumber(hourlyData.result.summary?.total_transactions || 0)}
                  </p>
                </div>
              </div>

              <AdminSurface className="text-sm text-muted-foreground">
                تاریخ: {hourlyData.result.summary?.date_jalali || formatJalaliDate(dailyDate)}
                <br />
                بازه (جلالی):{' '}
                {hourlyData.result.summary?.range_start_jalali ||
                  formatJalaliDateTime(hourlyData.result.summary?.range_start || '')}{' '}
                تا{' '}
                {hourlyData.result.summary?.range_end_jalali ||
                  formatJalaliDateTime(hourlyData.result.summary?.range_end || '')}
              </AdminSurface>

              {hourlyData.result.results && hourlyData.result.results.length > 0 && (
                <>
                  <div className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm shadow-black/[0.02]">
                    <DragScrollArea axis="x">
                      <table className="w-full">
                        <thead className="bg-muted/40">
                          <tr>
                            <th className="px-6 py-4 text-right text-sm font-bold text-foreground">ساعت</th>
                            <th className="px-6 py-4 text-right text-sm font-bold text-foreground">کل سفارشات</th>
                            <th className="px-6 py-4 text-right text-sm font-bold text-foreground">سفارشات موفق</th>
                            <th className="px-6 py-4 text-right text-sm font-bold text-foreground">ناموفق</th>
                            <th className="px-6 py-4 text-right text-sm font-bold text-foreground">تعداد تراکنش</th>
                            <th className="px-6 py-4 text-right text-sm font-bold text-foreground">فروش موفق</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/70">
                          {hourlyData.result.results.map((hour) => (
                            <tr key={hour.hour_start} className="hover:bg-muted/40">
                              <td className="px-6 py-4 text-sm text-foreground">{hour.hour_label}</td>
                              <td className="px-6 py-4 text-sm text-foreground">{formatNumber(hour.total_orders)}</td>
                              <td className="px-6 py-4 text-sm text-foreground">{formatNumber(hour.successful_orders)}</td>
                              <td className="px-6 py-4 text-sm text-foreground">{formatNumber(hour.failed_orders || 0)}</td>
                              <td className="px-6 py-4 text-sm text-foreground">{formatNumber(hour.total_transactions)}</td>
                              <td className="px-6 py-4 text-sm text-foreground">{formatCurrency(hour.total_sales)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </DragScrollArea>
                  </div>
                  {renderPagination(hourlyPage, setHourlyPage, hourlyData.result.count, !!hourlyData.result.next)}
                </>
              )}
            </motion.div>
          )}

          {activeReport === 'exceptions' && exceptionData?.result && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                <AdminSurface>
                  <p className="mb-2 text-sm text-muted-foreground">پرداخت ناموفق</p>
                  <p className="text-2xl font-black text-red-600 dark:text-red-400">
                    {formatNumber(exceptionData.result.failed_payments_count)}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatCurrency(exceptionData.result.failed_payments_amount)}
                  </p>
                </AdminSurface>
                <AdminSurface>
                  <p className="mb-2 text-sm text-muted-foreground">سفارش معطل</p>
                  <p className="text-2xl font-black text-amber-600 dark:text-amber-400">
                    {formatNumber(exceptionData.result.stuck_orders_count)}
                  </p>
                </AdminSurface>
                <AdminSurface>
                  <p className="mb-2 text-sm text-muted-foreground">موجودی بحرانی</p>
                  <p className="text-2xl font-black text-foreground">
                    {formatNumber(exceptionData.result.low_stock_count)}
                  </p>
                </AdminSurface>
                <AdminSurface>
                  <p className="mb-2 text-sm text-muted-foreground">غیرفعال با موجودی</p>
                  <p className="text-2xl font-black text-foreground">
                    {formatNumber(exceptionData.result.inactive_with_stock_count)}
                  </p>
                </AdminSurface>
              </div>

              <AdminSurface className="text-sm text-muted-foreground">
                تاریخ: {exceptionData.result.date_jalali} · بازه:{' '}
                {exceptionData.result.range_start_jalali} تا {exceptionData.result.range_end_jalali}
                <br />
                به‌روزرسانی: {exceptionData.result.generated_at_jalali}
              </AdminSurface>

              {exceptionData.result.failed_orders.length > 0 && (
                <AdminSurface padded={false} className="overflow-hidden">
                  <p className="border-b border-border px-5 py-3 font-bold">پرداخت‌های ناموفق</p>
                  <DragScrollArea axis="x">
                    <table className="w-full">
                      <thead className="bg-muted/40">
                        <tr>
                          <th className="px-5 py-3 text-right text-xs font-bold">سفارش</th>
                          <th className="px-5 py-3 text-right text-xs font-bold">مبلغ</th>
                          <th className="px-5 py-3 text-right text-xs font-bold">زمان</th>
                          <th className="px-5 py-3 text-right text-xs font-bold">پیام</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/70">
                        {exceptionData.result.failed_orders.map((order) => (
                          <tr key={order.id}>
                            <td className="px-5 py-3 text-sm">{order.order_number}</td>
                            <td className="px-5 py-3 text-sm">{formatCurrency(order.total_amount)}</td>
                            <td className="px-5 py-3 text-sm">{order.created_at_jalali || '—'}</td>
                            <td className="px-5 py-3 text-sm text-muted-foreground">{order.error_message || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </DragScrollArea>
                </AdminSurface>
              )}

              {exceptionData.result.stuck_orders.length > 0 && (
                <AdminSurface padded={false} className="overflow-hidden">
                  <p className="border-b border-border px-5 py-3 font-bold">سفارش‌های معطل</p>
                  <DragScrollArea axis="x">
                    <table className="w-full">
                      <thead className="bg-muted/40">
                        <tr>
                          <th className="px-5 py-3 text-right text-xs font-bold">سفارش</th>
                          <th className="px-5 py-3 text-right text-xs font-bold">وضعیت</th>
                          <th className="px-5 py-3 text-right text-xs font-bold">زمان</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/70">
                        {exceptionData.result.stuck_orders.map((order) => (
                          <tr key={order.id}>
                            <td className="px-5 py-3 text-sm">{order.order_number}</td>
                            <td className="px-5 py-3 text-sm">{translateOrderStatus(order.status)}</td>
                            <td className="px-5 py-3 text-sm">{order.created_at_jalali || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </DragScrollArea>
                </AdminSurface>
              )}

              {exceptionData.result.low_stock_products.length > 0 && (
                <AdminSurface padded={false} className="overflow-hidden">
                  <p className="border-b border-border px-5 py-3 font-bold">موجودی بحرانی</p>
                  <DragScrollArea axis="x">
                    <table className="w-full">
                      <thead className="bg-muted/40">
                        <tr>
                          <th className="px-5 py-3 text-right text-xs font-bold">محصول</th>
                          <th className="px-5 py-3 text-right text-xs font-bold">موجودی</th>
                          <th className="px-5 py-3 text-right text-xs font-bold">فعال</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/70">
                        {exceptionData.result.low_stock_products.map((product) => (
                          <tr key={product.id}>
                            <td className="px-5 py-3 text-sm">{product.name}</td>
                            <td className="px-5 py-3 text-sm">{formatNumber(product.stock_quantity)}</td>
                            <td className="px-5 py-3 text-sm">{product.is_active ? 'بله' : 'خیر'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </DragScrollArea>
                </AdminSurface>
              )}
            </motion.div>
          )}
        </>
      )}

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
        onReprint={(orderNumber) => void handleReprintReceipt(orderNumber)}
      />
    </div>
  )
}

