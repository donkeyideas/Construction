export interface ScrapedData {
  url: string
  scrapedAt: string
  businessName: string
  tagline: string | null
  logoUrl: string | null
  faviconUrl: string | null
  colors: ColorPalette
  fonts: {
    heading: string | null
    body: string | null
    raw: string[]
  }
  navigation: NavItem[]
  content: {
    heroHeading: string | null
    heroSubtext: string | null
    heroImageUrl: string | null
    sections: ContentSection[]
    features: string[]
    testimonials: Testimonial[]
  }
  socialLinks: SocialLink[]
  industry: IndustryType
  hasPWA: boolean
  description: string | null
}

export interface ColorPalette {
  primary: string
  secondary: string
  accent: string
  background: string
  text: string
  muted: string
  all: string[]
}

export interface NavItem {
  label: string
  href: string
  children?: NavItem[]
  icon?: string
}

export interface ContentSection {
  type: 'hero' | 'about' | 'services' | 'features' | 'testimonials' |
        'gallery' | 'contact' | 'pricing' | 'team' | 'faq' | 'cta'
  heading: string | null
  body: string | null
  items: string[]
  images: string[]
}

export interface Testimonial {
  quote: string
  author: string
  role?: string
}

export type IndustryType =
  | 'construction' | 'restaurant' | 'ecommerce' | 'services'
  | 'healthcare' | 'education' | 'real-estate' | 'fitness'
  | 'legal' | 'technology' | 'nonprofit' | 'general'

export interface SocialLink {
  platform: 'facebook' | 'twitter' | 'instagram' | 'linkedin' |
            'youtube' | 'tiktok' | 'pinterest' | 'other'
  url: string
}
