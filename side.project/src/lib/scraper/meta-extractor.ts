import * as cheerio from 'cheerio'

export function extractMeta(html: string): {
  businessName: string
  tagline: string | null
  description: string | null
} {
  const $ = cheerio.load(html)

  // Business name: priority order
  const ogTitle = $('meta[property="og:title"]').attr('content')?.trim()
  const title = $('title').text().trim()
  const h1 = $('h1').first().text().trim()
  const siteName = $('meta[property="og:site_name"]').attr('content')?.trim()

  // Clean up title — remove common suffixes like " | Home", " - Company Name"
  let businessName = siteName || cleanTitle(ogTitle || title) || h1 || 'Your Business'

  // Truncate if too long
  if (businessName.length > 40) {
    businessName = businessName.substring(0, 37) + '...'
  }

  // Tagline
  const ogDescription = $('meta[property="og:description"]').attr('content')?.trim()
  const metaDescription = $('meta[name="description"]').attr('content')?.trim()
  let tagline = ogDescription || metaDescription || null

  if (tagline && tagline.length > 100) {
    tagline = tagline.substring(0, 97) + '...'
  }

  return {
    businessName,
    tagline,
    description: metaDescription || ogDescription || null,
  }
}

function cleanTitle(title: string | undefined): string | null {
  if (!title) return null
  // Remove common suffixes
  const cleaned = title
    .split(/\s*[|\-–—]\s*/)[0]
    .trim()
  return cleaned.length > 2 ? cleaned : title
}
