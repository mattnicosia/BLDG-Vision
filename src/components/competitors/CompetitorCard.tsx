import { Link } from 'react-router-dom'
import type { Competitor } from '@/types'
import { getInitials, getAvatarColor } from '@/types'
import { MapPin, Globe, Trash2, Instagram } from 'lucide-react'

function getDisplacementColor(score: number): string {
  if (score >= 70) return '#A32D2D'
  if (score >= 40) return '#BA7517'
  return '#0F6E56'
}

interface CompetitorCardProps {
  competitor: Competitor
  onDelete?: (id: string) => void
}

export function CompetitorCard({ competitor, onDelete }: CompetitorCardProps) {
  const colors = getAvatarColor(competitor.name)
  const dColor = getDisplacementColor(competitor.displacement_score)

  return (
    <div
      className="flex items-center gap-4 rounded-xl border border-border bg-[#1C1C1C] p-4 transition-colors hover:bg-[#0F0F0F]"
      style={{ borderWidth: '0.5px' }}
    >
      <Link
        to={`/competitors/${competitor.id}`}
        className="flex min-w-0 flex-1 items-center gap-4"
      >
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-medium"
          style={{ backgroundColor: colors.bg, color: colors.text }}
        >
          {getInitials(competitor.name)}
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="truncate text-sm font-medium text-[#E8E8F0]">
            {competitor.name}
          </span>
          <div className="flex items-center gap-2">
            {competitor.location && (
              <span className="truncate text-xs text-muted-foreground">
                {competitor.location}
              </span>
            )}
            <div className="flex items-center gap-1.5">
              {competitor.website && (
                <a
                  href={competitor.website.startsWith('http') ? competitor.website : `https://${competitor.website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="text-muted-foreground hover:text-primary"
                  title="Website"
                >
                  <Globe className="h-3 w-3" />
                </a>
              )}
              {competitor.instagram_handle && (
                <a
                  href={`https://instagram.com/${competitor.instagram_handle.replace('@', '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="text-muted-foreground hover:text-primary"
                  title="Instagram"
                >
                  <Instagram className="h-3 w-3" />
                </a>
              )}
            </div>
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

      {onDelete && (
        <button
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            if (confirm(`Remove ${competitor.name} from competitors?`)) {
              onDelete(competitor.id)
            }
          }}
          className="shrink-0 rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-destructive"
          title="Remove competitor"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  )
}
