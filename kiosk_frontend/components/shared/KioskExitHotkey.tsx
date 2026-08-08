'use client'

import { useEffect } from 'react'

/**
 * Staff-only escape from Chrome --kiosk mode.
 * Ctrl+Alt+Shift+X closes the window (services keep running).
 */
export function KioskExitHotkey() {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (
        event.ctrlKey &&
        event.altKey &&
        event.shiftKey &&
        (event.key === 'x' || event.key === 'X')
      ) {
        event.preventDefault()
        window.close()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  return null
}
