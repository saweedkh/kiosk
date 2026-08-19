import { apiClient } from './client'
import type { ApiResponse, PaginatedResponse } from '@/types'

export type SalesPreset = 'today' | 'yesterday' | '7d' | '30d'

export interface ReportBreakdown {
  order_status_breakdown?: Record<string, number>
  payment_status_breakdown?: Record<string, number>
  fulfillment_breakdown?: Record<string, number>
  gateway_breakdown?: Array<{ gateway_name: string; count: number; amount: number }>
  total_service_fee?: number
  total_packaging_fee?: number
  total_discount?: number
  coupon_usage_count?: number
}

export interface SalesReportSummary extends ReportBreakdown {
  total_sales: number
  paid_orders?: number
  total_orders: number
  average_order_value: number
  total_transactions: number
  successful_transactions: number
  failed_transactions: number
  successful_amount: number
  start_date?: string | null
  end_date?: string | null
  start_date_jalali?: string
  end_date_jalali?: string
  range_start_jalali?: string
  range_end_jalali?: string
  preset?: SalesPreset | string
}

export interface SalesReport extends PaginatedResponse<SalesReportOrder> {
  summary: SalesReportSummary
}

export interface SalesReportOrder {
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
  created_at_jalali?: string
  updated_at_jalali?: string
}

export interface ProductReportSummary {
  total_products: number
  active_products: number
  low_stock_count?: number
  out_of_stock_count?: number
  generated_at_jalali?: string
}

export interface ProductReport extends PaginatedResponse<ProductReportRow> {
  summary: ProductReportSummary
}

export interface ProductReportRow {
  id: number
  name: string
  description?: string
  price: number
  stock_quantity: number
  is_active: boolean
  category_name: string
  total_sold: number
  total_revenue: number
  is_low_stock?: boolean
  is_out_of_stock?: boolean
}

export interface StockReportSummary {
  total_stock_value: number
  total_items: number
  low_stock_count?: number
  out_of_stock_count?: number
  generated_at_jalali?: string
}

export interface StockReport extends PaginatedResponse<StockReportRow> {
  summary: StockReportSummary
}

export interface StockReportRow {
  id: number
  name: string
  category_name: string
  stock_quantity: number
  price: number
  stock_value: number
  is_active: boolean
  is_low_stock: boolean
  is_out_of_stock: boolean
}

export interface DailyReportSummary extends ReportBreakdown {
  date: string
  date_jalali?: string
  business_day_start_hour: number
  business_day_start_minute?: number
  business_day_start_time?: string
  business_day_end_hour: number
  range_start: string
  range_end: string
  range_start_jalali?: string
  range_end_jalali?: string
  total_sales: number
  total_orders: number
  paid_orders?: number
  average_order_value?: number
  total_transactions: number
  top_products?: Array<{ product_id: number; product_name: string; qty: number; revenue: number }>
}

export interface DailyReport extends PaginatedResponse<DailyReportOrder> {
  summary: DailyReportSummary
}

export interface DailyReportOrder {
  id: number
  order_number: string
  total_amount: number
  status?: string
  payment_status: string
  created_at: string
  created_at_jalali?: string
}

export interface HourlyReportSummary {
  date: string
  date_jalali?: string
  business_day_start_hour: number
  business_day_start_minute?: number
  business_day_start_time?: string
  business_day_end_hour: number
  range_start: string
  range_end: string
  range_start_jalali?: string
  range_end_jalali?: string
  total_sales: number
  total_orders: number
  paid_orders?: number
  successful_orders: number
  failed_orders?: number
  average_order_value?: number
  total_transactions: number
}

export interface HourlyReportRow {
  hour_label: string
  hour_start: string
  hour_end: string
  hour_start_jalali?: string
  hour_end_jalali?: string
  total_orders: number
  successful_orders: number
  failed_orders?: number
  total_transactions: number
  total_sales: number
}

export interface HourlyReport extends PaginatedResponse<HourlyReportRow> {
  summary: HourlyReportSummary
}

