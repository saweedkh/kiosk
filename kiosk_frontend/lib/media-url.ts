import { getBrowserApiBaseUrl } from '@/lib/api/base-url'

/** Turn /media/... paths into absolute URLs for Tauri / desktop (no nginx). */
export function resolveMediaUrl(url?: string | null): string | undefined {
  if (!url) return undefined
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  const api = getBrowserApiBaseUrl()
  const origin = api.replace(/\/api\/?$/, '')
  const path = url.startsWith('/') ? url : `/${url}`
  return `${origin}${path}`
}
