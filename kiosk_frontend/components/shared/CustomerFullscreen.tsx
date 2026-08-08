'use client'

import { useEffect, useState } from 'react'

/**
 * Keeps the customer screen in Fullscreen API mode (touch-friendly).
 * First touch/click enters fullscreen if needed.
 */
export function CustomerFullscreen() {
  const [needsGesture, setNeedsGesture] = useState(false)

  useEffect(() => {
    const isFs = () => Boolean(document.fullscreenElement)

    const tryEnter = async () => {
      if (isFs()) {
        setNeedsGesture(false)
        return true
      }
      try {
        await document.documentElement.requestFullscreen()
        setNeedsGesture(false)
        return true
      } catch {
        setNeedsGesture(true)
        return false
      }
    }

    void tryEnter()

    const onPointer = () => {
      void tryEnter()
    }

    const onFsChange = () => {
      if (!isFs()) {
        setNeedsGesture(true)
      } else {
        setNeedsGesture(false)
      }
    }

    window.addEventListener('pointerdown', onPointer)
    document.addEventListener('fullscreenchange', onFsChange)
    return () => {
      window.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('fullscreenchange', onFsChange)
    }
  }, [])

  if (!needsGesture) return null

  return (
    <button
      type="button"
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 text-white text-2xl font-bold touch-manipulation"
      onClick={() => {
        void document.documentElement.requestFullscreen().catch(() => {})
      }}
    >
      برای شروع صفحه را لمس کنید
    </button>
  )
}
