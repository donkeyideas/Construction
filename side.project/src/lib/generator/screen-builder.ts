import type { ScrapedData } from '../types/scraper'
import type { ScreenData } from '../types/generator'
import {
  buildDashboardSections,
  buildListSections,
  buildDetailSections,
  buildMoreSections,
  buildContactSections,
} from './content-mapper'

export function buildScreens(data: ScrapedData): ScreenData[] {
  return [
    {
      id: 'splash',
      type: 'splash',
      label: 'Splash',
      sections: [],
    },
    {
      id: 'login',
      type: 'login',
      label: 'Login',
      sections: [],
    },
    {
      id: 'dashboard',
      type: 'dashboard',
      label: 'Dashboard',
      sections: buildDashboardSections(data),
    },
    {
      id: 'list',
      type: 'list',
      label: 'List',
      sections: buildListSections(data),
    },
    {
      id: 'detail',
      type: 'detail',
      label: 'Detail',
      sections: buildDetailSections(data),
    },
    {
      id: 'more',
      type: 'more',
      label: 'More',
      sections: buildMoreSections(data),
    },
    {
      id: 'contact',
      type: 'contact',
      label: 'Contact',
      sections: buildContactSections(data),
    },
  ]
}
