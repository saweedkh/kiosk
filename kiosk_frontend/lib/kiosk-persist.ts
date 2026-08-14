/**
 * Persistent client cache for kiosk branding, menu, and public settings.
 * Shows instantly on attract / menu while network refresh runs in background.
 */

import type { Settings } from '@/lib/api/settings'
import type { ApiResponse, Category, PaginatedResponse, Product } from '@/types'

/** Bump when settings shape / semantics change so stale exe WebView caches drop. */
const SETTINGS_KEY = 'kiosk-settings-cache-v3'
const SETTINGS_UPDATED_EVENT = 'kiosk-settings-cache-updated'
const CATEGORIES_KEY = 'kiosk-categories-cache-v3'
const PRODUCTS_KEY = 'kiosk-products-cache-v2'
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
  | 'coupons_enabled'
  | 'service_fee'
  | 'service_title_dine_in'
  | 'service_title_takeaway'
  | 'service_fee_dine_in_amount'
  | 'service_fee_takeaway_amount'
  | 'service_fee_dine_in'
  | 'service_fee_takeaway'
  | 'packaging_enabled'
  | 'packaging_title_dine_in'
  | 'packaging_title_takeaway'
  | 'packaging_fee_dine_in_amount'
  | 'packaging_fee_takeaway_amount'
  | 'packaging_fee_dine_in'
  | 'packaging_fee_takeaway'
  | 'fulfillment_choice_enabled'
  | 'dine_in_enabled'
  | 'takeaway_enabled'
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

/** Drop legacy cache keys from older builds (Tauri WebView keeps localStorage). */
export function migrateSettingsCache(): void {
  if (!canUseStorage()) return
  try {
    localStorage.removeItem('kiosk-settings-cache-v1')
    localStorage.removeItem('kiosk-settings-cache-v2')
    localStorage.removeItem('kiosk-categories-cache-v2')
    localStorage.removeItem('kiosk-products-cache-v1')
  } catch {
    // ignore
  }
}

export function writeCachedSettings(
  settings?: Settings | null,
  options?: { force?: boolean }
): void {
  if (!settings) return
  const snapshot: KioskSettingsSnapshot = {
    site_name: settings.site_name || '',
    logo_url: settings.logo_url || '',
    copyright_text: settings.copyright_text || '',
    description: settings.description || '',
    contact_phone: settings.contact_phone || '',
    service_enabled: settings.service_enabled,
    coupons_enabled: settings.coupons_enabled,
    service_fee: settings.service_fee,
    service_title_dine_in: settings.service_title_dine_in,
    service_title_takeaway: settings.service_title_takeaway,
    service_fee_dine_in_amount: settings.service_fee_dine_in_amount,
    service_fee_takeaway_amount: settings.service_fee_takeaway_amount,
    service_fee_dine_in: settings.service_fee_dine_in,
    service_fee_takeaway: settings.service_fee_takeaway,
    packaging_enabled: settings.packaging_enabled,
    packaging_title_dine_in: settings.packaging_title_dine_in,
    packaging_title_takeaway: settings.packaging_title_takeaway,
    packaging_fee_dine_in_amount: settings.packaging_fee_dine_in_amount,
    packaging_fee_takeaway_amount: settings.packaging_fee_takeaway_amount,
    packaging_fee_dine_in: settings.packaging_fee_dine_in,
    packaging_fee_takeaway: settings.packaging_fee_takeaway,
    fulfillment_choice_enabled: settings.fulfillment_choice_enabled,
    dine_in_enabled: settings.dine_in_enabled,
    takeaway_enabled: settings.takeaway_enabled,
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
  // Skip write when content unchanged — unless admin forced a publish
  if (!options?.force) {
    const prev = readCachedSettings()
    if (prev) {
      const { cached_at: _a, ...prevBody } = prev
      const { cached_at: _b, ...nextBody } = snapshot
      if (JSON.stringify(prevBody) === JSON.stringify(nextBody)) {
        return
      }
    }
  }
  writeJson(SETTINGS_KEY, snapshot)
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(SETTINGS_UPDATED_EVENT))
  }
  if (snapshot.logo_url) {
    void preloadImage(snapshot.logo_url)
  }
  if (snapshot.landing_background_url) {
    void preloadImage(snapshot.landing_background_url)
  }
}

export function getSettingsUpdatedEventName(): string {
  return SETTINGS_UPDATED_EVENT
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
  if (!envelope) return null
  if (!envelope.data) return null
  if (envelope.cached_at == null) return null
  if (Date.now() - envelope.cached_at > MENU_MAX_AGE_MS) return null
  return envelope.data
}

export function writeCachedCategories(
  data?: ApiResponse<Category[] | PaginatedResponse<Category>> | null
): void {
  if (!data?.result) return
  const list = Array.isArray(data.result)
    ? data.result
    : Array.isArray((data.result as PaginatedResponse<Category>).results)
      ? (data.result as PaginatedResponse<Category>).results
      : []
  if (list.length === 0) return
  writeJson(CATEGORIES_KEY, { data, cached_at: Date.now() } satisfies CachedEnvelope<typeof data>)
}

export function readCachedProducts(): ApiResponse<PaginatedResponse<Product>> | null {
  const envelope = readJson<CachedEnvelope<ApiResponse<PaginatedResponse<Product>>>>(PRODUCTS_KEY)
  if (!envelope) return null
  if (!envelope.data) return null
  if (envelope.cached_at == null) return null
  if (Date.now() - envelope.cached_at > MENU_MAX_AGE_MS) return null
  return envelope.data
}

export function writeCachedProducts(
  data?: ApiResponse<PaginatedResponse<Product>> | null
): void {
  if (!data?.result) return
  const results = data.result?.results
  if (!Array.isArray(results) || results.length === 0) return
  writeJson(PRODUCTS_KEY, { data, cached_at: Date.now() } satisfies CachedEnvelope<typeof data>)
  preloadImages(results.map((p) => p.image).filter(Boolean))
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
