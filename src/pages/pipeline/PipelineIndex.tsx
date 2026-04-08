import { useState } from 'react'
import { useOpportunities } from '@/hooks/useOpportunities'
import { useArchitects } from '@/hooks/useArchitects'
import { PipelineMetrics } from '@/components/pipeline/PipelineMetrics'
import { OpportunityCard } from '@/components/pipeline/OpportunityCard'
import { OpportunityDetail } from '@/components/pipeline/OpportunityDetail'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Plus, Kanban } from 'lucide-react'
import type { Opportunity, OpportunityStage } from '@/types'
import { OPPORTUNITY_STAGE_LABELS, OPPORTUNITY_STAGE_STYLES } from '@/types'

const ACTIVE_STAGES: OpportunityStage[] = ['lead', 'interview', 'proposal', 'negotiation']
const CLOSED_STAGES: OpportunityStage[] = ['won', 'lost']

export function PipelineIndex() {
  const {
    opportunities,
    loading,
    byStage,
    metrics,
    createOpportunity,
    updateOpportunity,
    deleteOpportunity,
  } = useOpportunities()
  const { architects } = useArchitects()

  const [selectedOpp, setSelectedOpp] = useState<Opportunity | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [showClosed, setShowClosed] = useState(false)

  // Add form state
  const [newName, setNewName] = useState('')
  const [newValue, setNewValue] = useState('')
  const [newLocation, setNewLocation] = useState('')
  const [newArchitectId, setNewArchitectId] = useState('')
  const [newNotes, setNewNotes] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleAdd() {
    setSaving(true)
    const arch = architects.find((a) => a.id === newArchitectId)
    await createOpportunity({
      project_name: newName,
      location: newLocation || undefined,
      estimated_value: parseInt(newValue) || undefined,
      architect_id: newArchitectId || undefined,
      architect_name: arch?.name,
      stage: 'lead',
      probability: 10,
      notes: newNotes || undefined,
    })
    setNewName('')
    setNewValue('')
    setNewLocation('')
    setNewArchitectId('')
    setNewNotes('')
    setShowAdd(false)
    setSaving(false)
  }

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
            {metrics.pipelineCount} active deal{metrics.pipelineCount !== 1 ? 's' : ''}
          </p>
        </div>
        <Button onClick={() => setShowAdd(true)} className="gap-2">
          <Plus className="h-4 w-4" /> New opportunity
        </Button>
      </div>

      {/* Metrics */}
      <div className="mb-4">
        <PipelineMetrics {...metrics} />
      </div>

      {/* Kanban board */}
      {opportunities.length === 0 ? (
        <div className="flex h-48 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border">
          <Kanban className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            No opportunities yet. Create one to start building your pipeline.
          </p>
          <Button variant="outline" onClick={() => setShowAdd(true)} className="gap-2">
            <Plus className="h-4 w-4" /> New opportunity
          </Button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-4 gap-3" style={{ minHeight: 300 }}>
            {ACTIVE_STAGES.map((stage) => {
              const stageStyle = OPPORTUNITY_STAGE_STYLES[stage]
              const stageOpps = byStage[stage]
              const stageValue = stageOpps.reduce((s, o) => s + (o.estimated_value ?? 0), 0)
              return (
                <div key={stage} className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className="rounded-full px-2 py-0.5 text-[10px] font-medium"
                        style={{ backgroundColor: stageStyle.bg, color: stageStyle.text }}
                      >
                        {OPPORTUNITY_STAGE_LABELS[stage]}
                      </span>
                      <span className="text-xs text-muted-foreground">{stageOpps.length}</span>
                    </div>
                    {stageValue > 0 && (
                      <span className="text-[10px] text-muted-foreground">
                        ${(stageValue / 1000000).toFixed(1)}M
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col gap-1.5 rounded-lg bg-[#0F0F0F] p-2" style={{ minHeight: 200 }}>
                    {stageOpps.length === 0 ? (
                      <p className="py-4 text-center text-[10px] text-muted-foreground">
                        No deals
                      </p>
                    ) : (
                      stageOpps.map((opp) => (
                        <OpportunityCard
                          key={opp.id}
                          opportunity={opp}
                          onClick={() => setSelectedOpp(opp)}
                        />
                      ))
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Closed deals toggle */}
          {(byStage.won.length > 0 || byStage.lost.length > 0) && (
            <div className="mt-4">
              <button
                onClick={() => setShowClosed(!showClosed)}
                className="text-xs text-muted-foreground hover:text-[#E8E8F0]"
              >
                {showClosed ? 'Hide' : 'Show'} closed deals ({byStage.won.length} won, {byStage.lost.length} lost)
              </button>
              {showClosed && (
                <div className="mt-2 grid grid-cols-2 gap-3">
                  {CLOSED_STAGES.map((stage) => {
                    const stageStyle = OPPORTUNITY_STAGE_STYLES[stage]
                    const stageOpps = byStage[stage]
                    return (
                      <div key={stage} className="flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                          <span
                            className="rounded-full px-2 py-0.5 text-[10px] font-medium"
                            style={{ backgroundColor: stageStyle.bg, color: stageStyle.text }}
                          >
                            {OPPORTUNITY_STAGE_LABELS[stage]}
                          </span>
                          <span className="text-xs text-muted-foreground">{stageOpps.length}</span>
                        </div>
                        <div className="flex flex-col gap-1.5">
                          {stageOpps.map((opp) => (
                            <OpportunityCard
                              key={opp.id}
                              opportunity={opp}
                              onClick={() => setSelectedOpp(opp)}
                            />
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Detail modal */}
      {selectedOpp && (
        <OpportunityDetail
          opportunity={selectedOpp}
          open={!!selectedOpp}
          onClose={() => setSelectedOpp(null)}
          onUpdate={(id, updates) => {
            updateOpportunity(id, updates)
            setSelectedOpp(null)
          }}
          onDelete={(id) => {
            deleteOpportunity(id)
            setSelectedOpp(null)
          }}
        />
      )}

      {/* Add dialog */}
      {showAdd && (
        <Dialog open onOpenChange={() => setShowAdd(false)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>New opportunity</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-3">
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Project name"
                autoFocus
              />
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
              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted-foreground">Architect</label>
                <select
                  value={newArchitectId}
                  onChange={(e) => setNewArchitectId(e.target.value)}
                  className="rounded-md border border-border bg-[#1C1C1C] px-3 py-2 text-sm"
                >
                  <option value="">Select architect (optional)</option>
                  {architects.map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </div>
              <Input
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
                placeholder="Notes"
              />
              <div className="flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={() => setShowAdd(false)}>Cancel</Button>
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
