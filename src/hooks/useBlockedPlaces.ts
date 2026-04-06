import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useOrg } from './useOrg'

export interface BlockedPlace {
  id: string
  org_id: string
  google_place_id?: string
  name: string
  reason?: string
  blocked_at: string
}

export function useBlockedPlaces() {
  const { org } = useOrg()
  const [blocked, setBlocked] = useState<BlockedPlace[]>([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    if (!org) return
    setLoading(true)
    const { data } = await supabase
      .from('blocked_places')
      .select('*')
      .eq('org_id', org.id)
    if (data) setBlocked(data)
    setLoading(false)
  }, [org])

  useEffect(() => {
    fetch()
  }, [fetch])

  const blockedPlaceIds = new Set(blocked.map((b) => b.google_place_id).filter(Boolean))
  const blockedNames = new Set(blocked.map((b) => b.name.toLowerCase()))

  function isBlocked(googlePlaceId?: string | null, name?: string): boolean {
    if (googlePlaceId && blockedPlaceIds.has(googlePlaceId)) return true
    if (name && blockedNames.has(name.toLowerCase())) return true
    return false
  }

  async function blockPlace(googlePlaceId: string | undefined, name: string, reason?: string) {
    if (!org) return
    const { data, error } = await supabase.from('blocked_places').insert({
      org_id: org.id,
      google_place_id: googlePlaceId || null,
      name,
      reason,
    }).select().single()
    if (!error && data) {
      setBlocked((prev) => [...prev, data])
    }
  }

  async function unblock(id: string) {
    await supabase.from('blocked_places').delete().eq('id', id)
    setBlocked((prev) => prev.filter((b) => b.id !== id))
  }

  return { blocked, loading, isBlocked, blockPlace, unblock, refetch: fetch }
}
