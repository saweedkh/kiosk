import { apiClient } from './client'
import type { ApiResponse, PaymentResponse, PaymentStatus } from '@/types'

export interface PaymentStatusRequest {
  transaction_id: string
}

export interface PaymentStatusResponse {
  status: PaymentStatus
  transaction_id: string
  order_id?: number
  amount: number
  message?: string
}

export const paymentApi = {
  getPaymentStatus: async (
    data: PaymentStatusRequest
  ): Promise<ApiResponse<PaymentStatusResponse>> => {
    const response = await apiClient.post<ApiResponse<PaymentStatusResponse>>(
      '/api/kiosk/payment/payment/status/',
      data
    )
    return response.data
  },
}

