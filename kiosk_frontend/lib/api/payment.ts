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
      '/kiosk/payment/payment/status/',
      data
    )
    return response.data
  },

  abortPos: async (): Promise<void> => {
    try {
      await apiClient.post('/kiosk/payment/abort/', {}, { timeout: 4000 })
    } catch {
      // Best-effort: UI already left the waiting state.
    }
  },
}

