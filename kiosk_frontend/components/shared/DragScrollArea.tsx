'use client'

import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { useDragScroll } from '@/lib/use-drag-scroll'

type DragAxis = 'x' | 'y'

type DragScrollAreaProps = {
  axis?: DragAxis
  children: ReactNode
  className?: string
} & Omit<HTMLAttributes<HTMLDivElement>, 'children'>

/**
 * Overflow area with mouse click-drag scroll (touch keeps native pan).
 */
export function DragScrollArea({
  axis = 'y',
  className,
  children,
  ...rest
}: DragScrollAreaProps) {
  const ref = useDragScroll<HTMLDivElement>(axis)

  return (
    <div
      ref={ref}
      className={cn(
        'admin-drag-scroll cursor-grab active:cursor-grabbing',
        axis === 'x'
          ? 'overflow-x-auto overscroll-x-contain'
          : 'overflow-y-auto overscroll-y-contain',
        className
      )}
      {...rest}
    >
      {children}
    </div>
  )
}
