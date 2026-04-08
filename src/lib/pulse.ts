// src/lib/pulse.ts
// Client-side pulse score calculation
// The nightly pg_cron job in Supabase recalculates this in the DB
// This function is used for immediate UI updates without waiting for DB sync

import type { Architect } from '@/types'

export function calculatePulse(architect: Pick<
  Architect,
  'projects_together' | 'last_contact_date' | 'stage' | 'active_lead'
>): number {
  let score = 50

  // Days since last contact
  const daysSinceContact = architect.last_contact_date
    ? Math.floor((Date.now() - new Date(architect.last_contact_date).getTime()) / 86400000)
    : 365

  // Projects together: +8 per project, max +40
  score += Math.min(architect.projects_together * 8, 40)

  // Contact recency: -0.5 per day, max -45
  score -= Math.min(Math.floor(daysSinceContact / 2), 45)

  // Stage bonus/penalty
  const stageAdjustment = {
    Active: 15,
    Warm: 5,
    Cooling: -10,
    Cold: -20,
  }
  score += stageAdjustment[architect.stage] ?? 0

  // Active lead bonus
  score += architect.active_lead ? 10 : 0

  return Math.max(0, Math.min(100, score))
}

export function getPulseColor(score: number): string {
  if (score >= 80) return '#06B6D4'
  if (score >= 50) return '#F59E0B'
  return '#EF4444'
}

export function getPulseLabel(score: number): string {
  if (score >= 80) return 'Strong'
  if (score >= 60) return 'Healthy'
  if (score >= 40) return 'Cooling'
  if (score >= 20) return 'Weak'
  return 'Critical'
}
