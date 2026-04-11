import { useState } from 'react'
import { useOpportunities } from '@/hooks/useOpportunities'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Plus, DollarSign, Trash2 } from 'lucide-react'
import { usePipelineStages } from '@/hooks/usePipelineStages'

interface OpportunityPanelProps {
  architectId: string
  architectName: string
}

export function OpportunityPanel({ architectId, architectName }: OpportunityPanelProps) {
  const { opportunities, loading, createOpportunity, updateOpportunity, deleteOpportunity, metrics } =
    useOpportunities(architectId)
  const { allKeys, labelMap, styleMap, probabilityMap, pipelineKeys } = usePipelineStages()
  const [showAdd, setShowAdd] = useState(false)
  const [newName, setNewName] = useState('')
  const [newValue, setNewValue] = useState('')
  const [newLocation, setNewLocation] = useState('')
  const [newNotes, setNewNotes] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleAdd() {
    setSaving(true)
    await createOpportunity({
      architect_id: architectId,
      architect_name: architectName,
      project_name: newName,
      location: newLocation || undefined,
      estimated_value: parseInt(newValue) || undefined,
      stage: pipelineKeys[0] ?? 'cold_lead',
      probability: probabilityMap[pipelineKeys[0]] ?? 5,
      notes: newNotes || undefined,
      outreach_attempts: 0,
      budget_revision: 0,
    })
    setNewName('')
    setNewValue('')
    setNewLocation('')
    setNewNotes('')
    setShowAdd(false)
    setSaving(false)
  }

  async function handleStageChange(id: string, stage: string) {
    const updates: Record<string, unknown> = {
      stage,
      probability: probabilityMap[stage] ?? 10,
    }
    if (stage === 'awarded') updates.awarded_date = new Date().toISOString().split('T')[0]
    if (stage === 'lost') updates.lost_date = new Date().toISOString().split('T')[0]
    await updateOpportunity(id, updates)
  }

  if (loading) return null

  return (
    <div className="rounded-xl border border-border bg-[#1C1C1C] p-4" style={{ borderWidth: '0.5px' }}>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-medium">
          Pipeline {opportunities.length > 0 && `(${opportunities.length})`}
        </h3>
        <Button variant="ghost" size="sm" onClick={() => setShowAdd(true)}>
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Metrics */}
      {opportunities.length > 0 && (
        <div className="mb-3 grid grid-cols-2 gap-2">
          <div className="rounded-lg bg-[#141414] p-2">
            <p className="text-[10px] text-muted-foreground">Pipeline</p>
            <p className="text-xs font-medium">
              ${(metrics.pipelineValue / 1000000).toFixed(1)}M
            </p>
          </div>
          <div className="rounded-lg bg-[#141414] p-2">
            <p className="text-[10px] text-muted-foreground">Win rate</p>
            <p className="text-xs font-medium">{metrics.winRate}%</p>
          </div>
        </div>
      )}

      {/* Lead list */}
      <div className="flex flex-col gap-2">
        {opportunities.length === 0 && (
          <p className="text-xs text-muted-foreground">No leads yet</p>
        )}
        {opportunities.map((opp) => {
          const style = styleMap[opp.stage as string] ?? { bg: 'rgba(124,124,150,0.15)', text: '#7C7C7C' }
          return (
            <div key={opp.id} className="rounded-lg bg-[#141414] p-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium">{opp.project_name}</span>
                <button
                  onClick={() => {
                    if (confirm(`Delete ${opp.project_name}?`)) deleteOpportunity(opp.id)
                  }}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-2.5 w-2.5" />
                </button>
              </div>
              {opp.estimated_value && (
                <p className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                  <DollarSign className="h-2.5 w-2.5" />
                  {(opp.estimated_value / 1000000).toFixed(1)}M
                  <span className="ml-1">({opp.probability}%)</span>
                  {opp.design_phase && (
                    <span
                      className="ml-1 rounded px-1 py-0.5 text-[8px] font-semibold"
                      style={{ backgroundColor: 'rgba(99, 102, 241, 0.15)', color: '#818CF8' }}
                    >
                      {opp.design_phase}
                    </span>
                  )}
                </p>
              )}
              <div className="mt-1.5 flex flex-wrap gap-1">
                {allKeys.map((s) => {
                  const sStyle = styleMap[s] ?? { bg: 'rgba(124,124,150,0.15)', text: '#7C7C7C' }
                  return (
                    <button
                      key={s}
                      onClick={() => handleStageChange(opp.id, s)}
                      className="rounded-full px-1.5 py-0.5 text-[9px] font-medium transition-colors"
                      style={{
                        backgroundColor: opp.stage === s ? sStyle.bg : 'transparent',
                        color: opp.stage === s ? sStyle.text : '#7C7C7C',
                        border: `1px solid ${opp.stage === s ? sStyle.text + '40' : '#2A2A2A'}`,
                      }}
                    >
                      {labelMap[s] ?? s}
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* Add dialog */}
      {showAdd && (
        <Dialog open onOpenChange={() => setShowAdd(false)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Add lead</DialogTitle>
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
              <Textarea
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
                placeholder="Notes"
                rows={2}
              />
              <div className="flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={() => setShowAdd(false)}>
                  Cancel
                </Button>
                <Button size="sm" onClick={handleAdd} disabled={!newName || saving}>
                  {saving ? 'Adding...' : 'Add'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
