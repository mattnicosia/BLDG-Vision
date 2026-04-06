import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useOrg } from './useOrg'

export interface DiscoveredPlace {
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
  county?: string
  state?: string
  added_to_crm: boolean
  architect_id?: string
  discovered_at: string
}

export function useDiscoveredPlaces() {
  const { org } = useOrg()
  const [places, setPlaces] = useState<DiscoveredPlace[]>([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    if (!org) return
    setLoading(true)
    const { data } = await supabase
      .from('discovered_places')
      .select('*')
      .eq('org_id', org.id)
      .order('rating', { ascending: false, nullsFirst: false })
    if (data) setPlaces(data)
    setLoading(false)
  }, [org])

  useEffect(() => {
    fetch()
  }, [fetch])

  async function bulkUpsert(
    rows: Omit<DiscoveredPlace, 'id' | 'org_id' | 'discovered_at' | 'added_to_crm' | 'architect_id'>[]
  ) {
    if (!org) return 0
    const fullRows = rows.map((r) => ({
      ...r,
      org_id: org.id,
      added_to_crm: false,
    }))

    // Upsert in batches of 50
    let inserted = 0
    for (let i = 0; i < fullRows.length; i += 50) {
      const batch = fullRows.slice(i, i + 50)
      const { data } = await supabase
        .from('discovered_places')
        .upsert(batch, { onConflict: 'org_id,google_place_id' })
        .select()
      if (data) inserted += data.length
    }

    await fetch()
    return inserted
  }

  async function markAddedToCRM(googlePlaceId: string, architectId: string) {
    if (!org) return
    await supabase
      .from('discovered_places')
      .update({ added_to_crm: true, architect_id: architectId })
      .eq('org_id', org.id)
      .eq('google_place_id', googlePlaceId)
    setPlaces((prev) =>
      prev.map((p) =>
        p.google_place_id === googlePlaceId
          ? { ...p, added_to_crm: true, architect_id: architectId }
          : p
      )
    )
  }

  return { places, loading, refetch: fetch, bulkUpsert, markAddedToCRM }
}
