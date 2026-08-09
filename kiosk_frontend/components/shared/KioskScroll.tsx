'use client'

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type UIEvent,
} from 'react'
import { cn } from '@/lib/utils'

type Orientation = 'vertical' | 'horizontal'

/**
 * Always-visible fat scrollbar for kiosk touch.
 * Native OS overlay bars hide — this rail never does.
 */
export function KioskScroll({
  children,
  orientation = 'vertical',
  className,
  contentClassName,
  style,
  /** When false, only native (hidden) overflow scroll — no permanent rail. */
  showRail = true,
}: {
  children: ReactNode
  orientation?: Orientation
  className?: string
  contentClassName?: string
  style?: CSSProperties
  showRail?: boolean
}) {
  const paneRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{ startPos: number; startScroll: number } | null>(null)
  const [metrics, setMetrics] = useState({
    needed: false,
    thumbSize: 48,
    thumbOffset: 0,
  })

  const vertical = orientation === 'vertical'

  const sync = useCallback(() => {
    if (!showRail) return
    const pane = paneRef.current
    const track = trackRef.current
    if (!pane || !track) return

    if (vertical) {
      const { scrollTop, scrollHeight, clientHeight } = pane
      const needed = scrollHeight > clientHeight + 2
      const trackSize = track.clientHeight
      const ratio = clientHeight / Math.max(scrollHeight, 1)
      const thumbSize = needed
        ? Math.max(36, Math.min(trackSize, trackSize * ratio))
        : trackSize
      const maxOffset = Math.max(trackSize - thumbSize, 0)
      const maxScroll = Math.max(scrollHeight - clientHeight, 1)
      const thumbOffset = needed ? (scrollTop / maxScroll) * maxOffset : 0
      setMetrics({ needed, thumbSize, thumbOffset })
    } else {
      const { scrollLeft, scrollWidth, clientWidth } = pane
      const needed = scrollWidth > clientWidth + 2
      const trackSize = track.clientWidth
      const ratio = clientWidth / Math.max(scrollWidth, 1)
      const thumbSize = needed
        ? Math.max(36, Math.min(trackSize, trackSize * ratio))
        : trackSize
      const maxOffset = Math.max(trackSize - thumbSize, 0)
      const maxScroll = Math.max(scrollWidth - clientWidth, 1)
      const absLeft = Math.abs(scrollLeft)
      const thumbOffset = needed ? (absLeft / maxScroll) * maxOffset : 0
      setMetrics({ needed, thumbSize, thumbOffset })
    }
  }, [vertical, showRail])

  useEffect(() => {
    const pane = paneRef.current
    if (!pane) return
    sync()
    const ro = new ResizeObserver(() => sync())
    ro.observe(pane)
    if (pane.firstElementChild) ro.observe(pane.firstElementChild)
    window.addEventListener('resize', sync)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', sync)
    }
  }, [sync, children])

  const onScroll = (_e: UIEvent<HTMLDivElement>) => {
    sync()
  }

  const scrollFromThumbOffset = (offset: number) => {
    const pane = paneRef.current
    const track = trackRef.current
    if (!pane || !track) return

    if (vertical) {
      const maxOffset = Math.max(track.clientHeight - metrics.thumbSize, 1)
      const maxScroll = Math.max(pane.scrollHeight - pane.clientHeight, 0)
      pane.scrollTop = (offset / maxOffset) * maxScroll
    } else {
      const maxOffset = Math.max(track.clientWidth - metrics.thumbSize, 1)
      const maxScroll = Math.max(pane.scrollWidth - pane.clientWidth, 0)
      const next = (offset / maxOffset) * maxScroll
      pane.scrollTo({ left: pane.scrollLeft < 0 ? -next : next })
    }
  }

  const onThumbPointerDown = (e: ReactPointerEvent<HTMLButtonElement>) => {
    e.preventDefault()
    e.stopPropagation()
    const pane = paneRef.current
    if (!pane) return
    const startPos = vertical ? e.clientY : e.clientX
    const startScroll = vertical ? pane.scrollTop : Math.abs(pane.scrollLeft)
    dragRef.current = { startPos, startScroll }
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  const onThumbPointerMove = (e: ReactPointerEvent<HTMLButtonElement>) => {
    if (!dragRef.current || !paneRef.current || !trackRef.current) return
    const pane = paneRef.current
    const track = trackRef.current
    const delta = (vertical ? e.clientY : e.clientX) - dragRef.current.startPos
    if (vertical) {
      const maxOffset = Math.max(track.clientHeight - metrics.thumbSize, 1)
      const maxScroll = Math.max(pane.scrollHeight - pane.clientHeight, 0)
      const scrollDelta = (delta / maxOffset) * maxScroll
      pane.scrollTop = dragRef.current.startScroll + scrollDelta
    } else {
      const maxOffset = Math.max(track.clientWidth - metrics.thumbSize, 1)
      const maxScroll = Math.max(pane.scrollWidth - pane.clientWidth, 0)
      const scrollDelta = (delta / maxOffset) * maxScroll
      const next = dragRef.current.startScroll + scrollDelta
      pane.scrollTo({ left: pane.scrollLeft < 0 ? -next : next })
    }
  }

  const onThumbPointerUp = (e: ReactPointerEvent<HTMLButtonElement>) => {
    dragRef.current = null
    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch {
      /* ignore */
    }
  }

  const onTrackPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return
    const track = trackRef.current
    if (!track) return
    const rect = track.getBoundingClientRect()
    if (vertical) {
      const y = e.clientY - rect.top - metrics.thumbSize / 2
      scrollFromThumbOffset(Math.max(0, Math.min(y, rect.height - metrics.thumbSize)))
    } else {
      const x = e.clientX - rect.left - metrics.thumbSize / 2
      scrollFromThumbOffset(Math.max(0, Math.min(x, rect.width - metrics.thumbSize)))
    }
  }

  return (
    <div
      className={cn(
        'relative min-h-0 min-w-0',
        showRail && 'flex',
        showRail && !vertical && 'flex-col',
        className
      )}
      style={style}
    >
      <div
        ref={paneRef}
        onScroll={onScroll}
        className={cn(
          'kiosk-scroll-pane min-h-0 min-w-0 flex-1',
          vertical
            ? 'overflow-y-scroll overflow-x-hidden overscroll-y-contain'
            : 'overflow-x-scroll overflow-y-hidden overscroll-x-contain',
          contentClassName
        )}
      >
        {children}
      </div>

      {showRail ? (
        <div
          ref={trackRef}
          onPointerDown={onTrackPointerDown}
          className={cn(
            'pointer-events-auto absolute z-10 touch-none select-none rounded-full',
            'bg-muted/70 backdrop-blur-[2px]',
            vertical
              ? 'inset-y-2 end-1.5 w-2.5'
              : 'inset-x-2 bottom-1.5 h-2.5',
            metrics.needed ? 'opacity-100' : 'pointer-events-none opacity-0'
          )}
          aria-hidden={!metrics.needed}
        >
          <button
            type="button"
            aria-label="اسکرول"
            onPointerDown={onThumbPointerDown}
            onPointerMove={onThumbPointerMove}
            onPointerUp={onThumbPointerUp}
            onPointerCancel={onThumbPointerUp}
            className={cn(
              'absolute rounded-full bg-primary/80',
              'hover:bg-primary active:bg-primary',
              vertical ? 'inset-x-0' : 'inset-y-0'
            )}
            style={
              vertical
                ? {
                    height: metrics.thumbSize,
                    top: metrics.thumbOffset,
                  }
                : {
                    width: metrics.thumbSize,
                    insetInlineStart: metrics.thumbOffset,
                  }
            }
          />
        </div>
      ) : null}
    </div>
  )
}
