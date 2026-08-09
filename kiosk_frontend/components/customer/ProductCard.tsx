'use client'

import { useMemo, useState } from 'react'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { Button } from '@/components/shared/Button'
import {
  useCartStore,
  type CartSelectedOption,
} from '@/lib/store/cart-store'
import { formatCurrency, formatNumber } from '@/lib/utils'
import type { Product, ProductOptionGroup } from '@/types'

interface ProductCardProps {
  product: Product
}

export function ProductCard({ product }: ProductCardProps) {
  const { addItem, items } = useCartStore()
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
  const quantityInCart = items
    .filter((item) => item.product.id === product.id)
    .reduce((s, i) => s + i.quantity, 0)

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
    addItem(product, 1, [])
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

  const optionsExtra = buildSelectedOptions().reduce(
    (s, o) => s + Number(o.price_delta || 0),
    0
  )

  return (
    <>
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
              unoptimized={
                product.image?.startsWith('http://localhost') ||
                product.image?.startsWith('http://')
              }
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
              {hasOptions ? (
                <span className="ms-2 text-xs font-medium text-muted-foreground">
                  + آپشن
                </span>
              ) : null}
            </span>
            <span className="text-sm text-text-secondary dark:text-gray-400">
              موجودی: {formatNumber(product.stock_quantity)} عدد
              {quantityInCart > 0
                ? ` · در سبد: ${formatNumber(quantityInCart)}`
                : ''}
            </span>
          </div>

          <Button
            variant={isOutOfStock ? 'secondary' : 'primary'}
            size="md"
            className="w-full"
            onClick={handleAddToCart}
            disabled={isOutOfStock}
          >
            {isOutOfStock
              ? 'اتمام موجودی'
              : hasOptions
                ? 'انتخاب و افزودن'
                : 'افزودن به سبد'}
          </Button>
        </div>
      </motion.div>

      {showOptions ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center">
          <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-card p-5 shadow-xl">
            <h3 className="text-xl font-black">{product.name}</h3>
            <p className="mt-1 text-sm text-muted-foreground">آپشن‌های محصول را انتخاب کنید</p>

            <div className="mt-4 space-y-4">
              {groups.map((group) => (
                <div key={group.id}>
                  <p className="mb-2 font-bold">
                    {group.name}
                    {group.is_required ? (
                      <span className="ms-1 text-destructive">*</span>
                    ) : null}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {group.options.map((opt) => {
                      const active = (selectedByGroup[group.id] || []).includes(opt.id)
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => toggleOption(group, opt.id)}
                          className={`rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                            active
                              ? 'border-primary bg-primary text-white'
                              : 'border-border hover:border-primary'
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
            </div>

            {optionError ? (
              <p className="mt-3 text-sm text-destructive">{optionError}</p>
            ) : null}

            <div className="mt-5 flex items-center justify-between gap-3">
              <p className="font-bold text-primary">
                {formatCurrency(product.price + optionsExtra)}
              </p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowOptions(false)
                    setSelectedByGroup({})
                    setOptionError('')
                  }}
                >
                  انصراف
                </Button>
                <Button type="button" onClick={confirmOptions}>
                  افزودن
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
