import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Product } from '@/types'

interface CartItem {
  product: Product
  quantity: number
}

interface CartStore {
  items: CartItem[]
  addItem: (product: Product, quantity?: number) => void
  removeItem: (productId: number) => void
  updateQuantity: (productId: number, quantity: number) => void
  clearCart: () => void
  getTotalPrice: () => number
  getTotalItems: () => number
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (product, quantity = 1) => {
        const items = get().items
        const existingItem = items.find((item) => item.product.id === product.id)

        if (existingItem) {
          const newQuantity = existingItem.quantity + quantity
          // Validate: don't exceed stock quantity
          if (newQuantity > product.stock_quantity) {
            return // Don't add if it exceeds stock
          }
          set({
            items: items.map((item) =>
              item.product.id === product.id
                ? { ...item, quantity: newQuantity }
                : item
            ),
          })
        } else {
          // Validate: don't exceed stock quantity
          if (quantity > product.stock_quantity) {
            return // Don't add if it exceeds stock
          }
          set({ items: [...items, { product, quantity }] })
        }
      },
      removeItem: (productId) => {
        set({ items: get().items.filter((item) => item.product.id !== productId) })
      },
      updateQuantity: (productId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(productId)
        } else {
          const items = get().items
          const item = items.find((item) => item.product.id === productId)
          if (item) {
            // Validate: don't exceed stock quantity
            if (quantity > item.product.stock_quantity) {
              return // Don't update if it exceeds stock
            }
            set({
              items: items.map((item) =>
                item.product.id === productId ? { ...item, quantity } : item
              ),
            })
          }
        }
      },
      clearCart: () => set({ items: [] }),
      getTotalPrice: () => {
        const total = get().items.reduce(
          (sum, item) => {
            // محاسبه دقیق مبلغ هر آیتم
            const itemTotal = Number(item.product.price) * Number(item.quantity)
            return sum + itemTotal
          },
          0
        )
        // اطمینان از اینکه مبلغ دقیق است (بدون اعشار)
        return Math.round(total)
      },
      getTotalItems: () => {
        return get().items.reduce((total, item) => total + item.quantity, 0)
      },
    }),
    {
      name: 'cart-storage',
    }
  )
)

