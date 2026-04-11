import { useState, useMemo } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core'
import { useOpportunities } from '@/hooks/useOpportunities'
import { useArchitects } from '@/hooks/useArchitects'
import { PipelineMetrics } from '@/components/pipeline/PipelineMetrics'
import { LeadCard } from '@/components/pipeline/LeadCard'
import { LeadDetail } from '@/components/pipeline/LeadDetail'
import { KanbanColumn } from '@/components/pipeline/KanbanColumn'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Plus, Kanban } from 'lucide-react'
import type { Opportunity, LeadStage, LeadStatus, DesignPhase } from '@/types'
import {
  PIPELINE_STAGES,
  END_STATES,
  LEAD_STAGE_LABELS,
  LEAD_STAGE_STYLES,
  LEAD_STAGE_PROBABILITY,
} from '@/types'

const DESIGN_PHASES: DesignPhase[] = ['PD', 'SD', 'DD', 'CD', 'PER']

export function PipelineIndex() {
  const {
    opportunities,
    loading,
    byStage,
    metrics,
    createOpportunity,
    updateOpportunity,
    deleteOpportunity,
    advanceStage,
    recordOutreach,
    recordBudgetRevision,
  } = useOpportunities()
  const { architects } = useArchitects()

  const [selectedOpp, setSelectedOpp] = useState<Opportunity | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [showEnded, setShowEnded] = useState(false)
  const [activeId, setActiveId] = useState<string | null>(null)

  // Require 8px of movement before starting drag (prevents accidental drags on click)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  // Find the lead being dragged for the overlay
  const activeLead = useMemo(
    () => (activeId ? opportunities.find((o) => o.id === activeId) : null),
    [activeId, opportunities]
  )

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string)
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null)
    const { active, over } = event
    if (!over) return

    const leadId = active.id as string
    const targetStage = over.id as LeadStatus
    const lead = opportunities.find((o) => o.id === leadId)
    if (!lead || lead.stage === targetStage) return

    advanceStage(leadId, targetStage)
  }

  // Add form state
  const [newName, setNewName] = useState('')
  const [newValue, setNewValue] = useState('')
  const [newLocation, setNewLocation] = useState('')
  const [newArchitectId, setNewArchitectId] = useState('')
  const [newNotes, setNewNotes] = useState('')
  const [newDesignPhase, setNewDesignPhase] = useState<DesignPhase | ''>('')
  const [newStage, setNewStage] = useState<LeadStage>('cold_lead')
  const [newClientName, setNewClientName] = useState('')
  const [newProjectType, setNewProjectType] = useState('')
  const [saving, setSaving] = useState(false)

  function resetForm() {
    setNewName('')
    setNewValue('')
    setNewLocation('')
    setNewArchitectId('')
    setNewNotes('')
    setNewDesignPhase('')
    setNewStage('cold_lead')
    setNewClientName('')
    setNewProjectType('')
  }

  async function handleAdd() {
    setSaving(true)
    const arch = architects.find((a) => a.id === newArchitectId)
    await createOpportunity({
      project_name: newName,
      location: newLocation || undefined,
      estimated_value: parseInt(newValue) || undefined,
      architect_id: newArchitectId || undefined,
      architect_name: arch?.name,
      stage: newStage,
      probability: LEAD_STAGE_PROBABILITY[newStage],
      notes: newNotes || undefined,
      design_phase: (newDesignPhase as DesignPhase) || undefined,
      client_name: newClientName || undefined,
      project_type: newProjectType || undefined,
      outreach_attempts: 0,
      budget_revision: 0,
    })
    resetForm()
    setShowAdd(false)
    setSaving(false)
  }

  // Count ended deals
  const endedCounts = END_STATES.reduce((acc, s) => {
    acc[s] = byStage[s]?.length ?? 0
    return acc
  }, {} as Record<string, number>)
  const totalEnded = Object.values(endedCounts).reduce((a, b) => a + b, 0)

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-muted-foreground">Loading pipeline...</p>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-medium">Pipeline</h1>
          <p className="text-sm text-muted-foreground">
            {metrics.pipelineCount} active lead{metrics.pipelineCount !== 1 ? 's' : ''}
          </p>
        </div>
        <Button onClick={() => setShowAdd(true)} className="gap-2">
          <Plus className="h-4 w-4" /> New lead
        </Button>
      </div>

      {/* Metrics */}
      <div className="mb-4">
        <PipelineMetrics
          pipelineValue={metrics.pipelineValue}
          weightedValue={metrics.weightedValue}
          pipelineCount={metrics.pipelineCount}
          winRate={metrics.winRate}
          avgDealSize={metrics.avgDealSize}
          awardedCount={metrics.awardedCount}
        />
      </div>

      {/* Kanban board */}
      {opportunities.length === 0 ? (
        <div className="flex h-48 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border">
          <Kanban className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            No leads yet. Create one to start building your pipeline.
          </p>
          <Button variant="outline" onClick={() => setShowAdd(true)} className="gap-2">
            <Plus className="h-4 w-4" /> New lead
          </Button>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          {/* 6-column pipeline */}
          <div className="grid grid-cols-6 gap-2" style={{ minHeight: 300 }}>
            {PIPELINE_STAGES.map((stage) => {
              const stageLeads = byStage[stage] ?? []
              const stageValue = stageLeads.reduce((s, o) => s + (o.estimated_value ?? 0), 0)
              return (
                <KanbanColumn
                  key={stage}
                  stage={stage}
                  count={stageLeads.length}
                  value={stageValue}
                >
                  {stageLeads.length === 0 ? (
                    <p className="py-4 text-center text-[10px] text-muted-foreground">
                      No leads
                    </p>
                  ) : (
                    stageLeads.map((lead) => (
                      <LeadCard
                        key={lead.id}
                        lead={lead}
                        onClick={() => setSelectedOpp(lead)}
                      />
                    ))
                  )}
                </KanbanColumn>
              )
            })}
          </div>

          {/* End states toggle */}
          {totalEnded > 0 && (
            <div className="mt-4">
              <button
                onClick={() => setShowEnded(!showEnded)}
                className="text-xs text-muted-foreground hover:text-[#E8E8F0]"
              >
                {showEnded ? 'Hide' : 'Show'} closed leads ({endedCounts.awarded ?? 0} awarded, {endedCounts.lost ?? 0} lost, {endedCounts.on_hold ?? 0} on hold, {endedCounts.redesign ?? 0} redesign, {endedCounts.cancelled ?? 0} cancelled)
              </button>
              {showEnded && (
                <div className="mt-2 grid grid-cols-5 gap-2">
                  {END_STATES.map((state) => {
                    const stateLeads = byStage[state] ?? []
                    const stateValue = stateLeads.reduce((s, o) => s + (o.estimated_value ?? 0), 0)
                    return (
                      <KanbanColumn
                        key={state}
                        stage={state}
                        count={stateLeads.length}
                        value={stateValue}
                      >
                        {stateLeads.length === 0 ? (
                          <p className="py-4 text-center text-[10px] text-muted-foreground">
                            None
                          </p>
                        ) : (
                          stateLeads.map((lead) => (
                            <LeadCard
                              key={lead.id}
                              lead={lead}
                              onClick={() => setSelectedOpp(lead)}
                            />
                          ))
                        )}
                      </KanbanColumn>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* Drag overlay - floating card that follows cursor */}
          <DragOverlay dropAnimation={null}>
            {activeLead ? (
              <LeadCard
                lead={activeLead}
                onClick={() => {}}
                isOverlay
              />
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      {/* Detail modal */}
      {selectedOpp && (
        <LeadDetail
          lead={selectedOpp}
          open={!!selectedOpp}
          onClose={() => setSelectedOpp(null)}
          onUpdate={(id, updates) => {
            updateOpportunity(id, updates)
            setSelectedOpp(null)
          }}
          onAdvance={(id, stage) => {
            advanceStage(id, stage)
            setSelectedOpp(null)
          }}
          onRecordOutreach={(id) => {
            recordOutreach(id)
            setSelectedOpp((prev) => prev ? { ...prev, outreach_attempts: (prev.outreach_attempts ?? 0) + 1 } : null)
          }}
          onRecordRevision={(id) => {
            recordBudgetRevision(id)
            setSelectedOpp((prev) => prev ? { ...prev, budget_revision: (prev.budget_revision ?? 0) + 1 } : null)
          }}
          onDelete={(id) => {
            deleteOpportunity(id)
            setSelectedOpp(null)
          }}
        />
      )}

      {/* Add dialog */}
      {showAdd && (
        <Dialog open onOpenChange={() => { resetForm(); setShowAdd(false) }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>New lead</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-3">
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Project name"
                autoFocus
              />
              <div className="grid grid-cols-2 gap-3">
                <Input
                  value={newLocation}
                  onChange={(e) => setNewLocation(e.target.value)}
                  placeholder="Location"
                />
                <Input
                  type="number"
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                  placeholder="Estimated value ($)"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-medium" style={{ color: '#7C7C7C' }}>Stage</label>
                  <select
                    value={newStage}
                    onChange={(e) => setNewStage(e.target.value as LeadStage)}
                    className="rounded-md border border-border px-3 py-2 text-sm"
                    style={{ backgroundColor: '#141414', borderColor: '#2A2A2A', color: '#E8E8F0' }}
                  >
                    {PIPELINE_STAGES.map((s) => (
                      <option key={s} value={s}>{LEAD_STAGE_LABELS[s]}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-medium" style={{ color: '#7C7C7C' }}>Design phase</label>
                  <select
                    value={newDesignPhase}
                    onChange={(e) => setNewDesignPhase(e.target.value as DesignPhase | '')}
                    className="rounded-md border border-border px-3 py-2 text-sm"
                    style={{ backgroundColor: '#141414', borderColor: '#2A2A2A', color: '#E8E8F0' }}
                  >
                    <option value="">Unknown</option>
                    {DESIGN_PHASES.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-medium" style={{ color: '#7C7C7C' }}>Architect</label>
                  <select
                    value={newArchitectId}
                    onChange={(e) => setNewArchitectId(e.target.value)}
                    className="rounded-md border border-border px-3 py-2 text-sm"
                    style={{ backgroundColor: '#141414', borderColor: '#2A2A2A', color: '#E8E8F0' }}
                  >
                    <option value="">Select architect</option>
                    {architects.map((a) => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                </div>
                <Input
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                  placeholder="Client name"
                  className="mt-auto"
                />
              </div>
              <Input
                value={newProjectType}
                onChange={(e) => setNewProjectType(e.target.value)}
                placeholder="Project type (e.g. New build, Addition, Renovation)"
              />
              <Input
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
                placeholder="Notes"
              />
              <div className="flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={() => { resetForm(); setShowAdd(false) }}>Cancel</Button>
                <Button size="sm" onClick={handleAdd} disabled={!newName || saving}>
                  {saving ? 'Creating...' : 'Create'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
