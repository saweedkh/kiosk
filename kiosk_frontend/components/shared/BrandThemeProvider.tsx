'use client'

import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { settingsApi } from '@/lib/api/settings'
import { readCachedSettings } from '@/lib/kiosk-persist'
import { useThemeStore } from '@/lib/store/theme-store'
import {
  applyBrandTheme,
  paletteFromSettings,
} from '@/lib/theme/brand-palette'

/**
 * Loads site palette from public settings and paints shadcn CSS variables
 * so customer + admin UIs share one brand theme.
 */
export function BrandThemeProvider({ children }: { children: React.ReactNode }) {
  const { theme } = useThemeStore()

  const { data } = useQuery({
    // Share cache with customer page — one network fetch for branding + kiosk settings
    queryKey: ['settings'],
    queryFn: async () => {
      const res = await settingsApi.getSettings()
      return res
    },
    select: (res) => res?.result || {},
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    refetchInterval: 60_000,
  })

  useEffect(() => {
    const source = data || readCachedSettings()
    applyBrandTheme(paletteFromSettings(source), {
      mode: theme === 'dark' ? 'dark' : 'light',
    })
  }, [data, theme])

  return <>{children}</>
}
