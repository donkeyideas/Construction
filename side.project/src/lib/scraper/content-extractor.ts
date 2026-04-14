import * as cheerio from 'cheerio'
import type { ContentSection, Testimonial, SocialLink } from '../types/scraper'
import { resolveUrl } from '../utils/url'

export function extractContent(html: string, baseUrl: string): {
  heroHeading: string | null
  heroSubtext: string | null
  heroImageUrl: string | null
  sections: ContentSection[]
  features: string[]
  testimonials: Testimonial[]
  socialLinks: SocialLink[]
} {
  const $ = cheerio.load(html)

  // Hero heading: first h1
  const h1 = $('h1').first().text().trim() || null
  const heroHeading = h1 && h1.length < 100 ? h1 : null

  // Hero subtext: first p after h1 or in hero section
  let heroSubtext: string | null = null
  const heroSection = $('.hero, .banner, .jumbotron, [class*="hero"], [class*="banner"]').first()
  if (heroSection.length) {
    heroSubtext = heroSection.find('p').first().text().trim() || null
  }
  if (!heroSubtext) {
    heroSubtext = $('h1').first().next('p').text().trim() || null
  }
  if (heroSubtext && heroSubtext.length > 200) {
    heroSubtext = heroSubtext.substring(0, 197) + '...'
  }

  // Hero image
  let heroImageUrl: string | null = null
  if (heroSection.length) {
    const heroImg = heroSection.find('img').first().attr('src')
    if (heroImg) heroImageUrl = resolveUrl(baseUrl, heroImg)
  }

  // Sections
  const sections: ContentSection[] = []

  // About section
  const aboutSection = findSection($, ['about', 'who-we-are', 'our-story', 'company'])
  if (aboutSection) {
    sections.push({
      type: 'about',
      heading: aboutSection.heading,
      body: aboutSection.body,
      items: [],
      images: [],
    })
  }

  // Services section
  const servicesSection = findSection($, ['services', 'what-we-do', 'offerings', 'solutions'])
  if (servicesSection) {
    sections.push({
      type: 'services',
      heading: servicesSection.heading,
      body: servicesSection.body,
      items: servicesSection.items,
      images: [],
    })
  }

  // Features / key items
  const features: string[] = []
  const featureSection = findSection($, ['features', 'benefits', 'why-choose', 'advantages'])
  if (featureSection) {
    features.push(...featureSection.items.slice(0, 8))
    sections.push({
      type: 'features',
      heading: featureSection.heading,
      body: null,
      items: featureSection.items,
      images: [],
    })
  }

  // If no features found, extract from h2/h3 headings
  if (features.length === 0) {
    $('h2, h3').each((_, el) => {
      const text = $(el).text().trim()
      if (text && text.length < 60 && features.length < 6) {
        features.push(text)
      }
    })
  }

  // Testimonials
  const testimonials: Testimonial[] = []
  $('[class*="testimonial"], [class*="review"], [class*="quote"], blockquote').each((_, el) => {
    if (testimonials.length >= 3) return
    const $el = $(el)
    const quote = $el.find('p, .text, .content, .quote-text').first().text().trim()
      || $el.text().trim()
    const author = $el.find('.author, .name, cite, .reviewer').first().text().trim()
    if (quote && quote.length > 20 && quote.length < 300) {
      testimonials.push({
        quote: quote.substring(0, 200),
        author: author || 'Customer',
        role: $el.find('.role, .title, .position').first().text().trim() || undefined,
      })
    }
  })

  // Social links
  const socialLinks: SocialLink[] = []
  const socialPlatforms: Record<string, SocialLink['platform']> = {
    facebook: 'facebook', 'fb.com': 'facebook',
    twitter: 'twitter', 'x.com': 'twitter',
    instagram: 'instagram',
    linkedin: 'linkedin',
    youtube: 'youtube',
    tiktok: 'tiktok',
    pinterest: 'pinterest',
  }

  $('a[href]').each((_, el) => {
    const href = $(el).attr('href') || ''
    for (const [key, platform] of Object.entries(socialPlatforms)) {
      if (href.includes(key) && !socialLinks.some(s => s.platform === platform)) {
        socialLinks.push({ platform, url: href })
        break
      }
    }
  })

  return {
    heroHeading,
    heroSubtext,
    heroImageUrl,
    sections,
    features,
    testimonials,
    socialLinks,
  }
}

function findSection($: cheerio.CheerioAPI, keywords: string[]): {
  heading: string | null
  body: string | null
  items: string[]
} | null {
  // Search by id/class containing keywords
  for (const kw of keywords) {
    const section = $(`[id*="${kw}"], [class*="${kw}"], section:has(h2:contains("${kw}"))`)
    if (section.length) {
      const heading = section.find('h2, h3').first().text().trim() || null
      const body = section.find('p').first().text().trim() || null
      const items: string[] = []
      section.find('li, .item, .card h3, .card h4, .feature-title').each((_, el) => {
        const text = $(el).text().trim()
        if (text && text.length < 80 && items.length < 8) {
          items.push(text)
        }
      })
      if (heading || body || items.length) {
        return {
          heading: heading && heading.length < 80 ? heading : null,
          body: body && body.length < 300 ? body : body?.substring(0, 297) + '...' || null,
          items,
        }
      }
    }
  }
  return null
}
