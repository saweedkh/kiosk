'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/shared/Button'

/**
 * Touch-friendly fullscreen toggle for staff on keyboard-less kiosks.
 * Requires Chrome to be started with --start-fullscreen (not --kiosk).
 */
export function FullscreenToggle() {
  const [isFullscreen, setIsFullscreen] = useState(false)

  useEffect(() => {
    const sync = () => {
      setIsFullscreen(Boolean(document.fullscreenElement))
    }
    sync()
    document.addEventListener('fullscreenchange', sync)
    return () => document.removeEventListener('fullscreenchange', sync)
  }, [])

  const toggle = async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen()
      } else {
        await document.documentElement.requestFullscreen()
      }
    } catch {
      // Browser may deny without a user gesture or if not supported
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={toggle}
      className="min-h-11 min-w-[9.5rem] touch-manipulation"
      aria-pressed={isFullscreen}
      aria-label={isFullscreen ? 'خروج از تمام‌صفحه' : 'ورود به تمام‌صفحه'}
    >
      {isFullscreen ? 'خروج از تمام‌صفحه' : 'تمام‌صفحه'}
    </Button>
  )
}
