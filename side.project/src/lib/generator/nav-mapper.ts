import type { NavItem } from '../types/scraper'
import type { TabItem } from '../types/generator'
import { inferIcon } from '../utils/icons'

export function mapNavToTabs(navItems: NavItem[]): TabItem[] {
  const tabs: TabItem[] = []

  // Always start with Home/Dashboard
  tabs.push({
    id: 'dashboard',
    label: 'Home',
    icon: 'home',
    screenId: 'dashboard',
  })

  // Map up to 3 nav items to middle tabs
  const mappable = navItems
    .filter(item => {
      const lower = item.label.toLowerCase()
      return !['home', 'main', 'start'].some(k => lower === k)
    })
    .slice(0, 3)

  for (const item of mappable) {
    const label = item.label.length > 10 ? item.label.substring(0, 9) + '.' : item.label
    tabs.push({
      id: slugify(item.label),
      label,
      icon: inferIcon(item.label),
      screenId: 'list',
    })
  }

  // If we have fewer than 3 middle tabs, add common ones
  const defaultMiddleTabs: TabItem[] = [
    { id: 'search', label: 'Search', icon: 'search', screenId: 'list' },
    { id: 'contact', label: 'Contact', icon: 'phone', screenId: 'contact' },
    { id: 'favorites', label: 'Favorites', icon: 'heart', screenId: 'list' },
  ]

  let i = 0
  while (tabs.length < 4 && i < defaultMiddleTabs.length) {
    const def = defaultMiddleTabs[i]
    if (!tabs.some(t => t.id === def.id)) {
      tabs.push(def)
    }
    i++
  }

  // Always end with More
  tabs.push({
    id: 'more',
    label: 'More',
    icon: 'more',
    screenId: 'more',
  })

  return tabs
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}
