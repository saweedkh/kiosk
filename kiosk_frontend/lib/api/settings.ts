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
  /** Show "لغو پرداخت" on kiosk payment modal (default off). */
  kiosk_payment_cancel_enabled?: boolean
  cart_layout?: 'side' | 'bottom' | string
  /** Bumps when products/categories change — kiosk refreshes menu cache. */
  catalog_revision?: number
  [key: string]: any
}

function normalizeSettings(raw: unknown): Settings {
  if (!raw || typeof raw !== 'object') return {}
  return coerceSettingsBooleans(raw as Settings)
}

/** FormData / JSON quirks sometimes yield "false"/"true" strings — normalize. */
function coerceBool(value: unknown): boolean | undefined {
  if (value === undefined || value === null || value === '') return undefined
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value !== 0
  if (typeof value === 'string') {
    const v = value.trim().toLowerCase()
    if (['true', '1', 'yes', 'on'].includes(v)) return true
    if (['false', '0', 'no', 'off'].includes(v)) return false
  }
  return Boolean(value)
}

const BOOLEAN_SETTING_KEYS = [
  'service_enabled',
  'coupons_enabled',
  'service_fee_dine_in',
  'service_fee_takeaway',
  'packaging_enabled',
  'packaging_fee_dine_in',
  'packaging_fee_takeaway',
  'fulfillment_choice_enabled',
  'dine_in_enabled',
  'takeaway_enabled',
  'kiosk_payment_cancel_enabled',
] as const

export function coerceSettingsBooleans(settings: Settings): Settings {
  const next: Settings = { ...settings }
  for (const key of BOOLEAN_SETTING_KEYS) {
    const coerced = coerceBool(next[key])
    if (coerced !== undefined) next[key] = coerced
  }
  return next
}

/**
 * Merge localStorage snapshot with live API settings.
 * Live defined fields win; empty/failed live payloads must not wipe the cache.
 */
export function mergeSettings(
  cached?: Settings | null,
  live?: Settings | null
): Settings {
  const base: Settings = { ...(cached || {}) }
  if (!live || typeof live !== 'object') return coerceSettingsBooleans(base)
  const liveKeys = Object.keys(live)
  if (liveKeys.length === 0) return coerceSettingsBooleans(base)
  for (const key of liveKeys) {
    const value = live[key]
    if (value !== undefined) base[key] = value
  }
  return coerceSettingsBooleans(base)
}

/** Master switches: only show when explicitly enabled. */
export function isServiceFeesEnabled(settings?: Settings | null): boolean {
  return coerceBool(settings?.service_enabled) === true
}

export function isPackagingFeesEnabled(settings?: Settings | null): boolean {
  return coerceBool(settings?.packaging_enabled) === true
}

/** Coupons default ON in DB; hide only when explicitly false. */
export function isCouponsEnabled(settings?: Settings | null): boolean {
  return coerceBool(settings?.coupons_enabled) !== false
}

/** Payment cancel button on kiosk — off unless explicitly enabled. */
export function isKioskPaymentCancelEnabled(settings?: Settings | null): boolean {
  return coerceBool(settings?.kiosk_payment_cancel_enabled) === true
}

export const settingsApi = {
  /** Client-side / browser fetch via axios (relative `/api` works behind nginx). */
  getSettings: async (): Promise<ApiResponse<Settings>> => {
    const response = await apiClient.get('/kiosk/settings/public/', {
      headers: {
        'Cache-Control': 'no-cache',
        Pragma: 'no-cache',
      },
      // Avoid axios/browser serving a stale 200 for kiosk settings
      params: { _ts: Date.now() },
    })
    const data = response.data as ApiResponse<Settings>
    if (data?.result && typeof data.result === 'object') {
      data.result = coerceSettingsBooleans(data.result)
      if (Object.keys(data.result).length > 0) {
        writeCachedSettings(data.result)
      }
    }
    return data
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

export const DEFAULT_SERVICE_TITLE_DINE_IN = 'هزینه سرویس'
export const DEFAULT_SERVICE_TITLE_TAKEAWAY = 'هزینه سرویس'
export const DEFAULT_PACKAGING_TITLE_DINE_IN = 'هزینه بسته‌بندی'
export const DEFAULT_PACKAGING_TITLE_TAKEAWAY = 'هزینه بسته‌بندی'

function readServiceAmount(value: unknown, fallback: unknown): number {
  if (value !== undefined && value !== null && value !== '') {
    return Math.max(0, Math.round(Number(value) || 0))
  }
  return Math.max(0, Math.round(Number(fallback) || 0))
}

export function resolveServiceTitle(
  settings: Settings | null | undefined,
  fulfillment: 'dine_in' | 'takeaway'
): string {
  if (fulfillment === 'takeaway') {
    const title = (settings?.service_title_takeaway || '').trim()
    return title || DEFAULT_SERVICE_TITLE_TAKEAWAY
  }
  const title = (settings?.service_title_dine_in || '').trim()
  return title || DEFAULT_SERVICE_TITLE_DINE_IN
}

/** Amount for a fulfillment type from settings (no product tick required). */
export function resolveServiceFeeAmount(
  settings: Settings | null | undefined,
  fulfillment: 'dine_in' | 'takeaway'
): number {
  if (!isServiceFeesEnabled(settings)) return 0
  if (fulfillment === 'takeaway') {
    if (settings?.service_fee_takeaway === false) return 0
    return readServiceAmount(settings?.service_fee_takeaway_amount, settings?.service_fee)
  }
  if (settings?.service_fee_dine_in === false) return 0
  return readServiceAmount(settings?.service_fee_dine_in_amount, settings?.service_fee)
}

export function resolvePackagingTitle(
  settings: Settings | null | undefined,
  fulfillment: 'dine_in' | 'takeaway'
): string {
  if (fulfillment === 'takeaway') {
    const title = (settings?.packaging_title_takeaway || '').trim()
    return title || DEFAULT_PACKAGING_TITLE_TAKEAWAY
  }
  const title = (settings?.packaging_title_dine_in || '').trim()
  return title || DEFAULT_PACKAGING_TITLE_DINE_IN
}

export function resolvePackagingFeeAmount(
  settings: Settings | null | undefined,
  fulfillment: 'dine_in' | 'takeaway'
): number {
  if (!isPackagingFeesEnabled(settings)) return 0
  if (fulfillment === 'takeaway') {
    if (settings?.packaging_fee_takeaway === false) return 0
    return readServiceAmount(settings?.packaging_fee_takeaway_amount, 0)
  }
  if (settings?.packaging_fee_dine_in === false) return 0
  return readServiceAmount(settings?.packaging_fee_dine_in_amount, 0)
}
