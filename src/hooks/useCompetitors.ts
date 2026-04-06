import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useOrg } from './useOrg'
import type { Competitor, ArchitectCompetitorLink } from '@/types'

export function useCompetitors() {
  const { org } = useOrg()
  const [competitors, setCompetitors] = useState<Competitor[]>([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    if (!org) return
    setLoading(true)
    const { data } = await supabase
      .from('competitors')
      .select('*')
      .eq('org_id', org.id)
      .order('displacement_score', { ascending: false })
    if (data) setCompetitors(data)
    setLoading(false)
  }, [org])

  useEffect(() => {
    fetch()
  }, [fetch])

  async function createCompetitor(
    competitor: Omit<Competitor, 'id' | 'org_id' | 'created_at' | 'updated_at'>
  ) {
    if (!org) return null
    const { data, error } = await supabase
      .from('competitors')
      .insert({ ...competitor, org_id: org.id })
      .select()
      .single()
    if (!error && data) {
      setCompetitors((prev) => [data, ...prev])
      return data
    }
    return null
  }

  async function deleteCompetitor(id: string) {
    const { error } = await supabase.from('competitors').delete().eq('id', id)
    if (!error) setCompetitors((prev) => prev.filter((c) => c.id !== id))
  }

  return { competitors, loading, refetch: fetch, createCompetitor, deleteCompetitor }
}

export function useCompetitorDetail(id: string) {
  const { org } = useOrg()
  const [competitor, setCompetitor] = useState<Competitor | null>(null)
  const [links, setLinks] = useState<(ArchitectCompetitorLink & { architect_name?: string })[]>([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    if (!org || !id) return
    setLoading(true)

    const [compResult, linksResult] = await Promise.all([
      supabase.from('competitors').select('*').eq('id', id).single(),
      supabase
        .from('architect_competitor_links')
        .select('*, architects(name)')
        .eq('competitor_id', id)
        .order('projects_count', { ascending: false }),
    ])

    if (compResult.data) setCompetitor(compResult.data)
    if (linksResult.data) {
      setLinks(
        linksResult.data.map((l: any) => ({
          ...l,
          architect_name: l.architects?.name,
        }))
      )
    }
    setLoading(false)
  }, [org, id])

  useEffect(() => {
    fetch()
  }, [fetch])

  async function updateCompetitor(updates: Partial<Competitor>) {
    if (!competitor) return
    const { data, error } = await supabase
      .from('competitors')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', competitor.id)
      .select()
      .single()
    if (!error && data) setCompetitor(data)
  }

  async function addLink(link: Omit<ArchitectCompetitorLink, 'id' | 'org_id' | 'created_at'>) {
    if (!org) return
    const { data, error } = await supabase
      .from('architect_competitor_links')
      .insert({ ...link, org_id: org.id })
      .select('*, architects(name)')
      .single()
    if (!error && data) {
      setLinks((prev) => [
        { ...data, architect_name: (data as any).architects?.name },
        ...prev,
      ])
    }
  }

  async function removeLink(linkId: string) {
    const { error } = await supabase
      .from('architect_competitor_links')
      .delete()
      .eq('id', linkId)
    if (!error) setLinks((prev) => prev.filter((l) => l.id !== linkId))
  }

  return { competitor, links, loading, refetch: fetch, updateCompetitor, addLink, removeLink }
}
