import { Link } from 'react-router-dom'
import type { Architect, Signal, AIDraft } from '@/types'
import { getPulseColor } from '@/lib/pulse'
import { Button } from '@/components/ui/button'
import { Sparkles, AlertTriangle, Zap, Clock, User, Handshake, UserPlus, Globe } from 'lucide-react'

interface AISuggestionsProps {
  architects: Architect[]
  sentDrafts: AIDraft[]
  signals: Signal[]
  onGenerateDraft: (architect: Architect, reason: string) => void
  onCreateCampaign: (architect: Architect) => void
}

function daysAgo(date: string): number {
  return Math.floor((Date.now() - new Date(date).getTime()) / 86400000)
}

type RelationshipStatus = 'worked_together' | 'contacted' | 'never_contacted'

function getRelationshipStatus(arch: Architect, sentDrafts: AIDraft[]): RelationshipStatus {
  if (arch.projects_together > 0) return 'worked_together'
  const hasSent = sentDrafts.some((d) => d.architect_id === arch.id && d.outcome === 'sent')
  if (hasSent || arch.last_contact_date) return 'contacted'
  return 'never_contacted'
}

const RELATIONSHIP_LABELS: Record<RelationshipStatus, { label: string; bg: string; text: string }> = {
  worked_together: { label: 'Built together', bg: '#E1F5EE', text: '#085041' },
  contacted: { label: 'Previously contacted', bg: '#FAEEDA', text: '#854F0B' },
  never_contacted: { label: 'New contact', bg: '#EEEDFE', text: '#3C3489' },
}

export function AISuggestions({ architects, sentDrafts, signals, onGenerateDraft, onCreateCampaign }: AISuggestionsProps) {
  // Cooling relationships
  const cooling = architects
    .filter((a) => a.pulse_score < 50 && a.email)
    .sort((a, b) => a.pulse_score - b.pulse_score)
    .slice(0, 5)

  // Signal opportunities
  const signalOpps = signals
    .filter((s) => !s.actioned_at && !s.dismissed_at && s.architect_id)
    .slice(0, 5)
    .map((s) => ({ signal: s, architect: architects.find((a) => a.id === s.architect_id) }))
    .filter((s) => s.architect)

  // Follow-up needed
  const followUps = sentDrafts
    .filter((d) => d.outcome === 'sent' && d.sent_at && daysAgo(d.sent_at) > 5 && d.architect_id)
    .slice(0, 5)
    .map((d) => ({ draft: d, architect: architects.find((a) => a.id === d.architect_id) }))
    .filter((f) => f.architect)

  // Content-based personalization hooks
  const contentHooks = architects
    .filter((a) => a.email && (a.awards || a.style || a.website) && a.pulse_score < 70)
    .sort(() => Math.random() - 0.5)
    .slice(0, 5)
    .map((arch) => {
      let hook = ''
      if (arch.awards) hook = `Congratulate on: ${arch.awards}`
      else if (arch.style) hook = `Reference their style: ${arch.style}`
      else if (arch.website) hook = `Mention their recent work (check website)`
      return { architect: arch, hook }
    })
    .filter((h) => h.hook)

  // New prospects
  const newProspects = architects
    .filter((a) => a.email && getRelationshipStatus(a, sentDrafts) === 'never_contacted')
    .slice(0, 5)

  const hasAny = cooling.length > 0 || signalOpps.length > 0 || followUps.length > 0 || contentHooks.length > 0 || newProspects.length > 0

  if (!hasAny) {
    return (
      <div className="flex h-48 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border">
        <Sparkles className="h-8 w-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">All caught up! No outreach suggestions right now.</p>
      </div>
    )
  }

  function renderCard(arch: Architect, reason: string, icon: React.ReactNode) {
    const status = getRelationshipStatus(arch, sentDrafts)
    const relStyle = RELATIONSHIP_LABELS[status]
    return (
      <div key={arch.id + reason} className="flex items-center justify-between rounded-xl border border-border bg-[#1C1C1C] p-3" style={{ borderWidth: '0.5px' }}>
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {icon}
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Link to={`/relationships/${arch.id}`} className="text-sm font-medium text-primary hover:underline truncate">{arch.name}</Link>
              <span className="shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-medium" style={{ backgroundColor: relStyle.bg, color: relStyle.text }}>{relStyle.label}</span>
            </div>
            <p className="text-[10px] text-muted-foreground truncate">{reason}</p>
          </div>
        </div>
        <div className="ml-2 flex shrink-0 gap-1">
          <Button variant="outline" size="sm" onClick={() => onGenerateDraft(arch, reason)} className="gap-1">
            <Sparkles className="h-3 w-3" /> Draft
          </Button>
          <Button variant="ghost" size="sm" onClick={() => onCreateCampaign(arch)} title="Start campaign">
            <Zap className="h-3 w-3" />
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {cooling.length > 0 && (
        <div>
          <h3 className="mb-2 flex items-center gap-2 text-sm font-medium">
            <AlertTriangle className="h-4 w-4" style={{ color: '#F59E0B' }} /> Relationships cooling
          </h3>
          <div className="flex flex-col gap-2">
            {cooling.map((arch) => {
              const days = arch.last_contact_date ? daysAgo(arch.last_contact_date) : null
              return renderCard(arch, `Pulse ${arch.pulse_score} ${days !== null ? `/ ${days}d since contact` : '/ never contacted'}`,
                <div className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: getPulseColor(arch.pulse_score) }} />)
            })}
          </div>
        </div>
      )}

      {contentHooks.length > 0 && (
        <div>
          <h3 className="mb-2 flex items-center gap-2 text-sm font-medium">
            <Globe className="h-4 w-4" style={{ color: '#3C3489' }} /> Personalization hooks
          </h3>
          <p className="mb-2 text-xs text-muted-foreground">Mention something specific to make your outreach stand out</p>
          <div className="flex flex-col gap-2">
            {contentHooks.map(({ architect, hook }) => renderCard(architect, hook, <Sparkles className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />))}
          </div>
        </div>
      )}

      {newProspects.length > 0 && (
        <div>
          <h3 className="mb-2 flex items-center gap-2 text-sm font-medium">
            <UserPlus className="h-4 w-4" style={{ color: '#06B6D4' }} /> New prospects
          </h3>
          <div className="flex flex-col gap-2">
            {newProspects.map((arch) => renderCard(arch, `${arch.firm || 'Independent'} / ${arch.location || 'Location unknown'}`, <User className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />))}
          </div>
        </div>
      )}

      {signalOpps.length > 0 && (
        <div>
          <h3 className="mb-2 flex items-center gap-2 text-sm font-medium">
            <Zap className="h-4 w-4" style={{ color: '#06B6D4' }} /> Signal opportunities
          </h3>
          <div className="flex flex-col gap-2">
            {signalOpps.map(({ signal, architect }) => renderCard(architect!, signal.headline,
              <div className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: signal.priority === 'high' ? '#EF4444' : '#F59E0B' }} />))}
          </div>
        </div>
      )}

      {followUps.length > 0 && (
        <div>
          <h3 className="mb-2 flex items-center gap-2 text-sm font-medium">
            <Clock className="h-4 w-4" style={{ color: '#7C7C7C' }} /> Follow-up needed
          </h3>
          <div className="flex flex-col gap-2">
            {followUps.map(({ draft, architect }) => renderCard(architect!, `Sent "${draft.subject || 'outreach'}" ${draft.sent_at ? `${daysAgo(draft.sent_at)}d ago` : ''}`,
              <Handshake className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />))}
          </div>
        </div>
      )}
    </div>
  )
}
