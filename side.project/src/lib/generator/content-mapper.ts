import type { ScrapedData } from '../types/scraper'
import type { ScreenSection, KPIItem, QuickActionItem, ListItem, MenuItem } from '../types/generator'
import { INDUSTRY_TEMPLATES, getDefaultKPIs, getDefaultQuickActions, getDefaultListItems, getDefaultMenuItems } from './industry-templates'

export function buildDashboardSections(data: ScrapedData): ScreenSection[] {
  const template = INDUSTRY_TEMPLATES[data.industry] || INDUSTRY_TEMPLATES.general
  const sections: ScreenSection[] = []

  // Header
  sections.push({
    type: 'header',
    data: {
      greeting: `Welcome back`,
      businessName: data.businessName,
      initials: getInitials(data.businessName),
    },
  })

  // KPIs
  const kpis: KPIItem[] = template.kpis || getDefaultKPIs(data.industry)
  sections.push({ type: 'kpi-row', data: { items: kpis } })

  // Quick Actions
  const actions: QuickActionItem[] = template.quickActions || getDefaultQuickActions(data.industry)
  sections.push({ type: 'quick-actions', data: { items: actions } })

  // Card list from features/content
  const items: ListItem[] = data.content.features.length > 0
    ? data.content.features.slice(0, 3).map((f, i) => ({
        title: f,
        subtitle: data.businessName,
        badge: ['Active', 'New', 'Featured'][i % 3],
        badgeType: (['active', 'planning', 'pending'] as const)[i % 3],
      }))
    : template.listItems || getDefaultListItems(data.industry)

  sections.push({
    type: 'card-list',
    data: { title: template.listTitle || 'Recent Items', items: items.slice(0, 3), linkText: 'See All' },
  })

  // Activity feed
  sections.push({
    type: 'activity-feed',
    data: {
      title: 'Recent Activity',
      items: template.activityItems || [
        { text: 'New update available', time: '2 hours ago', color: 'var(--blue)' },
        { text: 'Task completed successfully', time: 'Yesterday', color: 'var(--green)' },
        { text: 'New notification received', time: '2 days ago', color: 'var(--amber)' },
      ],
    },
  })

  return sections
}

export function buildListSections(data: ScrapedData): ScreenSection[] {
  const template = INDUSTRY_TEMPLATES[data.industry] || INDUSTRY_TEMPLATES.general
  const sections: ScreenSection[] = []

  // Search bar
  sections.push({
    type: 'search-bar',
    data: { placeholder: `Search ${template.listTitle || 'items'}...` },
  })

  // Filters
  sections.push({
    type: 'filter-row',
    data: {
      filters: template.filters || ['All', 'Active', 'Pending', 'Completed'],
    },
  })

  // List items
  const items: ListItem[] = template.detailedListItems || data.content.features.slice(0, 5).map((f, i) => ({
    title: f,
    subtitle: data.businessName,
    badge: ['Active', 'New', 'Featured', 'Popular', 'Pending'][i % 5],
    badgeType: (['active', 'planning', 'pending', 'active', 'urgent'] as const)[i % 5],
    stats: [
      { label: 'Views', value: `${Math.floor(Math.random() * 500 + 50)}` },
      { label: 'Progress', value: `${Math.floor(Math.random() * 80 + 20)}%` },
    ],
    progress: Math.floor(Math.random() * 80 + 20),
  }))

  sections.push({
    type: 'card-list',
    data: { title: template.listTitle || 'Items', items },
  })

  return sections
}

export function buildDetailSections(data: ScrapedData): ScreenSection[] {
  const template = INDUSTRY_TEMPLATES[data.industry] || INDUSTRY_TEMPLATES.general
  const sections: ScreenSection[] = []

  sections.push({
    type: 'detail-hero',
    data: {
      title: template.detailTitle || data.content.features[0] || 'Item Details',
      subtitle: data.businessName,
    },
  })

  sections.push({
    type: 'detail-stats',
    data: {
      stats: template.detailStats || [
        { label: 'Status', value: 'Active' },
        { label: 'Progress', value: '65%' },
        { label: 'Updated', value: 'Today' },
      ],
    },
  })

  sections.push({
    type: 'detail-description',
    data: {
      title: 'Description',
      text: data.content.sections[0]?.body || data.description || template.detailDescription || 'Detailed information about this item will appear here.',
    },
  })

  sections.push({
    type: 'detail-actions',
    data: {
      primary: { label: template.detailPrimaryAction || 'Take Action', variant: 'primary' },
      secondary: { label: 'Share', variant: 'secondary' },
    },
  })

  return sections
}

export function buildMoreSections(data: ScrapedData): ScreenSection[] {
  const template = INDUSTRY_TEMPLATES[data.industry] || INDUSTRY_TEMPLATES.general
  const sections: ScreenSection[] = []

  sections.push({
    type: 'user-profile',
    data: {
      name: 'John Doe',
      role: `User — ${data.businessName}`,
      initials: 'JD',
    },
  })

  const menuItems: MenuItem[] = template.menuItems || getDefaultMenuItems(data.industry)
  sections.push({ type: 'menu-grid', data: { items: menuItems } })

  sections.push({
    type: 'settings-list',
    data: {
      items: [
        { label: 'Appearance', icon: 'settings' },
        { label: 'Help & Support', icon: 'help' },
        { label: 'Privacy & Legal', icon: 'lock' },
      ],
    },
  })

  return sections
}

export function buildContactSections(data: ScrapedData): ScreenSection[] {
  const sections: ScreenSection[] = []

  sections.push({
    type: 'header',
    data: {
      title: 'Contact Us',
      subtitle: data.tagline || `Get in touch with ${data.businessName}`,
    },
  })

  sections.push({ type: 'map', data: {} })

  sections.push({
    type: 'contact-info',
    data: {
      items: [
        { label: 'Phone', value: '(555) 123-4567', icon: 'phone' },
        { label: 'Email', value: `info@${getHostFromUrl(data.url)}`, icon: 'mail' },
        { label: 'Address', value: '123 Main Street', icon: 'map' },
      ],
    },
  })

  if (data.socialLinks.length > 0) {
    sections.push({
      type: 'social-links',
      data: { links: data.socialLinks },
    })
  }

  sections.push({
    type: 'contact-form',
    data: {
      title: 'Send a Message',
      fields: ['Name', 'Email', 'Message'],
    },
  })

  return sections
}

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map(w => w[0])
    .join('')
    .toUpperCase()
}

function getHostFromUrl(url: string): string {
  try {
    return new URL(url).hostname.replace('www.', '')
  } catch {
    return 'example.com'
  }
}
