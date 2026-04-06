import { Link } from 'react-router-dom'
import type { Competitor } from '@/types'
import { getInitials, getAvatarColor } from '@/types'
import { MapPin, Globe } from 'lucide-react'

function getDisplacementColor(score: number): string {
  if (score >= 70) return '#A32D2D'
  if (score >= 40) return '#BA7517'
  return '#0F6E56'
}

export function CompetitorCard({ competitor }: { competitor: Competitor }) {
  const colors = getAvatarColor(competitor.name)
  const dColor = getDisplacementColor(competitor.displacement_score)

  return (
    <Link
      to={`/competitors/${competitor.id}`}
      className="flex items-center gap-4 rounded-xl border border-border bg-white p-4 transition-colors hover:bg-muted/30"
      style={{ borderWidth: '0.5px' }}
    >
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-medium"
        style={{ backgroundColor: colors.bg, color: colors.text }}
      >
        {getInitials(competitor.name)}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="truncate text-sm font-medium text-foreground">
          {competitor.name}
        </span>
        <div className="flex items-center gap-3">
          {competitor.location && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3" /> {competitor.location}
            </div>
          )}
          {competitor.website && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Globe className="h-3 w-3" /> Website
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col items-end gap-1">
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${competitor.displacement_score}%`,
                backgroundColor: dColor,
              }}
            />
          </div>
          <span className="text-xs font-medium" style={{ color: dColor }}>
            {competitor.displacement_score}
          </span>
        </div>
        <span className="text-[10px] text-muted-foreground">Displacement</span>
      </div>
    </Link>
  )
}
