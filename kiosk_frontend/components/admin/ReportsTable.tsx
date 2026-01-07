'use client'

import { motion } from 'framer-motion'
import type { ReportItem } from '@/types'
import { formatCurrency, formatNumber } from '@/lib/utils'

interface ReportsTableProps {
  data: ReportItem[]
  isLoading?: boolean
}

export function ReportsTable({ data, isLoading }: ReportsTableProps) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="h-16 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse"
          />
        ))}
      </div>
    )
  }

  return (
    <div className="bg-card dark:bg-card-dark rounded-2xl border border-border dark:border-border-dark overflow-hidden">
      {/* Table Header */}
      <div className="bg-gray-50 dark:bg-gray-800 px-6 py-4 border-b border-border dark:border-border-dark">
        <div className="grid grid-cols-6 gap-4 text-sm font-bold text-text dark:text-text-dark">
          <div className="text-right">ردیف</div>
          <div className="text-right">تاریخ</div>
          <div className="text-right">نام محصول</div>
          <div className="text-right">قیمت محصول</div>
          <div className="text-right">تعداد فروش</div>
          <div className="text-right">مبلغ کلی</div>
        </div>
      </div>

      {/* Table Body */}
      <div className="divide-y divide-border dark:divide-border-dark">
        {data.map((item, index) => (
          <motion.div
            key={item.row}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className={`px-6 py-4 grid grid-cols-6 gap-4 text-sm ${
              index % 2 === 0
                ? 'bg-card dark:bg-card-dark'
                : 'bg-gray-50 dark:bg-gray-800'
            }`}
          >
            <div className="text-center text-text dark:text-text-dark">
              {formatNumber(item.row)}
            </div>
            <div className="text-center text-text dark:text-text-dark">
              {item.date}
            </div>
            <div className="text-center text-text dark:text-text-dark">
              {item.product_name}
            </div>
            <div className="text-center text-primary dark:text-primary-light">
              {formatCurrency(item.product_price)}
            </div>
            <div className="text-center text-text dark:text-text-dark">
              {formatNumber(item.sales_count)}
            </div>
            <div className="text-center text-primary dark:text-primary-light font-bold">
              {formatCurrency(item.total_amount)}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

