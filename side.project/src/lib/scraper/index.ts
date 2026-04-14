import * as cheerio from 'cheerio'
import type { ScrapedData } from '../types/scraper'
import { normalizeUrl, resolveUrl } from '../utils/url'
import { extractColors } from './color-extractor'
import { extractLogo } from './logo-extractor'
import { extractNavigation } from './nav-extractor'
import { extractContent } from './content-extractor'
import { extractFonts } from './font-extractor'
import { extractMeta } from './meta-extractor'
import { detectIndustry } from './industry-detector'
import { detectPWA } from './pwa-detector'

const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

export async function scrapeWebsite(url: string): Promise<ScrapedData> {
  const normalizedUrl = normalizeUrl(url)

  // Fetch HTML
  const html = await fetchPage(normalizedUrl)
  const $ = cheerio.load(html)

  // Fetch external CSS files (up to 3, with timeout)
  const cssTexts = await fetchExternalCSS($, normalizedUrl)

  // Get full text content for industry detection
  const textContent = $('body').text()

  // Run all extractors (most are synchronous, run in parallel where possible)
  const [meta, logo, navigation, content, fonts] = await Promise.all([
    Promise.resolve(extractMeta(html)),
    Promise.resolve(extractLogo(html, normalizedUrl)),
    Promise.resolve(extractNavigation(html)),
    Promise.resolve(extractContent(html, normalizedUrl)),
    Promise.resolve(extractFonts(html, cssTexts)),
  ])

  const colors = extractColors(html, cssTexts)
  const industry = detectIndustry(textContent)
  const hasPWA = detectPWA(html)

  return {
    url: normalizedUrl,
    scrapedAt: new Date().toISOString(),
    businessName: meta.businessName,
    tagline: meta.tagline,
    logoUrl: logo.logoUrl,
    faviconUrl: logo.faviconUrl,
    colors,
    fonts,
    navigation,
    content: {
      heroHeading: content.heroHeading,
      heroSubtext: content.heroSubtext,
      heroImageUrl: content.heroImageUrl,
      sections: content.sections,
      features: content.features,
      testimonials: content.testimonials,
    },
    socialLinks: content.socialLinks,
    industry,
    hasPWA,
    description: meta.description,
  }
}

async function fetchPage(url: string): Promise<string> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 8000)

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      signal: controller.signal,
      redirect: 'follow',
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const contentType = response.headers.get('content-type') || ''
    if (!contentType.includes('text/html') && !contentType.includes('application/xhtml')) {
      throw new Error('URL does not return HTML content')
    }

    return await response.text()
  } finally {
    clearTimeout(timeout)
  }
}

async function fetchExternalCSS($: cheerio.CheerioAPI, baseUrl: string): Promise<string[]> {
  const cssUrls: string[] = []
  $('link[rel="stylesheet"]').each((_, el) => {
    const href = $(el).attr('href')
    if (href && cssUrls.length < 3) {
      cssUrls.push(resolveUrl(baseUrl, href))
    }
  })

  const results = await Promise.allSettled(
    cssUrls.map(async (cssUrl) => {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 5000)
      try {
        const res = await fetch(cssUrl, {
          headers: { 'User-Agent': USER_AGENT },
          signal: controller.signal,
        })
        if (res.ok) return await res.text()
        return ''
      } catch {
        return ''
      } finally {
        clearTimeout(timeout)
      }
    })
  )

  return results
    .filter((r): r is PromiseFulfilledResult<string> => r.status === 'fulfilled')
    .map(r => r.value)
    .filter(t => t.length > 0)
}
