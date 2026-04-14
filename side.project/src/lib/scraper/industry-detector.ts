import type { IndustryType } from '../types/scraper'

const INDUSTRY_KEYWORDS: Record<IndustryType, string[]> = {
  construction: ['construction', 'contractor', 'building', 'renovation', 'general contractor', 'blueprint', 'excavation', 'roofing', 'plumbing', 'electrical contractor', 'subcontractor', 'jobsite'],
  restaurant: ['menu', 'restaurant', 'food', 'dining', 'reservation', 'cuisine', 'chef', 'takeout', 'delivery', 'brunch', 'appetizer', 'entree', 'dessert'],
  ecommerce: ['shop', 'cart', 'product', 'price', 'buy now', 'add to cart', 'checkout', 'shipping', 'free delivery', 'catalog', 'sale', 'order now'],
  healthcare: ['health', 'medical', 'doctor', 'patient', 'clinic', 'hospital', 'appointment', 'therapy', 'wellness', 'diagnosis', 'treatment', 'physician'],
  education: ['courses', 'learn', 'students', 'enrollment', 'curriculum', 'academic', 'university', 'school', 'training', 'certificate', 'instructor', 'classroom'],
  'real-estate': ['property', 'listing', 'real estate', 'apartment', 'rent', 'mortgage', 'bedroom', 'sq ft', 'open house', 'realtor', 'mls', 'townhouse'],
  fitness: ['gym', 'fitness', 'workout', 'training', 'membership', 'class schedule', 'personal trainer', 'yoga', 'crossfit', 'exercise'],
  legal: ['attorney', 'lawyer', 'law firm', 'legal', 'practice areas', 'case', 'litigation', 'counsel', 'court', 'jurisdiction'],
  technology: ['software', 'saas', 'api', 'platform', 'solution', 'integrate', 'cloud', 'startup', 'developer', 'deploy', 'dashboard', 'automation'],
  services: ['services', 'solutions', 'consulting', 'expertise', 'portfolio', 'our work', 'client', 'professional'],
  nonprofit: ['donate', 'volunteer', 'mission', 'charity', 'impact', 'cause', 'fundraising', 'community', 'giving'],
  general: [],
}

export function detectIndustry(textContent: string): IndustryType {
  const lower = textContent.toLowerCase()
  const scores: Record<string, number> = {}

  for (const [industry, keywords] of Object.entries(INDUSTRY_KEYWORDS)) {
    if (industry === 'general') continue
    let score = 0
    for (const keyword of keywords) {
      const regex = new RegExp('\\b' + keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'gi')
      const matches = lower.match(regex)
      if (matches) score += matches.length
    }
    scores[industry] = score
  }

  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1])

  // Need at least 3 keyword hits to classify
  if (sorted[0] && sorted[0][1] >= 3) {
    return sorted[0][0] as IndustryType
  }

  return 'general'
}
