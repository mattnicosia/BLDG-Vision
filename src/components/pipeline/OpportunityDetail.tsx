import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useArchitects } from '@/hooks/useArchitects'
import type { Opportunity, OpportunityStage } from '@/types'
import { OPPORTUNITY_STAGE_LABELS, OPPORTUNITY_STAGE_STYLES } from '@/types'
import { User, Sparkles, Trash2 } from 'lucide-react'

const STAGES: OpportunityStage[] = ['lead', 'interview', 'proposal', 'negotiation', 'won', 'lost']

interface OpportunityDetailProps {
  opportunity: Opportunity
  open: boolean
  onClose: () => void
  onUpdate: (id: string, updates: Partial<Opportunity>) => void
  onDelete: (id: string) => void
}

export function OpportunityDetail({ opportunity, open, onClose, onUpdate, onDelete }: OpportunityDetailProps) {
  const { architects } = useArchitects()
  const [projectName, setProjectName] = useState('')
  const [location, setLocation] = useState('')
  const [estimatedValue, setEstimatedValue] = useState('')
  const [architectId, setArchitectId] = useState('')
  const [notes, setNotes] = useState('')
  const [expectedClose, setExpectedClose] = useState('')
  const [source, setSource] = useState('')
  const [lostReason, setLostReason] = useState('')

  useEffect(() => {
    setProjectName(opportunity.project_name)
    setLocation(opportunity.location ?? '')
    setEstimatedValue(opportunity.estimated_value?.toString() ?? '')
    setArchitectId(opportunity.architect_id ?? '')
    setNotes(opportunity.notes ?? '')
    setExpectedClose(opportunity.expected_close_date ?? '')
    setSource(opportunity.source ?? '')
    setLostReason(opportunity.lost_reason ?? '')
  }, [opportunity])

  function handleStageChange(stage: OpportunityStage) {
    const updates: Partial<Opportunity> = { stage }
    const probMap: Record<string, number> = { lead: 10, interview: 25, proposal: 50, negotiation: 75, won: 100, lost: 0 }
    updates.probability = probMap[stage] ?? 10
    if (stage === 'won') updates.won_date = new Date().toISOString().split('T')[0]
    if (stage === 'lost') updates.lost_date = new Date().toISOString().split('T')[0]
    onUpdate(opportunity.id, updates)
  }

  function handleSave() {
    const arch = architects.find((a) => a.id === architectId)
    onUpdate(opportunity.id, {
      project_name: projectName,
      location: location || undefined,
      estimated_value: parseInt(estimatedValue) || undefined,
      architect_id: architectId || undefined,
      architect_name: arch?.name || opportunity.architect_name,
      notes: notes || undefined,
      expected_close_date: expectedClose || undefined,
      source: source || undefined,
      lost_reason: lostReason || undefined,
    })
    onClose()
  }

  const style = OPPORTUNITY_STAGE_STYLES[opportunity.stage]

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{opportunity.project_name}</DialogTitle>
        </DialogHeader>

        {/* Stage selector */}
        <div className="flex flex-wrap gap-1.5">
          {STAGES.map((s) => {
            const sStyle = OPPORTUNITY_STAGE_STYLES[s]
            const isActive = opportunity.stage === s
            return (
              <button
                key={s}
                onClick={() => handleStageChange(s)}
                className="rounded-full px-2.5 py-1 text-[10px] font-medium transition-colors"
                style={{
                  backgroundColor: isActive ? sStyle.bg : 'transparent',
                  color: isActive ? sStyle.text : '#a1a1aa',
                  border: `1px solid ${isActive ? (sStyle.text === '#ffffff' ? sStyle.bg : sStyle.text) : '#e4e4e7'}`,
                }}
              >
                {OPPORTUNITY_STAGE_LABELS[s]}
              </button>
            )
          })}
        </div>

        {/* Architect link */}
        {opportunity.architect_id && (
          <Link
            to={`/crm/${opportunity.architect_id}`}
            className="flex items-center gap-2 rounded-lg bg-[#141414] p-2 text-sm text-primary hover:underline"
            onClick={onClose}
          >
            <User className="h-3.5 w-3.5" />
            {opportunity.architect_name}
            <span className="ml-auto text-xs text-muted-foreground">View profile</span>
          </Link>
        )}

        {/* Form */}
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">Project name</label>
            <Input value={projectName} onChange={(e) => setProjectName(e.target.value)} />
          </div>
          <div className="flex gap-3">
            <div className="flex flex-1 flex-col gap-1">
              <label className="text-xs text-muted-foreground">Value ($)</label>
              <Input type="number" value={estimatedValue} onChange={(e) => setEstimatedValue(e.target.value)} />
            </div>
            <div className="flex flex-1 flex-col gap-1">
              <label className="text-xs text-muted-foreground">Expected close</label>
              <Input type="date" value={expectedClose} onChange={(e) => setExpectedClose(e.target.value)} />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">Location</label>
            <Input value={location} onChange={(e) => setLocation(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">Architect</label>
            <select
              value={architectId}
              onChange={(e) => setArchitectId(e.target.value)}
              className="rounded-md border border-border bg-[#1C1C1C] px-3 py-2 text-sm"
            >
              <option value="">No architect linked</option>
              {architects.map((a) => (
                <option key={a.id} value={a.id}>{a.name} {a.firm ? `(${a.firm})` : ''}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">Source</label>
            <Input value={source} onChange={(e) => setSource(e.target.value)} placeholder="e.g., Board meeting, permit, referral" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">Notes</label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
          </div>
          {opportunity.stage === 'lost' && (
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">Lost reason</label>
              <Input value={lostReason} onChange={(e) => setLostReason(e.target.value)} />
            </div>
          )}
        </div>

        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (confirm(`Delete ${opportunity.project_name}?`)) {
                onDelete(opportunity.id)
                onClose()
              }
            }}
            className="gap-1 text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5" /> Delete
          </Button>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
            <Button size="sm" onClick={handleSave}>Save</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
