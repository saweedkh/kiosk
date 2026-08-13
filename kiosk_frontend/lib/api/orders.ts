import { apiClient } from './client'
import type { ApiResponse, Order, OrderCreateRequest } from '@/types'

export const ordersApi = {
  createOrder: async (
    data: OrderCreateRequest,
    signal?: AbortSignal
  ): Promise<ApiResponse<Order>> => {
    // Long timeout while customer completes card payment on POS
    const response = await apiClient.post<ApiResponse<Order>>(
      '/kiosk/orders/orders/create/',
      data,
      {
        timeout: 300000,
        signal,
      }
    )
    return response.data
  },

  getOrderItems: async (orderId: number): Promise<ApiResponse<import('@/types').OrderItem[]>> => {
    const response = await apiClient.get<ApiResponse<import('@/types').OrderItem[]>>(
      `/kiosk/orders/order-items/order/${orderId}/items/`
    )
    return response.data
  },

  reprintReceipt: async (orderNumber: string): Promise<ApiResponse<any>> => {
    const response = await apiClient.post<ApiResponse<any>>(
      `/kiosk/admin/orders/receipt/${orderNumber}/reprint/`
    )
    return response.data
  },
}

