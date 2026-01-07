'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Image from 'next/image'
import { useCartStore } from '@/lib/store/cart-store'
import { formatCurrency, formatNumber } from '@/lib/utils'
import { Button } from '@/components/shared/Button'

interface CartViewProps {
  onCheckout: () => void
}

export function CartView({ onCheckout }: CartViewProps) {
  const [isMounted, setIsMounted] = useState(false)
  const { items, removeItem, getTotalPrice, getTotalItems } =
    useCartStore()

  useEffect(() => {
    setIsMounted(true)
  }, [])

  if (!isMounted) {
    return (
      <div className="h-full flex flex-col bg-card dark:bg-card-dark border border-border dark:border-border-dark rounded-2xl shadow-lg">
        <div className="p-6 border-b border-border dark:border-border-dark">
          <div className="flex items-center gap-3">
            <svg
              className="w-6 h-6 text-primary"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
            <h2 className="text-xl font-bold text-text dark:text-text-dark">
              سبد خرید
            </h2>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-text-secondary dark:text-gray-400">در حال بارگذاری...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-card dark:bg-card-dark border border-border dark:border-border-dark shadow-lg min-h-0">
      {/* Header */}
      <div className="p-6 border-b border-border dark:border-border-dark">
        <div className="flex items-center gap-3">
          <svg
            className="w-6 h-6 text-primary"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
            />
          </svg>
          <h2 className="text-xl font-bold text-text dark:text-text-dark">
            سبد خرید
          </h2>
          {items.length > 0 && (
            <div className="mr-auto px-3 py-1 bg-primary/10 dark:bg-primary/20 rounded-full">
              <span className="text-sm font-medium text-primary">
                {formatNumber(getTotalItems())} عدد
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Cart Items */}
      <div className="flex-1 overflow-y-auto p-4">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-8">
            <svg
              className="w-16 h-16 text-gray-300 dark:text-gray-700 mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
              />
            </svg>
            <p className="text-sm text-text-secondary dark:text-gray-400">
              سبد خرید شما خالی است
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {items.map((item, index) => (
              <motion.div
                key={item.product.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ scale: 1.02 }}
                className="group bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden"
              >
                <div className="flex gap-4 p-4">
                  {/* Product Image */}
                  <div className="relative w-24 h-24 bg-white dark:bg-gray-700 rounded-xl overflow-hidden flex-shrink-0 shadow-lg ring-2 ring-gray-100 dark:ring-gray-600 group-hover:ring-primary/20 transition-all">
                    {item.product.image ? (
                      <Image
                        src={item.product.image}
                        alt={item.product.name}
                        fill
                        className="object-cover group-hover:scale-110 transition-transform duration-300"
                        sizes="96px"
                        unoptimized={item.product.image?.startsWith('http://localhost') || item.product.image?.startsWith('http://')}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">
                        بدون تصویر
                      </div>
                    )}
                  </div>

                  {/* Product Info */}
                  <div className="flex-1 flex flex-col justify-between min-w-0">
                    <div>
                      <h4 className="font-bold text-lg text-text dark:text-text-dark mb-1.5 truncate group-hover:text-primary dark:group-hover:text-primary-light transition-colors">
                        {item.product.name}
                      </h4>
                      <div className="flex items-center gap-3 mb-2">
                        <p className="text-base font-semibold text-primary dark:text-primary-light">
                          {formatCurrency(item.product.price)}
                        </p>
                        <span className="text-xs text-text-secondary dark:text-gray-400">
                          × {formatNumber(item.quantity)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-1 bg-primary/10 dark:bg-primary/20 text-primary dark:text-primary-light rounded-full text-xs font-semibold">
                          {formatNumber(item.quantity)} عدد
                        </span>
                        <span className="text-sm font-bold text-text-secondary dark:text-gray-400">
                          = {formatCurrency(item.product.price * item.quantity)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Remove Button */}
                  <div className="flex items-center">
                    <button
                      onClick={() => removeItem(item.product.id)}
                      className="min-w-[56px] min-h-[56px] p-4 flex items-center justify-center bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-500 dark:hover:bg-red-600 hover:text-white rounded-xl transition-all duration-200 shadow-md hover:shadow-lg active:scale-95"
                      aria-label="حذف از سبد خرید"
                    >
                      <svg
                        className="w-7 h-7"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2.5}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Footer with Total and Checkout */}
      {items.length > 0 && (
        <div className="p-4 border-t border-border dark:border-border-dark space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-base font-medium text-text dark:text-text-dark">
              جمع کل:
            </span>
            <span className="text-xl font-bold text-primary dark:text-primary-light">
              {formatCurrency(getTotalPrice())}
            </span>
          </div>
          <Button
            variant="primary"
            size="md"
            className="w-full"
            onClick={onCheckout}
          >
            <span>تکمیل سفارش</span>
            <svg
              className="w-5 h-5 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </Button>
        </div>
      )}
    </div>
  )
}

