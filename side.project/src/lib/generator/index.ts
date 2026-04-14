import type { ScrapedData } from '../types/scraper'
import type { MockupConfig } from '../types/generator'
import { mapColorsToTheme } from './color-mapper'
import { mapNavToTabs } from './nav-mapper'
import { buildScreens } from './screen-builder'

export function generateMockup(data: ScrapedData): MockupConfig {
  const theme = mapColorsToTheme(data.colors, data.fonts)
  const tabs = mapNavToTabs(data.navigation)
  const screens = buildScreens(data)

  return {
    brand: {
      name: data.businessName,
      tagline: data.tagline || `Welcome to ${data.businessName}`,
      logoUrl: data.logoUrl,
    },
    theme,
    screens,
    tabs,
    industry: data.industry,
  }
}
