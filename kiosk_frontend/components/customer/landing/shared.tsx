'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'

export function BrandMark({
  brand,
  logoUrl,
  accent,
  size = 'md',
}: {
  brand: string
  logoUrl?: string | null
  accent: string
  size?: 'sm' | 'md' | 'lg' | 'hero'
}) {
  const [failed, setFailed] = useState(false)
  const [ready, setReady] = useState(false)
  const show = Boolean(logoUrl) && !failed

  const dim =
    size === 'hero'
      ? 'min(52cqw, 28cqh, 320px)'
      : size === 'lg'
        ? 'min(42cqw, 22cqh, 260px)'
        : size === 'sm'
          ? 'min(20cqw, 11cqh, 104px)'
          : 'min(32cqw, 17cqh, 180px)'

  useEffect(() => {
    setFailed(false)
    setReady(false)
  }, [logoUrl])

  return (
    <div
      className="relative flex items-center justify-center overflow-hidden"
      style={{ width: dim, height: dim }}
    >
      {show ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logoUrl!}
          alt={brand}
          className={`h-full w-full object-contain transition-opacity duration-500 ${
            ready ? 'opacity-100' : 'opacity-0'
          }`}
          onLoad={() => setReady(true)}
          onError={() => setFailed(true)}
        />
      ) : (
        <span
          className="font-black leading-none"
          style={{
            color: accent,
            fontSize:
              size === 'hero' || size === 'lg'
                ? 'clamp(3rem, 12cqh, 7rem)'
                : 'clamp(2rem, 7cqh, 4rem)',
          }}
        >
          {brand.charAt(0) || 'ک'}
        </span>
      )}
    </div>
  )
}

export function TouchHint({
  accent,
  label,
  motionEnabled = true,
}: {
  accent: string
  label: string
  motionEnabled?: boolean
}) {
  if (!motionEnabled) {
    return (
      <div className="flex flex-col items-center gap-[2cqh]">
        <div
          className="relative flex h-[7.5cqh] w-[7.5cqh] max-h-[88px] max-w-[88px] items-center justify-center"
          aria-hidden
        >
          <span
            className="absolute inset-[18%] rounded-full"
            style={{ background: accent }}
          />
        </div>
        <p
          className="max-w-[86cqw] text-center font-semibold leading-snug text-foreground"
          style={{ fontSize: 'clamp(1.2rem, 3.4cqh, 2rem)' }}
        >
          {label}
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-[2cqh]">
      <motion.div
        className="relative flex h-[7.5cqh] w-[7.5cqh] max-h-[88px] max-w-[88px] items-center justify-center"
        aria-hidden
      >
        <motion.span
          className="absolute inset-0 rounded-full border-2"
          style={{ borderColor: accent }}
          animate={{ scale: [1, 1.45], opacity: [0.55, 0] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: 'easeOut' }}
        />
        <motion.span
          className="absolute inset-[18%] rounded-full"
          style={{ background: accent }}
          animate={{ scale: [1, 0.92, 1] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
        />
      </motion.div>
      <p
        className="max-w-[86cqw] text-center font-semibold leading-snug text-foreground"
        style={{ fontSize: 'clamp(1.2rem, 3.4cqh, 2rem)' }}
      >
        {label}
      </p>
    </div>
  )
}

/**
 * Full-bleed atmosphere. When no URL, themes paint their own base.
 * With URL: opaque edge-to-edge photo + theme overlay (nothing shows through).
 */
export function BgImage({
  url,
  overlay,
}: {
  url?: string | null
  /** Single overlay for both themes (preview stage has no dark-mode toggle). */
  overlay: string
}) {
  if (!url) return null
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt=""
        aria-hidden
        className="pointer-events-none absolute inset-0 h-full w-full object-cover"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ background: overlay }}
      />
    </>
  )
}

export function AmbientWash({
  accent,
  className,
}: {
  accent: string
  className?: string
}) {
  return (
    <div
      aria-hidden
      className={className}
      style={{
        background: `radial-gradient(circle at center, ${accent}28, transparent 68%)`,
      }}
    />
  )
}
