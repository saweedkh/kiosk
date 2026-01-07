import { apiClient } from './client'
import type { ApiResponse, PaginatedResponse } from '@/types'

export interface SalesReport {
  count: number
  next: string | null
  previous: string | null
  page_size: number
  current_page?: number
  total_pages?: number
  results: Array<{
    id: number
    order_number: string
    total_amount: number
    status: string
    payment_status: string
    transaction_id?: string | null
    gateway_name?: string | null
    payment_method?: string | null
    created_at: string
    updated_at?: string
  }>
  summary: {
    total_sales: number
    total_orders: number
    average_order_value: number
    total_transactions: number
    successful_transactions: number
    failed_transactions: number
    successful_amount: number
    start_date?: string | null
    end_date?: string | null
  }
}

export interface ProductReport {
  count: number
  next: string | null
  previous: string | null
  page_size: number
  current_page?: number
  total_pages?: number
  results: Array<{
    id: number
    name: string
    description?: string
    price: number
    stock_quantity: number
    is_active: boolean
    category_name: string
    total_sold: number
    total_revenue: number
  }>
  summary: {
    total_products: number
    active_products: number
  }
}

export interface StockReport {
  count: number
  next: string | null
  previous: string | null
  page_size: number
  current_page?: number
  total_pages?: number
  results: Array<{
    id: number
    name: string
    category_name: string
    stock_quantity: number
    price: number
    stock_value: number
    is_active: boolean
    is_low_stock: boolean
    is_out_of_stock: boolean
  }>
  summary: {
    total_stock_value: number
    total_items: number
  }
}

export interface DailyReport {
  count: number
  next: string | null
  previous: string | null
  page_size: number
  current_page?: number
  total_pages?: number
  results: Array<{
    id?: number
    order_number: string
    total_amount: number
    status?: string
    payment_status: string
    transaction_id?: string | null
    gateway_name?: string | null
    payment_method?: string | null
    created_at: string
    updated_at?: string
  }>
  summary: {
    date: string
    total_sales: number
    total_orders: number
    total_transactions: number
  }
}

export const reportsApi = {
  // گزارش فروش
  getSalesReport: async (params?: {
    start_date?: string
    end_date?: string
    page?: number
    page_size?: number
  }): Promise<ApiResponse<SalesReport>> => {
    const response = await apiClient.get('/api/kiosk/admin/reports/sales/', { params })
    return response.data
  },

  // گزارش محصولات
  getProductReport: async (params?: {
    page?: number
    page_size?: number
  }): Promise<ApiResponse<ProductReport>> => {
    const response = await apiClient.get('/api/kiosk/admin/reports/products/', { params })
    return response.data
  },

  // گزارش موجودی
  getStockReport: async (params?: {
    page?: number
    page_size?: number
  }): Promise<ApiResponse<StockReport>> => {
    const response = await apiClient.get('/api/kiosk/admin/reports/stock/', { params })
    return response.data
  },

  // گزارش روزانه
  getDailyReport: async (params?: {
    date?: string
    page?: number
    page_size?: number
  }): Promise<ApiResponse<DailyReport>> => {
    const response = await apiClient.get('/api/kiosk/admin/reports/daily/', { params })
    return response.data
  },

  // Export functions
  exportSalesReport: async (params?: {
    start_date?: string
    end_date?: string
  }): Promise<string> => {
    const response = await apiClient.get('/api/kiosk/admin/reports/sales/export/', {
      params,
    })
    // API returns JSON with file_url
    return response.data.result?.file_url || response.data.file_url || ''
  },


  exportProductReport: async (): Promise<string> => {
    const response = await apiClient.get('/api/kiosk/admin/reports/products/export/', {})
    // API returns JSON with file_url
    return response.data.result?.file_url || response.data.file_url || ''
  },

  exportStockReport: async (): Promise<string> => {
    const response = await apiClient.get('/api/kiosk/admin/reports/stock/export/', {})
    // API returns JSON with file_url
    return response.data.result?.file_url || response.data.file_url || ''
  },

  exportDailyReport: async (params?: {
    date?: string
  }): Promise<string> => {
    const response = await apiClient.get('/api/kiosk/admin/reports/daily/export/', {
      params,
    })
    // API returns JSON with file_url
    return response.data.result?.file_url || response.data.file_url || ''
  },
}
