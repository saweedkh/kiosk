'use client'

import { CinemaLanding } from './landing/CinemaLanding'
import { NeonLanding } from './landing/NeonLanding'
import { FreshLanding } from './landing/FreshLanding'
import { EditorialLanding } from './landing/EditorialLanding'
import type { LandingThemeId, LandingThemeProps } from './landing/types'

export type { LandingThemeId }

export interface KioskAttractScreenProps extends LandingThemeProps {
  theme?: LandingThemeId | string | null
}

/**
 * Attract / idle landing router for portrait kiosk panels.
 * Theme comes from SiteSettings.landing_theme (default: cinema).
 */
export function KioskAttractScreen({
  theme = 'cinema',
  ...props
}: KioskAttractScreenProps) {
  const id = (theme || 'cinema').toLowerCase() as LandingThemeId

  switch (id) {
    case 'neon':
      return <NeonLanding {...props} />
    case 'fresh':
      return <FreshLanding {...props} />
    case 'editorial':
      return <EditorialLanding {...props} />
    case 'cinema':
    default:
      return <CinemaLanding {...props} />
  }
}
