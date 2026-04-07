import { Link } from 'react-router-dom'
import type { Opportunity } from '@/types'
import { OPPORTUNITY_STAGE_STYLES } from '@/types'
import { MapPin, DollarSign, Clock, User } from 'lucide-react'

interface OpportunityCardProps {
  opportunity: Opportunity
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

export function OpportunityCard({ opportunity, onClick }: OpportunityCardProps) {
  const style = OPPORTUNITY_STAGE_STYLES[opportunity.stage]
  const days = daysAgo(opportunity.updated_at)

  return (
    <button
      onClick={onClick}
      className="w-full rounded-lg border border-border bg-white p-3 text-left transition-colors hover:bg-muted/30"
      style={{ borderWidth: '0.5px' }}
    >
      <div className="flex items-start justify-between">
        <span className="text-sm font-medium leading-tight">{opportunity.project_name}</span>
        {opportunity.estimated_value ? (
          <span className="shrink-0 text-xs font-medium" style={{ color: '#0F6E56' }}>
            {formatValue(opportunity.estimated_value)}
          </span>
        ) : null}
      </div>

      {opportunity.architect_name && (
        <Link
          to={opportunity.architect_id ? `/crm/${opportunity.architect_id}` : '#'}
          onClick={(e) => e.stopPropagation()}
          className="mt-1 flex items-center gap-1 text-xs text-primary hover:underline"
        >
          <User className="h-2.5 w-2.5" />
          {opportunity.architect_name}
        </Link>
      )}

      <div className="mt-1.5 flex items-center gap-2">
        {opportunity.location && (
          <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
            <MapPin className="h-2.5 w-2.5" />
            {opportunity.location.length > 20 ? opportunity.location.slice(0, 20) + '...' : opportunity.location}
          </span>
        )}
        <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
          <Clock className="h-2.5 w-2.5" />
          {days}d
        </span>
        <span
          className="ml-auto rounded-full px-1.5 py-0.5 text-[9px] font-medium"
          style={{ backgroundColor: style.bg, color: style.text }}
        >
          {opportunity.probability}%
        </span>
      </div>
    </button>
  )
}
