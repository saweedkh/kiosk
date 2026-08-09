'use client'

import { useMemo, useState } from 'react'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { Button } from '@/components/shared/Button'
import {
  buildCartItemKey,
  useCartStore,
  type CartSelectedOption,
} from '@/lib/store/cart-store'
import { formatCurrency, formatNumber } from '@/lib/utils'
import type { Product, ProductOptionGroup } from '@/types'

interface ProductCardProps {
  product: Product
}

export function ProductCard({ product }: ProductCardProps) {
  const { addItem, items, updateQuantity, removeItem } = useCartStore()
  const [showOptions, setShowOptions] = useState(false)
  const [selectedByGroup, setSelectedByGroup] = useState<Record<number, number[]>>({})
  const [optionError, setOptionError] = useState('')

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

  const buildSelectedOptions = (): CartSelectedOption[] => {
    const selected: CartSelectedOption[] = []
    for (const group of groups) {
      const ids = selectedByGroup[group.id] || []
      for (const id of ids) {
        const opt = group.options.find((o) => o.id === id)
        if (opt) {
          selected.push({
            id: opt.id,
            name: opt.name,
            group_id: group.id,
            group_name: group.name,
            price_delta: opt.price_delta || 0,
          })
        }
      }
    }
    return selected
  }

  const validateGroups = (draft: Record<number, number[]>) => {
    for (const group of groups) {
      const count = (draft[group.id] || []).length
      const minSel = group.min_select || 0
      const maxSel = group.max_select || 1
      if (group.is_required && count < Math.max(minSel, 1)) {
        return `انتخاب «${group.name}» اجباری است`
      }
      if (count < minSel) return `حداقل ${minSel} گزینه برای «${group.name}»`
      if (count > maxSel) return `حداکثر ${maxSel} گزینه برای «${group.name}»`
    }
    return ''
  }

  const toggleOption = (group: ProductOptionGroup, optionId: number) => {
    setSelectedByGroup((prev) => {
      const current = prev[group.id] || []
      const maxSel = group.max_select || 1
      let next: number[]
      if (current.includes(optionId)) {
        next = current.filter((id) => id !== optionId)
      } else if (maxSel <= 1) {
        next = [optionId]
      } else if (current.length >= maxSel) {
        next = [...current.slice(1), optionId]
      } else {
        next = [...current, optionId]
      }
      const draft = { ...prev, [group.id]: next }
      setOptionError(validateGroups(draft))
      return draft
    })
  }

  const handleAddToCart = () => {
    if (isOutOfStock) return
    if (hasOptions) {
      setShowOptions(true)
      setOptionError('')
      return
    }
    addItem(product, 1)
  }

  const confirmOptions = () => {
    const err = validateGroups(selectedByGroup)
    if (err) {
      setOptionError(err)
      return
    }
    addItem(product, 1, buildSelectedOptions())
    setShowOptions(false)
    setSelectedByGroup({})
    setOptionError('')
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

        <div className="h-[2.5rem] mb-3">
          <p className="text-sm text-text-secondary dark:text-gray-400 line-clamp-2">
            {product.description || ''}
          </p>
        </div>

        <div className="flex flex-col gap-1 mb-3">
          <span className="text-xl font-bold text-primary dark:text-primary-light">
            {formatCurrency(product.price)}
          </span>
          <span className="text-sm text-text-secondary dark:text-gray-400">
            موجودی: {formatNumber(product.stock_quantity)} عدد
          </span>
        </div>

        {showOptions ? (
          <div className="space-y-3 rounded-xl border border-border dark:border-border-dark p-3 mb-3">
            {groups.map((group) => (
              <div key={group.id}>
                <p className="mb-2 text-sm font-semibold text-text dark:text-text-dark">
                  {group.name}
                  {group.is_required ? ' *' : ''}
                </p>
                <div className="flex flex-wrap gap-2">
                  {group.options
                    .filter((o) => o.is_active !== false)
                    .map((opt) => {
                      const selected = (selectedByGroup[group.id] || []).includes(opt.id)
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => toggleOption(group, opt.id)}
                          className={`rounded-lg border px-3 py-2 text-sm transition-colors ${
                            selected
                              ? 'border-primary bg-primary text-white'
                              : 'border-border dark:border-border-dark'
                          }`}
                        >
                          {opt.name}
                          {opt.price_delta
                            ? ` (${opt.price_delta > 0 ? '+' : ''}${formatCurrency(opt.price_delta)})`
                            : ''}
                        </button>
                      )
                    })}
                </div>
              </div>
            ))}
            {optionError ? (
              <p className="text-xs text-red-600">{optionError}</p>
            ) : null}
            <div className="flex gap-2">
              <Button variant="primary" size="md" className="flex-1" onClick={confirmOptions}>
                تأیید
              </Button>
              <Button
                variant="secondary"
                size="md"
                className="flex-1"
                onClick={() => {
                  setShowOptions(false)
                  setOptionError('')
                }}
              >
                انصراف
              </Button>
            </div>
          </div>
        ) : null}

        {!showOptions && quantity > 0 && !hasOptions ? (
          <div className="flex items-center gap-8">
            <button
              onClick={handleDecrease}
              className="flex-1 flex items-center justify-center gap-2 py-4 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
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
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>
        ) : !showOptions ? (
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
                <span>{hasOptions && quantity > 0 ? 'افزودن مجدد' : 'افزودن به سبد'}</span>
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
        ) : null}
      </div>
    </motion.div>
  )
}
