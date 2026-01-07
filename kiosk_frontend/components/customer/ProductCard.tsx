'use client'

import Image from 'next/image'
import { motion } from 'framer-motion'
import { Button } from '@/components/shared/Button'
import { useCartStore } from '@/lib/store/cart-store'
import { formatCurrency, formatNumber } from '@/lib/utils'
import type { Product } from '@/types'

interface ProductCardProps {
  product: Product
}

export function ProductCard({ product }: ProductCardProps) {
  const { addItem, items, updateQuantity, removeItem } = useCartStore()
  
  // Check stock status: is_in_stock can be boolean or string
  const checkIsInStock = () => {
    if (product.is_in_stock === undefined) {
      // Fallback to stock_quantity and is_active if is_in_stock is not provided
      return product.stock_quantity > 0 && product.is_active === true
    }
    // Check is_in_stock (can be boolean true/false or string "true"/"false")
    if (typeof product.is_in_stock === 'boolean') {
      return product.is_in_stock
    }
    if (typeof product.is_in_stock === 'string') {
      return product.is_in_stock.toLowerCase() === 'true'
    }
    return false
  }
  
  const isOutOfStock = !checkIsInStock()
  const cartItem = items.find(item => item.product.id === product.id)
  const quantity = cartItem?.quantity || 0

  const handleAddToCart = () => {
    if (!isOutOfStock) {
      addItem(product, 1)
    }
  }

  const handleIncrease = () => {
    if (!isOutOfStock && quantity < product.stock_quantity) {
      if (quantity === 0) {
        addItem(product, 1)
      } else {
        updateQuantity(product.id, quantity + 1)
      }
    }
  }

  const canIncrease = quantity < product.stock_quantity

  const handleDecrease = () => {
    if (quantity > 1) {
      updateQuantity(product.id, quantity - 1)
    } else if (quantity === 1) {
      removeItem(product.id)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      className="bg-card dark:bg-card-dark rounded-2xl overflow-hidden border border-border dark:border-border-dark shadow-sm hover:shadow-lg transition-shadow"
    >
      <div className="relative w-full h-56 bg-gray-100 dark:bg-gray-800">
        {product.image ? (
          <Image
            src={product.image}
            alt={product.name}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            unoptimized={product.image?.startsWith('http://localhost') || product.image?.startsWith('http://')}
            onError={(e) => {
              console.error('Image load error:', product.image)
              e.currentTarget.style.display = 'none'
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            بدون تصویر
          </div>
        )}
      </div>

      <div className="p-4">
        <h3 className="text-lg font-bold text-text dark:text-text-dark mb-2">
          {product.name}
        </h3>

        {/* Description - Fixed height, max 2 lines */}
        <div className="h-[2.5rem] mb-3">
          <p className="text-sm text-text-secondary dark:text-gray-400 line-clamp-2">
            {product.description || ''}
          </p>
        </div>

        <div className="flex items-center justify-between mb-3">
          <span className="text-xl font-bold text-primary dark:text-primary-light">
            {formatCurrency(product.price)}
          </span>
          <span className="text-sm text-text-secondary dark:text-gray-400">
            موجودی: {formatNumber(product.stock_quantity)} عدد
          </span>
        </div>

        {quantity > 0 ? (
          <div className="flex items-center gap-8">
            <button
              onClick={handleDecrease}
              className="flex-1 flex items-center justify-center gap-2 py-4 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg transition-colors"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M20 12H4"
                />
              </svg>
            </button>
            <span className="text-base font-bold text-text dark:text-text-dark min-w-[2rem] text-center">
              {formatNumber(quantity)}
            </span>
            <button
              onClick={handleIncrease}
              disabled={isOutOfStock || !canIncrease}
              className="flex-1 flex items-center justify-center gap-2 py-4 bg-primary hover:bg-primary/90 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
            </button>
          </div>
        ) : (
          <Button
            variant={isOutOfStock ? 'secondary' : 'primary'}
            size="md"
            className="w-full"
            onClick={handleAddToCart}
            disabled={isOutOfStock}
          >
            {isOutOfStock ? (
              'اتمام موجودی'
            ) : (
              <>
                <span>افزودن به سبد</span>
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
                    d="M12 4v16m8-8H4"
                  />
                </svg>
              </>
            )}
          </Button>
        )}
      </div>
    </motion.div>
  )
}

