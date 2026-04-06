import { Link } from 'react-router-dom'
import type { Architect } from '@/types'
import { getInitials, getAvatarColor } from '@/types'
import { StageBadge } from './StageBadge'
import { PulseBar } from './PulseBar'
import { MapPin, Calendar, Briefcase } from 'lucide-react'

interface ArchitectCardProps {
  architect: Architect
}

export function ArchitectCard({ architect }: ArchitectCardProps) {
  const colors = getAvatarColor(architect.name)
  const daysSinceContact = architect.last_contact_date
    ? Math.floor(
        (Date.now() - new Date(architect.last_contact_date).getTime()) / 86400000
      )
    : null

  return (
    <Link
      to={`/crm/${architect.id}`}
      className="flex items-center gap-4 rounded-xl border border-border bg-white p-4 transition-colors hover:bg-muted/30"
      style={{ borderWidth: '0.5px' }}
    >
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-medium"
        style={{ backgroundColor: colors.bg, color: colors.text }}
      >
        {getInitials(architect.name)}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium text-foreground">
            {architect.name}
          </span>
          <StageBadge stage={architect.stage} />
        </div>
        {architect.firm && (
          <span className="truncate text-xs text-muted-foreground">
            {architect.firm}
          </span>
        )}
      </div>

      <div className="flex items-center gap-4">
        {architect.location && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3" />
            <span className="max-w-[100px] truncate">{architect.location}</span>
          </div>
        )}
        {architect.projects_together > 0 && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Briefcase className="h-3 w-3" />
            <span>{architect.projects_together}</span>
          </div>
        )}
        {daysSinceContact !== null && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" />
            <span>{daysSinceContact}d ago</span>
          </div>
        )}
        <PulseBar score={architect.pulse_score} />
      </div>
    </Link>
  )
}
