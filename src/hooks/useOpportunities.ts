import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useOrg } from './useOrg'
import type { Opportunity, OpportunityStage } from '@/types'

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
    }
  }

  async function deleteOpportunity(id: string) {
    const { error } = await supabase.from('opportunities').delete().eq('id', id)
    if (!error) setOpportunities((prev) => prev.filter((o) => o.id !== id))
  }

  // Pipeline metrics
  const active = opportunities.filter((o) => o.stage !== 'won' && o.stage !== 'lost')
  const pipelineValue = active.reduce((s, o) => s + (o.estimated_value ?? 0), 0)
  const weightedValue = active.reduce((s, o) => s + ((o.estimated_value ?? 0) * o.probability) / 100, 0)
  const wonDeals = opportunities.filter((o) => o.stage === 'won')
  const lostDeals = opportunities.filter((o) => o.stage === 'lost')
  const wonCount = wonDeals.length
  const lostCount = lostDeals.length
  const winRate = wonCount + lostCount > 0 ? Math.round((wonCount / (wonCount + lostCount)) * 100) : 0
  const avgDealSize = active.length > 0 ? pipelineValue / active.length : 0

  // Group by stage for Kanban
  const byStage: Record<OpportunityStage, Opportunity[]> = {
    lead: [], interview: [], proposal: [], negotiation: [], won: [], lost: [],
  }
  for (const opp of opportunities) {
    if (byStage[opp.stage]) byStage[opp.stage].push(opp)
  }
  // Sort each column by value descending
  for (const stage of Object.keys(byStage) as OpportunityStage[]) {
    byStage[stage].sort((a, b) => (b.estimated_value ?? 0) - (a.estimated_value ?? 0))
  }

  return {
    opportunities,
    loading,
    refetch: fetch,
    createOpportunity,
    updateOpportunity,
    deleteOpportunity,
    byStage,
    metrics: { pipelineValue, weightedValue, wonCount, lostCount, winRate, pipelineCount: active.length, avgDealSize },
  }
}
