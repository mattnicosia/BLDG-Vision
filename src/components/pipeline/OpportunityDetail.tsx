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
import { supabase } from '@/lib/supabase'
import type { Opportunity, OpportunityStage, Permit } from '@/types'
import { OPPORTUNITY_STAGE_LABELS, OPPORTUNITY_STAGE_STYLES } from '@/types'
import {
  User, Trash2, MapPin, DollarSign, Calendar, FileText,
  Building2, Pencil, Check, X, ExternalLink, Clock,
} from 'lucide-react'

const STAGES: OpportunityStage[] = ['lead', 'interview', 'proposal', 'negotiation', 'won', 'lost']

function formatValue(v: number): string {
  if (v >= 1000000) return `$${(v / 1000000).toFixed(1)}M`
  if (v >= 1000) return `$${(v / 1000).toFixed(0)}K`
  return `$${v.toLocaleString()}`
}

function formatDate(d?: string): string {
  if (!d) return ''
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

interface OpportunityDetailProps {
  opportunity: Opportunity
  open: boolean
  onClose: () => void
  onUpdate: (id: string, updates: Partial<Opportunity>) => void
  onDelete: (id: string) => void
}

export function OpportunityDetail({ opportunity, open, onClose, onUpdate, onDelete }: OpportunityDetailProps) {
  const { architects } = useArchitects()
  const [editing, setEditing] = useState(false)
  const [linkedPermit, setLinkedPermit] = useState<Permit | null>(null)

  // Edit fields
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
    setEditing(false)

    // Fetch linked permit
    if (opportunity.permit_id) {
      supabase
        .from('permits')
        .select('*')
        .eq('id', opportunity.permit_id)
        .single()
        .then(({ data }) => { if (data) setLinkedPermit(data) })
    } else {
      setLinkedPermit(null)
    }
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
    setEditing(false)
  }

  const style = OPPORTUNITY_STAGE_STYLES[opportunity.stage]
  const linkedArch = architects.find((a) => a.id === opportunity.architect_id)
  const daysInStage = Math.floor((Date.now() - new Date(opportunity.updated_at).getTime()) / 86400000)

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="!max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div>
              <DialogTitle className="text-lg">{opportunity.project_name}</DialogTitle>
              {opportunity.location && (
                <p className="mt-0.5 flex items-center gap-1 text-[13px]" style={{ color: '#7C7C7C' }}>
                  <MapPin className="h-3 w-3" /> {opportunity.location}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              {!editing && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditing(true)}
                  className="gap-1.5"
                  style={{ color: '#7C7C7C' }}
                >
                  <Pencil className="h-3.5 w-3.5" /> Edit
                </Button>
              )}
            </div>
          </div>
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
                className="nav-item rounded-full px-3 py-1.5 text-[11px] font-semibold transition-all"
                style={{
                  backgroundColor: isActive ? sStyle.bg : 'transparent',
                  color: isActive ? sStyle.text : '#7C7C7C',
                  border: `1px solid ${isActive ? sStyle.text + '40' : '#2A2A2A'}`,
                }}
              >
                {OPPORTUNITY_STAGE_LABELS[s]}
              </button>
            )
          })}
        </div>

        {editing ? (
          /* ─── EDIT MODE ─── */
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-medium" style={{ color: '#7C7C7C' }}>Project name</label>
                <Input value={projectName} onChange={(e) => setProjectName(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-medium" style={{ color: '#7C7C7C' }}>Location</label>
                <Input value={location} onChange={(e) => setLocation(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-medium" style={{ color: '#7C7C7C' }}>Value ($)</label>
                <Input type="number" value={estimatedValue} onChange={(e) => setEstimatedValue(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-medium" style={{ color: '#7C7C7C' }}>Expected close</label>
                <Input type="date" value={expectedClose} onChange={(e) => setExpectedClose(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-medium" style={{ color: '#7C7C7C' }}>Source</label>
                <Input value={source} onChange={(e) => setSource(e.target.value)} placeholder="Board meeting, permit, referral" />
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-medium" style={{ color: '#7C7C7C' }}>Architect</label>
              <select
                value={architectId}
                onChange={(e) => setArchitectId(e.target.value)}
                className="rounded-md border border-border px-3 py-2 text-sm"
                style={{ backgroundColor: '#141414', borderColor: '#2A2A2A', color: '#E8E8F0' }}
              >
                <option value="">No architect linked</option>
                {architects.map((a) => (
                  <option key={a.id} value={a.id}>{a.name} {a.firm ? `(${a.firm})` : ''}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-medium" style={{ color: '#7C7C7C' }}>Notes</label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} />
            </div>
            {opportunity.stage === 'lost' && (
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-medium" style={{ color: '#7C7C7C' }}>Lost reason</label>
                <Input value={lostReason} onChange={(e) => setLostReason(e.target.value)} />
              </div>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" size="sm" onClick={() => setEditing(false)} className="gap-1">
                <X className="h-3.5 w-3.5" /> Cancel
              </Button>
              <Button size="sm" onClick={handleSave} className="gap-1">
                <Check className="h-3.5 w-3.5" /> Save
              </Button>
            </div>
          </div>
        ) : (
          /* ─── VIEW MODE ─── */
          <div className="flex flex-col gap-4">
            {/* Key metrics row */}
            <div className="grid grid-cols-4 gap-3">
              <div className="rounded-lg p-3" style={{ backgroundColor: '#141414' }}>
                <p className="text-[10px] font-medium uppercase" style={{ color: '#7C7C7C', letterSpacing: '0.5px' }}>Value</p>
                <p className="metric-number mt-1 text-xl" style={{ color: '#06B6D4' }}>
                  {opportunity.estimated_value ? formatValue(opportunity.estimated_value) : 'TBD'}
                </p>
              </div>
              <div className="rounded-lg p-3" style={{ backgroundColor: '#141414' }}>
                <p className="text-[10px] font-medium uppercase" style={{ color: '#7C7C7C', letterSpacing: '0.5px' }}>Probability</p>
                <p className="metric-number mt-1 text-xl" style={{ color: style.text }}>
                  {opportunity.probability}%
                </p>
              </div>
              <div className="rounded-lg p-3" style={{ backgroundColor: '#141414' }}>
                <p className="text-[10px] font-medium uppercase" style={{ color: '#7C7C7C', letterSpacing: '0.5px' }}>Weighted</p>
                <p className="metric-number mt-1 text-xl" style={{ color: '#E8E8F0' }}>
                  {opportunity.estimated_value
                    ? formatValue(Math.round(opportunity.estimated_value * opportunity.probability / 100))
                    : 'TBD'}
                </p>
              </div>
              <div className="rounded-lg p-3" style={{ backgroundColor: '#141414' }}>
                <p className="text-[10px] font-medium uppercase" style={{ color: '#7C7C7C', letterSpacing: '0.5px' }}>In stage</p>
                <p className="metric-number mt-1 text-xl" style={{ color: '#E8E8F0' }}>
                  {daysInStage}d
                </p>
              </div>
            </div>

            {/* Details grid */}
            <div className="grid grid-cols-2 gap-x-6 gap-y-3">
              {opportunity.architect_name && (
                <div className="flex items-center gap-2.5">
                  <div className="flex h-7 w-7 items-center justify-center rounded-md" style={{ backgroundColor: 'rgba(99, 102, 241, 0.15)' }}>
                    <User className="h-3.5 w-3.5" style={{ color: '#6366F1' }} />
                  </div>
                  <div>
                    <p className="text-[10px]" style={{ color: '#7C7C7C' }}>Architect</p>
                    {opportunity.architect_id ? (
                      <Link
                        to={`/relationships/${opportunity.architect_id}`}
                        className="text-[13px] font-medium text-primary hover:underline"
                        onClick={onClose}
                      >
                        {opportunity.architect_name}
                      </Link>
                    ) : (
                      <p className="text-[13px] font-medium" style={{ color: '#E8E8F0' }}>{opportunity.architect_name}</p>
                    )}
                  </div>
                </div>
              )}

              {opportunity.source && (
                <div className="flex items-center gap-2.5">
                  <div className="flex h-7 w-7 items-center justify-center rounded-md" style={{ backgroundColor: 'rgba(6, 182, 212, 0.15)' }}>
                    <FileText className="h-3.5 w-3.5" style={{ color: '#06B6D4' }} />
                  </div>
                  <div>
                    <p className="text-[10px]" style={{ color: '#7C7C7C' }}>Source</p>
                    <p className="text-[13px] font-medium" style={{ color: '#E8E8F0' }}>{opportunity.source}</p>
                  </div>
                </div>
              )}

              {opportunity.expected_close_date && (
                <div className="flex items-center gap-2.5">
                  <div className="flex h-7 w-7 items-center justify-center rounded-md" style={{ backgroundColor: 'rgba(245, 158, 11, 0.15)' }}>
                    <Calendar className="h-3.5 w-3.5" style={{ color: '#F59E0B' }} />
                  </div>
                  <div>
                    <p className="text-[10px]" style={{ color: '#7C7C7C' }}>Expected close</p>
                    <p className="text-[13px] font-medium" style={{ color: '#E8E8F0' }}>{formatDate(opportunity.expected_close_date)}</p>
                  </div>
                </div>
              )}

              {opportunity.competitor_names && opportunity.competitor_names.length > 0 && (
                <div className="flex items-center gap-2.5">
                  <div className="flex h-7 w-7 items-center justify-center rounded-md" style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)' }}>
                    <Building2 className="h-3.5 w-3.5" style={{ color: '#EF4444' }} />
                  </div>
                  <div>
                    <p className="text-[10px]" style={{ color: '#7C7C7C' }}>Competitors</p>
                    <p className="text-[13px] font-medium" style={{ color: '#E8E8F0' }}>{opportunity.competitor_names.join(', ')}</p>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-md" style={{ backgroundColor: 'rgba(124, 124, 124, 0.15)' }}>
                  <Clock className="h-3.5 w-3.5" style={{ color: '#7C7C7C' }} />
                </div>
                <div>
                  <p className="text-[10px]" style={{ color: '#7C7C7C' }}>Created</p>
                  <p className="text-[13px] font-medium" style={{ color: '#E8E8F0' }}>{formatDate(opportunity.created_at)}</p>
                </div>
              </div>

              {(opportunity.won_date || opportunity.lost_date) && (
                <div className="flex items-center gap-2.5">
                  <div className="flex h-7 w-7 items-center justify-center rounded-md" style={{ backgroundColor: opportunity.won_date ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)' }}>
                    <Calendar className="h-3.5 w-3.5" style={{ color: opportunity.won_date ? '#22C55E' : '#EF4444' }} />
                  </div>
                  <div>
                    <p className="text-[10px]" style={{ color: '#7C7C7C' }}>{opportunity.won_date ? 'Won date' : 'Lost date'}</p>
                    <p className="text-[13px] font-medium" style={{ color: '#E8E8F0' }}>
                      {formatDate(opportunity.won_date || opportunity.lost_date)}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Linked permit */}
            {linkedPermit && (
              <div className="rounded-lg p-3" style={{ backgroundColor: '#141414', border: '1px solid #2A2A2A' }}>
                <p className="mb-2 text-[10px] font-medium uppercase" style={{ color: '#7C7C7C', letterSpacing: '0.5px' }}>Linked permit</p>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[13px] font-medium" style={{ color: '#E8E8F0' }}>
                      {linkedPermit.permit_number} - {linkedPermit.permit_type}
                    </p>
                    <p className="text-[11px]" style={{ color: '#7C7C7C' }}>
                      {linkedPermit.project_address}
                    </p>
                  </div>
                  {linkedPermit.source_url && (
                    <a
                      href={linkedPermit.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-[11px]"
                      style={{ color: '#6366F1' }}
                    >
                      <ExternalLink className="h-3 w-3" /> View
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Notes */}
            {opportunity.notes && (
              <div>
                <p className="mb-1.5 text-[10px] font-medium uppercase" style={{ color: '#7C7C7C', letterSpacing: '0.5px' }}>Notes</p>
                <p className="whitespace-pre-wrap text-[13px] leading-relaxed" style={{ color: '#E8E8F0' }}>{opportunity.notes}</p>
              </div>
            )}

            {/* Lost reason */}
            {opportunity.stage === 'lost' && opportunity.lost_reason && (
              <div className="rounded-lg p-3" style={{ backgroundColor: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                <p className="mb-1 text-[10px] font-medium uppercase" style={{ color: '#EF4444', letterSpacing: '0.5px' }}>Lost reason</p>
                <p className="text-[13px]" style={{ color: '#E8E8F0' }}>{opportunity.lost_reason}</p>
              </div>
            )}
          </div>
        )}

        {/* Footer actions */}
        <div className="flex items-center justify-between border-t pt-3" style={{ borderColor: '#2A2A2A' }}>
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
          {!editing && (
            <Button size="sm" onClick={() => setEditing(true)} className="gap-1.5">
              <Pencil className="h-3.5 w-3.5" /> Edit details
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
