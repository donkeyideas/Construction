import * as cheerio from 'cheerio'
import { resolveUrl } from '../utils/url'

export function extractLogo(html: string, baseUrl: string): { logoUrl: string | null; faviconUrl: string | null } {
  const $ = cheerio.load(html)
  let logoUrl: string | null = null
  let faviconUrl: string | null = null

  // 1. Apple touch icon (highest quality)
  const appleIcon = $('link[rel="apple-touch-icon"]').attr('href')
    || $('link[rel="apple-touch-icon-precomposed"]').attr('href')
  if (appleIcon) {
    logoUrl = resolveUrl(baseUrl, appleIcon)
  }

  // 2. og:image
  if (!logoUrl) {
    const ogImage = $('meta[property="og:image"]').attr('content')
    if (ogImage) logoUrl = resolveUrl(baseUrl, ogImage)
  }

  // 3. Logo in header/nav — img with "logo" in class, id, alt, or src
  if (!logoUrl) {
    const headerImgs = $('header img, nav img, .header img, .navbar img, #header img').toArray()
    for (const img of headerImgs) {
      const el = $(img)
      const src = el.attr('src')
      const alt = (el.attr('alt') || '').toLowerCase()
      const cls = (el.attr('class') || '').toLowerCase()
      const id = (el.attr('id') || '').toLowerCase()

      if (src && (alt.includes('logo') || cls.includes('logo') || id.includes('logo') || src.toLowerCase().includes('logo'))) {
        logoUrl = resolveUrl(baseUrl, src)
        break
      }
    }
  }

  // 4. First img in header as fallback
  if (!logoUrl) {
    const firstHeaderImg = $('header img, .header img').first().attr('src')
    if (firstHeaderImg) logoUrl = resolveUrl(baseUrl, firstHeaderImg)
  }

  // 5. SVG logo in header
  if (!logoUrl) {
    const headerSvg = $('header svg, nav svg, .header svg, .navbar svg').first()
    if (headerSvg.length) {
      // Can't easily use external SVGs, but note it exists
      logoUrl = null // Will use initials fallback
    }
  }

  // Favicon
  const favicon = $('link[rel="icon"]').attr('href')
    || $('link[rel="shortcut icon"]').attr('href')
    || $('link[rel="icon"][type="image/png"]').attr('href')
  if (favicon) {
    faviconUrl = resolveUrl(baseUrl, favicon)
  } else {
    faviconUrl = resolveUrl(baseUrl, '/favicon.ico')
  }

  return { logoUrl, faviconUrl }
}
