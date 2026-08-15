import { apiClient } from './client'
import type {
  ApiResponse,
  Coupon,
  CouponPreview,
  LiveDashboardData,
  ProductOptionGroup,
  SystemHealthData,
} from '@/types'

export interface PosTestConnectionResult {
  ok: boolean
  success?: boolean
  busy?: boolean
  timed_out?: boolean
  reset?: boolean
  status?: string
  latency_ms?: number | null
  host?: string | null
  port?: number | null
  error?: string | null
  message?: string
  connection_type?: string
}

export const dashboardApi = {
  getLive: async (days = 7): Promise<LiveDashboardData> => {
    const response = await apiClient.get('/kiosk/admin/dashboard/live/', {
      params: { days },
    })
    // DRF Response may be wrapped by custom renderer
    const data = response.data
    return (data?.result ?? data) as LiveDashboardData
  },

  getHealth: async (): Promise<SystemHealthData> => {
    const response = await apiClient.get('/kiosk/admin/dashboard/health/', {
      timeout: 10_000,
    })
    const data = response.data
    return (data?.result ?? data) as SystemHealthData
  },

  testPosConnection: async (params?: {
    pos_ip?: string
    pos_port?: number | string
  }): Promise<PosTestConnectionResult> => {
    const response = await apiClient.post(
      '/kiosk/admin/dashboard/health/pos-test/',
      {
        pos_ip: params?.pos_ip || undefined,
        pos_port: params?.pos_port || undefined,
      },
      { timeout: 8_000 }
    )
    const data = response.data
    return (data?.result ?? data) as PosTestConnectionResult
  },

  resetPosConnection: async (): Promise<PosTestConnectionResult> => {
    const response = await apiClient.post(
      '/kiosk/admin/dashboard/health/pos-reset/',
      {},
      { timeout: 8_000 }
    )
    const data = response.data
    return (data?.result ?? data) as PosTestConnectionResult
  },
}

export const couponsApi = {
  list: async (): Promise<Coupon[]> => {
    const response = await apiClient.get('/kiosk/admin/coupons/')
    const data = response.data
    const payload = data?.result ?? data
    if (Array.isArray(payload)) return payload
    if (Array.isArray(payload?.results)) return payload.results
    return []
  },

  create: async (body: Partial<Coupon>): Promise<ApiResponse<Coupon>> => {
    const response = await apiClient.post('/kiosk/admin/coupons/', body)
    return response.data
  },

  update: async (id: number, body: Partial<Coupon>): Promise<ApiResponse<Coupon>> => {
    const response = await apiClient.patch(`/kiosk/admin/coupons/${id}/`, body)
    return response.data
  },

  remove: async (id: number): Promise<void> => {
    await apiClient.delete(`/kiosk/admin/coupons/${id}/`)
  },

  validate: async (payload: {
    code: string
    items_total: number
    service_fee?: number
    packaging_fee?: number
  }): Promise<CouponPreview> => {
    const response = await apiClient.post('/kiosk/admin/coupons/validate/', payload)
    const data = response.data
    return (data?.result ?? data) as CouponPreview
  },
}

export const productOptionsApi = {
  listGroups: async (productId: number): Promise<ProductOptionGroup[]> => {
    const response = await apiClient.get(
      `/kiosk/admin/products/${productId}/option-groups/`
    )
    const data = response.data
    const payload = data?.result ?? data
    if (Array.isArray(payload)) return payload
    if (Array.isArray(payload?.results)) return payload.results
    return []
  },

  saveGroup: async (
    productId: number,
    body: {
      name: string
      min_select?: number
      max_select?: number
      is_required?: boolean
      display_order?: number
      is_active?: boolean
      options?: {
        name: string
        price_delta?: number
        display_order?: number
        is_active?: boolean
      }[]
    },
    groupId?: number
  ): Promise<ProductOptionGroup> => {
    if (groupId) {
      const response = await apiClient.patch(
        `/kiosk/admin/products/${productId}/option-groups/${groupId}/`,
        { ...body, product: productId }
      )
      const data = response.data
      return (data?.result ?? data) as ProductOptionGroup
    }
    const response = await apiClient.post(
      `/kiosk/admin/products/${productId}/option-groups/`,
      { ...body, product: productId }
    )
    const data = response.data
    return (data?.result ?? data) as ProductOptionGroup
  },

  deleteGroup: async (productId: number, groupId: number): Promise<void> => {
    await apiClient.delete(
      `/kiosk/admin/products/${productId}/option-groups/${groupId}/`
    )
  },
}

export const analyticsApi = {
  trackLanding: async (payload: {
    event_type: 'impression' | 'start'
    theme: string
    session_key?: string
  }): Promise<void> => {
    try {
      await apiClient.post('/kiosk/analytics/landing-event/', payload)
    } catch {
      // Non-blocking analytics
    }
  },
}
