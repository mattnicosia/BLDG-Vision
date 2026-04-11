import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useOrg } from './useOrg'
import type { Opportunity, LeadStatus, LeadStage, LeadEndState } from '@/types'
import { PIPELINE_STAGES, END_STATES, LEAD_STAGE_PROBABILITY } from '@/types'

export function useOpportunities(architectId?: string) {
  const { org } = useOrg()
  const [opportunities, setOpportunities] = useState<Opportunity[]>([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    if (!org) return
    setLoading(true)
    let query = supabase
      .from('opportunities')
      .select('*')
      .eq('org_id', org.id)
      .order('created_at', { ascending: false })

    if (architectId) {
      query = query.eq('architect_id', architectId)
    }

    const { data } = await query
    if (data) setOpportunities(data)
    setLoading(false)
  }, [org, architectId])

  useEffect(() => {
    fetch()
  }, [fetch])

  async function createOpportunity(
    opp: Omit<Opportunity, 'id' | 'org_id' | 'created_at' | 'updated_at'>
  ) {
    if (!org) return null
    const { data, error } = await supabase
      .from('opportunities')
      .insert({ ...opp, org_id: org.id })
      .select()
      .single()
    if (!error && data) {
      setOpportunities((prev) => [data, ...prev])
      return data
    }
    return null
  }

  async function updateOpportunity(id: string, updates: Partial<Opportunity>) {
    const { data, error } = await supabase
      .from('opportunities')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (!error && data) {
      setOpportunities((prev) => prev.map((o) => (o.id === id ? data : o)))

      // Auto-trigger win attribution when deal is awarded
      if (updates.stage === 'awarded') {
        const session = await supabase.auth.getSession()
        const token = session.data.session?.access_token
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
        const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
        const hdrs = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`, 'apikey': anonKey }
        window.fetch(`${supabaseUrl}/functions/v1/win-attribution`, { method: 'POST', headers: hdrs, body: '{}' }).catch(() => {})
        window.fetch(`${supabaseUrl}/functions/v1/generate-alerts`, { method: 'POST', headers: hdrs, body: '{}' }).catch(() => {})
      }
    }
  }

  async function deleteOpportunity(id: string) {
    const { error } = await supabase.from('opportunities').delete().eq('id', id)
    if (!error) setOpportunities((prev) => prev.filter((o) => o.id !== id))
  }

  // Move to next stage with auto-probability
  function advanceStage(id: string, newStage: LeadStatus) {
    const updates: Partial<Opportunity> = {
      stage: newStage,
      probability: LEAD_STAGE_PROBABILITY[newStage],
    }
    if (newStage === 'awarded') updates.awarded_date = new Date().toISOString().split('T')[0]
    if (newStage === 'lost') updates.lost_date = new Date().toISOString().split('T')[0]
    return updateOpportunity(id, updates)
  }

  // Increment outreach attempts on a cold lead
  function recordOutreach(id: string) {
    const opp = opportunities.find((o) => o.id === id)
    if (!opp) return
    return updateOpportunity(id, {
      outreach_attempts: (opp.outreach_attempts ?? 0) + 1,
      last_outreach_date: new Date().toISOString().split('T')[0],
    })
  }

  // Increment budget revision
  function recordBudgetRevision(id: string) {
    const opp = opportunities.find((o) => o.id === id)
    if (!opp) return
    return updateOpportunity(id, {
      budget_revision: (opp.budget_revision ?? 0) + 1,
    })
  }

  // Active = in pipeline (not end states)
  const active = opportunities.filter((o) =>
    PIPELINE_STAGES.includes(o.stage as LeadStage)
  )
  const ended = opportunities.filter((o) =>
    END_STATES.includes(o.stage as LeadEndState)
  )

  // Pipeline metrics
  const pipelineValue = active.reduce((s, o) => s + (o.estimated_value ?? 0), 0)
  const weightedValue = active.reduce((s, o) => s + ((o.estimated_value ?? 0) * o.probability) / 100, 0)
  const awardedDeals = opportunities.filter((o) => o.stage === 'awarded')
  const lostDeals = opportunities.filter((o) => o.stage === 'lost')
  const awardedCount = awardedDeals.length
  const lostCount = lostDeals.length
  const winRate = awardedCount + lostCount > 0 ? Math.round((awardedCount / (awardedCount + lostCount)) * 100) : 0
  const avgDealSize = active.length > 0 ? pipelineValue / active.length : 0

  // Group by stage for Kanban
  const byStage: Record<LeadStatus, Opportunity[]> = {} as any
  for (const s of [...PIPELINE_STAGES, ...END_STATES]) {
    byStage[s] = []
  }
  for (const opp of opportunities) {
    if (byStage[opp.stage]) byStage[opp.stage].push(opp)
  }
  // Sort each column by value descending
  for (const key of Object.keys(byStage) as LeadStatus[]) {
    byStage[key].sort((a, b) => (b.estimated_value ?? 0) - (a.estimated_value ?? 0))
  }

  return {
    opportunities,
    loading,
    refetch: fetch,
    createOpportunity,
    updateOpportunity,
    deleteOpportunity,
    advanceStage,
    recordOutreach,
    recordBudgetRevision,
    byStage,
    active,
    ended,
    metrics: {
      pipelineValue,
      weightedValue,
      awardedCount,
      lostCount,
      winRate,
      pipelineCount: active.length,
      avgDealSize,
    },
  }
}
