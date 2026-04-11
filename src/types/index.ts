// src/types/index.ts
// All TypeScript interfaces for BLDG Vision
// Keep this file as the single source of truth for all types

// ─── CORE ─────────────────────────────────────────────────────────────────────

export interface ServiceCounty {
  name: string
  state: string
  fips: string
  lat: number
  lng: number
}

export interface Organization {
  id: string
  name: string
  slug: string
  region: string
  territory_label: string
  territory_lat: number
  territory_lng: number
  territory_radius_miles: number
  service_counties: ServiceCounty[]
  scan_schedule?: string
  scan_enabled?: boolean
  budget_min: number
  budget_max: number
  project_types: string[]
  procore_company_id?: string
  procore_connected_at?: string
  procore_last_sync_at?: string
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

export type ProjectCategory = 'residential' | 'commercial' | 'hospitality'

export interface KBProject {
  id: string
  org_id: string
  name: string
  category: ProjectCategory
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
  client_name?: string
  engineer_name?: string
  owners_rep_name?: string
  status?: string
  start_date?: string
  end_date?: string
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
  tone?: string
  cadence?: string
  next_touch_date?: string
  outreach_context?: string
  communication_notes?: string
  contact_type?: string
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

// ─── CONTACTS ────────────────────────────────────────────────────────────────

export interface ArchitectContact {
  id: string
  org_id: string
  architect_id: string
  name: string
  title?: string
  email?: string
  phone?: string
  linkedin_url?: string
  is_decision_maker: boolean
  source: 'website' | 'google_search' | 'permit' | 'board' | 'manual'
  source_url?: string
  confidence: 'high' | 'medium' | 'low'
  created_at: string
  updated_at: string
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
  source_system: 'accela' | 'tyler' | 'manual' | 'csv' | 'buildzoom' | 'energov'
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
  lat?: number
  lng?: number
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
  outcome?: DraftOutcome
  edited_body?: string
  campaign_id?: string
  created_at: string
}

// ─── EMAIL ───────────────────────────────────────────────────────────────────

export type SignatureType = 'html_paste' | 'builder'
export type DraftOutcome = 'sent' | 'copied' | 'discarded'
export type CampaignStatus = 'active' | 'paused' | 'completed' | 'cancelled'
export type CampaignEmailStatus = 'pending' | 'scheduled' | 'sent' | 'failed' | 'cancelled'

export interface EmailSettings {
  id: string
  org_id: string
  from_email?: string
  from_name?: string
  signature_html?: string
  signature_type: SignatureType
  builder_name?: string
  builder_title?: string
  builder_phone?: string
  builder_email?: string
  builder_logo_url?: string
  resend_domain_id?: string
  domain_verified: boolean
  created_at: string
  updated_at: string
}

export interface EmailCampaign {
  id: string
  org_id: string
  architect_id?: string
  architect_name?: string
  series_type?: string
  topic?: string
  status: CampaignStatus
  created_at: string
}

export interface CampaignEmail {
  id: string
  campaign_id: string
  org_id: string
  architect_id?: string
  subject?: string
  body_html: string
  sequence_number: number
  scheduled_at?: string
  sent_at?: string
  status: CampaignEmailStatus
  resend_message_id?: string
  error_message?: string
  created_at: string
}

// ─── PIPELINE STAGE CONFIG ──────────────────────────────────────────────────

export interface PipelineStageConfig {
  id: string
  org_id: string
  key: string
  label: string
  color: string
  probability: number
  stage_type: 'pipeline' | 'end_state'
  sort_order: number
  is_protected: boolean
  created_at: string
}

// ─── LEAD PIPELINE (defaults / fallbacks) ───────────────────────────────────

// Pipeline stages (active progression)
export type LeadStage =
  | 'cold_lead'
  | 'warm_lead'
  | 'preliminary_budget'
  | 'pre_construction'
  | 'formal_pricing'
  | 'pending'

// End states (terminal)
export type LeadEndState = 'awarded' | 'lost' | 'on_hold' | 'redesign' | 'cancelled'

// All possible stages (pipeline + end states)
export type LeadStatus = LeadStage | LeadEndState

// Design phases (where the project is in the architect's process)
export type DesignPhase = 'PD' | 'SD' | 'DD' | 'CD' | 'PER'

export interface Opportunity {
  id: string
  org_id: string
  architect_id?: string
  architect_name?: string
  project_name: string
  location?: string
  estimated_value?: number
  stage: string
  probability: number
  expected_close_date?: string
  competitor_ids?: string[]
  competitor_names?: string[]
  source?: string
  notes?: string
  won_date?: string
  lost_date?: string
  lost_reason?: string
  permit_id?: string
  // New pipeline fields
  design_phase?: DesignPhase
  outreach_attempts: number
  budget_revision: number
  client_name?: string
  client_email?: string
  client_phone?: string
  on_hold_reason?: string
  redesign_notes?: string
  cancelled_reason?: string
  awarded_date?: string
  sf?: number
  project_type?: string
  last_outreach_date?: string
  created_at: string
  updated_at: string
}

// Backward compat alias
export type OpportunityStage = LeadStatus

export const PIPELINE_STAGES: LeadStage[] = [
  'cold_lead', 'warm_lead', 'preliminary_budget', 'pre_construction', 'formal_pricing', 'pending',
]

export const END_STATES: LeadEndState[] = ['awarded', 'lost', 'on_hold', 'redesign', 'cancelled']

export const LEAD_STAGE_LABELS: Record<LeadStatus, string> = {
  cold_lead: 'Cold Lead',
  warm_lead: 'Warm Lead',
  preliminary_budget: 'Prelim Budget',
  pre_construction: 'Pre-Con',
  formal_pricing: 'Formal Pricing',
  pending: 'Pending',
  awarded: 'Awarded',
  lost: 'Lost',
  on_hold: 'On Hold',
  redesign: 'Redesign',
  cancelled: 'Cancelled',
}

export const LEAD_STAGE_STYLES: Record<LeadStatus, { bg: string; text: string }> = {
  cold_lead: { bg: 'rgba(124, 124, 150, 0.15)', text: '#7C7C7C' },
  warm_lead: { bg: 'rgba(245, 158, 11, 0.15)', text: '#F59E0B' },
  preliminary_budget: { bg: 'rgba(129, 140, 248, 0.15)', text: '#818CF8' },
  pre_construction: { bg: 'rgba(6, 182, 212, 0.15)', text: '#06B6D4' },
  formal_pricing: { bg: 'rgba(168, 85, 247, 0.15)', text: '#A855F7' },
  pending: { bg: 'rgba(251, 191, 36, 0.15)', text: '#FBBF24' },
  awarded: { bg: 'rgba(34, 197, 94, 0.2)', text: '#22C55E' },
  lost: { bg: 'rgba(239, 68, 68, 0.15)', text: '#EF4444' },
  on_hold: { bg: 'rgba(251, 191, 36, 0.1)', text: '#A3A3A3' },
  redesign: { bg: 'rgba(245, 158, 11, 0.1)', text: '#D97706' },
  cancelled: { bg: 'rgba(124, 124, 124, 0.1)', text: '#6B7280' },
}

export const DESIGN_PHASE_LABELS: Record<DesignPhase, string> = {
  PD: 'Pre-Design',
  SD: 'Schematic Design',
  DD: 'Design Development',
  CD: 'Construction Docs',
  PER: 'Permit',
}

export const DESIGN_PHASE_SHORT: Record<DesignPhase, string> = {
  PD: 'PD',
  SD: 'SD',
  DD: 'DD',
  CD: 'CD',
  PER: 'PER',
}

// Probability defaults per stage
export const LEAD_STAGE_PROBABILITY: Record<LeadStatus, number> = {
  cold_lead: 5,
  warm_lead: 15,
  preliminary_budget: 30,
  pre_construction: 50,
  formal_pricing: 60,
  pending: 75,
  awarded: 100,
  lost: 0,
  on_hold: 10,
  redesign: 20,
  cancelled: 0,
}

// Legacy aliases for backward compatibility
export const OPPORTUNITY_STAGE_LABELS = LEAD_STAGE_LABELS
export const OPPORTUNITY_STAGE_STYLES = LEAD_STAGE_STYLES

// ─── EMAIL TEMPLATES ─────────────────────────────────────────────────────────

export type TemplateCategory = 'introduction' | 'follow_up' | 'project_showcase' | 've_case_study' | 'custom'

export interface EmailTemplate {
  id: string
  org_id: string
  name: string
  category: TemplateCategory
  subject_template?: string
  body_template: string
  created_at: string
  updated_at: string
}

export const TEMPLATE_CATEGORY_LABELS: Record<TemplateCategory, string> = {
  introduction: 'Introduction',
  follow_up: 'Follow-up',
  project_showcase: 'Project Showcase',
  ve_case_study: 'VE Case Study',
  custom: 'Custom',
}

// ─── ENERGOV PREVIEW ─────────────────────────────────────────────────────────

export interface EnerGovContact {
  type: string
  company: string
  firstName: string
  lastName: string
  email: string
  phone: string
  address: string
}

export interface EnerGovPermitPreview {
  caseId: string
  permitNumber: string
  permitType: string
  status: string
  applyDate: string | null
  issueDate: string | null
  address: string
  town: string
  county: string
  parcel: string
  value: number
  sqft: number
  description: string
  contacts: EnerGovContact[]
  sourceUrl: string
}

// ─── GOOGLE PLACES ───────────────────────────────────────────────────────────

export interface GooglePlaceResult {
  id: string
  displayName: { text: string; languageCode: string }
  formattedAddress: string
  rating?: number
  userRatingCount?: number
  websiteUri?: string
  phone?: string
  location: { latitude: number; longitude: number }
}

// ─── UI HELPERS ───────────────────────────────────────────────────────────────

export interface StageStyle {
  bg: string
  text: string
  border: string
}

export const STAGE_STYLES: Record<ArchitectStage, StageStyle> = {
  Active: { bg: 'rgba(6, 182, 212, 0.15)', text: '#06B6D4', border: 'rgba(6, 182, 212, 0.3)' },
  Warm: { bg: 'rgba(245, 158, 11, 0.15)', text: '#F59E0B', border: 'rgba(245, 158, 11, 0.3)' },
  Cooling: { bg: 'rgba(129, 140, 248, 0.15)', text: '#818CF8', border: 'rgba(129, 140, 248, 0.3)' },
  Cold: { bg: 'rgba(124, 124, 150, 0.15)', text: '#7C7C7C', border: 'rgba(124, 124, 150, 0.3)' },
}

export const AVATAR_COLORS = [
  { bg: 'rgba(99, 102, 241, 0.2)', text: '#818CF8' },
  { bg: 'rgba(6, 182, 212, 0.2)', text: '#06B6D4' },
  { bg: 'rgba(245, 158, 11, 0.2)', text: '#F59E0B' },
  { bg: 'rgba(129, 140, 248, 0.2)', text: '#A5B4FC' },
  { bg: 'rgba(124, 124, 150, 0.2)', text: '#9CA3AF' },
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
