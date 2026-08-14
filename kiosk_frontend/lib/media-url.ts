import { getBrowserApiBaseUrl } from '@/lib/api/base-url'

const DESKTOP_BACKEND_ORIGIN = 'http://127.0.0.1:18765'

/** Turn /media/... paths into absolute URLs for Tauri / desktop (no nginx). */
export function resolveMediaUrl(url?: string | null): string | undefined {
  if (!url) return undefined
  if (url.startsWith('data:') || url.startsWith('blob:')) return url
  if (url.startsWith('http://') || url.startsWith('https://')) return url

  const api = getBrowserApiBaseUrl()
  let origin = api.replace(/\/api\/?$/, '')
  // Relative API base (`/api`) → use current page origin in browser, else desktop default
  if (!origin || origin.startsWith('/')) {
    if (typeof window !== 'undefined' && window.location?.origin) {
      // Tauri webview origin is not the Django host — prefer explicit backend
      const host = window.location.hostname
      if (
        host === '127.0.0.1' ||
        host === 'localhost' ||
        host === '' ||
        host === 'tauri.localhost' ||
        host.endsWith('.localhost')
      ) {
        origin = DESKTOP_BACKEND_ORIGIN
      } else if (window.location.protocol.startsWith('http')) {
        origin = window.location.origin
      } else {
        origin = DESKTOP_BACKEND_ORIGIN
      }
    } else {
      origin = DESKTOP_BACKEND_ORIGIN
    }
  }

  const path = url.startsWith('/') ? url : `/${url}`
  return `${origin}${path}`
}

/** Append cache-buster so WebView does not keep an overwritten logo/background. */
export function withMediaCacheBust(
  url?: string | null,
  version?: string | number | null
): string | undefined {
  const resolved = resolveMediaUrl(url)
  if (!resolved) return undefined
  if (version == null || version === '') return resolved
  const join = resolved.includes('?') ? '&' : '?'
  return `${resolved}${join}v=${encodeURIComponent(String(version))}`
}
