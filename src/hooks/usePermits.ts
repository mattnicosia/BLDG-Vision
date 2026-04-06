import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useOrg } from './useOrg'
import type { Permit } from '@/types'

export function usePermits() {
  const { org } = useOrg()
  const [permits, setPermits] = useState<Permit[]>([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    if (!org) return
    setLoading(true)
    const { data } = await supabase
      .from('permits')
      .select('*')
      .eq('org_id', org.id)
      .order('filed_date', { ascending: false })
    if (data) setPermits(data)
    setLoading(false)
  }, [org])

  useEffect(() => {
    fetch()
  }, [fetch])

  async function bulkInsertPermits(rows: Partial<Permit>[]) {
    if (!org) return { inserted: 0, error: null }
    const fullRows = rows.map((r) => ({
      ...r,
      org_id: org.id,
      source_system: 'csv' as const,
      our_project: false,
      opportunity: false,
    }))

    const { data, error } = await supabase
      .from('permits')
      .insert(fullRows)
      .select()

    if (!error && data) {
      setPermits((prev) => [...data, ...prev])
      return { inserted: data.length, error: null }
    }
    return { inserted: 0, error: error?.message ?? 'Insert failed' }
  }

  return { permits, loading, refetch: fetch, bulkInsertPermits }
}
