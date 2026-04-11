import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { useOrg } from './useOrg'
import type { PipelineStageConfig } from '@/types'
import {
  PIPELINE_STAGES as DEFAULT_PIPELINE,
  END_STATES as DEFAULT_END,
  LEAD_STAGE_LABELS as DEFAULT_LABELS,
  LEAD_STAGE_STYLES as DEFAULT_STYLES,
  LEAD_STAGE_PROBABILITY as DEFAULT_PROB,
} from '@/types'

export function usePipelineStages() {
  const { org } = useOrg()
  const [stages, setStages] = useState<PipelineStageConfig[]>([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    if (!org) return
    setLoading(true)
    const { data } = await supabase
      .from('pipeline_stages')
      .select('*')
      .eq('org_id', org.id)
      .order('stage_type')
      .order('sort_order')
    if (data && data.length > 0) {
      setStages(data)
    }
    setLoading(false)
  }, [org])

  useEffect(() => { fetch() }, [fetch])

  // Split into pipeline vs end states
  const pipelineStages = useMemo(
    () => stages.filter((s) => s.stage_type === 'pipeline').sort((a, b) => a.sort_order - b.sort_order),
    [stages]
  )
  const endStates = useMemo(
    () => stages.filter((s) => s.stage_type === 'end_state').sort((a, b) => a.sort_order - b.sort_order),
    [stages]
  )

  // Key arrays (like the old PIPELINE_STAGES / END_STATES constants)
  const pipelineKeys = useMemo(() => pipelineStages.map((s) => s.key), [pipelineStages])
  const endStateKeys = useMemo(() => endStates.map((s) => s.key), [endStates])
  const allKeys = useMemo(() => [...pipelineKeys, ...endStateKeys], [pipelineKeys, endStateKeys])

  // Lookup maps (replacements for hardcoded constants)
  const labelMap = useMemo(() => {
    if (stages.length === 0) return DEFAULT_LABELS
    const map: Record<string, string> = {}
    for (const s of stages) map[s.key] = s.label
    return map
  }, [stages])

  const styleMap = useMemo(() => {
    if (stages.length === 0) return DEFAULT_STYLES
    const map: Record<string, { bg: string; text: string }> = {}
    for (const s of stages) {
      map[s.key] = {
        bg: hexToRgba(s.color, s.stage_type === 'end_state' ? 0.1 : 0.15),
        text: s.color,
      }
    }
    return map
  }, [stages])

  const probabilityMap = useMemo(() => {
    if (stages.length === 0) return DEFAULT_PROB
    const map: Record<string, number> = {}
    for (const s of stages) map[s.key] = s.probability
    return map
  }, [stages])

  // Stage config lookup by key
  const stageByKey = useMemo(() => {
    const map: Record<string, PipelineStageConfig> = {}
    for (const s of stages) map[s.key] = s
    return map
  }, [stages])

  // ─── CRUD ─────────────────────────────────────────────────────────────────

  async function createStage(stage: {
    label: string
    color: string
    probability: number
    stage_type: 'pipeline' | 'end_state'
  }) {
    if (!org) return null
    const group = stages.filter((s) => s.stage_type === stage.stage_type)
    const maxOrder = group.length > 0 ? Math.max(...group.map((s) => s.sort_order)) : -1
    const key = stage.label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '')

    const { data, error } = await supabase
      .from('pipeline_stages')
      .insert({
        org_id: org.id,
        key,
        label: stage.label,
        color: stage.color,
        probability: stage.probability,
        stage_type: stage.stage_type,
        sort_order: maxOrder + 1,
        is_protected: false,
      })
      .select()
      .single()
    if (!error && data) {
      setStages((prev) => [...prev, data])
      return data
    }
    return null
  }

  async function updateStage(id: string, updates: Partial<Pick<PipelineStageConfig, 'label' | 'color' | 'probability'>>) {
    const existing = stages.find((s) => s.id === id)
    if (!existing) return

    // If label changed, update the key too
    const newUpdates: Record<string, unknown> = { ...updates }
    if (updates.label && updates.label !== existing.label) {
      newUpdates.key = updates.label
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_|_$/g, '')
    }

    const { data, error } = await supabase
      .from('pipeline_stages')
      .update(newUpdates)
      .eq('id', id)
      .select()
      .single()

    if (!error && data) {
      // If key changed, update all opportunities with the old key
      if (newUpdates.key && newUpdates.key !== existing.key) {
        await supabase
          .from('opportunities')
          .update({ stage: newUpdates.key as string })
          .eq('org_id', existing.org_id)
          .eq('stage', existing.key)
      }
      setStages((prev) => prev.map((s) => (s.id === id ? data : s)))
    }
  }

  async function deleteStage(id: string): Promise<{ ok: boolean; reason?: string }> {
    const stage = stages.find((s) => s.id === id)
    if (!stage) return { ok: false, reason: 'Stage not found' }
    if (stage.is_protected) return { ok: false, reason: `${stage.label} is a protected stage and cannot be deleted` }

    // Check if any leads use this stage
    const { count } = await supabase
      .from('opportunities')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', stage.org_id)
      .eq('stage', stage.key)
    if (count && count > 0) {
      return { ok: false, reason: `${count} lead${count !== 1 ? 's' : ''} currently in this stage. Move them first.` }
    }

    const { error } = await supabase.from('pipeline_stages').delete().eq('id', id)
    if (!error) {
      setStages((prev) => prev.filter((s) => s.id !== id))
      return { ok: true }
    }
    return { ok: false, reason: 'Failed to delete' }
  }

  async function reorderStages(stageType: 'pipeline' | 'end_state', orderedIds: string[]) {
    const updates = orderedIds.map((id, i) => ({ id, sort_order: i }))
    // Batch update
    for (const u of updates) {
      await supabase.from('pipeline_stages').update({ sort_order: u.sort_order }).eq('id', u.id)
    }
    setStages((prev) => {
      const other = prev.filter((s) => s.stage_type !== stageType)
      const reordered = orderedIds
        .map((id, i) => {
          const s = prev.find((x) => x.id === id)
          return s ? { ...s, sort_order: i } : null
        })
        .filter(Boolean) as PipelineStageConfig[]
      return [...other, ...reordered]
    })
  }

  return {
    stages,
    pipelineStages,
    endStates,
    pipelineKeys,
    endStateKeys,
    allKeys,
    labelMap,
    styleMap,
    probabilityMap,
    stageByKey,
    loading,
    refetch: fetch,
    createStage,
    updateStage,
    deleteStage,
    reorderStages,
  }
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}
