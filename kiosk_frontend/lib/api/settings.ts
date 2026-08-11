import { apiClient } from './client'
import { getServerApiBaseUrl } from './base-url'
import { writeCachedSettings } from '@/lib/kiosk-persist'
import type { ApiResponse } from '@/types'

export interface Settings {
  site_name?: string
  copyright_text?: string
  contact_phone?: string
  contact_email?: string
  address?: string
  description?: string
  logo_url?: string
  landing_theme?: 'cinema' | 'neon' | 'fresh' | 'editorial' | string
  landing_cta_text?: string
  landing_accent_color?: string
  landing_bg_color?: string
  landing_text_color?: string
  landing_muted_color?: string
  landing_background_url?: string
  service_enabled?: boolean
  coupons_enabled?: boolean
  service_fee?: number
  service_fee_dine_in?: boolean
  service_fee_takeaway?: boolean
  fulfillment_choice_enabled?: boolean
  dine_in_enabled?: boolean
  takeaway_enabled?: boolean
  cart_layout?: 'side' | 'bottom' | string
  /** Bumps when products/categories change — kiosk refreshes menu cache. */
  catalog_revision?: number
  [key: string]: any
}

function normalizeSettings(raw: unknown): Settings {
  if (!raw || typeof raw !== 'object') return {}
  return raw as Settings
}

export const settingsApi = {
  /** Client-side / browser fetch via axios (relative `/api` works behind nginx). */
  getSettings: async (): Promise<ApiResponse<Settings>> => {
    try {
      const response = await apiClient.get('/kiosk/settings/public/', {
        headers: {
          'Cache-Control': 'no-cache',
          Pragma: 'no-cache',
        },
      })
      const data = response.data as ApiResponse<Settings>
      if (data?.result) {
        writeCachedSettings(data.result)
      }
      return data
    } catch (error: any) {
      console.error('Failed to fetch settings:', error)
      return {
        result: {},
        status: 200,
        success: true,
        messages: {},
      }
    }
  },

  /**
   * Server-side fetch for metadata / SSR.
   * Uses INTERNAL_API_BASE_URL so Docker frontend can reach Django directly.
   */
  getSettingsServer: async (): Promise<Settings> => {
    const base = getServerApiBaseUrl()
    const url = `${base}/kiosk/settings/public/`
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        // Allow Next/fetch HTTP cache for SSR branding
        next: { revalidate: 60 },
      })
      if (!response.ok) {
        console.error('Server settings fetch failed:', response.status, url)
        return {}
      }
      const data = await response.json()
      return normalizeSettings(data?.result ?? data)
    } catch (error) {
      console.error('Server settings fetch error:', url, error)
      return {}
    }
  },
}

/** Prefer DB value; never invent a branded default store name. */
export function resolveSiteName(settings?: Settings | null): string {
  const name = (settings?.site_name || '').trim()
  return name
}

export function resolveSiteDescription(settings?: Settings | null): string {
  const description = (settings?.description || '').trim()
  return description
}

export function resolveCopyright(settings?: Settings | null): string {
  const text = (settings?.copyright_text || '').trim()
  return text
}
