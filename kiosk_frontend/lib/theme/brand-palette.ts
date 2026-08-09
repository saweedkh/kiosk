/**
 * Site-wide brand palette → shadcn CSS variables (H S% L% channels).
 */

export type BrandPaletteInput = {
  accent?: string | null
  bg?: string | null
  text?: string | null
  muted?: string | null
}

export const BRAND_DEFAULTS = {
  accent: '#E17100',
  bg: '#FFF3E8',
  text: '#111111',
  muted: '#5C5046',
} as const

const HEX_RE = /^#[0-9A-Fa-f]{6}$/

export function isHexColor(color?: string | null): color is string {
  return HEX_RE.test((color || '').trim())
}

export function resolveHex(color: string | null | undefined, fallback: string): string {
  const c = (color || '').trim()
  return isHexColor(c) ? c : fallback
}

export function hexToHslChannels(hex: string): string {
  const raw = hex.replace('#', '')
  const r = parseInt(raw.slice(0, 2), 16) / 255
  const g = parseInt(raw.slice(2, 4), 16) / 255
  const b = parseInt(raw.slice(4, 6), 16) / 255

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  let h = 0
  let s = 0

  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6
        break
      case g:
        h = ((b - r) / d + 2) / 6
        break
      default:
        h = ((r - g) / d + 4) / 6
        break
    }
  }

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`
}

function relativeLuminance(hex: string): number {
  const raw = hex.replace('#', '')
  const toLin = (c: number) => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  }
  const r = toLin(parseInt(raw.slice(0, 2), 16))
  const g = toLin(parseInt(raw.slice(2, 4), 16))
  const b = toLin(parseInt(raw.slice(4, 6), 16))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function primaryForeground(accentHex: string): string {
  return relativeLuminance(accentHex) > 0.45 ? '0 0% 9%' : '0 0% 100%'
}

function softAccentChannels(accentHex: string): string {
  const [h, s] = hexToHslChannels(accentHex).split(' ')
  return `${h} ${s} 94%`
}

function softAccentForeground(accentHex: string): string {
  const [h, s] = hexToHslChannels(accentHex).split(' ')
  return `${h} ${s} 30%`
}

const LIGHT_KEYS = [
  '--background',
  '--foreground',
  '--muted-foreground',
  '--card-foreground',
  '--popover-foreground',
  '--secondary-foreground',
  '--accent',
  '--accent-foreground',
  '--sidebar-background',
  '--sidebar-foreground',
  '--sidebar-accent',
  '--sidebar-accent-foreground',
] as const

const ALWAYS_KEYS = [
  '--primary',
  '--primary-foreground',
  '--ring',
  '--chart-1',
  '--sidebar-primary',
  '--sidebar-primary-foreground',
  '--sidebar-ring',
] as const

function setVar(el: HTMLElement, key: string, value: string) {
  el.style.setProperty(key, value)
}

function clearVar(el: HTMLElement, key: string) {
  el.style.removeProperty(key)
}

/**
 * Apply brand colors to :root. In dark mode, only accent/primary overrides
 * stay so the dark surfaces remain readable.
 */
export function applyBrandTheme(
  input: BrandPaletteInput,
  options?: { mode?: 'light' | 'dark' }
) {
  if (typeof document === 'undefined') return

  const root = document.documentElement
  const mode =
    options?.mode ||
    (root.classList.contains('dark') ? 'dark' : 'light')

  const accent = resolveHex(input.accent, BRAND_DEFAULTS.accent)
  const bg = resolveHex(input.bg, BRAND_DEFAULTS.bg)
  const text = resolveHex(input.text, BRAND_DEFAULTS.text)
  const muted = resolveHex(input.muted, BRAND_DEFAULTS.muted)

  const accentCh = hexToHslChannels(accent)
  const fgOnPrimary = primaryForeground(accent)

  setVar(root, '--primary', accentCh)
  setVar(root, '--primary-foreground', fgOnPrimary)
  setVar(root, '--ring', accentCh)
  setVar(root, '--chart-1', accentCh)
  setVar(root, '--sidebar-primary', accentCh)
  setVar(root, '--sidebar-primary-foreground', fgOnPrimary)
  setVar(root, '--sidebar-ring', accentCh)

  if (mode === 'light') {
    const bgCh = hexToHslChannels(bg)
    const textCh = hexToHslChannels(text)
    const mutedCh = hexToHslChannels(muted)

    setVar(root, '--background', bgCh)
    setVar(root, '--foreground', textCh)
    setVar(root, '--muted-foreground', mutedCh)
    setVar(root, '--card-foreground', textCh)
    setVar(root, '--popover-foreground', textCh)
    setVar(root, '--secondary-foreground', textCh)
    setVar(root, '--accent', softAccentChannels(accent))
    setVar(root, '--accent-foreground', softAccentForeground(accent))
    setVar(root, '--sidebar-background', bgCh)
    setVar(root, '--sidebar-foreground', textCh)
    setVar(root, '--sidebar-accent', softAccentChannels(accent))
    setVar(root, '--sidebar-accent-foreground', softAccentForeground(accent))
  } else {
    for (const key of LIGHT_KEYS) clearVar(root, key)
  }

  root.dataset.brandTheme = '1'
}

export function clearBrandThemeOverrides() {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  for (const key of [...ALWAYS_KEYS, ...LIGHT_KEYS]) clearVar(root, key)
  delete root.dataset.brandTheme
}

export function paletteFromSettings(settings?: {
  landing_accent_color?: string | null
  landing_bg_color?: string | null
  landing_text_color?: string | null
  landing_muted_color?: string | null
} | null): BrandPaletteInput {
  return {
    accent: settings?.landing_accent_color,
    bg: settings?.landing_bg_color,
    text: settings?.landing_text_color,
    muted: settings?.landing_muted_color,
  }
}
