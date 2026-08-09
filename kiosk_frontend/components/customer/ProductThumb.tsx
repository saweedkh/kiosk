'use client'

import Image from 'next/image'
import { cn } from '@/lib/utils'

interface ProductThumbProps {
  src?: string | null
  alt: string
  className?: string
  sizes?: string
  /** Extra classes for the image (e.g. hover scale). */
  imageClassName?: string
}

function isRemoteHttp(url: string) {
  return url.startsWith('http://localhost') || url.startsWith('http://')
}

export function ProductThumb({
  src,
  alt,
  className,
  sizes = '96px',
  imageClassName,
}: ProductThumbProps) {
  const initial = (alt?.trim()?.charAt(0) || '·').toUpperCase()

  return (
    <div
      className={cn(
        'relative overflow-hidden bg-gradient-to-br from-background via-accent to-primary/25',
        className
      )}
    >
      {src ? (
        <Image
          src={src}
          alt={alt}
          fill
          className={cn('object-cover', imageClassName)}
          sizes={sizes}
          unoptimized={isRemoteHttp(src)}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center" aria-hidden>
          <div className="absolute inset-0">
            <div className="absolute -top-1/3 -right-1/4 h-3/4 w-3/4 rounded-full bg-primary/20 blur-2xl" />
            <div className="absolute -bottom-1/4 -left-1/4 h-2/3 w-2/3 rounded-full bg-white/60 blur-xl" />
          </div>
          <span className="relative flex h-[58%] w-[58%] max-h-14 max-w-14 items-center justify-center rounded-2xl bg-white/75 shadow-sm ring-1 ring-primary/15 backdrop-blur-[2px]">
            <span className="select-none text-[1.35rem] font-bold leading-none text-primary/85">
              {initial}
            </span>
          </span>
        </div>
      )}
    </div>
  )
}
