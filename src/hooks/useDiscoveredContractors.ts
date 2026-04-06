import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useOrg } from './useOrg'

export interface DiscoveredContractor {
  id: string
  org_id: string
  google_place_id: string
  name: string
  address?: string
  lat?: number
  lng?: number
  rating?: number
  review_count?: number
  website?: string
  phone?: string
  county?: string
  state?: string
  added_to_competitors: boolean
  competitor_id?: string
  discovered_at: string
}

export function useDiscoveredContractors() {
  const { org } = useOrg()
  const [contractors, setContractors] = useState<DiscoveredContractor[]>([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    if (!org) return
    setLoading(true)
    const { data } = await supabase
      .from('discovered_contractors')
      .select('*')
      .eq('org_id', org.id)
      .order('rating', { ascending: false, nullsFirst: false })
    if (data) setContractors(data)
    setLoading(false)
  }, [org])

  useEffect(() => {
    fetch()
  }, [fetch])

  async function bulkUpsert(
    rows: Omit<DiscoveredContractor, 'id' | 'org_id' | 'discovered_at' | 'added_to_competitors' | 'competitor_id'>[]
  ) {
    if (!org) return 0
    const fullRows = rows.map((r) => ({
      ...r,
      org_id: org.id,
      added_to_competitors: false,
    }))

    let inserted = 0
    for (let i = 0; i < fullRows.length; i += 50) {
      const batch = fullRows.slice(i, i + 50)
      const { data } = await supabase
        .from('discovered_contractors')
        .upsert(batch, { onConflict: 'org_id,google_place_id' })
        .select()
      if (data) inserted += data.length
    }

    await fetch()
    return inserted
  }

  async function markAdded(googlePlaceId: string, competitorId: string) {
    if (!org) return
    await supabase
      .from('discovered_contractors')
      .update({ added_to_competitors: true, competitor_id: competitorId })
      .eq('org_id', org.id)
      .eq('google_place_id', googlePlaceId)
    setContractors((prev) =>
      prev.map((c) =>
        c.google_place_id === googlePlaceId
          ? { ...c, added_to_competitors: true, competitor_id: competitorId }
          : c
      )
    )
  }

  return { contractors, loading, refetch: fetch, bulkUpsert, markAdded }
}
