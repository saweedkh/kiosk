import { apiClient } from './client'
import type { ApiResponse, LoginRequest, LoginResponse } from '@/types'

export const authApi = {
  login: async (credentials: LoginRequest): Promise<ApiResponse<LoginResponse>> => {
    const response = await apiClient.post<ApiResponse<LoginResponse>>(
      '/kiosk/admin/auth/login/',
      credentials
    )
    return response.data
  },

  logout: async (): Promise<ApiResponse<{ message: string }>> => {
    const response = await apiClient.post<ApiResponse<{ message: string }>>(
      '/kiosk/admin/auth/logout/',
      { message: 'خروج با موفقیت' }
    )
    return response.data
  },

  getUserInfo: async (): Promise<ApiResponse<{ user: import('@/types').User }>> => {
    const response = await apiClient.get<ApiResponse<{ user: import('@/types').User }>>(
      '/kiosk/admin/auth/user/'
    )
    return response.data
  },
}

