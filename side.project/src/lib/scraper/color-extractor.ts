import type { ColorPalette } from '../types/scraper'
import { normalizeToHex, isNeutral } from '../utils/color'

export function extractColors(html: string, cssTexts: string[]): ColorPalette {
  const allCSS = [...extractStyleBlocks(html), ...cssTexts].join('\n')
  const colorFrequency = new Map<string, number>()

  // Extract hex colors
  const hexPattern = /#([0-9a-fA-F]{3,8})\b/g
  for (const match of allCSS.matchAll(hexPattern)) {
    const hex = normalizeToHex('#' + match[1])
    if (hex) increment(colorFrequency, hex)
  }

  // Extract rgb/rgba colors
  const rgbPattern = /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/g
  for (const match of allCSS.matchAll(rgbPattern)) {
    const hex = normalizeToHex(`rgb(${match[1]},${match[2]},${match[3]})`)
    if (hex) increment(colorFrequency, hex)
  }

  // Extract colors from inline styles in HTML
  const inlineStylePattern = /style="([^"]*)"/g
  for (const match of html.matchAll(inlineStylePattern)) {
    const style = match[1]
    for (const hexMatch of style.matchAll(/#([0-9a-fA-F]{3,8})\b/g)) {
      const hex = normalizeToHex('#' + hexMatch[1])
      if (hex) increment(colorFrequency, hex)
    }
  }

  // Weight colors from CTA/button contexts more heavily
  const ctaPattern = /(?:\.btn|button|\.cta|\.primary|a:hover)[^{]*\{[^}]*(?:background(?:-color)?|color)\s*:\s*([^;}\s]+)/gi
  for (const match of allCSS.matchAll(ctaPattern)) {
    const hex = normalizeToHex(match[1])
    if (hex) increment(colorFrequency, hex, 3) // 3x weight for CTAs
  }

  // Sort all colors by frequency
  const sorted = [...colorFrequency.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([color]) => color)

  const nonNeutrals = sorted.filter(c => !isNeutral(c))
  const neutrals = sorted.filter(c => isNeutral(c))

  // Extract body background
  const bgMatch = allCSS.match(/body\s*\{[^}]*background(?:-color)?\s*:\s*([^;}\s]+)/i)
  const bgHex = bgMatch ? normalizeToHex(bgMatch[1]) : null

  // Extract body text color
  const textMatch = allCSS.match(/body\s*\{[^}]*(?<!background-)color\s*:\s*([^;}\s]+)/i)
  const textHex = textMatch ? normalizeToHex(textMatch[1]) : null

  return {
    primary: nonNeutrals[0] || '#1d4ed8',
    secondary: nonNeutrals[1] || '#b45309',
    accent: nonNeutrals[2] || nonNeutrals[0] || '#6366f1',
    background: bgHex || neutrals.find(c => {
      const n = normalizeToHex(c)
      return n && (n === '#ffffff' || n === '#fafafa' || n === '#f5f5f5')
    }) || '#ffffff',
    text: textHex || neutrals.find(c => {
      const n = normalizeToHex(c)
      return n && (n === '#000000' || n === '#111111' || n === '#1a1a1a' || n === '#333333')
    }) || '#1a1a1a',
    muted: '#6b7280',
    all: sorted.slice(0, 20),
  }
}

function extractStyleBlocks(html: string): string[] {
  const blocks: string[] = []
  const pattern = /<style[^>]*>([\s\S]*?)<\/style>/gi
  for (const match of html.matchAll(pattern)) {
    blocks.push(match[1])
  }
  return blocks
}

function increment(map: Map<string, number>, key: string, amount = 1) {
  map.set(key, (map.get(key) || 0) + amount)
}
