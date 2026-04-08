import { Link } from 'react-router-dom'
import type { Architect } from '@/types'
import { getInitials, getAvatarColor } from '@/types'
import { StageBadge } from './StageBadge'
import { PulseBar } from './PulseBar'
import { MapPin, Calendar, Briefcase, Globe, Instagram, Trash2, Ban } from 'lucide-react'

interface ArchitectCardProps {
  architect: Architect
  onDelete?: (id: string) => void
  onBlock?: (architect: Architect) => void
}

export function ArchitectCard({ architect, onDelete, onBlock }: ArchitectCardProps) {
  const colors = getAvatarColor(architect.name)
  const daysSinceContact = architect.last_contact_date
    ? Math.floor(
        (Date.now() - new Date(architect.last_contact_date).getTime()) / 86400000
      )
    : null

  return (
    <div
      className="flex items-center gap-4 rounded-xl border border-border bg-[#1A1A24] p-4 transition-colors hover:bg-[#0F0F17]"
      style={{ borderWidth: '0.5px' }}
    >
      <Link
        to={`/crm/${architect.id}`}
        className="flex min-w-0 flex-1 items-center gap-4"
      >
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-medium"
          style={{ backgroundColor: colors.bg, color: colors.text }}
        >
          {getInitials(architect.name)}
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-medium text-[#E8E8F0]">
              {architect.name}
            </span>
            <StageBadge stage={architect.stage} />
          </div>
          <div className="flex items-center gap-2">
            {architect.firm && (
              <span className="truncate text-xs text-muted-foreground">
                {architect.firm}
              </span>
            )}
            <div className="flex items-center gap-1.5">
              {architect.website && (
                <a
                  href={architect.website.startsWith('http') ? architect.website : `https://${architect.website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="text-muted-foreground hover:text-primary"
                  title="Website"
                >
                  <Globe className="h-3 w-3" />
                </a>
              )}
              {architect.instagram_handle && (
                <a
                  href={`https://instagram.com/${architect.instagram_handle.replace('@', '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="text-muted-foreground hover:text-primary"
                  title="Instagram"
                >
                  <Instagram className="h-3 w-3" />
                </a>
              )}
              {architect.linkedin_url && (
                <a
                  href={architect.linkedin_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="text-muted-foreground hover:text-primary"
                  title="LinkedIn"
                >
                  <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                </a>
              )}
            </div>
          </div>
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

      {/* Quick actions */}
      {(onDelete || onBlock) && (
        <div className="flex shrink-0 items-center gap-0.5">
          {onBlock && (
            <button
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                onBlock(architect)
              }}
              className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-[#E8E8F0]"
              title="Block (hide from Radar)"
            >
              <Ban className="h-3.5 w-3.5" />
            </button>
          )}
          {onDelete && (
            <button
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                if (confirm(`Remove ${architect.name} from CRM?`)) {
                  onDelete(architect.id)
                }
              }}
              className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-destructive"
              title="Remove from CRM"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}
    </div>
  )
}
