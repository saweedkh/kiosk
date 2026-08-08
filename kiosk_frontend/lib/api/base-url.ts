/**
 * Resolve API base URL for server-side fetches (SSR / generateMetadata).
 * Browser keeps using NEXT_PUBLIC_API_BASE_URL (usually `/api` via nginx).
 */
export function getServerApiBaseUrl(): string {
  const candidates = [
    process.env.INTERNAL_API_BASE_URL,
    process.env.API_BASE_URL,
    // Absolute public URL if provided
    process.env.NEXT_PUBLIC_API_BASE_URL?.startsWith('http')
      ? process.env.NEXT_PUBLIC_API_BASE_URL
      : undefined,
    'http://127.0.0.1:8000/api',
  ]

  for (const value of candidates) {
    if (value && value.trim()) {
      return value.trim().replace(/\/$/, '')
    }
  }
  return 'http://127.0.0.1:8000/api'
}

export function getBrowserApiBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8000/api').replace(/\/$/, '')
}
