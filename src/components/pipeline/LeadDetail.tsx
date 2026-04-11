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
import { usePipelineStages } from '@/hooks/usePipelineStages'
import { supabase } from '@/lib/supabase'
import type { Opportunity, DesignPhase, Permit } from '@/types'
import { DESIGN_PHASE_LABELS } from '@/types'
import {
  User, Trash2, MapPin, DollarSign, Calendar, FileText,
  Building2, Pencil, Check, X, ExternalLink, Clock,
  PhoneOutgoing, Ruler, Home, UserCircle,
} from 'lucide-react'

const DESIGN_PHASES: DesignPhase[] = ['PD', 'SD', 'DD', 'CD', 'PER']

function formatValue(v: number): string {
  if (v >= 1000000) return `$${(v / 1000000).toFixed(1)}M`
  if (v >= 1000) return `$${(v / 1000).toFixed(0)}K`
  return `$${v.toLocaleString()}`
}

function formatDate(d?: string): string {
  if (!d) return ''
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

interface LeadDetailProps {
  lead: Opportunity
  open: boolean
  onClose: () => void
  onUpdate: (id: string, updates: Partial<Opportunity>) => void
  onAdvance: (id: string, stage: LeadStatus) => void
  onRecordOutreach: (id: string) => void
  onRecordRevision: (id: string) => void
  onDelete: (id: string) => void
}

export function LeadDetail({
  lead, open, onClose, onUpdate, onAdvance,
  onRecordOutreach, onRecordRevision, onDelete,
}: LeadDetailProps) {
  const { architects } = useArchitects()
  const { allKeys, labelMap, styleMap } = usePipelineStages()
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
  const [designPhase, setDesignPhase] = useState<DesignPhase | ''>('')
  const [clientName, setClientName] = useState('')
  const [clientEmail, setClientEmail] = useState('')
  const [clientPhone, setClientPhone] = useState('')
  const [sf, setSf] = useState('')
  const [projectType, setProjectType] = useState('')
  const [onHoldReason, setOnHoldReason] = useState('')
  const [redesignNotes, setRedesignNotes] = useState('')
  const [cancelledReason, setCancelledReason] = useState('')

  useEffect(() => {
    setProjectName(lead.project_name)
    setLocation(lead.location ?? '')
    setEstimatedValue(lead.estimated_value?.toString() ?? '')
    setArchitectId(lead.architect_id ?? '')
    setNotes(lead.notes ?? '')
    setExpectedClose(lead.expected_close_date ?? '')
    setSource(lead.source ?? '')
    setLostReason(lead.lost_reason ?? '')
    setDesignPhase(lead.design_phase ?? '')
    setClientName(lead.client_name ?? '')
    setClientEmail(lead.client_email ?? '')
    setClientPhone(lead.client_phone ?? '')
    setSf(lead.sf?.toString() ?? '')
    setProjectType(lead.project_type ?? '')
    setOnHoldReason(lead.on_hold_reason ?? '')
    setRedesignNotes(lead.redesign_notes ?? '')
    setCancelledReason(lead.cancelled_reason ?? '')
    setEditing(false)

    if (lead.permit_id) {
      supabase
        .from('permits')
        .select('*')
        .eq('id', lead.permit_id)
        .single()
        .then(({ data }) => { if (data) setLinkedPermit(data) })
    } else {
      setLinkedPermit(null)
    }
  }, [lead])

  function handleSave() {
    const arch = architects.find((a) => a.id === architectId)
    onUpdate(lead.id, {
      project_name: projectName,
      location: location || undefined,
      estimated_value: parseInt(estimatedValue) || undefined,
      architect_id: architectId || undefined,
      architect_name: arch?.name || lead.architect_name,
      notes: notes || undefined,
      expected_close_date: expectedClose || undefined,
      source: source || undefined,
      lost_reason: lostReason || undefined,
      design_phase: (designPhase as DesignPhase) || undefined,
      client_name: clientName || undefined,
      client_email: clientEmail || undefined,
      client_phone: clientPhone || undefined,
      sf: parseInt(sf) || undefined,
      project_type: projectType || undefined,
      on_hold_reason: onHoldReason || undefined,
      redesign_notes: redesignNotes || undefined,
      cancelled_reason: cancelledReason || undefined,
    })
    setEditing(false)
  }

  const style = styleMap[lead.stage as string] ?? { bg: 'rgba(124,124,150,0.15)', text: '#7C7C7C' }
  const daysInStage = Math.floor((Date.now() - new Date(lead.updated_at).getTime()) / 86400000)

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="!max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div>
              <DialogTitle className="text-lg">{lead.project_name}</DialogTitle>
              <div className="mt-0.5 flex items-center gap-2">
                {lead.location && (
                  <p className="flex items-center gap-1 text-[13px]" style={{ color: '#7C7C7C' }}>
                    <MapPin className="h-3 w-3" /> {lead.location}
                  </p>
                )}
                {lead.design_phase && (
                  <span
                    className="rounded px-1.5 py-0.5 text-[10px] font-semibold"
                    style={{ backgroundColor: 'rgba(99, 102, 241, 0.15)', color: '#818CF8' }}
                  >
                    {lead.design_phase}
                  </span>
                )}
              </div>
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
          {allKeys.map((s) => {
            const sStyle = styleMap[s] ?? { bg: 'rgba(124,124,150,0.15)', text: '#7C7C7C' }
            const isActive = lead.stage === s
            return (
              <button
                key={s}
                onClick={() => onAdvance(lead.id, s as any)}
                className="rounded-full px-2.5 py-1 text-[10px] font-semibold transition-all"
                style={{
                  backgroundColor: isActive ? sStyle.bg : 'transparent',
                  color: isActive ? sStyle.text : '#7C7C7C',
                  border: `1px solid ${isActive ? sStyle.text + '40' : '#2A2A2A'}`,
                }}
              >
                {labelMap[s] ?? s}
              </button>
            )
          })}
        </div>

        {/* Quick actions for current stage */}
        {!editing && (
          <div className="flex items-center gap-2">
            {lead.stage === 'cold_lead' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onRecordOutreach(lead.id)}
                className="gap-1.5 text-xs"
              >
                <PhoneOutgoing className="h-3 w-3" />
                Log outreach ({lead.outreach_attempts ?? 0})
              </Button>
            )}
            {lead.stage === 'preliminary_budget' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onRecordRevision(lead.id)}
                className="gap-1.5 text-xs"
              >
                <FileText className="h-3 w-3" />
                New revision ({lead.budget_revision ?? 0})
              </Button>
            )}
          </div>
        )}

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
                <label className="text-[11px] font-medium" style={{ color: '#7C7C7C' }}>Design phase</label>
                <select
                  value={designPhase}
                  onChange={(e) => setDesignPhase(e.target.value as DesignPhase | '')}
                  className="rounded-md border border-border px-3 py-2 text-sm"
                  style={{ backgroundColor: '#141414', borderColor: '#2A2A2A', color: '#E8E8F0' }}
                >
                  <option value="">Unknown</option>
                  {DESIGN_PHASES.map((p) => (
                    <option key={p} value={p}>{p} - {DESIGN_PHASE_LABELS[p]}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
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
                <label className="text-[11px] font-medium" style={{ color: '#7C7C7C' }}>Source</label>
                <Input value={source} onChange={(e) => setSource(e.target.value)} placeholder="Board meeting, permit, referral" />
              </div>
            </div>

            {/* Client info */}
            <p className="text-[10px] font-medium uppercase mt-1" style={{ color: '#7C7C7C', letterSpacing: '0.5px' }}>Client</p>
            <div className="grid grid-cols-3 gap-3">
              <Input value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Client name" />
              <Input value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} placeholder="Email" />
              <Input value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} placeholder="Phone" />
            </div>

            {/* Project details */}
            <div className="grid grid-cols-2 gap-3">
              <Input value={projectType} onChange={(e) => setProjectType(e.target.value)} placeholder="Project type" />
              <Input type="number" value={sf} onChange={(e) => setSf(e.target.value)} placeholder="Square footage" />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-medium" style={{ color: '#7C7C7C' }}>Notes</label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
            </div>

            {/* Stage-specific fields */}
            {lead.stage === 'lost' && (
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-medium" style={{ color: '#7C7C7C' }}>Lost reason</label>
                <Input value={lostReason} onChange={(e) => setLostReason(e.target.value)} />
              </div>
            )}
            {lead.stage === 'on_hold' && (
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-medium" style={{ color: '#7C7C7C' }}>On hold reason</label>
                <Input value={onHoldReason} onChange={(e) => setOnHoldReason(e.target.value)} />
              </div>
            )}
            {lead.stage === 'redesign' && (
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-medium" style={{ color: '#7C7C7C' }}>Redesign notes</label>
                <Input value={redesignNotes} onChange={(e) => setRedesignNotes(e.target.value)} />
              </div>
            )}
            {lead.stage === 'cancelled' && (
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-medium" style={{ color: '#7C7C7C' }}>Cancelled reason</label>
                <Input value={cancelledReason} onChange={(e) => setCancelledReason(e.target.value)} />
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
                  {lead.estimated_value ? formatValue(lead.estimated_value) : 'TBD'}
                </p>
              </div>
              <div className="rounded-lg p-3" style={{ backgroundColor: '#141414' }}>
                <p className="text-[10px] font-medium uppercase" style={{ color: '#7C7C7C', letterSpacing: '0.5px' }}>Probability</p>
                <p className="metric-number mt-1 text-xl" style={{ color: style.text }}>
                  {lead.probability}%
                </p>
              </div>
              <div className="rounded-lg p-3" style={{ backgroundColor: '#141414' }}>
                <p className="text-[10px] font-medium uppercase" style={{ color: '#7C7C7C', letterSpacing: '0.5px' }}>Weighted</p>
                <p className="metric-number mt-1 text-xl" style={{ color: '#E8E8F0' }}>
                  {lead.estimated_value
                    ? formatValue(Math.round(lead.estimated_value * lead.probability / 100))
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
              {lead.architect_name && (
                <div className="flex items-center gap-2.5">
                  <div className="flex h-7 w-7 items-center justify-center rounded-md" style={{ backgroundColor: 'rgba(99, 102, 241, 0.15)' }}>
                    <User className="h-3.5 w-3.5" style={{ color: '#6366F1' }} />
                  </div>
                  <div>
                    <p className="text-[10px]" style={{ color: '#7C7C7C' }}>Architect</p>
                    {lead.architect_id ? (
                      <Link
                        to={`/relationships/${lead.architect_id}`}
                        className="text-[13px] font-medium text-primary hover:underline"
                        onClick={onClose}
                      >
                        {lead.architect_name}
                      </Link>
                    ) : (
                      <p className="text-[13px] font-medium" style={{ color: '#E8E8F0' }}>{lead.architect_name}</p>
                    )}
                  </div>
                </div>
              )}

              {lead.client_name && (
                <div className="flex items-center gap-2.5">
                  <div className="flex h-7 w-7 items-center justify-center rounded-md" style={{ backgroundColor: 'rgba(34, 197, 94, 0.15)' }}>
                    <UserCircle className="h-3.5 w-3.5" style={{ color: '#22C55E' }} />
                  </div>
                  <div>
                    <p className="text-[10px]" style={{ color: '#7C7C7C' }}>Client</p>
                    <p className="text-[13px] font-medium" style={{ color: '#E8E8F0' }}>{lead.client_name}</p>
                  </div>
                </div>
              )}

              {lead.design_phase && (
                <div className="flex items-center gap-2.5">
                  <div className="flex h-7 w-7 items-center justify-center rounded-md" style={{ backgroundColor: 'rgba(129, 140, 248, 0.15)' }}>
                    <Ruler className="h-3.5 w-3.5" style={{ color: '#818CF8' }} />
                  </div>
                  <div>
                    <p className="text-[10px]" style={{ color: '#7C7C7C' }}>Design phase</p>
                    <p className="text-[13px] font-medium" style={{ color: '#E8E8F0' }}>
                      {lead.design_phase} - {DESIGN_PHASE_LABELS[lead.design_phase]}
                    </p>
                  </div>
                </div>
              )}

              {lead.project_type && (
                <div className="flex items-center gap-2.5">
                  <div className="flex h-7 w-7 items-center justify-center rounded-md" style={{ backgroundColor: 'rgba(6, 182, 212, 0.15)' }}>
                    <Home className="h-3.5 w-3.5" style={{ color: '#06B6D4' }} />
                  </div>
                  <div>
                    <p className="text-[10px]" style={{ color: '#7C7C7C' }}>Project type</p>
                    <p className="text-[13px] font-medium" style={{ color: '#E8E8F0' }}>{lead.project_type}</p>
                  </div>
                </div>
              )}

              {lead.sf && (
                <div className="flex items-center gap-2.5">
                  <div className="flex h-7 w-7 items-center justify-center rounded-md" style={{ backgroundColor: 'rgba(168, 85, 247, 0.15)' }}>
                    <Ruler className="h-3.5 w-3.5" style={{ color: '#A855F7' }} />
                  </div>
                  <div>
                    <p className="text-[10px]" style={{ color: '#7C7C7C' }}>Size</p>
                    <p className="text-[13px] font-medium" style={{ color: '#E8E8F0' }}>{lead.sf.toLocaleString()} SF</p>
                  </div>
                </div>
              )}

              {lead.source && (
                <div className="flex items-center gap-2.5">
                  <div className="flex h-7 w-7 items-center justify-center rounded-md" style={{ backgroundColor: 'rgba(6, 182, 212, 0.15)' }}>
                    <FileText className="h-3.5 w-3.5" style={{ color: '#06B6D4' }} />
                  </div>
                  <div>
                    <p className="text-[10px]" style={{ color: '#7C7C7C' }}>Source</p>
                    <p className="text-[13px] font-medium" style={{ color: '#E8E8F0' }}>{lead.source}</p>
                  </div>
                </div>
              )}

              {lead.expected_close_date && (
                <div className="flex items-center gap-2.5">
                  <div className="flex h-7 w-7 items-center justify-center rounded-md" style={{ backgroundColor: 'rgba(245, 158, 11, 0.15)' }}>
                    <Calendar className="h-3.5 w-3.5" style={{ color: '#F59E0B' }} />
                  </div>
                  <div>
                    <p className="text-[10px]" style={{ color: '#7C7C7C' }}>Expected close</p>
                    <p className="text-[13px] font-medium" style={{ color: '#E8E8F0' }}>{formatDate(lead.expected_close_date)}</p>
                  </div>
                </div>
              )}

              {lead.competitor_names && lead.competitor_names.length > 0 && (
                <div className="flex items-center gap-2.5">
                  <div className="flex h-7 w-7 items-center justify-center rounded-md" style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)' }}>
                    <Building2 className="h-3.5 w-3.5" style={{ color: '#EF4444' }} />
                  </div>
                  <div>
                    <p className="text-[10px]" style={{ color: '#7C7C7C' }}>Competitors</p>
                    <p className="text-[13px] font-medium" style={{ color: '#E8E8F0' }}>{lead.competitor_names.join(', ')}</p>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-md" style={{ backgroundColor: 'rgba(124, 124, 124, 0.15)' }}>
                  <Clock className="h-3.5 w-3.5" style={{ color: '#7C7C7C' }} />
                </div>
                <div>
                  <p className="text-[10px]" style={{ color: '#7C7C7C' }}>Created</p>
                  <p className="text-[13px] font-medium" style={{ color: '#E8E8F0' }}>{formatDate(lead.created_at)}</p>
                </div>
              </div>

              {(lead.awarded_date || lead.won_date || lead.lost_date) && (
                <div className="flex items-center gap-2.5">
                  <div className="flex h-7 w-7 items-center justify-center rounded-md" style={{ backgroundColor: (lead.awarded_date || lead.won_date) ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)' }}>
                    <Calendar className="h-3.5 w-3.5" style={{ color: (lead.awarded_date || lead.won_date) ? '#22C55E' : '#EF4444' }} />
                  </div>
                  <div>
                    <p className="text-[10px]" style={{ color: '#7C7C7C' }}>{(lead.awarded_date || lead.won_date) ? 'Awarded date' : 'Lost date'}</p>
                    <p className="text-[13px] font-medium" style={{ color: '#E8E8F0' }}>
                      {formatDate(lead.awarded_date || lead.won_date || lead.lost_date)}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Stage-specific info panels */}
            {lead.stage === 'cold_lead' && (lead.outreach_attempts ?? 0) > 0 && (
              <div className="rounded-lg p-3" style={{ backgroundColor: '#141414', border: '1px solid #2A2A2A' }}>
                <p className="mb-1 text-[10px] font-medium uppercase" style={{ color: '#7C7C7C', letterSpacing: '0.5px' }}>Outreach history</p>
                <p className="text-[13px]" style={{ color: '#E8E8F0' }}>
                  {lead.outreach_attempts} attempt{lead.outreach_attempts !== 1 ? 's' : ''}
                  {lead.last_outreach_date && ` (last: ${formatDate(lead.last_outreach_date)})`}
                </p>
              </div>
            )}

            {lead.stage === 'preliminary_budget' && (lead.budget_revision ?? 0) > 0 && (
              <div className="rounded-lg p-3" style={{ backgroundColor: '#141414', border: '1px solid #2A2A2A' }}>
                <p className="mb-1 text-[10px] font-medium uppercase" style={{ color: '#7C7C7C', letterSpacing: '0.5px' }}>Budget revisions</p>
                <p className="text-[13px]" style={{ color: '#E8E8F0' }}>
                  Currently on revision {lead.budget_revision}
                </p>
              </div>
            )}

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
            {lead.notes && (
              <div>
                <p className="mb-1.5 text-[10px] font-medium uppercase" style={{ color: '#7C7C7C', letterSpacing: '0.5px' }}>Notes</p>
                <p className="whitespace-pre-wrap text-[13px] leading-relaxed" style={{ color: '#E8E8F0' }}>{lead.notes}</p>
              </div>
            )}

            {/* End state reasons */}
            {lead.stage === 'lost' && lead.lost_reason && (
              <div className="rounded-lg p-3" style={{ backgroundColor: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                <p className="mb-1 text-[10px] font-medium uppercase" style={{ color: '#EF4444', letterSpacing: '0.5px' }}>Lost reason</p>
                <p className="text-[13px]" style={{ color: '#E8E8F0' }}>{lead.lost_reason}</p>
              </div>
            )}
            {lead.stage === 'on_hold' && lead.on_hold_reason && (
              <div className="rounded-lg p-3" style={{ backgroundColor: 'rgba(163, 163, 163, 0.08)', border: '1px solid rgba(163, 163, 163, 0.2)' }}>
                <p className="mb-1 text-[10px] font-medium uppercase" style={{ color: '#A3A3A3', letterSpacing: '0.5px' }}>On hold reason</p>
                <p className="text-[13px]" style={{ color: '#E8E8F0' }}>{lead.on_hold_reason}</p>
              </div>
            )}
            {lead.stage === 'redesign' && lead.redesign_notes && (
              <div className="rounded-lg p-3" style={{ backgroundColor: 'rgba(217, 119, 6, 0.08)', border: '1px solid rgba(217, 119, 6, 0.2)' }}>
                <p className="mb-1 text-[10px] font-medium uppercase" style={{ color: '#D97706', letterSpacing: '0.5px' }}>Redesign notes</p>
                <p className="text-[13px]" style={{ color: '#E8E8F0' }}>{lead.redesign_notes}</p>
              </div>
            )}
            {lead.stage === 'cancelled' && lead.cancelled_reason && (
              <div className="rounded-lg p-3" style={{ backgroundColor: 'rgba(107, 114, 128, 0.08)', border: '1px solid rgba(107, 114, 128, 0.2)' }}>
                <p className="mb-1 text-[10px] font-medium uppercase" style={{ color: '#6B7280', letterSpacing: '0.5px' }}>Cancelled reason</p>
                <p className="text-[13px]" style={{ color: '#E8E8F0' }}>{lead.cancelled_reason}</p>
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
              if (confirm(`Delete ${lead.project_name}?`)) {
                onDelete(lead.id)
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
