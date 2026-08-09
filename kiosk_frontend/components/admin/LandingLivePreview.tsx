'use client'

import { useEffect, useRef, useState } from 'react'
import { CinemaLanding } from '@/components/customer/landing/CinemaLanding'
import { NeonLanding } from '@/components/customer/landing/NeonLanding'
import { FreshLanding } from '@/components/customer/landing/FreshLanding'
import { EditorialLanding } from '@/components/customer/landing/EditorialLanding'
import {
  LANDING_DESIGN_HEIGHT,
  LANDING_DESIGN_WIDTH,
  type LandingThemeId,
} from '@/components/customer/landing/types'
import { cn } from '@/lib/utils'

export interface LandingLivePreviewProps {
  theme: LandingThemeId
  siteName: string
  logoUrl?: string | null
  tagline?: string | null
  ctaText?: string | null
  accentColor?: string | null
  bgColor?: string | null
  textColor?: string | null
  mutedColor?: string | null
  backgroundUrl?: string | null
  className?: string
  /** Outer frame chrome (kiosk bezel). */
  framed?: boolean
  /** Optional label under the frame. */
  caption?: string
  /** Run attract animations (main preview). Off for picker tiles. */
  motionEnabled?: boolean
}

function ThemePreview({
  theme,
  motionEnabled,
  ...props
}: Omit<LandingLivePreviewProps, 'className' | 'framed' | 'caption'> & {
  onStart: () => void
}) {
  const shared = {
    ...props,
    preview: true,
    motionEnabled,
    onStart: () => {},
  }

  switch (theme) {
    case 'neon':
      return <NeonLanding {...shared} />
    case 'fresh':
      return <FreshLanding {...shared} />
    case 'editorial':
      return <EditorialLanding {...shared} />
    case 'cinema':
    default:
      return <CinemaLanding {...shared} />
  }
}

/**
 * True WYSIWYG: mounts the real landing at 1080×1920 and scales it to fit.
 */
export function LandingLivePreview({
  theme,
  siteName,
  logoUrl,
  tagline,
  ctaText,
  accentColor,
  bgColor,
  textColor,
  mutedColor,
  backgroundUrl,
  className,
  framed = true,
  caption,
  motionEnabled = true,
}: LandingLivePreviewProps) {
  const hostRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(0.2)

  useEffect(() => {
    const el = hostRef.current
    if (!el) return

    const update = () => {
      const w = el.clientWidth
      if (w > 0) setScale(w / LANDING_DESIGN_WIDTH)
    }

    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const stage = (
    <div
      ref={hostRef}
      className="relative w-full overflow-hidden bg-background"
      style={{ aspectRatio: `${LANDING_DESIGN_WIDTH} / ${LANDING_DESIGN_HEIGHT}` }}
    >
      <div
        className="absolute left-0 top-0 origin-top-left"
        style={{
          width: LANDING_DESIGN_WIDTH,
          height: LANDING_DESIGN_HEIGHT,
          transform: `scale(${scale})`,
        }}
      >
        <ThemePreview
          theme={theme}
          siteName={siteName}
          logoUrl={logoUrl}
          tagline={tagline}
          ctaText={ctaText}
          accentColor={accentColor}
          bgColor={bgColor}
          textColor={textColor}
          mutedColor={mutedColor}
          backgroundUrl={backgroundUrl}
          motionEnabled={motionEnabled}
          onStart={() => {}}
        />
      </div>
    </div>
  )

  if (!framed) {
    return <div className={cn(className)}>{stage}</div>
  }

  return (
    <div className={cn('w-full', className)}>
      <div className="overflow-hidden rounded-[1.75rem] border-[5px] border-[#1c1c1c] bg-[#1c1c1c] shadow-2xl shadow-black/25">
        <div className="border-b border-white/10 px-3 py-1.5">
          <div className="mx-auto h-1 w-16 rounded-full bg-white/25" />
        </div>
        {stage}
      </div>
      {caption ? (
        <p className="mt-3 text-center text-sm font-bold text-foreground">{caption}</p>
      ) : null}
    </div>
  )
}

/** Compact picker tile — real theme, no bezel. */
export function LandingThemePickerThumb({
  theme,
  siteName,
  logoUrl,
  tagline,
  ctaText,
  accentColor,
  bgColor,
  textColor,
  mutedColor,
  backgroundUrl,
  selected,
  disabled,
  title,
  desc,
  onSelect,
}: LandingLivePreviewProps & {
  selected?: boolean
  disabled?: boolean
  title: string
  desc: string
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onSelect}
      className={cn(
        'overflow-hidden rounded-2xl border text-right transition-all disabled:opacity-60',
        selected
          ? 'border-primary shadow-[0_10px_30px_rgba(225,113,0,0.18)] ring-2 ring-primary/25'
          : 'border-border hover:border-primary/40 dark:border-border-dark'
      )}
    >
      <div className="aspect-[9/16] w-full">
        <LandingLivePreview
          framed={false}
          motionEnabled={false}
          theme={theme}
          siteName={siteName}
          logoUrl={logoUrl}
          tagline={tagline}
          ctaText={ctaText}
          accentColor={accentColor}
          bgColor={bgColor}
          textColor={textColor}
          mutedColor={mutedColor}
          backgroundUrl={backgroundUrl}
        />
      </div>
      <div className="border-t border-border/70 px-3 py-2.5 dark:border-border-dark/70">
        <p className="text-sm font-bold text-foreground">{title}</p>
        <p className="mt-0.5 line-clamp-2 text-[11px] leading-relaxed text-muted-foreground">
          {desc}
        </p>
      </div>
    </button>
  )
}
