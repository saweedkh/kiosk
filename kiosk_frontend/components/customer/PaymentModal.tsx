'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/shared/Button'
import { formatCurrency, cn } from '@/lib/utils'

interface PaymentModalProps {
  isOpen: boolean
  totalAmount: number
  orderNumber?: string
  onCancel: () => void
  onConfirm?: () => void
  isLoading?: boolean
  status?: 'waiting' | 'success' | 'failed' | 'cancelled'
}

export function PaymentModal({
  isOpen,
  totalAmount,
  orderNumber,
  onCancel,
  onConfirm,
  isLoading = false,
  status = 'waiting',
}: PaymentModalProps) {
  const getStatusConfig = () => {
    switch (status) {
      case 'success':
        return {
          icon: (
            <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <svg
                className="w-10 h-10 text-green-600 dark:text-green-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
          ),
          title: 'پرداخت موفق',
          message: 'پرداخت شما با موفقیت انجام شد',
          gradient: 'from-green-500 to-green-600',
          bgGradient: 'from-green-50 to-green-50 dark:from-green-900/20 dark:to-green-900/10',
        }
      case 'failed':
        return {
          icon: (
            <div className="w-20 h-20 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <svg
                className="w-10 h-10 text-red-600 dark:text-red-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
          ),
          title: 'پرداخت انجام نشد',
          message: 'متأسفانه پرداخت شما انجام نشد. لطفا دوباره تلاش کنید.',
          gradient: 'from-red-500 to-red-600',
          bgGradient: 'from-red-50 to-red-50 dark:from-red-900/20 dark:to-red-900/10',
        }
      case 'cancelled':
        return {
          icon: (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15 }}
              className="w-24 h-24 rounded-full bg-gradient-to-br from-orange-400 to-amber-600 flex items-center justify-center shadow-lg shadow-orange-500/30"
            >
              <svg
                className="w-12 h-12 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={3}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </motion.div>
          ),
          title: 'لغو شد',
          message: 'پرداخت لغو شد',
          gradient: 'from-orange-500 to-amber-600',
          bgGradient: 'from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/10',
        }
      default:
        return {
          icon: (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
              className="relative w-24 h-24"
            >
              <div className="absolute inset-0 rounded-full border-4 border-primary/20" />
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                className="absolute inset-0 rounded-full border-4 border-transparent border-t-primary border-r-primary"
              />
              <div className="absolute inset-4 rounded-full bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-primary"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                  />
                </svg>
              </div>
            </motion.div>
          ),
          title: 'در انتظار پرداخت',
          message: 'لطفا پرداخت خود را توسط کارتخوان انجام بدین',
          gradient: 'from-blue-500 to-indigo-600',
          bgGradient: 'from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/10',
        }
    }
  }

  const config = getStatusConfig()

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={undefined}
            className="fixed inset-0 bg-black/40 backdrop-blur-md z-50"
            style={{ pointerEvents: status === 'waiting' ? 'none' : 'auto' }}
          />

          {/* Modal */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="pointer-events-auto w-full max-w-md"
            >
              <div className="relative bg-white dark:bg-gray-900 rounded-3xl shadow-2xl overflow-hidden border border-gray-200 dark:border-gray-800">
                {/* Gradient Background */}
                <div className={cn('absolute inset-0 bg-gradient-to-br opacity-50', config.bgGradient)} />

                {/* Content */}
                <div className="relative p-8">
                  {/* Icon */}
                  <div className="flex justify-center mb-6">
                    {config.icon}
                  </div>

                  {/* Title */}
                  <h2 className="text-2xl font-bold text-center text-gray-900 dark:text-white mb-2">
                    {config.title}
                  </h2>

                  {/* Message */}
                  <p className="text-center text-gray-600 dark:text-gray-300 mb-6">
                    {config.message}
                  </p>

                  {/* Amount Card - فقط برای وضعیت waiting */}
                  {status === 'waiting' && (
                    <div className={cn('bg-gradient-to-br rounded-xl p-5 mb-6', config.gradient)}>
                      <div className="text-center">
                        <p className="text-white/90 text-sm mb-1">مبلغ قابل پرداخت</p>
                        <p className="text-3xl font-bold text-white">
                          {formatCurrency(totalAmount)}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Order Number */}
                  {orderNumber && (
                    <div className="text-center mb-6">
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        شماره سفارش: 
                      </span>
                      <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 mr-2">
                        {orderNumber}
                      </span>
                    </div>
                  )}

                  {/* Loading Message */}
                  {status === 'waiting' && (
                    <div className="text-center mb-6">
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {isLoading
                          ? 'در حال ارسال درخواست...'
                          : 'منتظر پرداخت از طریق کارتخوان...'}
                      </p>
                    </div>
                  )}

                  {/* Failed Message */}
                  {status === 'failed' && (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 mb-6">
                      <p className="text-sm text-red-700 dark:text-red-300 text-center">
                        لطفا دوباره تلاش کنید
                      </p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="space-y-3">
                    {status === 'waiting' ? (
                      <Button
                        variant="outline"
                        size="lg"
                        className="w-full border-2 border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600 opacity-50 cursor-not-allowed"
                        onClick={() => {}} // هیچ کاری نکن - باید منتظر پاسخ بک‌اند باشیم
                        disabled={true}
                      >
                        {isLoading ? 'در حال پردازش...' : 'در انتظار پرداخت...'}
                      </Button>
                    ) : status === 'failed' ? (
                      <Button
                        variant="primary"
                        size="lg"
                        className={cn('w-full bg-gradient-to-r shadow-lg hover:shadow-xl transition-all', config.gradient)}
                        onClick={onCancel}
                      >
                        سفارش مجدد
                      </Button>
                    ) : (
                      <Button
                        variant="primary"
                        size="lg"
                        className={cn('w-full bg-gradient-to-r shadow-lg hover:shadow-xl transition-all', config.gradient)}
                        onClick={onConfirm || onCancel}
                      >
                        {status === 'success' ? 'بستن' : 'متوجه شدم'}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}
