'use client'

import { motion } from 'framer-motion'
import { AttractShell } from './AttractShell'
import { BgImage } from './shared'
import {
  resolveBrand,
  resolveCta,
  resolvePalette,
  resolveTagline,
  type LandingThemeProps,
} from './types'

/**
 * Type — brand name as a full-height poster. Minimal chrome, maximum type.
 */
export function EditorialLanding({
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
  const m = motionEnabled

  return (
    <AttractShell
      ariaLabel={cta}
      onStart={onStart}
      onSecretAdmin={onSecretAdmin}
      preview={preview}
      style={{
        color: palette.text,
        background: `linear-gradient(180deg, ${palette.bg} 0%, ${palette.bg} 50%, ${palette.accent}16 100%)`,
      }}
    >
      <BgImage
        url={backgroundUrl}
        overlay={`linear-gradient(180deg,
          ${palette.bg}d0 0%,
          ${palette.bg}90 45%,
          ${palette.bg}e8 100%)`}
      />

      <motion.div
        aria-hidden
        className="pointer-events-none absolute start-0 top-[8cqh] bottom-[8cqh] w-[3px] origin-top"
        style={{ background: palette.accent }}
        initial={m ? { scaleY: 0 } : false}
        animate={{ scaleY: 1 }}
        transition={m ? { duration: 0.85, ease: [0.22, 1, 0.36, 1] } : { duration: 0 }}
      />

      <div className="relative z-10 flex h-full w-full flex-col justify-between px-[8cqw] py-[9cqh]">
        <motion.div
          data-attract-brand
          className="flex flex-col items-start gap-[2.4cqh]"
          initial={m ? { opacity: 0, y: 30 } : false}
          animate={{ opacity: 1, y: 0 }}
          transition={m ? { duration: 0.85, ease: [0.22, 1, 0.36, 1] } : { duration: 0 }}
        >
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoUrl}
              alt={brand}
              className="h-[min(9cqh,72px)] w-[min(9cqh,72px)] object-contain"
            />
          ) : (
            <span
              className="text-[11px] font-bold uppercase tracking-[0.35em]"
              style={{ color: palette.accent }}
            >
              Kiosk
            </span>
          )}

          <h1
            className="max-w-[94cqw] text-start font-black leading-[0.88] tracking-tight"
            style={{ fontSize: 'clamp(4rem, 16cqh, 10rem)', color: palette.text }}
          >
            {brand}
          </h1>

          <p
            className="mt-[1cqh] max-w-[26rem] text-start"
            style={{ fontSize: 'clamp(1.1rem, 2.5cqh, 1.45rem)', color: palette.muted }}
          >
            {support}
          </p>
        </motion.div>

        <motion.div
          className="flex items-center gap-4"
          initial={m ? { opacity: 0 } : false}
          animate={{ opacity: 1 }}
          transition={m ? { delay: 0.25, duration: 0.5 } : { duration: 0 }}
        >
          <motion.span
            className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ background: palette.accent }}
            animate={m ? { opacity: [0.35, 1, 0.35], scale: [1, 1.15, 1] } : undefined}
            transition={m ? { duration: 2.1, repeat: Infinity, ease: 'easeInOut' } : undefined}
          />
          <p
            className="font-semibold leading-snug"
            style={{ fontSize: 'clamp(1.2rem, 3.1cqh, 1.85rem)', color: palette.text }}
          >
            {cta}
          </p>
        </motion.div>
      </div>
    </AttractShell>
  )
}
