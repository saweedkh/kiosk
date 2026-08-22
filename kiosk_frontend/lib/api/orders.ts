import { apiClient } from './client'
import type { ApiResponse, Order, OrderCreateRequest, OrderStatus } from '@/types'

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

  getOrderPaymentStatus: async (
    orderId: number
  ): Promise<ApiResponse<{
    id: number
    order_number: string
    payment_status: string
    status: string
  }>> => {
    const response = await apiClient.get<
      ApiResponse<{
        id: number
        order_number: string
        payment_status: string
        status: string
      }>
    >(`/kiosk/orders/orders/${orderId}/status/`, { timeout: 4000 })
    return response.data
  },

  getAdminOrder: async (orderId: number): Promise<ApiResponse<Order>> => {
    const response = await apiClient.get<ApiResponse<Order>>(
      `/kiosk/admin/orders/${orderId}/`
    )
    return response.data
  },

  updateAdminOrderStatus: async (
    orderId: number,
    status: OrderStatus
  ): Promise<ApiResponse<Order>> => {
    const response = await apiClient.put<ApiResponse<Order>>(
      `/kiosk/admin/orders/${orderId}/update-status/`,
      { status }
    )
    return response.data
  },

  updateAdminOrderPaymentStatus: async (
    orderId: number,
    paymentStatus: string
  ): Promise<ApiResponse<Order>> => {
    const response = await apiClient.put<ApiResponse<Order>>(
      `/kiosk/admin/orders/${orderId}/update-payment-status/`,
      { payment_status: paymentStatus }
    )
    return response.data
  },
}

