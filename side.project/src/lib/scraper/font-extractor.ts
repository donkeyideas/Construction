export function extractFonts(html: string, cssTexts: string[]): {
  heading: string | null
  body: string | null
  raw: string[]
} {
  const allCSS = [...extractStyleBlocks(html), ...cssTexts].join('\n')
  const fontFamilies = new Map<string, number>()

  // Extract font-family declarations
  const fontPattern = /font-family\s*:\s*([^;}\n]+)/gi
  for (const match of allCSS.matchAll(fontPattern)) {
    const families = parseFontFamily(match[1])
    for (const family of families) {
      fontFamilies.set(family, (fontFamilies.get(family) || 0) + 1)
    }
  }

  // Extract Google Fonts from link tags
  const googleFontPattern = /fonts\.googleapis\.com\/css2?\?family=([^"&]+)/g
  for (const match of html.matchAll(googleFontPattern)) {
    const families = decodeURIComponent(match[1]).split('|').map(f => f.split(':')[0].replace(/\+/g, ' '))
    for (const family of families) {
      fontFamilies.set(family.trim(), (fontFamilies.get(family.trim()) || 0) + 5) // Higher weight for explicit font imports
    }
  }

  const raw = [...fontFamilies.entries()]
    .filter(([name]) => !isGenericFont(name))
    .sort((a, b) => b[1] - a[1])
    .map(([name]) => name)

  // Heading font: look for font used on h1-h6
  let heading: string | null = null
  const headingPattern = /h[1-6][^{]*\{[^}]*font-family\s*:\s*([^;}\n]+)/gi
  for (const match of allCSS.matchAll(headingPattern)) {
    const families = parseFontFamily(match[1])
    const nonGeneric = families.find(f => !isGenericFont(f))
    if (nonGeneric) { heading = nonGeneric; break }
  }

  // Body font: look for font used on body
  let body: string | null = null
  const bodyPattern = /body[^{]*\{[^}]*font-family\s*:\s*([^;}\n]+)/gi
  for (const match of allCSS.matchAll(bodyPattern)) {
    const families = parseFontFamily(match[1])
    const nonGeneric = families.find(f => !isGenericFont(f))
    if (nonGeneric) { body = nonGeneric; break }
  }

  // Fallback: most common non-generic font
  if (!heading) heading = raw[0] || null
  if (!body) body = raw[1] || raw[0] || null

  return { heading, body, raw }
}

function extractStyleBlocks(html: string): string[] {
  const blocks: string[] = []
  const pattern = /<style[^>]*>([\s\S]*?)<\/style>/gi
  for (const match of html.matchAll(pattern)) {
    blocks.push(match[1])
  }
  return blocks
}

function parseFontFamily(value: string): string[] {
  return value
    .split(',')
    .map(f => f.trim().replace(/['"]/g, '').trim())
    .filter(f => f.length > 0)
}

function isGenericFont(name: string): boolean {
  const generics = [
    'sans-serif', 'serif', 'monospace', 'cursive', 'fantasy', 'system-ui',
    'ui-sans-serif', 'ui-serif', 'ui-monospace', '-apple-system',
    'BlinkMacSystemFont', 'Segoe UI', 'inherit', 'initial', 'unset',
  ]
  return generics.some(g => g.toLowerCase() === name.toLowerCase())
}
