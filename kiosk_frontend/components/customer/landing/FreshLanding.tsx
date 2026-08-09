'use client'

import { motion } from 'framer-motion'
import { AttractShell } from './AttractShell'
import { AmbientWash, BgImage, BrandMark } from './shared'
import {
  resolveBrand,
  resolveCta,
  resolvePalette,
  resolveTagline,
  type LandingThemeProps,
} from './types'

/**
 * Quiet — tall open field, soft wash, calm bottom invitation.
 */
export function FreshLanding({
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
        backgroundColor: palette.bg,
        backgroundImage: `
          radial-gradient(70% 45% at 80% 8%, ${palette.accent}18, transparent 60%),
          radial-gradient(55% 40% at 10% 92%, ${palette.accent}12, transparent 55%),
          linear-gradient(180deg, ${palette.bg} 0%, ${palette.bg} 55%, ${palette.accent}14 100%)
        `,
      }}
    >
      <BgImage
        url={backgroundUrl}
        overlay={`linear-gradient(180deg,
          ${palette.bg}c8 0%,
          ${palette.bg}8a 40%,
          ${palette.bg}e8 100%)`}
      />

      <AmbientWash
        accent={palette.accent}
        className="pointer-events-none absolute -end-[22%] -top-[8%] h-[58cqmax] w-[58cqmax] rounded-full blur-3xl"
      />
      <AmbientWash
        accent={palette.accent}
        className="pointer-events-none absolute -start-[28%] bottom-[-18%] h-[50cqmax] w-[50cqmax] rounded-full blur-3xl opacity-70"
      />

      <div className="relative z-10 flex h-full w-full flex-col px-[8cqw] pb-[8cqh] pt-[11cqh]">
        <motion.div
          data-attract-brand
          className="flex flex-[1.15] flex-col items-center justify-center gap-[2.6cqh]"
          initial={m ? { opacity: 0, y: 22 } : false}
          animate={{ opacity: 1, y: 0 }}
          transition={m ? { duration: 0.8, ease: [0.22, 1, 0.36, 1] } : { duration: 0 }}
        >
          <motion.div
            animate={m ? { y: [0, -8, 0] } : undefined}
            transition={m ? { duration: 5.8, repeat: Infinity, ease: 'easeInOut' } : undefined}
          >
            <BrandMark brand={brand} logoUrl={logoUrl} accent={palette.accent} size="lg" />
          </motion.div>

          <h1
            className="max-w-[90cqw] text-center font-black leading-[1.06] tracking-tight"
            style={{ fontSize: 'clamp(2.8rem, 8.2cqh, 5.4rem)', color: palette.text }}
          >
            {brand}
          </h1>

          <p
            className="max-w-[32rem] text-center leading-relaxed"
            style={{ fontSize: 'clamp(1.1rem, 2.5cqh, 1.5rem)', color: palette.muted }}
          >
            {support}
          </p>
        </motion.div>

        <div className="min-h-[6cqh] flex-shrink-0" aria-hidden />

        <motion.div
          className="flex flex-col items-center gap-[2.2cqh]"
          initial={m ? { opacity: 0, y: 14 } : false}
          animate={{ opacity: 1, y: 0 }}
          transition={m ? { delay: 0.2, duration: 0.55 } : { duration: 0 }}
        >
          <motion.div
            className="w-full max-w-[min(78cqw,420px)] border-y py-[2.2cqh]"
            style={{ borderColor: `${palette.accent}55` }}
            animate={
              m
                ? { borderColor: [`${palette.accent}40`, `${palette.accent}90`, `${palette.accent}40`] }
                : undefined
            }
            transition={m ? { duration: 3.2, repeat: Infinity, ease: 'easeInOut' } : undefined}
          >
            <p
              className="text-center font-bold"
              style={{ fontSize: 'clamp(1.15rem, 3cqh, 1.7rem)', color: palette.text }}
            >
              {cta}
            </p>
          </motion.div>
          <motion.div
            aria-hidden
            className="h-2 w-2 rounded-full"
            style={{ background: palette.accent }}
            animate={m ? { opacity: [0.35, 1, 0.35], y: [0, 4, 0] } : undefined}
            transition={m ? { duration: 2.1, repeat: Infinity, ease: 'easeInOut' } : undefined}
          />
        </motion.div>
      </div>
    </AttractShell>
  )
}
