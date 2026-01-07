import { apiClient } from './client'
import type { ApiResponse } from '@/types'

export interface Settings {
  site_name?: string
  copyright_text?: string
  contact_phone?: string
  contact_email?: string
  address?: string
  [key: string]: any
}

export const settingsApi = {
  // دریافت تنظیمات (برای کاربر عادی - public endpoint)
  getSettings: async (): Promise<ApiResponse<Settings>> => {
    try {
      const response = await apiClient.get('/kiosk/settings/public/')
      return response.data
    } catch (error: any) {
      console.error('Failed to fetch settings:', error)
      // Return empty settings if fails
      return {
        result: {},
        status: 200,
        success: true,
        messages: {},
      }
    }
  },
}

