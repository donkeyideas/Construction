import { NextRequest, NextResponse } from 'next/server'
import { scrapeWebsite } from '@/lib/scraper'
import { isValidUrl } from '@/lib/utils/url'

// Simple in-memory rate limiter
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT = 10
const RATE_WINDOW = 60 * 60 * 1000 // 1 hour

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(ip)

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW })
    return true
  }

  if (entry.count >= RATE_LIMIT) return false

  entry.count++
  return true
}

// Simple in-memory cache
const cache = new Map<string, { data: unknown; expiresAt: number }>()
const CACHE_TTL = 24 * 60 * 60 * 1000 // 24 hours

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'

    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      )
    }

    const body = await request.json()
    const { url } = body

    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      )
    }

    if (!isValidUrl(url)) {
      return NextResponse.json(
        { error: 'Invalid URL. Please enter a valid website URL.' },
        { status: 400 }
      )
    }

    // Check cache
    const cacheKey = url.toLowerCase().replace(/\/+$/, '')
    const cached = cache.get(cacheKey)
    if (cached && Date.now() < cached.expiresAt) {
      return NextResponse.json(cached.data)
    }

    // Scrape
    const data = await scrapeWebsite(url)

    // Cache result
    cache.set(cacheKey, { data, expiresAt: Date.now() + CACHE_TTL })

    // Cleanup old cache entries periodically
    if (cache.size > 100) {
      const now = Date.now()
      for (const [key, val] of cache) {
        if (now > val.expiresAt) cache.delete(key)
      }
    }

    return NextResponse.json(data)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to scrape website'
    console.error('Scrape error:', message)

    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}
