import * as cheerio from 'cheerio'

export function detectPWA(html: string): boolean {
  const $ = cheerio.load(html)

  // Check for manifest link
  const manifest = $('link[rel="manifest"]').attr('href')
  if (manifest) return true

  // Check for service worker registration in scripts
  const scripts = $('script').toArray().map(el => $(el).html() || '').join('\n')
  if (scripts.includes('serviceWorker.register') || scripts.includes('navigator.serviceWorker')) {
    return true
  }

  // Check for meta theme-color (common PWA indicator)
  const themeColor = $('meta[name="theme-color"]').attr('content')
  const appleCapable = $('meta[name="apple-mobile-web-app-capable"]').attr('content')

  if (themeColor && appleCapable === 'yes') return true

  return false
}
