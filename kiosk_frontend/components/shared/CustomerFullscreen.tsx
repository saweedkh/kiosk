'use client'

/**
 * Keeps the customer screen in Fullscreen API mode (touch-friendly).
 * Silently retries on pointer events — visual CTA lives on the attract screen.
 */
import { useEffect } from 'react'

export function CustomerFullscreen() {
  useEffect(() => {
    const isFs = () => Boolean(document.fullscreenElement)

    const tryEnter = async () => {
      if (isFs()) return
      // Attract screen owns the first explicit gesture UI
      if (document.querySelector('[data-kiosk-attract="true"]')) return
      try {
        await document.documentElement.requestFullscreen()
      } catch {
        // Browser may require a more explicit gesture; ignore
      }
    }

    void tryEnter()

    const onPointer = () => {
      void tryEnter()
    }

    window.addEventListener('pointerdown', onPointer, { passive: true })
    return () => {
      window.removeEventListener('pointerdown', onPointer)
    }
  }, [])

  return null
}
