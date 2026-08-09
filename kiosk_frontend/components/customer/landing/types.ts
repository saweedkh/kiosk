export type LandingThemeId = 'cinema' | 'neon' | 'fresh' | 'editorial'

/** Portrait kiosk design canvas (typical 1080×1920 panel). */
export const LANDING_DESIGN_WIDTH = 1080
export const LANDING_DESIGN_HEIGHT = 1920

export const LANDING_THEMES: {
  id: LandingThemeId
  title: string
  desc: string
}[] = [
  {
    id: 'cinema',
    title: 'کلاسیک',
    desc: 'پس‌زمینه تمام‌صفحه، برند در مرکز، دعوت لمس پایین',
  },
  {
    id: 'neon',
    title: 'خطی',
    desc: 'تایپوگرافی درشت و نوار اکسنت عمودی',
  },
  {
    id: 'fresh',
    title: 'آرام',
    desc: 'فضای باز عمودی و دعوت آرام به لمس',
  },
  {
    id: 'editorial',
    title: 'تایپ',
    desc: 'نام برند به‌عنوان پوستر تمام‌قد',
  },
]

export const DEFAULT_LANDING_CTA = 'برای سفارش، صفحه را لمس کنید'
export const DEFAULT_ACCENT = '#E17100'
export const DEFAULT_BG = '#FFF3E8'
export const DEFAULT_TEXT = '#111111'
export const DEFAULT_MUTED = '#5C5046'

export interface LandingPalette {
  bg: string
  text: string
  muted: string
  accent: string
}

export const DEFAULT_LANDING_PALETTE: LandingPalette = {
  bg: DEFAULT_BG,
  text: DEFAULT_TEXT,
  muted: DEFAULT_MUTED,
  accent: DEFAULT_ACCENT,
}

/** Quick-apply palettes in admin. */
export const LANDING_PALETTE_PRESETS: {
  id: string
  title: string
  palette: LandingPalette
}[] = [
  {
    id: 'brand',
    title: 'برند',
    palette: { ...DEFAULT_LANDING_PALETTE },
  },
  {
    id: 'night',
    title: 'شب',
    palette: {
      bg: '#141414',
      text: '#F4F4F4',
      muted: '#A0A0A0',
      accent: '#FF8A3D',
    },
  },
  {
    id: 'forest',
    title: 'سبز',
    palette: {
      bg: '#F2F7F3',
      text: '#14201A',
      muted: '#5A6B60',
      accent: '#2F6B4F',
    },
  },
  {
    id: 'ocean',
    title: 'آبی',
    palette: {
      bg: '#F1F5F9',
      text: '#0F1B2A',
      muted: '#5A6A7A',
      accent: '#1E5FA8',
    },
  },
  {
    id: 'berry',
    title: 'آلبالو',
    palette: {
      bg: '#FFF5F5',
      text: '#1A0F12',
      muted: '#7A5A60',
      accent: '#C23B4C',
    },
  },
]

export interface LandingThemeProps {
  siteName: string
  logoUrl?: string | null
  tagline?: string | null
  ctaText?: string | null
  accentColor?: string | null
  bgColor?: string | null
  textColor?: string | null
  mutedColor?: string | null
  backgroundUrl?: string | null
  onStart: () => void
  onSecretAdmin?: () => void
  /** When true, render as nested stage (admin WYSIWYG) instead of fixed fullscreen. */
  preview?: boolean
  /** Framer motion / ambient loops. Disable on tiny picker tiles for performance. */
  motionEnabled?: boolean
}

export function isHexColor(color?: string | null): color is string {
  return /^#[0-9A-Fa-f]{6}$/.test((color || '').trim())
}

export function resolveHex(
  color: string | null | undefined,
  fallback: string
): string {
  const c = (color || '').trim()
  return isHexColor(c) ? c : fallback
}

export function resolveAccent(color?: string | null): string {
  return resolveHex(color, DEFAULT_ACCENT)
}

export function resolvePalette(input?: {
  accentColor?: string | null
  bgColor?: string | null
  textColor?: string | null
  mutedColor?: string | null
}): LandingPalette {
  return {
    bg: resolveHex(input?.bgColor, DEFAULT_BG),
    text: resolveHex(input?.textColor, DEFAULT_TEXT),
    muted: resolveHex(input?.mutedColor, DEFAULT_MUTED),
    accent: resolveHex(input?.accentColor, DEFAULT_ACCENT),
  }
}

export function resolveCta(text?: string | null): string {
  const t = (text || '').trim()
  return t || DEFAULT_LANDING_CTA
}

export function resolveBrand(siteName?: string | null): string {
  return (siteName || 'کیوسک').trim() || 'کیوسک'
}

export function resolveTagline(tagline?: string | null): string {
  const t = (tagline || '').trim()
  return t || 'منوی روز منتظر شماست'
}

/** Soft gradient wash from accent over custom bg. */
export function paletteSurfaceGradient(palette: LandingPalette): string {
  return `
    radial-gradient(90% 55% at 50% 0%, ${palette.accent}22, transparent 55%),
    linear-gradient(180deg, ${palette.bg} 0%, ${palette.bg} 55%, ${palette.accent}18 100%)
  `
}
