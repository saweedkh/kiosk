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
  is_superuser?: boolean
  groups?: { id: number; name: string }[]
  permissions?: string[]
  bale_chat_id?: string
  bale_enabled?: boolean
}

// Product Types
export interface ProductOption {
  id: number
  name: string
  price_delta: number
  display_order?: number
  is_active?: boolean
}

export interface ProductOptionGroup {
  id: number
  name: string
  min_select: number
  max_select: number
  is_required: boolean
  display_order?: number
  is_active?: boolean
  options: ProductOption[]
}

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
  service_fee_applicable?: boolean
  option_groups?: ProductOptionGroup[]
  created_at?: string
  updated_at?: string
}

export interface Category {
  id: number
  name: string
  parent?: number
  display_order?: number
  is_active: boolean
  image?: string | null
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
  selected_options?: {
    id: number
    name: string
    group_name?: string
    price_delta: number
  }[]
}

export interface Order {
  id: number
  order_number: string
  session_key: string
  status: OrderStatus
  payment_status: string
  total_amount: number
  service_fee?: number
  packaging_fee?: number
  discount_amount?: number
  coupon_code?: string
  landing_theme?: string
  fulfillment_type?: FulfillmentType
  receipt_number?: number
  transaction_id?: string
  payment_method?: string
  gateway_name?: string
  items: OrderItem[]
  created_at: string
  updated_at: string
}

export type OrderStatus = 'pending' | 'processing' | 'paid' | 'completed' | 'cancelled'

export type FulfillmentType = 'dine_in' | 'takeaway'

export interface OrderCreateRequest {
  items: {
    product_id: number
    quantity: number
    option_ids?: number[]
  }[]
  fulfillment_type: FulfillmentType
  coupon_code?: string
  landing_theme?: string
}

export interface Coupon {
  id: number
  code: string
  discount_type: 'percent' | 'fixed'
  value: number
  min_order_amount: number
  max_discount_amount?: number | null
  max_uses?: number | null
  used_count: number
  valid_from?: string | null
  valid_until?: string | null
  is_active: boolean
  created_at?: string
  updated_at?: string
}

export interface CouponPreview {
  code: string
  discount_type: string
  value: number
  discount_amount: number
  items_total: number
  service_fee: number
  packaging_fee?: number
  payable: number
}

export interface LiveDashboardData {
  live: {
    date: string
    sales_today: number
    orders_today: number
    avg_basket: number
    payment_attempts: number
    cancelled_payments: number
    cancel_rate: number
    pending_payments: number
    sales_yesterday?: number
    orders_yesterday?: number
    sales_delta_pct?: number | null
    orders_delta_pct?: number | null
    dine_in_orders?: number
    takeaway_orders?: number
  }
  heatmap: {
    days: number
    max_orders: number
    hours: { hour: number; orders: number; sales: number; intensity: number }[]
  }
  trend?: {
    days: number
    points: { date: string; sales: number; orders: number }[]
  }
  top_products?: {
    product_id: number | null
    name: string
    quantity: number
    revenue: number
  }[]
  recent_orders?: {
    id: number
    order_number: string
    total_amount: number
    payment_status: string
    fulfillment_type: string
    created_at: string
  }[]
}

export interface SystemHealthData {
  overall: string
  checked_at: string
  components: {
    pos: HealthComponent
    printer: HealthComponent
    bale: HealthComponent & { raw?: unknown }
  }
}

export interface HealthComponent {
  ok: boolean
  status: string
  latency_ms?: number | null
  host?: string | null
  port?: number | null
  error?: string | null
  message?: string
  api_ok?: boolean
  worker_ok?: boolean
  bot_username?: string
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
export type LandingTheme = 'cinema' | 'neon' | 'fresh' | 'editorial'

export interface Settings {
  site_name?: string
  copyright_text?: string
  contact_phone?: string
  contact_email?: string
  address?: string
  description?: string
  logo_url?: string
  landing_theme?: LandingTheme | string
  landing_cta_text?: string
  landing_accent_color?: string
  landing_bg_color?: string
  landing_text_color?: string
  landing_muted_color?: string
  landing_background_url?: string
  landing_background?: string
  landing_background_file?: File
  landing_background_preview?: string
  logo_file?: File
  logo_preview?: string
  logo?: string
  receipt_header?: string
  receipt_footer?: string
  receipt_template?: 'modern' | 'classic' | 'minimal' | 'elegant' | 'bold' | 'ticket' | 'market' | 'banner' | string
  receipt_template_mode?: 'normal' | 'random' | string
  active_receipt_template?: string
  receipt_copy_mode?: 'single' | 'dual' | string
  pos_ip?: string
  pos_port?: number
  pos_payment_mode?: 'mock' | 'real' | string
  mock_payment_delay?: number
  mock_payment_success_rate?: number
  printer_enabled?: boolean
  printer_ip?: string
  printer_port?: number
  service_enabled?: boolean
  coupons_enabled?: boolean
  service_fee?: number
  service_title_dine_in?: string
  service_title_takeaway?: string
  service_fee_dine_in_amount?: number
  service_fee_takeaway_amount?: number
  service_fee_dine_in?: boolean
  service_fee_takeaway?: boolean
  packaging_enabled?: boolean
  packaging_title_dine_in?: string
  packaging_title_takeaway?: string
  packaging_fee_dine_in_amount?: number
  packaging_fee_takeaway_amount?: number
  packaging_fee_dine_in?: boolean
  packaging_fee_takeaway?: boolean
  fulfillment_choice_enabled?: boolean
  dine_in_enabled?: boolean
  takeaway_enabled?: boolean
  kiosk_payment_cancel_enabled?: boolean
  business_day_start_hour?: number
  business_day_start_minute?: number
  cart_layout?: 'side' | 'bottom' | string
  catalog_revision?: number
  receipt_number_mode?: 'manual' | 'automatic' | string
  last_receipt_number?: number
  next_receipt_number?: number
  [key: string]: any
}

