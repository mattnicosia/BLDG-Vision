import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useOrg } from './useOrg'
import type { CompanyProfile, KBProject, VECase, KBMaterial } from '@/types'

export function useCompanyProfile() {
  const { org } = useOrg()
  const [profile, setProfile] = useState<CompanyProfile | null>(null)
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    if (!org) return
    setLoading(true)
    const { data } = await supabase
      .from('company_profiles')
      .select('*')
      .eq('org_id', org.id)
      .single()
    if (data) setProfile(data)
    setLoading(false)
  }, [org])

  useEffect(() => {
    fetch()
  }, [fetch])

  async function updateProfile(updates: Partial<CompanyProfile>) {
    if (!org) return
    const { data, error } = await supabase
      .from('company_profiles')
      .upsert(
        { ...updates, org_id: org.id },
        { onConflict: 'org_id' }
      )
      .select()
      .single()
    if (!error && data) setProfile(data)
    return { error }
  }

  return { profile, loading, refetch: fetch, updateProfile }
}

export function useKBProjects() {
  const { org } = useOrg()
  const [projects, setProjects] = useState<KBProject[]>([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    if (!org) return
    setLoading(true)
    const { data } = await supabase
      .from('kb_projects')
      .select('*')
      .eq('org_id', org.id)
      .order('year', { ascending: false })
    if (data) setProjects(data)
    setLoading(false)
  }, [org])

  useEffect(() => {
    fetch()
  }, [fetch])

  async function createProject(project: Omit<KBProject, 'id' | 'org_id' | 'created_at' | 'updated_at'>) {
    if (!org) return null
    const { data, error } = await supabase
      .from('kb_projects')
      .insert({ ...project, org_id: org.id })
      .select()
      .single()
    if (!error && data) {
      setProjects((prev) => [data, ...prev])
      return data
    }
    return null
  }

  return { projects, loading, refetch: fetch, createProject }
}

export function useVECases() {
  const { org } = useOrg()
  const [cases, setCases] = useState<VECase[]>([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    if (!org) return
    setLoading(true)
    const { data } = await supabase
      .from('kb_ve_cases')
      .select('*')
      .eq('org_id', org.id)
      .order('created_at', { ascending: false })
    if (data) setCases(data)
    setLoading(false)
  }, [org])

  useEffect(() => {
    fetch()
  }, [fetch])

  return { cases, loading, refetch: fetch }
}

export function useKBMaterials() {
  const { org } = useOrg()
  const [materials, setMaterials] = useState<KBMaterial[]>([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    if (!org) return
    setLoading(true)
    const { data } = await supabase
      .from('kb_materials')
      .select('*')
      .eq('org_id', org.id)
      .order('name')
    if (data) setMaterials(data)
    setLoading(false)
  }, [org])

  useEffect(() => {
    fetch()
  }, [fetch])

  return { materials, loading, refetch: fetch }
}
