import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useOrg } from './useOrg'
import type { Opportunity } from '@/types'

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
  const pipeline = opportunities.filter((o) => o.stage !== 'won' && o.stage !== 'lost')
  const pipelineValue = pipeline.reduce((s, o) => s + (o.estimated_value ?? 0), 0)
  const weightedValue = pipeline.reduce((s, o) => s + ((o.estimated_value ?? 0) * o.probability) / 100, 0)
  const wonCount = opportunities.filter((o) => o.stage === 'won').length
  const lostCount = opportunities.filter((o) => o.stage === 'lost').length
  const winRate = wonCount + lostCount > 0 ? Math.round((wonCount / (wonCount + lostCount)) * 100) : 0

  return {
    opportunities,
    loading,
    refetch: fetch,
    createOpportunity,
    updateOpportunity,
    deleteOpportunity,
    metrics: { pipelineValue, weightedValue, wonCount, lostCount, winRate, pipelineCount: pipeline.length },
  }
}
