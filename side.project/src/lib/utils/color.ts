/** Minimal color utilities — no external dependency for basic ops */

export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const clean = hex.replace('#', '')
  const full = clean.length === 3
    ? clean.split('').map(c => c + c).join('')
    : clean
  if (full.length !== 6) return null
  const num = parseInt(full, 16)
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 }
}

export function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(c => Math.max(0, Math.min(255, Math.round(c))).toString(16).padStart(2, '0')).join('')
}

export function lighten(hex: string, amount: number): string {
  const rgb = hexToRgb(hex)
  if (!rgb) return hex
  return rgbToHex(
    rgb.r + (255 - rgb.r) * amount,
    rgb.g + (255 - rgb.g) * amount,
    rgb.b + (255 - rgb.b) * amount
  )
}

export function darken(hex: string, amount: number): string {
  const rgb = hexToRgb(hex)
  if (!rgb) return hex
  return rgbToHex(
    rgb.r * (1 - amount),
    rgb.g * (1 - amount),
    rgb.b * (1 - amount)
  )
}

export function withAlpha(hex: string, alpha: number): string {
  const rgb = hexToRgb(hex)
  if (!rgb) return hex
  return `rgba(${rgb.r},${rgb.g},${rgb.b},${alpha})`
}

export function luminance(hex: string): number {
  const rgb = hexToRgb(hex)
  if (!rgb) return 0
  const [rs, gs, bs] = [rgb.r, rgb.g, rgb.b].map(c => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs
}

export function isLight(hex: string): boolean {
  return luminance(hex) > 0.5
}

export function isDark(hex: string): boolean {
  return !isLight(hex)
}

/** Check if a color is a neutral (gray, black, white) */
export function isNeutral(hex: string): boolean {
  const rgb = hexToRgb(hex)
  if (!rgb) return false
  const max = Math.max(rgb.r, rgb.g, rgb.b)
  const min = Math.min(rgb.r, rgb.g, rgb.b)
  const saturation = max === 0 ? 0 : (max - min) / max
  return saturation < 0.12
}

/** Normalize any CSS color string to hex */
export function normalizeToHex(color: string): string | null {
  const trimmed = color.trim().toLowerCase()

  // Already hex
  if (/^#[0-9a-f]{3,8}$/i.test(trimmed)) {
    const clean = trimmed.replace('#', '')
    if (clean.length === 3) {
      return '#' + clean.split('').map(c => c + c).join('')
    }
    return '#' + clean.slice(0, 6)
  }

  // rgb/rgba
  const rgbMatch = trimmed.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/)
  if (rgbMatch) {
    return rgbToHex(+rgbMatch[1], +rgbMatch[2], +rgbMatch[3])
  }

  // Named colors (common subset)
  const named: Record<string, string> = {
    white: '#ffffff', black: '#000000', red: '#ff0000', blue: '#0000ff',
    green: '#008000', yellow: '#ffff00', orange: '#ffa500', purple: '#800080',
    navy: '#000080', teal: '#008080', gray: '#808080', grey: '#808080',
    silver: '#c0c0c0', maroon: '#800000', olive: '#808000', aqua: '#00ffff',
    coral: '#ff7f50', tomato: '#ff6347', gold: '#ffd700', indigo: '#4b0082',
  }
  if (named[trimmed]) return named[trimmed]

  return null
}

/** Generate a complementary/analogous color for secondary */
export function deriveSecondary(hex: string): string {
  const rgb = hexToRgb(hex)
  if (!rgb) return '#b45309'
  // Rotate hue by ~30 degrees in RGB space (simple approximation)
  return rgbToHex(
    Math.min(255, rgb.g + 60),
    Math.min(255, rgb.b + 30),
    Math.max(0, rgb.r - 30)
  )
}
