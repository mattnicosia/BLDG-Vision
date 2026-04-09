import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useOrg } from './useOrg'
import type { EmailSettings } from '@/types'

export function useEmailSettings() {
  const { org } = useOrg()
  const [settings, setSettings] = useState<EmailSettings | null>(null)
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    if (!org) return
    setLoading(true)
    const { data } = await supabase
      .from('email_settings')
      .select('*')
      .eq('org_id', org.id)
      .maybeSingle()
    setSettings(data ?? null)
    setLoading(false)
  }, [org])

  useEffect(() => {
    fetch()
  }, [fetch])

  async function save(updates: Partial<EmailSettings>) {
    if (!org) return { error: 'No org' }
    const { data, error } = await supabase
      .from('email_settings')
      .upsert(
        { ...updates, org_id: org.id, updated_at: new Date().toISOString() },
        { onConflict: 'org_id' }
      )
      .select()
      .maybeSingle()
    if (!error && data) setSettings(data)
    return { error: error?.message }
  }

  return { settings, loading, save, refetch: fetch }
}
