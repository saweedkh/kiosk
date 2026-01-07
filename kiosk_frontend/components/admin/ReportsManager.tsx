'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { reportsApi } from '@/lib/api/reports'
import { ordersApi } from '@/lib/api/orders'
import { Button } from '@/components/shared/Button'
import { DatePicker } from '@/components/admin/DatePicker'
import { formatCurrency, formatNumber, toEnglishDigits } from '@/lib/utils'
import { formatJalaliDate, formatJalaliDateTime, getTodayJalali, convertJalaliToMiladi } from '@/lib/utils/date'
import moment from 'moment-jalaali'
import type { SalesReport, ProductReport, StockReport, DailyReport } from '@/lib/api/reports'

export function ReportsManager() {
  const [activeReport, setActiveReport] = useState<'sales' | 'products' | 'stock' | 'daily'>('sales')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [dailyDate, setDailyDate] = useState(getTodayJalali())
  
  // Pagination states for each report
  const [salesPage, setSalesPage] = useState(1)
  const [productsPage, setProductsPage] = useState(1)
  const [stockPage, setStockPage] = useState(1)
  const [dailyPage, setDailyPage] = useState(1)
  const [pageSize] = useState(20) // Items per page

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
    queryKey: ['sales-report', startDate || 'empty', endDate || 'empty', salesPage, pageSize],
    queryFn: () => {
      // اگر تاریخ‌ها خالی باشند، undefined ارسال می‌کنیم تا backend همه داده‌ها را برگرداند
      const startDateMiladi = startDate && startDate.trim() !== '' 
        ? convertJalaliToMiladi(startDate) 
        : undefined
      const endDateMiladi = endDate && endDate.trim() !== '' 
        ? convertJalaliToMiladi(endDate) 
        : undefined
      
      // اگر تبدیل تاریخ خطا داد (string خالی برگرداند)، undefined ارسال می‌کنیم
      return reportsApi.getSalesReport({
        start_date: (startDateMiladi && startDateMiladi.trim() !== '') ? startDateMiladi : undefined,
        end_date: (endDateMiladi && endDateMiladi.trim() !== '') ? endDateMiladi : undefined,
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
        page: dailyPage,
        page_size: pageSize,
      })
    },
    enabled: activeReport === 'daily',
    staleTime: 0,
    gcTime: 0, // cacheTime in older versions
    refetchOnMount: true,
  })

  const isLoading = salesLoading || productsLoading || stockLoading || dailyLoading

  // Reset page when report type changes
  const handleReportChange = (report: 'sales' | 'products' | 'stock' | 'daily') => {
    setActiveReport(report)
    setSalesPage(1)
    setProductsPage(1)
    setStockPage(1)
    setDailyPage(1)
  }

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-text dark:text-text-dark">
          گزارشات
        </h2>
      </div>

      {/* Report Type Tabs */}
      <div className="bg-card dark:bg-card-dark rounded-2xl p-6 border border-border dark:border-border-dark">
        <div className="flex items-center justify-between mb-6">
          <div className="flex flex-wrap gap-2">
            <Button
              variant={activeReport === 'sales' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => handleReportChange('sales')}
            >
              گزارش فروش
            </Button>
            <Button
              variant={activeReport === 'products' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => handleReportChange('products')}
            >
              گزارش محصولات
            </Button>
            <Button
              variant={activeReport === 'stock' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => handleReportChange('stock')}
            >
              گزارش موجودی
            </Button>
            <Button
              variant={activeReport === 'daily' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => handleReportChange('daily')}
            >
              گزارش روزانه
            </Button>
          </div>
        </div>

        {/* Date Filters */}
        {activeReport === 'sales' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
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
        )}

        {activeReport === 'daily' && (
          <div className="mb-6">
            <DatePicker
              label="تاریخ"
              value={dailyDate}
              onChange={(e) => {
                setDailyDate(e.target.value)
                setDailyPage(1)
              }}
            />
          </div>
        )}
      </div>

      {/* Report Content */}
      {isLoading ? (
        <div className="bg-card dark:bg-card-dark rounded-2xl p-8 border border-border dark:border-border-dark text-center">
          <p className="text-text-secondary dark:text-gray-400">در حال بارگذاری...</p>
        </div>
      ) : (
        <>
          {/* Sales Report */}
          {activeReport === 'sales' && salesData?.result && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-card dark:bg-card-dark rounded-2xl p-6 border border-border dark:border-border-dark">
                  <p className="text-sm text-text-secondary dark:text-gray-400 mb-2">مجموع فروش</p>
                  <p className="text-2xl font-bold text-text dark:text-text-dark">
                    {formatCurrency(salesData.result.summary?.total_sales || 0)}
                  </p>
                </div>
                <div className="bg-card dark:bg-card-dark rounded-2xl p-6 border border-border dark:border-border-dark">
                  <p className="text-sm text-text-secondary dark:text-gray-400 mb-2">تعداد سفارشات</p>
                  <p className="text-2xl font-bold text-text dark:text-text-dark">
                    {formatNumber(salesData.result.summary?.total_orders || 0)}
                  </p>
                </div>
                <div className="bg-card dark:bg-card-dark rounded-2xl p-6 border border-border dark:border-border-dark">
                  <p className="text-sm text-text-secondary dark:text-gray-400 mb-2">میانگین ارزش سفارش</p>
                  <p className="text-2xl font-bold text-text dark:text-text-dark">
                    {formatCurrency(salesData.result.summary?.average_order_value || 0)}
                  </p>
                </div>
              </div>

              {salesData.result.results && salesData.result.results.length > 0 && (
                <>
                  <div className="bg-card dark:bg-card-dark rounded-2xl border border-border dark:border-border-dark overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50 dark:bg-gray-800">
                          <tr>
                            <th className="px-6 py-4 text-right text-sm font-bold text-text dark:text-text-dark">شماره سفارش</th>
                            <th className="px-6 py-4 text-right text-sm font-bold text-text dark:text-text-dark">مبلغ</th>
                            <th className="px-6 py-4 text-right text-sm font-bold text-text dark:text-text-dark">وضعیت</th>
                            <th className="px-6 py-4 text-right text-sm font-bold text-text dark:text-text-dark">تاریخ</th>
                            <th className="px-6 py-4 text-center text-sm font-bold text-text dark:text-text-dark">عملیات</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border dark:divide-border-dark">
                          {salesData.result.results.map((order) => (
                            <tr key={order.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                              <td className="px-6 py-4 text-sm text-text dark:text-text-dark">{order.order_number}</td>
                              <td className="px-6 py-4 text-sm text-text dark:text-text-dark">{formatCurrency(order.total_amount)}</td>
                              <td className="px-6 py-4 text-sm">
                                <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                                  order.status === 'paid' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 
                                  order.status === 'pending' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                                  order.status === 'cancelled' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                                  'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                                }`}>
                                  {translateOrderStatus(order.status)}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-sm text-text dark:text-text-dark">
                                {formatJalaliDateTime(order.created_at)}
                              </td>
                              <td className="px-6 py-4 text-sm">
                                <div className="flex items-center justify-center">
                                  {(order.status === 'paid' || order.payment_status === 'paid') ? (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleReprintReceipt(order.order_number)}
                                      className="text-xs"
                                    >
                                      چاپ مجدد
                                    </Button>
                                  ) : (
                                    <span className="text-lg text-text-secondary dark:text-gray-400">-</span>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-card dark:bg-card-dark rounded-2xl p-6 border border-border dark:border-border-dark">
                  <p className="text-sm text-text-secondary dark:text-gray-400 mb-2">کل محصولات</p>
                  <p className="text-2xl font-bold text-text dark:text-text-dark">
                    {formatNumber(productsData.result.summary?.total_products || 0)}
                  </p>
                </div>
                <div className="bg-card dark:bg-card-dark rounded-2xl p-6 border border-border dark:border-border-dark">
                  <p className="text-sm text-text-secondary dark:text-gray-400 mb-2">محصولات فعال</p>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {formatNumber(productsData.result.summary?.active_products || 0)}
                  </p>
                </div>
              </div>

              {productsData.result.results && productsData.result.results.length > 0 && (
                <>
                  <div className="bg-card dark:bg-card-dark rounded-2xl border border-border dark:border-border-dark overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50 dark:bg-gray-800">
                          <tr>
                            <th className="px-6 py-4 text-right text-sm font-bold text-text dark:text-text-dark">نام محصول</th>
                            <th className="px-6 py-4 text-right text-sm font-bold text-text dark:text-text-dark">دسته‌بندی</th>
                            <th className="px-6 py-4 text-right text-sm font-bold text-text dark:text-text-dark">قیمت</th>
                            <th className="px-6 py-4 text-right text-sm font-bold text-text dark:text-text-dark">موجودی</th>
                            <th className="px-6 py-4 text-right text-sm font-bold text-text dark:text-text-dark">تعداد فروخته شده</th>
                            <th className="px-6 py-4 text-right text-sm font-bold text-text dark:text-text-dark">درآمد کل</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border dark:divide-border-dark">
                          {productsData.result.results.map((product) => (
                            <tr key={product.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                              <td className="px-6 py-4 text-sm text-text dark:text-text-dark">{product.name}</td>
                              <td className="px-6 py-4 text-sm text-text dark:text-text-dark">{product.category_name}</td>
                              <td className="px-6 py-4 text-sm text-text dark:text-text-dark">{formatCurrency(product.price)}</td>
                              <td className="px-6 py-4 text-sm text-text dark:text-text-dark">{formatNumber(product.stock_quantity)}</td>
                              <td className="px-6 py-4 text-sm text-text dark:text-text-dark">{formatNumber(product.total_sold)}</td>
                              <td className="px-6 py-4 text-sm text-text dark:text-text-dark">{formatCurrency(product.total_revenue)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-card dark:bg-card-dark rounded-2xl p-6 border border-border dark:border-border-dark">
                  <p className="text-sm text-text-secondary dark:text-gray-400 mb-2">ارزش کل موجودی</p>
                  <p className="text-2xl font-bold text-text dark:text-text-dark">
                    {formatCurrency(stockData.result.summary?.total_stock_value || 0)}
                  </p>
                </div>
                <div className="bg-card dark:bg-card-dark rounded-2xl p-6 border border-border dark:border-border-dark">
                  <p className="text-sm text-text-secondary dark:text-gray-400 mb-2">تعداد کل آیتم‌ها</p>
                  <p className="text-2xl font-bold text-text dark:text-text-dark">
                    {formatNumber(stockData.result.summary?.total_items || 0)}
                  </p>
                </div>
              </div>

              {stockData.result.results && stockData.result.results.length > 0 && (
                <>
                  <div className="bg-card dark:bg-card-dark rounded-2xl border border-border dark:border-border-dark overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50 dark:bg-gray-800">
                          <tr>
                            <th className="px-6 py-4 text-right text-sm font-bold text-text dark:text-text-dark">نام محصول</th>
                            <th className="px-6 py-4 text-right text-sm font-bold text-text dark:text-text-dark">موجودی</th>
                            <th className="px-6 py-4 text-right text-sm font-bold text-text dark:text-text-dark">قیمت</th>
                            <th className="px-6 py-4 text-right text-sm font-bold text-text dark:text-text-dark">ارزش موجودی</th>
                            <th className="px-6 py-4 text-right text-sm font-bold text-text dark:text-text-dark">وضعیت</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border dark:divide-border-dark">
                          {stockData.result.results.map((item) => (
                            <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                              <td className="px-6 py-4 text-sm text-text dark:text-text-dark">{item.name}</td>
                              <td className="px-6 py-4 text-sm text-text dark:text-text-dark">{formatNumber(item.stock_quantity)}</td>
                              <td className="px-6 py-4 text-sm text-text dark:text-text-dark">{formatCurrency(item.price)}</td>
                              <td className="px-6 py-4 text-sm text-text dark:text-text-dark">{formatCurrency(item.stock_value)}</td>
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
                    </div>
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
                <div className="bg-card dark:bg-card-dark rounded-2xl p-6 border border-border dark:border-border-dark">
                  <p className="text-sm text-text-secondary dark:text-gray-400 mb-2">مجموع فروش</p>
                  <p className="text-2xl font-bold text-text dark:text-text-dark">
                    {formatCurrency(dailyData.result.summary?.total_sales || 0)}
                  </p>
                </div>
                <div className="bg-card dark:bg-card-dark rounded-2xl p-6 border border-border dark:border-border-dark">
                  <p className="text-sm text-text-secondary dark:text-gray-400 mb-2">تعداد سفارشات</p>
                  <p className="text-2xl font-bold text-text dark:text-text-dark">
                    {formatNumber(dailyData.result.summary?.total_orders || 0)}
                  </p>
                </div>
                <div className="bg-card dark:bg-card-dark rounded-2xl p-6 border border-border dark:border-border-dark">
                  <p className="text-sm text-text-secondary dark:text-gray-400 mb-2">تعداد تراکنش‌ها</p>
                  <p className="text-2xl font-bold text-text dark:text-text-dark">
                    {formatNumber(dailyData.result.summary?.total_transactions || 0)}
                  </p>
                </div>
              </div>

              {dailyData.result.results && dailyData.result.results.length > 0 && (
                <>
                  <div className="bg-card dark:bg-card-dark rounded-2xl border border-border dark:border-border-dark overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50 dark:bg-gray-800">
                          <tr>
                            <th className="px-6 py-4 text-right text-sm font-bold text-text dark:text-text-dark">شماره سفارش</th>
                            <th className="px-6 py-4 text-right text-sm font-bold text-text dark:text-text-dark">مبلغ</th>
                            <th className="px-6 py-4 text-right text-sm font-bold text-text dark:text-text-dark">وضعیت</th>
                            <th className="px-6 py-4 text-right text-sm font-bold text-text dark:text-text-dark">تاریخ</th>
                            <th className="px-6 py-4 text-center text-sm font-bold text-text dark:text-text-dark">عملیات</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border dark:divide-border-dark">
                          {dailyData.result.results.map((order, index) => {
                            // Use payment_status if status is not available
                            const status = order.status || order.payment_status
                            return (
                              <tr key={order.id || `order-${index}-${order.order_number}`} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                                <td className="px-6 py-4 text-sm text-text dark:text-text-dark">{order.order_number}</td>
                                <td className="px-6 py-4 text-sm text-text dark:text-text-dark">{formatCurrency(order.total_amount)}</td>
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
                                <td className="px-6 py-4 text-sm text-text dark:text-text-dark">
                                  {formatJalaliDateTime(order.created_at)}
                                </td>
                                <td className="px-6 py-4 text-sm">
                                  <div className="flex items-center justify-center">
                                    {status === 'paid' || order.payment_status === 'paid' ? (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleReprintReceipt(order.order_number)}
                                        className="text-xs"
                                      >
                                        چاپ مجدد
                                      </Button>
                                    ) : (
                                      <span className="text-lg text-text-secondary dark:text-gray-400">-</span>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  {renderPagination(dailyPage, setDailyPage, dailyData.result.count, !!dailyData.result.next)}
                </>
              )}
            </motion.div>
          )}
        </>
      )}
    </div>
  )
}

