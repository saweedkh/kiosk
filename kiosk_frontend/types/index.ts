// API Response Types
export interface ApiResponse<T> {
  result: T
  status: number
  success: boolean
  messages: Record<string, string[]>
}

// Auth Types
export interface LoginRequest {
  username: string
  password: string
}

export interface LoginResponse {
  access_token: string
  refresh_token: string
  user_info: User
}

export interface User {
  id: number
  username: string
  email?: string
  first_name?: string
  last_name?: string
  is_staff: boolean
  is_active: boolean
}

// Product Types
export interface Product {
  id: number
  name: string
  description?: string
  price: number
  category?: number
  category_name?: string
  image?: string
  stock_quantity: number
  is_active: boolean
  is_in_stock: string | boolean
  created_at?: string
  updated_at?: string
}

export interface Category {
  id: number
  name: string
  parent?: number
  display_order?: number
  is_active: boolean
  children_count?: number
  created_at?: string
  updated_at?: string
}

// Order Types
export interface OrderItem {
  id: number
  product: number
  product_name: string
  quantity: number
  unit_price: number
  subtotal: number
}

export interface Order {
  id: number
  order_number: string
  session_key: string
  status: OrderStatus
  payment_status: string
  total_amount: number
  items: OrderItem[]
  created_at: string
  updated_at: string
}

export type OrderStatus = 'pending' | 'processing' | 'paid' | 'completed' | 'cancelled'

export interface OrderCreateRequest {
  items: {
    product_id: number
    quantity: number
  }[]
}

// Payment Types
export interface PaymentInitiateRequest {
  order_id: number
  amount: number
}

export interface PaymentResponse {
  id: number
  transaction_id: string
  order_id?: number
  amount: number
  status: PaymentStatus
  gateway_name?: string
  gateway_response_data?: unknown
  created_at: string
}

export type PaymentStatus = 'pending' | 'processing' | 'success' | 'failed' | 'cancelled'

// Report Types
export interface ReportFilter {
  from_date?: string
  to_date?: string
  product_id?: number
}

export interface ReportItem {
  row: number
  date: string
  product_name: string
  product_price: number
  sales_count: number
  total_amount: number
}

export interface PaginatedResponse<T> {
  count: number
  next: string | null
  previous: string | null
  page_size: number
  results: T[]
}

// Settings Types
export interface Settings {
  site_name?: string
  copyright_text?: string
  contact_phone?: string
  contact_email?: string
  address?: string
  logo_url?: string
  [key: string]: any
}

