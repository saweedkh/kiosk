'use client'

import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'

interface KioskAttractScreenProps {
  siteName: string
  logoUrl?: string | null
  tagline?: string | null
  onStart: () => void
  onSecretAdmin?: () => void
}

/**
 * Full-bleed attract screen tuned for tall portrait kiosk panels.
 * Brand is the hero; whole surface is the CTA.
 */
export function KioskAttractScreen({
  siteName,
  logoUrl,
  tagline,
  onStart,
  onSecretAdmin,
}: KioskAttractScreenProps) {
  const tapCountRef = useRef(0)
  const tapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [logoFailed, setLogoFailed] = useState(false)
  const [logoReady, setLogoReady] = useState(false)

  useEffect(() => {
    setLogoFailed(false)
    setLogoReady(false)
  }, [logoUrl])

  useEffect(() => {
    return () => {
      if (tapTimerRef.current) clearTimeout(tapTimerRef.current)
    }
  }, [])

  const handleBrandTap = (e: React.PointerEvent) => {
    e.stopPropagation()
    tapCountRef.current += 1
    if (tapTimerRef.current) clearTimeout(tapTimerRef.current)
    tapTimerRef.current = setTimeout(() => {
      tapCountRef.current = 0
    }, 2000)
    if (tapCountRef.current >= 5) {
      tapCountRef.current = 0
      onSecretAdmin?.()
    }
  }

  const handleStart = () => {
    void document.documentElement.requestFullscreen?.().catch(() => {})
    onStart()
  }

  const brand = (siteName || 'کیوسک').trim()
  const support = (tagline || '').trim() || 'منوی روز منتظر شماست'
  const showLogo = Boolean(logoUrl) && !logoFailed

  return (
    <div
      role="button"
      tabIndex={0}
      data-kiosk-attract="true"
      onClick={handleStart}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          handleStart()
        }
      }}
      className="fixed inset-0 z-[200] touch-manipulation cursor-pointer overflow-hidden border-0 p-0 text-right outline-none"
      style={{
        background:
          'radial-gradient(120% 80% at 50% -10%, #4A2C18 0%, #1A1410 42%, #070809 100%)',
      }}
      aria-label="برای سفارش لمس کنید"
    >
      {/* Tall portrait atmosphere */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            'linear-gradient(180deg, rgba(255,140,40,0.14) 0%, transparent 28%, transparent 62%, rgba(0,0,0,0.45) 100%), linear-gradient(90deg, rgba(0,0,0,0.35) 0%, transparent 22%, transparent 78%, rgba(0,0,0,0.35) 100%)',
        }}
      />

      <motion.div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[-8%] h-[75vmax] w-[75vmax] -translate-x-1/2 rounded-full blur-3xl"
        style={{ background: 'radial-gradient(circle, rgba(225,113,0,0.42) 0%, transparent 68%)' }}
        animate={{ scale: [1, 1.1, 1], opacity: [0.45, 0.85, 0.45] }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        aria-hidden
        className="pointer-events-none absolute bottom-[-18%] left-[-22%] h-[58vmax] w-[58vmax] rounded-full blur-3xl"
        style={{ background: 'radial-gradient(circle, rgba(255,105,0,0.2) 0%, transparent 70%)' }}
        animate={{ scale: [1.06, 0.94, 1.06], opacity: [0.3, 0.55, 0.3] }}
        transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        aria-hidden
        className="pointer-events-none absolute bottom-[16%] right-[-18%] h-[42vmax] w-[42vmax] rounded-full blur-3xl"
        style={{ background: 'radial-gradient(circle, rgba(255,190,110,0.14) 0%, transparent 70%)' }}
        animate={{ y: [0, -28, 0] }}
        transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Soft vignette ring for portrait frame */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-[2.5vh] rounded-[2.5vh] border border-white/[0.06]"
      />

      {/* Fine grain */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.05] mix-blend-overlay"
        style={{
          backgroundImage:
            'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.85\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")',
        }}
      />

      {/* Vertical light sweep */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 h-[28%] bg-gradient-to-b from-transparent via-white/[0.08] to-transparent"
        initial={{ y: '-40%' }}
        animate={{ y: ['-40%', '170%'] }}
        transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut', repeatDelay: 2.5 }}
      />

      {/* Portrait composition: brand high, CTA lower */}
      <div className="relative z-10 flex h-full w-full flex-col items-center px-[7vw] pb-[7vh] pt-[9vh]">
        <motion.div
          className="flex flex-[1.15] flex-col items-center justify-center gap-[3.5vh]"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          onPointerDown={handleBrandTap}
        >
          <motion.div
            className="relative flex items-center justify-center"
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 5.5, repeat: Infinity, ease: 'easeInOut' }}
          >
            <span
              aria-hidden
              className="absolute rounded-full"
              style={{
                inset: '-14%',
                background:
                  'conic-gradient(from 180deg, transparent, rgba(255,180,80,0.35), transparent 40%)',
                filter: 'blur(2px)',
                opacity: 0.7,
              }}
            />
            <motion.div
              className="relative flex items-center justify-center overflow-hidden rounded-full"
              style={{
                width: 'min(40vw, 26vh, 300px)',
                height: 'min(40vw, 26vh, 300px)',
                background:
                  'linear-gradient(145deg, #FF7A18 0%, #E17100 52%, #B84E00 100%)',
                boxShadow:
                  '0 0 0 1px rgba(255,255,255,0.12) inset, 0 28px 80px rgba(225,113,0,0.4)',
              }}
              animate={{
                boxShadow: [
                  '0 0 0 1px rgba(255,255,255,0.1) inset, 0 20px 60px rgba(225,113,0,0.3)',
                  '0 0 0 1px rgba(255,255,255,0.16) inset, 0 32px 90px rgba(225,113,0,0.52)',
                  '0 0 0 1px rgba(255,255,255,0.1) inset, 0 20px 60px rgba(225,113,0,0.3)',
                ],
              }}
              transition={{ duration: 3.8, repeat: Infinity, ease: 'easeInOut' }}
            >
              {showLogo ? (
                // Native img uses browser HTTP cache after preload
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={logoUrl!}
                  alt={brand}
                  className={`h-full w-full object-cover transition-opacity duration-500 ${
                    logoReady ? 'opacity-100' : 'opacity-0'
                  }`}
                  decoding="async"
                  fetchPriority="high"
                  onLoad={() => setLogoReady(true)}
                  onError={() => setLogoFailed(true)}
                />
              ) : (
                <span
                  className="font-black text-white"
                  style={{ fontSize: 'clamp(3.25rem, 11vh, 6.75rem)' }}
                >
                  {brand.charAt(0) || 'ک'}
                </span>
              )}
            </motion.div>
          </motion.div>

          <div className="flex max-w-[94vw] flex-col items-center gap-[1.6vh]">
            <h1
              className="text-center font-black leading-[1.05] tracking-tight text-white"
              style={{
                fontSize: 'clamp(3rem, 10vh, 8rem)',
                textShadow: '0 12px 55px rgba(0,0,0,0.55)',
              }}
            >
              {brand}
            </h1>
            <motion.div
              aria-hidden
              className="h-[3px] rounded-full"
              style={{
                width: 'min(28vw, 12vh, 160px)',
                background:
                  'linear-gradient(90deg, transparent, #FF8A2B 20%, #FFD29A 50%, #FF8A2B 80%, transparent)',
              }}
              initial={{ scaleX: 0, opacity: 0 }}
              animate={{ scaleX: 1, opacity: 1 }}
              transition={{ delay: 0.35, duration: 0.7 }}
            />
          </div>
        </motion.div>

        <motion.div
          className="mb-[1.5vh] flex w-full flex-col items-center gap-[3.2vh]"
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.22, duration: 0.75 }}
        >
          <div className="relative flex items-center justify-center">
            <motion.span
              aria-hidden
              className="absolute rounded-full border border-[#E17100]/50"
              style={{ width: 'min(30vw, 17vh)', height: 'min(30vw, 17vh)' }}
              animate={{ scale: [1, 1.6], opacity: [0.55, 0] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: 'easeOut' }}
            />
            <motion.span
              aria-hidden
              className="absolute rounded-full border border-[#FF6900]/28"
              style={{ width: 'min(30vw, 17vh)', height: 'min(30vw, 17vh)' }}
              animate={{ scale: [1, 1.9], opacity: [0.35, 0] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: 'easeOut', delay: 0.55 }}
            />
            <motion.div
              className="relative flex items-center justify-center rounded-full"
              style={{
                width: 'min(26vw, 14.5vh, 148px)',
                height: 'min(26vw, 14.5vh, 148px)',
                background:
                  'linear-gradient(165deg, rgba(255,120,20,1), rgba(180,70,0,0.96))',
                boxShadow: '0 24px 70px rgba(225,113,0,0.48)',
              }}
              animate={{ scale: [1, 1.07, 1] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden
                className="text-white"
                style={{ width: '42%', height: '42%' }}
              >
                <path
                  d="M9 11.2V8.2a3 3 0 016 0v3"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                />
                <path
                  d="M7 11.2h10l-.55 7.1A1.8 1.8 0 0114.67 20H9.33a1.8 1.8 0 01-1.78-1.7L7 11.2z"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinejoin="round"
                />
                <path
                  d="M12 14v3"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                />
              </svg>
            </motion.div>
          </div>

          <div className="flex flex-col items-center gap-[1.2vh] px-4">
            <p
              className="text-center font-bold text-white"
              style={{ fontSize: 'clamp(1.65rem, 4.5vh, 3.25rem)' }}
            >
              برای سفارش، صفحه را لمس کنید
            </p>
            <p
              className="max-w-[32rem] text-center leading-relaxed text-white/55"
              style={{ fontSize: 'clamp(1.05rem, 2.5vh, 1.6rem)' }}
            >
              {support}
            </p>
          </div>
        </motion.div>

        <motion.div
          className="pointer-events-none mt-auto flex justify-center pb-1"
          animate={{ opacity: [0.28, 0.8, 0.28], y: [0, -8, 0] }}
          transition={{ duration: 2.7, repeat: Infinity, ease: 'easeInOut' }}
        >
          <span
            className="tracking-[0.18em] text-white/35"
            style={{ fontSize: 'clamp(0.9rem, 1.9vh, 1.15rem)' }}
          >
            لمس کنید
          </span>
        </motion.div>
      </div>
    </div>
  )
}
