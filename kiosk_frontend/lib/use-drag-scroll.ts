'use client'

import { useEffect, useRef } from 'react'

const DRAG_THRESHOLD_PX = 8

type DragAxis = 'x' | 'y'

/**
 * Mouse click-drag scroll. Touch keeps native overflow scrolling.
 * Does not steal clicks: drag mode starts only after moving past a threshold.
 */
export function useDragScroll<T extends HTMLElement>(axis: DragAxis = 'x') {
  const ref = useRef<T | null>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    let tracking = false
    let dragging = false
    let moved = false
    let startPos = 0
    let startScroll = 0
    let activePointerId: number | null = null

    const cleanupDragUi = () => {
      el.classList.remove('is-dragging')
      if (activePointerId != null && el.hasPointerCapture?.(activePointerId)) {
        try {
          el.releasePointerCapture(activePointerId)
        } catch {
          /* ignore */
        }
      }
    }

    const onPointerDown = (e: PointerEvent) => {
      // Touch/pen: native overflow scroll (momentum). Don't hijack.
      if (e.pointerType !== 'mouse' || e.button !== 0) return
      // Interactive controls: let the click through; only drag from "empty" areas
      // is too limited for kiosk — instead delay drag until threshold so clicks work.
      tracking = true
      dragging = false
      moved = false
      startPos = axis === 'x' ? e.clientX : e.clientY
      startScroll = axis === 'x' ? el.scrollLeft : el.scrollTop
      activePointerId = e.pointerId
    }

    const onPointerMove = (e: PointerEvent) => {
      if (!tracking || e.pointerId !== activePointerId) return
      const current = axis === 'x' ? e.clientX : e.clientY
      const delta = current - startPos

      if (!dragging) {
        if (Math.abs(delta) < DRAG_THRESHOLD_PX) return
        dragging = true
        moved = true
        el.classList.add('is-dragging')
        try {
          el.setPointerCapture(e.pointerId)
        } catch {
          /* ignore */
        }
      }

      if (axis === 'x') {
        el.scrollLeft = startScroll - delta
      } else {
        el.scrollTop = startScroll - delta
      }
    }

    const endDrag = (e: PointerEvent) => {
      if (e.pointerId !== activePointerId) return
      tracking = false
      dragging = false
      activePointerId = null
      cleanupDragUi()
      // Keep `moved` until click capture runs (same tick / next click).
      window.setTimeout(() => {
        moved = false
      }, 0)
    }

    const onClickCapture = (e: MouseEvent) => {
      if (!moved) return
      e.preventDefault()
      e.stopPropagation()
      moved = false
    }

    const onWheel = (e: WheelEvent) => {
      if (axis !== 'x') return
      if (el.scrollWidth <= el.clientWidth) return
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        el.scrollLeft += e.deltaY
        e.preventDefault()
      }
    }

    el.addEventListener('pointerdown', onPointerDown)
    // Listen on window so we still get move/up if pointer leaves the element
    // before capture starts.
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', endDrag)
    window.addEventListener('pointercancel', endDrag)
    el.addEventListener('click', onClickCapture, true)
    el.addEventListener('wheel', onWheel, { passive: false })

    return () => {
      el.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', endDrag)
      window.removeEventListener('pointercancel', endDrag)
      el.removeEventListener('click', onClickCapture, true)
      el.removeEventListener('wheel', onWheel)
      cleanupDragUi()
    }
  }, [axis])

  return ref
}
