import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useOrg } from './useOrg'
import type { Architect, ArchitectTouchpoint } from '@/types'
import { calculatePulse } from '@/lib/pulse'

export function useArchitects() {
  const { org } = useOrg()
  const [architects, setArchitects] = useState<Architect[]>([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    if (!org) return
    setLoading(true)
    const { data } = await supabase
      .from('architects')
      .select('*')
      .eq('org_id', org.id)
      .order('pulse_score', { ascending: false })

    if (data) setArchitects(data)
    setLoading(false)
  }, [org])

  useEffect(() => {
    fetch()
  }, [fetch])

  async function createArchitect(
    architect: Omit<Architect, 'id' | 'org_id' | 'created_at' | 'updated_at' | 'pulse_score'>
  ) {
    if (!org) return null
    const pulse_score = calculatePulse({
      projects_together: architect.projects_together,
      last_contact_date: architect.last_contact_date,
      stage: architect.stage,
      active_lead: architect.active_lead,
    })
    const { data, error } = await supabase
      .from('architects')
      .insert({ ...architect, org_id: org.id, pulse_score })
      .select()
      .single()
    if (!error && data) {
      setArchitects((prev) => [data, ...prev])
      return data
    }
    return null
  }

  async function updateArchitect(id: string, updates: Partial<Architect>) {
    const existing = architects.find((a) => a.id === id)
    if (!existing) return

    const merged = { ...existing, ...updates }
    const pulse_score = calculatePulse({
      projects_together: merged.projects_together,
      last_contact_date: merged.last_contact_date,
      stage: merged.stage,
      active_lead: merged.active_lead,
    })

    const { data, error } = await supabase
      .from('architects')
      .update({ ...updates, pulse_score, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (!error && data) {
      setArchitects((prev) => prev.map((a) => (a.id === id ? data : a)))
    }
  }

  async function deleteArchitect(id: string) {
    const { error } = await supabase.from('architects').delete().eq('id', id)
    if (!error) {
      setArchitects((prev) => prev.filter((a) => a.id !== id))
    }
  }

  return { architects, loading, refetch: fetch, createArchitect, updateArchitect, deleteArchitect }
}

export function useArchitectDetail(id: string) {
  const { org } = useOrg()
  const [architect, setArchitect] = useState<Architect | null>(null)
  const [touchpoints, setTouchpoints] = useState<ArchitectTouchpoint[]>([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    if (!org || !id) return
    setLoading(true)

    const [archResult, tpResult] = await Promise.all([
      supabase.from('architects').select('*').eq('id', id).single(),
      supabase
        .from('architect_touchpoints')
        .select('*')
        .eq('architect_id', id)
        .order('contacted_at', { ascending: false }),
    ])

    if (archResult.data) setArchitect(archResult.data)
    if (tpResult.data) setTouchpoints(tpResult.data)
    setLoading(false)
  }, [org, id])

  useEffect(() => {
    fetch()
  }, [fetch])

  async function updateArchitect(updates: Partial<Architect>) {
    if (!architect) return
    const merged = { ...architect, ...updates }
    const pulse_score = calculatePulse({
      projects_together: merged.projects_together,
      last_contact_date: merged.last_contact_date,
      stage: merged.stage,
      active_lead: merged.active_lead,
    })

    const { data, error } = await supabase
      .from('architects')
      .update({ ...updates, pulse_score, updated_at: new Date().toISOString() })
      .eq('id', architect.id)
      .select()
      .single()

    if (!error && data) setArchitect(data)
  }

  return { architect, touchpoints, loading, refetch: fetch, updateArchitect }
}
