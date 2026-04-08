// Auto-categorize permits by construction type and relevance to a GC

export type ConstructionType =
  | 'New Construction'
  | 'Renovation'
  | 'Addition'
  | 'Demolition'
  | 'Mechanical/Electrical/Plumbing'
  | 'Site Work'
  | 'Other'

export type PermitRelevance = 'high' | 'medium' | 'low'

interface CategoryResult {
  constructionType: ConstructionType
  relevance: PermitRelevance
}

// Keywords mapped to construction types
const TYPE_PATTERNS: Array<{ pattern: RegExp; type: ConstructionType }> = [
  { pattern: /new (home|house|dwelling|construction|building|residence|single.?family|multi.?family|townhome|condo)/i, type: 'New Construction' },
  { pattern: /ground.?up|new.?build|new.?struct/i, type: 'New Construction' },
  { pattern: /9.?1.?1 address|address assign/i, type: 'New Construction' }, // County-level proxy for new structures
  { pattern: /renovati|remodel|alterat|rehab|gut|interior.?fit|tenant.?improve|moderniz/i, type: 'Renovation' },
  { pattern: /addition|expan|extend|enlarg|add.?(room|floor|story|wing|garage|deck|porch)/i, type: 'Addition' },
  { pattern: /demoli|tear.?down|raze|remov.*(struct|build)/i, type: 'Demolition' },
  { pattern: /plumb|electric|mechanic|hvac|boiler|furnace|ac\b|air.?condition|fire.?alarm|sprinkler|solar|panel|generator|elevator/i, type: 'Mechanical/Electrical/Plumbing' },
  { pattern: /sewer|septic|water.?tap|connect|curb.?cut|driveway|pav|grade|excavat|foundation.?only|retaining.?wall|fence|pool|landscap/i, type: 'Site Work' },
]

// Low relevance keywords (things a premium residential GC wouldn't bid on)
const LOW_RELEVANCE_PATTERNS = [
  /fire.?alarm/i,
  /sign\b/i, /billboard/i, /tent\b/i, /temporary/i, /certificate.?of/i,
  /inspection.?only/i, /re.?inspection/i, /violation/i, /code.?enforce/i,
  /annual.?permit/i, /operating.?permit/i, /food/i, /restaurant/i,
  /sidewalk/i, /curb/i, /road/i, /utility/i, /telecom/i, /antenna/i,
  /oil.?tank/i, /underground.?storage/i,
]

// High relevance keywords (premium residential work)
const HIGH_RELEVANCE_PATTERNS = [
  /new (home|house|dwelling|residence|single.?family|custom)/i,
  /renovation.*(home|house|residence)/i,
  /addition.*(home|house|residence)/i,
  /new.?construct.*(resid|home|house)/i,
  /gut.?renov/i, /full.?renov/i, /major.?renov/i,
  /luxury/i, /custom.?home/i, /estate/i,
  /architect/i, /design.?build/i,
  /9.?1.?1.*new/i, /address assign.*new/i, // County address assignments for new builds
  /gml.*planning/i, /subdivision/i, /site.?plan/i, // County planning referrals
]

export function categorizePermit(
  permitType: string,
  description: string,
): CategoryResult {
  const text = `${permitType} ${description}`.toLowerCase()

  // Determine construction type
  let constructionType: ConstructionType = 'Other'
  for (const { pattern, type } of TYPE_PATTERNS) {
    if (pattern.test(text)) {
      constructionType = type
      break
    }
  }

  // Determine relevance
  let relevance: PermitRelevance = 'medium'

  // Check high relevance first
  for (const pattern of HIGH_RELEVANCE_PATTERNS) {
    if (pattern.test(text)) {
      relevance = 'high'
      break
    }
  }

  // Check low relevance (overrides medium but not high)
  if (relevance !== 'high') {
    for (const pattern of LOW_RELEVANCE_PATTERNS) {
      if (pattern.test(text)) {
        relevance = 'low'
        break
      }
    }
  }

  return { constructionType, relevance }
}

export const CONSTRUCTION_TYPE_STYLES: Record<ConstructionType, { bg: string; text: string }> = {
  'New Construction': { bg: '#E1F5EE', text: '#085041' },
  'Renovation': { bg: '#FAEEDA', text: '#854F0B' },
  'Addition': { bg: '#EEEDFE', text: '#3C3489' },
  'Demolition': { bg: '#FEE2E2', text: '#A32D2D' },
  'Mechanical/Electrical/Plumbing': { bg: '#F1EFE8', text: '#5F5E5A' },
  'Site Work': { bg: '#F1EFE8', text: '#5F5E5A' },
  'Other': { bg: '#F1EFE8', text: '#5F5E5A' },
}

export const RELEVANCE_STYLES: Record<PermitRelevance, { bg: string; text: string }> = {
  high: { bg: '#E1F5EE', text: '#085041' },
  medium: { bg: '#FAEEDA', text: '#854F0B' },
  low: { bg: '#F1EFE8', text: '#5F5E5A' },
}
