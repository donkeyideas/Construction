import type { IndustryType } from './scraper'

export interface MockupConfig {
  brand: {
    name: string
    tagline: string
    logoUrl: string | null
  }
  theme: ThemeConfig
  screens: ScreenData[]
  tabs: TabItem[]
  industry: IndustryType
}

export interface ThemeConfig {
  light: CSSVariableSet
  dark: CSSVariableSet
  fonts: {
    heading: string
    body: string
  }
  borderRadius: string
}

export interface CSSVariableSet {
  '--bg': string
  '--surface': string
  '--card-bg': string
  '--text': string
  '--muted': string
  '--border': string
  '--blue': string
  '--blue-light': string
  '--blue-dark': string
  '--amber': string
  '--amber-light': string
  '--green': string
  '--green-light': string
  '--red': string
  '--red-light': string
  '--tab-bg': string
  '--status-bar-color': string
  [key: string]: string
}

export interface ScreenData {
  id: string
  type: 'splash' | 'login' | 'dashboard' | 'list' | 'detail' | 'more' | 'contact'
  label: string
  sections: ScreenSection[]
}

export interface ScreenSection {
  type: 'header' | 'hero-banner' | 'kpi-row' | 'quick-actions' |
        'card-list' | 'task-list' | 'activity-feed' | 'search-bar' |
        'filter-row' | 'user-profile' | 'menu-grid' | 'settings-list' |
        'form' | 'social-login' | 'text-block' | 'contact-info' |
        'contact-form' | 'social-links' | 'map' | 'detail-hero' |
        'detail-stats' | 'detail-description' | 'detail-actions'
  data: Record<string, unknown>
}

export interface TabItem {
  id: string
  label: string
  icon: string
  screenId: string
}

export interface KPIItem {
  label: string
  value: string
  icon: string
  color: string
}

export interface QuickActionItem {
  label: string
  icon: string
}

export interface ListItem {
  title: string
  subtitle: string
  badge?: string
  badgeType?: 'active' | 'planning' | 'pending' | 'urgent'
  stats?: { label: string; value: string }[]
  progress?: number
}

export interface MenuItem {
  label: string
  icon: string
  color: string
}
