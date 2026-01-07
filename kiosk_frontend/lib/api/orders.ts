import { apiClient } from './client'
import type { ApiResponse, Order, OrderCreateRequest } from '@/types'

export const ordersApi = {
  createOrder: async (data: OrderCreateRequest): Promise<ApiResponse<Order>> => {
    // Set timeout to 5 minutes (300000ms) since the API waits for card payment
    const response = await apiClient.post<ApiResponse<Order>>(
      '/api/kiosk/orders/orders/create/',
      data,
      {
        timeout: 300000, // 5 minutes timeout
      }
    )
    return response.data
  },

  getOrderItems: async (orderId: number): Promise<ApiResponse<import('@/types').OrderItem[]>> => {
    const response = await apiClient.get<ApiResponse<import('@/types').OrderItem[]>>(
      `/api/kiosk/orders/order-items/order/${orderId}/items/`
    )
    return response.data
  },

  reprintReceipt: async (orderNumber: string): Promise<ApiResponse<any>> => {
    const response = await apiClient.post<ApiResponse<any>>(
      `/api/kiosk/admin/orders/receipt/${orderNumber}/reprint/`
    )
    return response.data
  },
}

