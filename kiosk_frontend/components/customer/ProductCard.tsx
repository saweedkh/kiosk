'use client'

import { useMemo, useState } from 'react'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { Button } from '@/components/shared/Button'
import { ProductOptionsDialog } from '@/components/customer/ProductOptionsDialog'
import {
  buildCartItemKey,
  useCartStore,
  type CartSelectedOption,
} from '@/lib/store/cart-store'
import { formatCurrency, formatNumber } from '@/lib/utils'
import { resolveMediaUrl } from '@/lib/media-url'
import type { Product } from '@/types'

interface ProductCardProps {
  product: Product
}

export function ProductCard({ product }: ProductCardProps) {
  const { addItem, items, updateQuantity, removeItem } = useCartStore()
  const [showOptions, setShowOptions] = useState(false)

  const groups = useMemo(
    () => (product.option_groups || []).filter((g) => g.is_active !== false),
    [product.option_groups]
  )
  const hasOptions = groups.length > 0

  const checkIsInStock = () => {
    if (product.is_in_stock === undefined) {
      return product.stock_quantity > 0 && product.is_active === true
    }
    if (typeof product.is_in_stock === 'boolean') return product.is_in_stock
    if (typeof product.is_in_stock === 'string') {
      return product.is_in_stock.toLowerCase() === 'true'
    }
    return false
  }

  const isOutOfStock = !checkIsInStock()
  const plainKey = buildCartItemKey(product.id, [])
  const plainItem = items.find((item) => item.key === plainKey)
  const quantityInCart = items
    .filter((item) => item.product.id === product.id)
    .reduce((s, i) => s + i.quantity, 0)
  const quantity = hasOptions ? quantityInCart : plainItem?.quantity || 0

  const handleAddToCart = () => {
    if (isOutOfStock) return
    if (hasOptions) {
      setShowOptions(true)
      return
    }
    addItem(product, 1)
  }

  const confirmOptions = (selected: CartSelectedOption[]) => {
    addItem(product, 1, selected)
    setShowOptions(false)
  }

  const handleIncrease = () => {
    if (isOutOfStock || hasOptions) return
    if (!plainItem) {
      addItem(product, 1)
      return
    }
    if (plainItem.quantity < product.stock_quantity) {
      updateQuantity(plainKey, plainItem.quantity + 1)
    }
  }

  const canIncrease = !hasOptions && quantity < product.stock_quantity

  const handleDecrease = () => {
    if (hasOptions || !plainItem) return
    if (plainItem.quantity > 1) {
      updateQuantity(plainKey, plainItem.quantity - 1)
    } else {
      removeItem(plainKey)
    }
  }

  const imageUrl = resolveMediaUrl(product.image)

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-shadow dark:border-border-dark dark:bg-card-dark touch-manipulation"
      >
        <div className="relative h-56 w-full bg-gray-100 dark:bg-gray-800">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={product.name}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              unoptimized={
                imageUrl.startsWith('http://localhost') ||
                imageUrl.startsWith('http://127.0.0.1') ||
                imageUrl.startsWith('http://')
              }
              onError={(e) => {
                console.error('Image load error:', imageUrl)
                e.currentTarget.style.display = 'none'
              }}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-gray-400">
              بدون تصویر
            </div>
          )}
          {hasOptions ? (
            <span className="absolute bottom-3 start-3 rounded-full bg-background/90 px-3 py-1 text-xs font-semibold text-foreground shadow-sm backdrop-blur">
              قابل سفارشی‌سازی
            </span>
          ) : null}
        </div>

        <div className="p-4">
          <h3 className="mb-2 text-lg font-bold text-text dark:text-text-dark">
            {product.name}
          </h3>

          <div className="mb-3 h-[2.5rem]">
            <p className="line-clamp-2 text-sm text-text-secondary dark:text-gray-400">
              {product.description || ''}
            </p>
          </div>

          <div className="mb-3 flex flex-col gap-1">
            <span className="text-xl font-bold text-primary dark:text-primary-light">
              {formatCurrency(product.price)}
            </span>
            <span className="text-sm text-text-secondary dark:text-gray-400">
              موجودی: {formatNumber(product.stock_quantity)} عدد
            </span>
          </div>

          {quantity > 0 && !hasOptions ? (
            <div className="flex items-center gap-8">
              <button
                onClick={handleDecrease}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-gray-200 py-4 transition-colors hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                </svg>
              </button>
              <span className="min-w-[2rem] text-center text-base font-bold text-text dark:text-text-dark">
                {formatNumber(quantity)}
              </span>
              <button
                onClick={handleIncrease}
                disabled={isOutOfStock || !canIncrease}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary py-4 text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                  <span>
                    {hasOptions && quantity > 0 ? 'افزودن مجدد' : 'افزودن به سبد'}
                  </span>
                  <svg
                    className="mr-2 h-5 w-5"
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

      {hasOptions ? (
        <ProductOptionsDialog
          product={product}
          groups={groups}
          open={showOptions}
          onOpenChange={setShowOptions}
          onConfirm={confirmOptions}
        />
      ) : null}
    </>
  )
}
