import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useOrg } from './useOrg'
import type { Signal } from '@/types'

const PRIORITY_RANK = { high: 0, medium: 1, low: 2 }

export function useSignals() {
  const { org } = useOrg()
  const [signals, setSignals] = useState<Signal[]>([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    if (!org) return
    setLoading(true)
    const { data } = await supabase
      .from('signals')
      .select('*')
      .eq('org_id', org.id)
      .order('created_at', { ascending: false })

    if (data) {
      const sorted = data.sort((a: Signal, b: Signal) => {
        const pa = PRIORITY_RANK[a.priority] ?? 2
        const pb = PRIORITY_RANK[b.priority] ?? 2
        if (pa !== pb) return pa - pb
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      })
      setSignals(sorted)
    }
    setLoading(false)
  }, [org])

  useEffect(() => {
    fetch()
  }, [fetch])

  async function createSignal(
    signal: Omit<Signal, 'id' | 'org_id' | 'created_at' | 'actioned_at' | 'dismissed_at'>
  ) {
    if (!org) return null
    const { data, error } = await supabase
      .from('signals')
      .insert({ ...signal, org_id: org.id })
      .select()
      .single()
    if (!error && data) {
      setSignals((prev) => [data, ...prev])
      return data
    }
    return null
  }

  async function actionSignal(id: string) {
    const { error } = await supabase
      .from('signals')
      .update({ actioned_at: new Date().toISOString() })
      .eq('id', id)
    if (!error) {
      setSignals((prev) =>
        prev.map((s) =>
          s.id === id ? { ...s, actioned_at: new Date().toISOString() } : s
        )
      )
    }
  }

  async function dismissSignal(id: string) {
    const { error } = await supabase
      .from('signals')
      .update({ dismissed_at: new Date().toISOString() })
      .eq('id', id)
    if (!error) {
      setSignals((prev) =>
        prev.map((s) =>
          s.id === id ? { ...s, dismissed_at: new Date().toISOString() } : s
        )
      )
    }
  }

  return { signals, loading, refetch: fetch, createSignal, actionSignal, dismissSignal }
}
