'use client'

import { useEffect, useRef } from 'react'

const DRAG_THRESHOLD_PX = 6

type DragAxis = 'x' | 'y'

/**
 * Mouse click-drag scroll. Touch keeps native overflow scrolling.
 * Suppresses the click on child controls after a real drag.
 */
export function useDragScroll<T extends HTMLElement>(axis: DragAxis = 'x') {
  const ref = useRef<T | null>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    let dragging = false
    let moved = false
    let startPos = 0
    let startScroll = 0
    let activePointerId: number | null = null

    const onPointerDown = (e: PointerEvent) => {
      // Touch/pen: native overflow scroll feels better (momentum).
      if (e.pointerType !== 'mouse' || e.button !== 0) return
      dragging = true
      moved = false
      startPos = axis === 'x' ? e.clientX : e.clientY
      startScroll = axis === 'x' ? el.scrollLeft : el.scrollTop
      activePointerId = e.pointerId
      el.setPointerCapture(e.pointerId)
      el.classList.add('is-dragging')
    }

    const onPointerMove = (e: PointerEvent) => {
      if (!dragging || e.pointerId !== activePointerId) return
      const current = axis === 'x' ? e.clientX : e.clientY
      const delta = current - startPos
      if (!moved && Math.abs(delta) < DRAG_THRESHOLD_PX) return
      moved = true
      if (axis === 'x') {
        el.scrollLeft = startScroll - delta
      } else {
        el.scrollTop = startScroll - delta
      }
    }

    const endDrag = (e: PointerEvent) => {
      if (e.pointerId !== activePointerId) return
      dragging = false
      activePointerId = null
      el.classList.remove('is-dragging')
      if (el.hasPointerCapture?.(e.pointerId)) {
        el.releasePointerCapture(e.pointerId)
      }
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
      // Map vertical wheel to horizontal for trackpad/mouse convenience
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        el.scrollLeft += e.deltaY
        e.preventDefault()
      }
    }

    el.addEventListener('pointerdown', onPointerDown)
    el.addEventListener('pointermove', onPointerMove)
    el.addEventListener('pointerup', endDrag)
    el.addEventListener('pointercancel', endDrag)
    el.addEventListener('click', onClickCapture, true)
    el.addEventListener('wheel', onWheel, { passive: false })

    return () => {
      el.removeEventListener('pointerdown', onPointerDown)
      el.removeEventListener('pointermove', onPointerMove)
      el.removeEventListener('pointerup', endDrag)
      el.removeEventListener('pointercancel', endDrag)
      el.removeEventListener('click', onClickCapture, true)
      el.removeEventListener('wheel', onWheel)
      el.classList.remove('is-dragging')
    }
  }, [axis])

  return ref
}
