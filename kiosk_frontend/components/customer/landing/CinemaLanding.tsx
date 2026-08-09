'use client'

import { motion } from 'framer-motion'
import { AttractShell } from './AttractShell'
import { BgImage, BrandMark, TouchHint } from './shared'
import {
  paletteSurfaceGradient,
  resolveBrand,
  resolveCta,
  resolvePalette,
  resolveTagline,
  type LandingThemeProps,
} from './types'

/**
 * Classic — full-bleed atmosphere, brand as hero, CTA anchored to lower third.
 * Tuned for tall portrait kiosk (≈9:16 / 1080×1920).
 */
export function CinemaLanding({
  siteName,
  logoUrl,
  tagline,
  ctaText,
  accentColor,
  bgColor,
  textColor,
  mutedColor,
  backgroundUrl,
  onStart,
  onSecretAdmin,
  preview = false,
  motionEnabled = true,
}: LandingThemeProps) {
  const brand = resolveBrand(siteName)
  const support = resolveTagline(tagline)
  const cta = resolveCta(ctaText)
  const palette = resolvePalette({ accentColor, bgColor, textColor, mutedColor })
  const hasBg = Boolean(backgroundUrl?.trim())
  const m = motionEnabled
  const titleColor = hasBg ? '#FFFFFF' : palette.text
  const supportColor = hasBg ? 'rgba(255,255,255,0.82)' : palette.muted
  const markAccent = hasBg ? '#FFFFFF' : palette.accent

  return (
    <AttractShell
      ariaLabel={cta}
      onStart={onStart}
      onSecretAdmin={onSecretAdmin}
      preview={preview}
      className="text-[#111111]"
      style={{
        color: palette.text,
        backgroundColor: palette.bg,
        ...(hasBg ? {} : { backgroundImage: paletteSurfaceGradient(palette) }),
      }}
    >
      <BgImage
        url={backgroundUrl}
        overlay={`linear-gradient(180deg,
          rgba(20,12,4,0.58) 0%,
          rgba(20,12,4,0.32) 38%,
          rgba(20,12,4,0.78) 100%)`}
      />

      {!hasBg && m ? (
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-[42%]"
          style={{
            background: `linear-gradient(180deg, ${palette.accent}14, transparent)`,
          }}
          animate={{ opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
        />
      ) : null}

      <div className="relative z-10 flex h-full w-full flex-col px-[7cqw] pb-[7cqh] pt-[9cqh]">
        <motion.div
          data-attract-brand
          className="flex flex-1 flex-col items-center justify-center gap-[3.2cqh]"
          initial={m ? { opacity: 0, y: 28 } : false}
          animate={{ opacity: 1, y: 0 }}
          transition={m ? { duration: 0.85, ease: [0.22, 1, 0.36, 1] } : { duration: 0 }}
        >
          <motion.div
            animate={m ? { y: [0, -10, 0] } : undefined}
            transition={m ? { duration: 6, repeat: Infinity, ease: 'easeInOut' } : undefined}
          >
            <BrandMark
              brand={brand}
              logoUrl={logoUrl}
              accent={markAccent}
              size="hero"
            />
          </motion.div>

          <h1
            className="max-w-[92cqw] text-center font-black leading-[1.02] tracking-tight"
            style={{ fontSize: 'clamp(3rem, 9.5cqh, 6.5rem)', color: titleColor }}
          >
            {brand}
          </h1>

          <motion.div
            aria-hidden
            className="h-[3px] w-16 origin-center rounded-full"
            style={{ background: palette.accent }}
            initial={m ? { scaleX: 0 } : false}
            animate={{ scaleX: 1 }}
            transition={m ? { delay: 0.28, duration: 0.55 } : { duration: 0 }}
          />

          <p
            className="max-w-[34rem] text-center leading-relaxed"
            style={{ fontSize: 'clamp(1.15rem, 2.7cqh, 1.65rem)', color: supportColor }}
          >
            {support}
          </p>
        </motion.div>

        <motion.div
          initial={m ? { opacity: 0, y: 16 } : false}
          animate={{ opacity: 1, y: 0 }}
          transition={m ? { delay: 0.22, duration: 0.6 } : { duration: 0 }}
        >
          <div style={{ color: hasBg ? '#FFFFFF' : palette.text }}>
            <TouchHint accent={palette.accent} label={cta} motionEnabled={m} />
          </div>
        </motion.div>
      </div>
    </AttractShell>
  )
}
