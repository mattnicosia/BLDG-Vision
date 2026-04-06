// src/types/index.ts
// All TypeScript interfaces for BLDG Vision
// Keep this file as the single source of truth for all types

// ─── CORE ─────────────────────────────────────────────────────────────────────

export interface Organization {
  id: string
  name: string
  slug: string
  region: string
  territory_label: string
  territory_lat: number
  territory_lng: number
  territory_radius_miles: number
  budget_min: number
  budget_max: number
  project_types: string[]
  procore_company_id?: string
  stripe_customer_id?: string
  plan: 'trial' | 'solo' | 'studio' | 'firm'
  trial_ends_at: string
  created_at: string
  updated_at: string
}

export interface OrgMember {
  id: string
  org_id: string
  user_id: string
  role: 'principal' | 'pm' | 'estimator' | 'viewer'
  created_at: string
}

// ─── KNOWLEDGE BASE ──────────────────────────────────────────────────────────

export interface CompanyProfile {
  id: string
  org_id: string
  story?: string
  tagline?: string
  founded_year?: number
  completed_projects?: number
  avg_project_value?: number
  focus_budget_min?: number
  focus_budget_max?: number
  differentiators: string[]
  core_values: Array<{ label: string; desc: string }>
  updated_at: string
}

export interface KBProject {
  id: string
  org_id: string
  name: string
  location?: string
  lat?: number
  lng?: number
  year?: number
  architect_id?: string
  architect_name?: string
  project_type?: string
  budget_value?: number
  sf?: number
  description?: string
  highlights: string[]
  tags: string[]
  photos: Array<{ url: string; caption?: string; procore_id?: string }>
  procore_project_id?: string
  is_showcase: boolean
  created_at: string
  updated_at: string
}

export interface KBMaterial {
  id: string
  org_id: string
  name: string
  category?: string
  lead_time_min_weeks?: number
  lead_time_max_weeks?: number
  price_range_low?: number
  price_range_high?: number
  price_unit?: string
  source?: string
  expertise?: string
  status: 'active' | 'emerging' | 'discontinued'
  tags: string[]
  last_updated?: string
  created_at: string
}

export interface VECase {
  id: string
  org_id: string
  title: string
  project_id?: string
  project_name?: string
  architect_name?: string
  original_spec?: string
  ve_spec?: string
  savings_amount?: number
  savings_label?: string
  time_impact?: string
  how_it_worked?: string
  architect_response?: string
  tags: string[]
  created_at: string
}

// ─── CRM ──────────────────────────────────────────────────────────────────────

export type ArchitectStage = 'Active' | 'Warm' | 'Cooling' | 'Cold'
export type ArchitectTier = 'Anchor' | 'Growth' | 'Prospect'

export interface Architect {
  id: string
  org_id: string
  name: string
  firm?: string
  email?: string
  phone?: string
  location?: string
  lat?: number
  lng?: number
  google_place_id?: string
  website?: string
  instagram_handle?: string
  linkedin_url?: string
  houzz_url?: string
  tier: ArchitectTier
  stage: ArchitectStage
  style?: string
  project_types?: string
  awards?: string
  notes?: string
  pulse_score: number
  last_contact_date?: string
  projects_together: number
  referral_value: number
  active_lead?: string
  next_action?: string
  source: 'manual' | 'google_places' | 'radar' | 'procore' | 'referral'
  is_in_radar: boolean
  created_at: string
  updated_at: string
}

export interface ArchitectTouchpoint {
  id: string
  org_id: string
  architect_id: string
  type: 'email' | 'call' | 'meeting' | 'site_visit' | 'social' | 'other'
  notes?: string
  outcome?: string
  contacted_by?: string
  contacted_at: string
}

// ─── INTELLIGENCE ──────────────────────────────────────────────────────────────

export interface Permit {
  id: string
  org_id: string
  architect_id?: string
  architect_name?: string
  project_address: string
  lat?: number
  lng?: number
  county?: string
  town?: string
  permit_number?: string
  filed_date?: string
  contractor_name?: string
  contractor_id?: string
  estimated_value?: number
  permit_type?: string
  status?: string
  scope_description?: string
  source_system: 'accela' | 'tyler' | 'manual' | 'csv' | 'buildzoom'
  source_url?: string
  our_project: boolean
  opportunity: boolean
  created_at: string
}

export interface Competitor {
  id: string
  org_id: string
  name: string
  location?: string
  website?: string
  instagram_handle?: string
  google_place_id?: string
  google_rating?: number
  google_review_count?: number
  founded_year?: number
  strengths: string[]
  weaknesses: string[]
  displacement_score: number
  intel?: string
  opening?: string
  license_number?: string
  active_liens: boolean
  created_at: string
  updated_at: string
}

export interface ArchitectCompetitorLink {
  id: string
  org_id: string
  architect_id: string
  competitor_id: string
  projects_count: number
  total_value?: number
  first_year?: number
  latest_year?: number
  notes?: string
  created_at: string
}

export type SignalType =
  | 'new_permit'
  | 'new_post'
  | 'new_review'
  | 'award'
  | 'publication'
  | 'website_update'
  | 'job_posting'
  | 'lien_filed'
  | 'stop_work'
  | 'project_anniversary'
  | 'opportunity'
  | 'planning_board'

export interface Signal {
  id: string
  org_id: string
  architect_id?: string
  competitor_id?: string
  type: SignalType
  priority: 'high' | 'medium' | 'low'
  headline: string
  detail?: string
  source?: string
  source_url?: string
  actioned_at?: string
  dismissed_at?: string
  created_at: string
}

// ─── AI ───────────────────────────────────────────────────────────────────────

export type AIDraftMode =
  | 'outreach'
  | 'brief'
  | 'email_series'
  | 've_email'
  | 'showcase'
  | 'signal_response'

export interface AIDraft {
  id: string
  org_id: string
  architect_id?: string
  type: AIDraftMode
  subject?: string
  body: string
  prompt_used?: string
  model: string
  sent_at?: string
  created_at: string
}

// ─── UI HELPERS ───────────────────────────────────────────────────────────────

export interface StageStyle {
  bg: string
  text: string
  border: string
}

export const STAGE_STYLES: Record<ArchitectStage, StageStyle> = {
  Active: { bg: '#E1F5EE', text: '#085041', border: '#9FE1CB' },
  Warm: { bg: '#FAEEDA', text: '#854F0B', border: '#FAC775' },
  Cooling: { bg: '#EEEDFE', text: '#3C3489', border: '#AFA9EC' },
  Cold: { bg: '#F1EFE8', text: '#5F5E5A', border: '#D3D1C7' },
}

export const AVATAR_COLORS = [
  { bg: '#E1F5EE', text: '#0F6E56' },
  { bg: '#FAEEDA', text: '#854F0B' },
  { bg: '#FAECE7', text: '#993C1D' },
  { bg: '#EEEDFE', text: '#3C3489' },
  { bg: '#F1EFE8', text: '#5F5E5A' },
]

// Generate consistent avatar color from a string
export function getAvatarColor(name: string) {
  const index = name.charCodeAt(0) % AVATAR_COLORS.length
  return AVATAR_COLORS[index]
}

// Generate initials from a name
export function getInitials(name: string): string {
  return name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}