export interface ExceptionReport {
  date: string
  date_jalali?: string
  business_day_start_hour: number
  business_day_start_minute?: number
  business_day_start_time?: string
  range_start: string
  range_end: string
  range_start_jalali?: string
  range_end_jalali?: string
  failed_payments_count: number
  failed_payments_amount: number
  stuck_orders_count: number
  low_stock_count: number
  inactive_with_stock_count: number
  failed_orders: Array<{
    id: number
    order_number: string
    total_amount: number
    status: string
    payment_status: string
    error_message?: string
    created_at?: string
    created_at_jalali?: string
  }>
  stuck_orders: Array<{
    id: number
    order_number: string
    total_amount: number
    status: string
    payment_status: string
    created_at?: string
    created_at_jalali?: string
  }>
  low_stock_products: Array<{
    id: number
    name: string
    stock_quantity: number
    is_active: boolean
  }>
  generated_at_jalali?: string
}

function unwrapExportUrl(data: unknown): string {
  const payload = data as { result?: { file_url?: string }; file_url?: string; message?: string }
  return payload.result?.file_url || payload.file_url || ''
}

export const reportsApi = {
  getSalesReport: async (params?: {
    start_date?: string
    end_date?: string
    preset?: SalesPreset
    business_day_start_hour?: number
    business_day_start_minute?: number
    page?: number
    page_size?: number
  }): Promise<ApiResponse<SalesReport>> => {
    const response = await apiClient.get('/kiosk/admin/reports/sales/', { params })
    return response.data
  },

  getProductReport: async (params?: {
    page?: number
    page_size?: number
  }): Promise<ApiResponse<ProductReport>> => {
    const response = await apiClient.get('/kiosk/admin/reports/products/', { params })
    return response.data
  },

  getStockReport: async (params?: {
    page?: number
    page_size?: number
  }): Promise<ApiResponse<StockReport>> => {
    const response = await apiClient.get('/kiosk/admin/reports/stock/', { params })
    return response.data
  },

  getDailyReport: async (params?: {
    date?: string
    business_day_start_hour?: number
    business_day_start_minute?: number
    page?: number
    page_size?: number
  }): Promise<ApiResponse<DailyReport>> => {
    const response = await apiClient.get('/kiosk/admin/reports/daily/', { params })
    return response.data
  },

  getHourlyReport: async (params?: {
    date?: string
    business_day_start_hour?: number
    business_day_start_minute?: number
    page?: number
    page_size?: number
  }): Promise<ApiResponse<HourlyReport>> => {
    const response = await apiClient.get('/kiosk/admin/reports/hourly/', { params })
    return response.data
  },

  getExceptionReport: async (params?: {
    business_day_start_hour?: number
    business_day_start_minute?: number
  }): Promise<ApiResponse<ExceptionReport>> => {
    const response = await apiClient.get('/kiosk/admin/reports/exceptions/', { params })
    return response.data
  },

  exportSalesReport: async (params?: {
    start_date?: string
    end_date?: string
    preset?: SalesPreset
    business_day_start_hour?: number
    business_day_start_minute?: number
  }): Promise<string> => {
    const response = await apiClient.get('/kiosk/admin/reports/sales/export/', { params })
    return unwrapExportUrl(response.data)
  },

  exportProductReport: async (): Promise<string> => {
    const response = await apiClient.get('/kiosk/admin/reports/products/export/')
    return unwrapExportUrl(response.data)
  },

  exportStockReport: async (): Promise<string> => {
    const response = await apiClient.get('/kiosk/admin/reports/stock/export/')
    return unwrapExportUrl(response.data)
  },

  exportDailyReport: async (params?: {
    date?: string
    business_day_start_hour?: number
    business_day_start_minute?: number
  }): Promise<string> => {
    const response = await apiClient.get('/kiosk/admin/reports/daily/export/', { params })
    return unwrapExportUrl(response.data)
  },

  exportHourlyReport: async (params?: {
    date?: string
    business_day_start_hour?: number
    business_day_start_minute?: number
  }): Promise<string> => {
    const response = await apiClient.get('/kiosk/admin/reports/hourly/export/', { params })
    return unwrapExportUrl(response.data)
  },
}

export const SALES_PRESET_LABELS: Record<SalesPreset, string> = {
  today: 'امروز',
  yesterday: 'دیروز',
  '7d': '۷ روز',
  '30d': '۳۰ روز',
}

/** Prefer server-side Jalali (Tehran) when available. */
export function formatReportDateTime(
  value?: string | null,
  jalali?: string | null
): string {
  if (jalali && jalali.trim()) return jalali
  if (!value) return '—'
  return value
}
