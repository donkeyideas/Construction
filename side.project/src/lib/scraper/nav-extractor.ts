import * as cheerio from 'cheerio'
import type { NavItem } from '../types/scraper'

export function extractNavigation(html: string): NavItem[] {
  const $ = cheerio.load(html)
  const navItems: NavItem[] = []
  const seen = new Set<string>()

  // 1. Try <nav> elements
  const navEls = $('nav')
  if (navEls.length) {
    navEls.first().find('a').each((_, el) => {
      const item = parseLink($, el)
      if (item && !seen.has(item.label)) {
        seen.add(item.label)
        navItems.push(item)
      }
    })
  }

  // 2. Fallback: links in <header>
  if (navItems.length === 0) {
    $('header a').each((_, el) => {
      const item = parseLink($, el)
      if (item && !seen.has(item.label)) {
        seen.add(item.label)
        navItems.push(item)
      }
    })
  }

  // 3. Fallback: top-level nav-like structures
  if (navItems.length === 0) {
    $('.navbar a, .nav a, .menu a, #menu a, #nav a, .navigation a').each((_, el) => {
      const item = parseLink($, el)
      if (item && !seen.has(item.label)) {
        seen.add(item.label)
        navItems.push(item)
      }
    })
  }

  // Filter out utility links
  return navItems.filter(item => !isUtilityLink(item))
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseLink($: cheerio.CheerioAPI, el: any): NavItem | null {
  const $el = $(el)
  const href = $el.attr('href') || ''
  let label = $el.text().trim()

  // Skip empty, anchor-only, or very long labels
  if (!label || label.length > 30) return null
  if (href === '#' || href === '') return null
  if (href.startsWith('javascript:')) return null
  if (href.startsWith('tel:') || href.startsWith('mailto:')) return null

  // Clean up label
  label = label.replace(/\s+/g, ' ').trim()
  if (!label) return null

  return { label, href }
}

function isUtilityLink(item: NavItem): boolean {
  const lower = item.label.toLowerCase()
  const utilityLabels = [
    'login', 'sign in', 'signin', 'sign up', 'signup', 'register',
    'cart', 'basket', 'checkout', 'my account', 'account',
    'log in', 'log out', 'logout', 'sign out', 'join',
    'skip to content', 'skip to main',
  ]
  return utilityLabels.some(u => lower === u || lower.startsWith(u))
}
