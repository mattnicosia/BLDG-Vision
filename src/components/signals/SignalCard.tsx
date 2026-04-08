import type { Signal } from '@/types'
import { Button } from '@/components/ui/button'
import { Check, X, ExternalLink } from 'lucide-react'

const PRIORITY_COLORS = {
  high: '#A32D2D',
  medium: '#BA7517',
  low: '#0F6E56',
}

const TYPE_LABELS: Record<string, string> = {
  new_permit: 'Permit',
  new_post: 'Social',
  new_review: 'Review',
  award: 'Award',
  publication: 'Publication',
  website_update: 'Website',
  job_posting: 'Job',
  lien_filed: 'Lien',
  stop_work: 'Stop Work',
  project_anniversary: 'Anniversary',
  opportunity: 'Opportunity',
  planning_board: 'Planning',
}

function timeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime()
  const hours = Math.floor(diff / 3600000)
  if (hours < 1) return 'Just now'
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  return `${Math.floor(days / 30)}mo ago`
}

interface SignalCardProps {
  signal: Signal
  onAction: (id: string) => void
  onDismiss: (id: string) => void
}

export function SignalCard({ signal, onAction, onDismiss }: SignalCardProps) {
  const isActioned = !!signal.actioned_at
  const isDismissed = !!signal.dismissed_at

  return (
    <div
      className="flex items-start gap-3 rounded-xl border border-border bg-[#1C1C1C] p-4"
      style={{
        borderWidth: '0.5px',
        opacity: isDismissed ? 0.5 : 1,
      }}
    >
      <div
        className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
        style={{ backgroundColor: PRIORITY_COLORS[signal.priority] }}
      />

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-center gap-2">
          <span
            className="rounded-full px-2 py-0.5 text-[10px] font-medium"
            style={{
              backgroundColor:
                signal.priority === 'high'
                  ? '#FEE2E2'
                  : signal.priority === 'medium'
                    ? '#FAEEDA'
                    : '#E1F5EE',
              color: PRIORITY_COLORS[signal.priority],
            }}
          >
            {TYPE_LABELS[signal.type] ?? signal.type}
          </span>
          <span className="truncate text-sm font-medium text-[#E8E8F0]">
            {signal.headline}
          </span>
        </div>
        {signal.detail && (
          <p className="line-clamp-2 text-xs text-muted-foreground">
            {signal.detail}
          </p>
        )}
        <div className="flex items-center gap-3">
          {signal.source_url && (
            <a
              href={signal.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-primary hover:underline"
            >
              <ExternalLink className="h-3 w-3" />
              {signal.source ?? 'Source'}
            </a>
          )}
          <span className="text-xs text-muted-foreground">
            {timeAgo(signal.created_at)}
          </span>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        {isActioned ? (
          <span className="text-xs font-medium" style={{ color: '#0F6E56' }}>
            Actioned
          </span>
        ) : isDismissed ? (
          <span className="text-xs text-muted-foreground">Dismissed</span>
        ) : (
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onAction(signal.id)}
              title="Mark as actioned"
            >
              <Check className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDismiss(signal.id)}
              title="Dismiss"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </>
        )}
      </div>
    </div>
  )
}
