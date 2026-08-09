'use client'

import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface AttractShellProps {
  ariaLabel: string
  onStart: () => void
  onSecretAdmin?: () => void
  children: ReactNode
  className?: string
  style?: CSSProperties
  /** Nested WYSIWYG mode for admin — absolute fill, no interactions. */
  preview?: boolean
}

/**
 * Shared attract interactions: full-surface CTA, fullscreen, 5-tap admin gate.
 * In preview mode, same visual tree is mounted inside a scaled stage.
 */
export function AttractShell({
  ariaLabel,
  onStart,
  onSecretAdmin,
  children,
  className = '',
  style,
  preview = false,
}: AttractShellProps) {
  const tapCountRef = useRef(0)
  const tapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (tapTimerRef.current) clearTimeout(tapTimerRef.current)
    }
  }, [])

  const handleStart = () => {
    if (preview) return
    void document.documentElement.requestFullscreen?.().catch(() => {})
    onStart()
  }

  const handleBrandTap = (e: React.PointerEvent) => {
    if (preview) return
    e.stopPropagation()
    tapCountRef.current += 1
    if (tapTimerRef.current) clearTimeout(tapTimerRef.current)
    tapTimerRef.current = setTimeout(() => {
      tapCountRef.current = 0
    }, 2000)
    if (tapCountRef.current >= 5) {
      tapCountRef.current = 0
      onSecretAdmin?.()
    }
  }

  return (
    <div
      role={preview ? undefined : 'button'}
      tabIndex={preview ? undefined : 0}
      data-kiosk-attract="true"
      data-landing-preview={preview ? 'true' : undefined}
      onClick={preview ? undefined : handleStart}
      onKeyDown={
        preview
          ? undefined
          : (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                handleStart()
              }
            }
      }
      className={cn(
        'isolate overflow-hidden border-0 p-0 text-right outline-none [container-type:size]',
        preview
          ? 'pointer-events-none absolute inset-0 h-full w-full'
          : 'fixed inset-0 z-[200] cursor-pointer touch-manipulation',
        className
      )}
      style={{ backgroundColor: 'hsl(var(--background))', ...style }}
      aria-label={preview ? undefined : ariaLabel}
      aria-hidden={preview || undefined}
    >
      <div
        className="contents"
        onPointerDownCapture={(e) => {
          if (preview) return
          const target = e.target as HTMLElement | null
          if (target?.closest('[data-attract-brand]')) {
            handleBrandTap(e)
          }
        }}
      >
        {children}
      </div>
    </div>
  )
}
