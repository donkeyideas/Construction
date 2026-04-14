import type { ColorPalette } from '../types/scraper'
import type { ThemeConfig, CSSVariableSet } from '../types/generator'
import { lighten, darken, withAlpha, isLight } from '../utils/color'

export function mapColorsToTheme(
  palette: ColorPalette,
  fonts: { heading: string | null; body: string | null }
): ThemeConfig {
  const primary = palette.primary || '#1d4ed8'
  const secondary = palette.secondary || '#b45309'
  const bg = palette.background || '#ffffff'
  const text = palette.text || '#1a1a1a'
  const muted = palette.muted || '#6b7280'

  const light: CSSVariableSet = {
    '--bg': bg,
    '--surface': lighten(primary, 0.93),
    '--card-bg': isLight(bg) ? '#ffffff' : lighten(bg, 0.05),
    '--text': text,
    '--muted': muted,
    '--border': lighten(text, 0.82),
    '--blue': primary,
    '--blue-light': withAlpha(primary, 0.1),
    '--blue-dark': darken(primary, 0.15),
    '--amber': secondary,
    '--amber-light': withAlpha(secondary, 0.1),
    '--green': '#16a34a',
    '--green-light': 'rgba(22,163,74,0.1)',
    '--red': '#dc2626',
    '--red-light': 'rgba(220,38,38,0.1)',
    '--tab-bg': isLight(bg) ? '#ffffff' : bg,
    '--status-bar-color': text,
  }

  const dark: CSSVariableSet = {
    '--bg': darken(primary, 0.88),
    '--surface': darken(primary, 0.78),
    '--card-bg': darken(primary, 0.78),
    '--text': '#f5f0eb',
    '--muted': '#a8a29e',
    '--border': darken(primary, 0.6),
    '--blue': lighten(primary, 0.2),
    '--blue-light': withAlpha(primary, 0.15),
    '--blue-dark': primary,
    '--amber': lighten(secondary, 0.2),
    '--amber-light': withAlpha(secondary, 0.15),
    '--green': '#22c55e',
    '--green-light': 'rgba(34,197,94,0.15)',
    '--red': '#ef4444',
    '--red-light': 'rgba(239,68,68,0.15)',
    '--tab-bg': darken(primary, 0.88),
    '--status-bar-color': '#f5f0eb',
  }

  const headingFont = fonts.heading || 'Inter'
  const bodyFont = fonts.body || fonts.heading || 'Inter'

  return {
    light,
    dark,
    fonts: {
      heading: headingFont,
      body: bodyFont,
    },
    borderRadius: '12px',
  }
}
