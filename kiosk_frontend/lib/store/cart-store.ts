import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Product, ProductOption } from '@/types'

export interface CartSelectedOption {
  id: number
  name: string
  group_id: number
  group_name: string
  price_delta: number
}

export interface CartItem {
  key: string
  product: Product
  quantity: number
  selectedOptions: CartSelectedOption[]
}

function optionsKey(optionIds: number[]) {
  return [...optionIds].sort((a, b) => a - b).join(',')
}

export function buildCartItemKey(productId: number, optionIds: number[] = []) {
  return `${productId}:${optionsKey(optionIds)}`
}

function lineUnitPrice(product: Product, selectedOptions: CartSelectedOption[]) {
  const extra = selectedOptions.reduce((s, o) => s + Number(o.price_delta || 0), 0)
  return Math.round(Number(product.price) + extra)
}

interface CartStore {
  items: CartItem[]
  couponCode: string
  discountAmount: number
  addItem: (
    product: Product,
    quantity?: number,
    selectedOptions?: CartSelectedOption[]
  ) => void
  removeItem: (key: string) => void
  updateQuantity: (key: string, quantity: number) => void
  clearCart: () => void
  setCoupon: (code: string, discountAmount: number) => void
  clearCoupon: () => void
  getTotalPrice: () => number
  getTotalItems: () => number
  getLineUnitPrice: (item: CartItem) => number
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      couponCode: '',
      discountAmount: 0,
      addItem: (product, quantity = 1, selectedOptions = []) => {
        const key = buildCartItemKey(
          product.id,
          selectedOptions.map((o) => o.id)
        )
        const items = get().items
        const existingItem = items.find((item) => item.key === key)

        if (existingItem) {
          const newQuantity = existingItem.quantity + quantity
          if (newQuantity > product.stock_quantity) return
          set({
            items: items.map((item) =>
              item.key === key ? { ...item, quantity: newQuantity } : item
            ),
          })
        } else {
          if (quantity > product.stock_quantity) return
          set({
            items: [
              ...items,
              { key, product, quantity, selectedOptions: [...selectedOptions] },
            ],
          })
        }
      },
      removeItem: (key) => {
        set({ items: get().items.filter((item) => item.key !== key) })
      },
      updateQuantity: (key, quantity) => {
        if (quantity <= 0) {
          get().removeItem(key)
          return
        }
        const items = get().items
        const item = items.find((i) => i.key === key)
        if (!item) return
        if (quantity > item.product.stock_quantity) return
        set({
          items: items.map((i) => (i.key === key ? { ...i, quantity } : i)),
        })
      },
      clearCart: () => set({ items: [], couponCode: '', discountAmount: 0 }),
      setCoupon: (code, discountAmount) =>
        set({
          couponCode: (code || '').trim().toUpperCase(),
          discountAmount: Math.max(0, Math.round(discountAmount || 0)),
        }),
      clearCoupon: () => set({ couponCode: '', discountAmount: 0 }),
      getLineUnitPrice: (item) => lineUnitPrice(item.product, item.selectedOptions),
      getTotalPrice: () => {
        const total = get().items.reduce((sum, item) => {
          return sum + lineUnitPrice(item.product, item.selectedOptions) * item.quantity
        }, 0)
        return Math.round(total)
      },
      getTotalItems: () =>
        get().items.reduce((total, item) => total + item.quantity, 0),
    }),
    {
      name: 'cart-storage',
      // migrate old cart shape { product, quantity } without key/options
      merge: (persisted: any, current) => {
        const p = persisted?.state ?? persisted
        const rawItems = Array.isArray(p?.items) ? p.items : []
        const items: CartItem[] = rawItems.map((item: any) => {
          if (item?.key && item?.product) {
            return {
              key: item.key,
              product: item.product,
              quantity: item.quantity || 1,
              selectedOptions: Array.isArray(item.selectedOptions)
                ? item.selectedOptions
                : [],
            }
          }
          if (item?.product?.id) {
            return {
              key: buildCartItemKey(item.product.id, []),
              product: item.product,
              quantity: item.quantity || 1,
              selectedOptions: [],
            }
          }
          return null
        }).filter(Boolean)
        return {
          ...current,
          ...p,
          items,
          couponCode: p?.couponCode || '',
          discountAmount: p?.discountAmount || 0,
        }
      },
    }
  )
)

export type { ProductOption }
