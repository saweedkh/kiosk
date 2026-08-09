/**
 * Persistent client cache for kiosk branding, menu, and public settings.
 * Shows instantly on attract / menu while network refresh runs in background.
 */

import type { Settings } from '@/lib/api/settings'
import type { ApiResponse, Category, PaginatedResponse, Product } from '@/types'

const SETTINGS_KEY = 'kiosk-settings-cache-v1'
const CATEGORIES_KEY = 'kiosk-categories-cache-v1'
const PRODUCTS_KEY = 'kiosk-products-cache-v1'
const PRELOADED = new Set<string>()

/** Max age before we still show cache but treat as soft-stale (always ok for placeholder). */
const MENU_MAX_AGE_MS = 24 * 60 * 60 * 1000

export type KioskSettingsSnapshot = Pick<
  Settings,
  | 'site_name'
  | 'logo_url'
  | 'copyright_text'
  | 'description'
  | 'contact_phone'
  | 'service_enabled'
  | 'service_fee'
  | 'service_fee_dine_in'
  | 'service_fee_takeaway'
  | 'cart_layout'
  | 'catalog_revision'
  | 'landing_theme'
  | 'landing_cta_text'
  | 'landing_accent_color'
  | 'landing_bg_color'
  | 'landing_text_color'
  | 'landing_muted_color'
  | 'landing_background_url'
> & {
  cached_at?: number
}

type CachedEnvelope<T> = {
  data: T
  cached_at: number
}

function canUseStorage(): boolean {
  return typeof window !== 'undefined' && typeof localStorage !== 'undefined'
}

function readJson<T>(key: string): T | null {
  if (!canUseStorage()) return null
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

function writeJson(key: string, value: unknown): void {
  if (!canUseStorage()) return
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // quota / private mode — ignore
  }
}

export function readCachedSettings(): KioskSettingsSnapshot | null {
  const parsed = readJson<KioskSettingsSnapshot>(SETTINGS_KEY)
  if (!parsed || typeof parsed !== 'object') return null
  return parsed
}

export function writeCachedSettings(settings?: Settings | null): void {
  if (!settings) return
  const snapshot: KioskSettingsSnapshot = {
    site_name: settings.site_name || '',
    logo_url: settings.logo_url || '',
    copyright_text: settings.copyright_text || '',
    description: settings.description || '',
    contact_phone: settings.contact_phone || '',
    service_enabled: settings.service_enabled,
    service_fee: settings.service_fee,
    service_fee_dine_in: settings.service_fee_dine_in,
    service_fee_takeaway: settings.service_fee_takeaway,
    cart_layout: settings.cart_layout === 'bottom' ? 'bottom' : 'side',
    catalog_revision: Number(settings.catalog_revision) || 0,
    landing_theme: settings.landing_theme || 'cinema',
    landing_cta_text: settings.landing_cta_text || '',
    landing_accent_color: settings.landing_accent_color || '',
    landing_bg_color: settings.landing_bg_color || '',
    landing_text_color: settings.landing_text_color || '',
    landing_muted_color: settings.landing_muted_color || '',
    landing_background_url: settings.landing_background_url || '',
    cached_at: Date.now(),
  }
  writeJson(SETTINGS_KEY, snapshot)
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('kiosk-settings-cache-updated'))
  }
  if (snapshot.logo_url) {
    void preloadImage(snapshot.logo_url)
  }
  if (snapshot.landing_background_url) {
    void preloadImage(snapshot.landing_background_url)
  }
}

export function clearCachedSettings(): void {
  if (!canUseStorage()) return
  try {
    localStorage.removeItem(SETTINGS_KEY)
  } catch {
    // ignore
  }
}

export function clearCachedMenu(): void {
  if (!canUseStorage()) return
  try {
    localStorage.removeItem(CATEGORIES_KEY)
    localStorage.removeItem(PRODUCTS_KEY)
  } catch {
    // ignore
  }
}

export function readCachedCategories(): ApiResponse<
  Category[] | PaginatedResponse<Category>
> | null {
  const envelope = readJson<CachedEnvelope<ApiResponse<Category[] | PaginatedResponse<Category>>>>(
    CATEGORIES_KEY
  )
  if (!envelope?.data || Date.now() - envelope.cached_at > MENU_MAX_AGE_MS) return null
  return envelope.data
}

export function writeCachedCategories(
  data?: ApiResponse<Category[] | PaginatedResponse<Category>> | null
): void {
  if (!data?.result) return
  writeJson(CATEGORIES_KEY, { data, cached_at: Date.now() } satisfies CachedEnvelope<typeof data>)
}

export function readCachedProducts(): ApiResponse<PaginatedResponse<Product>> | null {
  const envelope = readJson<CachedEnvelope<ApiResponse<PaginatedResponse<Product>>>>(PRODUCTS_KEY)
  if (!envelope?.data || Date.now() - envelope.cached_at > MENU_MAX_AGE_MS) return null
  return envelope.data
}

export function writeCachedProducts(
  data?: ApiResponse<PaginatedResponse<Product>> | null
): void {
  if (!data?.result) return
  writeJson(PRODUCTS_KEY, { data, cached_at: Date.now() } satisfies CachedEnvelope<typeof data>)
  const results = data.result?.results
  if (Array.isArray(results)) {
    preloadImages(results.map((p) => p.image).filter(Boolean))
  }
}

/** Warm browser image cache (and decode) for logos / product thumbs. */
export function preloadImage(url: string): Promise<void> {
  if (!url || typeof window === 'undefined') return Promise.resolve()
  if (PRELOADED.has(url)) return Promise.resolve()
  PRELOADED.add(url)
  return new Promise((resolve) => {
    const img = new window.Image()
    img.decoding = 'async'
    img.onload = () => resolve()
    img.onerror = () => {
      PRELOADED.delete(url)
      resolve()
    }
    img.src = url
  })
}

export function preloadImages(urls: Array<string | null | undefined>): void {
  urls.filter(Boolean).forEach((u) => {
    void preloadImage(u as string)
  })
}
