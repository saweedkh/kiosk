'use client'

import { motion } from 'framer-motion'
import { AttractShell } from './AttractShell'
import { BgImage, BrandMark } from './shared'
import {
  resolveBrand,
  resolveCta,
  resolvePalette,
  resolveTagline,
  type LandingThemeProps,
} from './types'

/**
 * Line — asymmetric vertical composition: accent spine + oversized type.
 */
export function NeonLanding({
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

  return (
    <AttractShell
      ariaLabel={cta}
      onStart={onStart}
      onSecretAdmin={onSecretAdmin}
      preview={preview}
      style={{
        color: palette.text,
        background: hasBg
          ? palette.bg
          : `linear-gradient(165deg, ${palette.bg} 0%, ${palette.bg} 55%, ${palette.accent}14 100%)`,
      }}
    >
      <BgImage
        url={backgroundUrl}
        overlay={`linear-gradient(180deg,
          ${palette.bg}cc 0%,
          ${palette.bg}99 42%,
          ${palette.bg}e6 100%)`}
      />

      <motion.div
        aria-hidden
        className="pointer-events-none absolute top-0 end-0 bottom-0 w-[min(4.5cqw,28px)] origin-top"
        style={{ background: palette.accent }}
        initial={m ? { scaleY: 0 } : false}
        animate={{ scaleY: 1 }}
        transition={m ? { duration: 0.9, ease: [0.22, 1, 0.36, 1] } : { duration: 0 }}
      />

      <div className="relative z-10 flex h-full w-full flex-col justify-between pe-[10cqw] ps-[8cqw] pb-[8cqh] pt-[10cqh]">
        <motion.div
          data-attract-brand
          className="flex flex-col items-start gap-[3cqh]"
          initial={m ? { opacity: 0, x: 24 } : false}
          animate={{ opacity: 1, x: 0 }}
          transition={m ? { duration: 0.75, ease: [0.22, 1, 0.36, 1] } : { duration: 0 }}
        >
          <BrandMark brand={brand} logoUrl={logoUrl} accent={palette.accent} size="sm" />

          <h1
            className="max-w-[82cqw] text-start font-black leading-[0.92] tracking-tight"
            style={{ fontSize: 'clamp(3.4rem, 11cqh, 7.5rem)', color: palette.text }}
          >
            {brand}
          </h1>

          <p
            className="max-w-[28rem] text-start leading-relaxed"
            style={{ fontSize: 'clamp(1.15rem, 2.6cqh, 1.6rem)', color: palette.muted }}
          >
            {support}
          </p>
        </motion.div>

        <motion.div
          className="flex flex-col items-start gap-[2cqh]"
          initial={m ? { opacity: 0, y: 18 } : false}
          animate={{ opacity: 1, y: 0 }}
          transition={m ? { delay: 0.18, duration: 0.55 } : { duration: 0 }}
        >
          <motion.div
            aria-hidden
            className="h-[3px] w-20 origin-right rounded-full"
            style={{ background: palette.accent }}
            animate={m ? { scaleX: [1, 1.35, 1], opacity: [0.5, 1, 0.5] } : undefined}
            transition={m ? { duration: 2.8, repeat: Infinity, ease: 'easeInOut' } : undefined}
          />
          <p
            className="max-w-[80cqw] text-start font-bold leading-snug"
            style={{ fontSize: 'clamp(1.35rem, 3.6cqh, 2.15rem)', color: palette.text }}
          >
            {cta}
          </p>
          <p
            className="font-medium tracking-wide"
            style={{ fontSize: 'clamp(0.95rem, 2cqh, 1.2rem)', color: palette.muted }}
          >
            لمس کنید تا شروع شود
          </p>
        </motion.div>
      </div>
    </AttractShell>
  )
}
