'use client'

import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { settingsApi, coerceSettingsBooleans } from '@/lib/api/settings'
import {
  readCachedSettings,
  getSettingsUpdatedEventName,
} from '@/lib/kiosk-persist'
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

  const { data, dataUpdatedAt } = useQuery({
    // Share cache with customer page — one network fetch for branding + kiosk settings
    queryKey: ['settings'],
    queryFn: async () => {
      const res = await settingsApi.getSettings()
      return res
    },
    select: (res) => coerceSettingsBooleans(res?.result || {}),
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    refetchInterval: 5_000,
  })

  useEffect(() => {
    const sync = () => {
      const snap = readCachedSettings()
      if (snap) {
        applyBrandTheme(paletteFromSettings(snap), {
          mode: theme === 'dark' ? 'dark' : 'light',
        })
      }
    }
    window.addEventListener(getSettingsUpdatedEventName(), sync)
    return () => window.removeEventListener(getSettingsUpdatedEventName(), sync)
  }, [theme])

  useEffect(() => {
    const source =
      data && Object.keys(data).length > 0 ? data : readCachedSettings()
    applyBrandTheme(paletteFromSettings(source || {}), {
      mode: theme === 'dark' ? 'dark' : 'light',
    })
  }, [data, dataUpdatedAt, theme])

  return <>{children}</>
}
