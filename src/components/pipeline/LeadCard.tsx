import { Link } from 'react-router-dom'
import type { Opportunity } from '@/types'
import { LEAD_STAGE_STYLES, DESIGN_PHASE_SHORT } from '@/types'
import { MapPin, Clock, User, PhoneOutgoing, FileText } from 'lucide-react'

interface LeadCardProps {
  lead: Opportunity
  onClick: () => void
}

function formatValue(v: number): string {
  if (v >= 1000000) return `$${(v / 1000000).toFixed(1)}M`
  if (v >= 1000) return `$${(v / 1000).toFixed(0)}K`
  return `$${v.toLocaleString()}`
}

function daysAgo(date: string): number {
  return Math.floor((Date.now() - new Date(date).getTime()) / 86400000)
}

export function LeadCard({ lead, onClick }: LeadCardProps) {
  const style = LEAD_STAGE_STYLES[lead.stage]
  const days = daysAgo(lead.updated_at)

  return (
    <button
      onClick={onClick}
      className="w-full rounded-lg border border-border bg-[#1C1C1C] p-3 text-left transition-colors hover:bg-[#242424]"
      style={{ borderWidth: '0.5px' }}
    >
      {/* Row 1: Name + Value */}
      <div className="flex items-start justify-between gap-2">
        <span className="text-sm font-medium leading-tight">{lead.project_name}</span>
        {lead.estimated_value ? (
          <span className="shrink-0 text-xs font-medium" style={{ color: '#06B6D4' }}>
            {formatValue(lead.estimated_value)}
          </span>
        ) : null}
      </div>

      {/* Row 2: Architect link */}
      {lead.architect_name && (
        <Link
          to={lead.architect_id ? `/relationships/${lead.architect_id}` : '#'}
          onClick={(e) => e.stopPropagation()}
          className="mt-1 flex items-center gap-1 text-xs text-primary hover:underline"
        >
          <User className="h-2.5 w-2.5" />
          {lead.architect_name}
        </Link>
      )}

      {/* Row 3: Metadata chips */}
      <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
        {/* Design phase chip */}
        {lead.design_phase && (
          <span
            className="rounded px-1.5 py-0.5 text-[9px] font-semibold"
            style={{ backgroundColor: 'rgba(99, 102, 241, 0.15)', color: '#818CF8' }}
          >
            {DESIGN_PHASE_SHORT[lead.design_phase]}
          </span>
        )}

        {/* Outreach attempts badge (cold leads) */}
        {lead.stage === 'cold_lead' && lead.outreach_attempts > 0 && (
          <span
            className="flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[9px] font-medium"
            style={{ backgroundColor: 'rgba(124, 124, 150, 0.2)', color: '#A3A3A3' }}
            title={`${lead.outreach_attempts} outreach attempt${lead.outreach_attempts !== 1 ? 's' : ''}`}
          >
            <PhoneOutgoing className="h-2 w-2" />
            {lead.outreach_attempts}x
          </span>
        )}

        {/* Budget revision badge (preliminary budget) */}
        {lead.stage === 'preliminary_budget' && lead.budget_revision > 0 && (
          <span
            className="flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[9px] font-medium"
            style={{ backgroundColor: 'rgba(129, 140, 248, 0.15)', color: '#A5B4FC' }}
            title={`Budget revision ${lead.budget_revision}`}
          >
            <FileText className="h-2 w-2" />
            Rev {lead.budget_revision}
          </span>
        )}

        {/* Location */}
        {lead.location && (
          <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
            <MapPin className="h-2.5 w-2.5" />
            {lead.location.length > 18 ? lead.location.slice(0, 18) + '...' : lead.location}
          </span>
        )}

        {/* Days since update */}
        <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground ml-auto">
          <Clock className="h-2.5 w-2.5" />
          {days}d
        </span>

        {/* Probability */}
        <span
          className="rounded-full px-1.5 py-0.5 text-[9px] font-medium"
          style={{ backgroundColor: style.bg, color: style.text }}
        >
          {lead.probability}%
        </span>
      </div>
    </button>
  )
}
