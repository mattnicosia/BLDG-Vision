import { Link } from 'react-router-dom'
import type { Architect, Signal, AIDraft } from '@/types'
import { getPulseColor } from '@/lib/pulse'
import { Button } from '@/components/ui/button'
import { Sparkles, AlertTriangle, Zap, Clock, User } from 'lucide-react'

interface AISuggestionsProps {
  architects: Architect[]
  sentDrafts: AIDraft[]
  signals: Signal[]
  onGenerateDraft: (architect: Architect, reason: string) => void
}

function daysAgo(date: string): number {
  return Math.floor((Date.now() - new Date(date).getTime()) / 86400000)
}

export function AISuggestions({ architects, sentDrafts, signals, onGenerateDraft }: AISuggestionsProps) {
  // Cooling relationships
  const cooling = architects
    .filter((a) => a.pulse_score < 50 && a.email)
    .sort((a, b) => a.pulse_score - b.pulse_score)
    .slice(0, 5)

  // Signal opportunities
  const signalOpps = signals
    .filter((s) => !s.actioned_at && !s.dismissed_at && s.architect_id)
    .slice(0, 5)
    .map((s) => ({
      signal: s,
      architect: architects.find((a) => a.id === s.architect_id),
    }))
    .filter((s) => s.architect?.email)

  // Follow-up needed
  const followUps = sentDrafts
    .filter((d) => d.outcome === 'sent' && d.sent_at && daysAgo(d.sent_at) > 5 && d.architect_id)
    .slice(0, 5)
    .map((d) => ({
      draft: d,
      architect: architects.find((a) => a.id === d.architect_id),
    }))
    .filter((f) => f.architect?.email)

  const hasAnySuggestions = cooling.length > 0 || signalOpps.length > 0 || followUps.length > 0

  if (!hasAnySuggestions) {
    return (
      <div className="flex h-48 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border">
        <Sparkles className="h-8 w-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">All caught up! No outreach suggestions right now.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Cooling relationships */}
      {cooling.length > 0 && (
        <div>
          <h3 className="mb-2 flex items-center gap-2 text-sm font-medium">
            <AlertTriangle className="h-4 w-4" style={{ color: '#BA7517' }} />
            Cooling relationships
          </h3>
          <div className="flex flex-col gap-2">
            {cooling.map((arch) => {
              const days = arch.last_contact_date ? daysAgo(arch.last_contact_date) : null
              return (
                <div
                  key={arch.id}
                  className="flex items-center justify-between rounded-xl border border-border bg-white p-3"
                  style={{ borderWidth: '0.5px' }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: getPulseColor(arch.pulse_score) }}
                    />
                    <div>
                      <Link to={`/relationships/${arch.id}`} className="text-sm font-medium text-primary hover:underline">
                        {arch.name}
                      </Link>
                      <p className="text-[10px] text-muted-foreground">
                        Pulse {arch.pulse_score} {days !== null ? `/ ${days}d since contact` : '/ never contacted'}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onGenerateDraft(arch, `Pulse score ${arch.pulse_score} - relationship cooling`)}
                    className="gap-1.5"
                  >
                    <Sparkles className="h-3 w-3" /> Draft
                  </Button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Signal opportunities */}
      {signalOpps.length > 0 && (
        <div>
          <h3 className="mb-2 flex items-center gap-2 text-sm font-medium">
            <Zap className="h-4 w-4" style={{ color: '#0F6E56' }} />
            Signal opportunities
          </h3>
          <div className="flex flex-col gap-2">
            {signalOpps.map(({ signal, architect }) => (
              <div
                key={signal.id}
                className="flex items-center justify-between rounded-xl border border-border bg-white p-3"
                style={{ borderWidth: '0.5px' }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="h-2 w-2 rounded-full"
                    style={{
                      backgroundColor: signal.priority === 'high' ? '#A32D2D' : signal.priority === 'medium' ? '#BA7517' : '#0F6E56',
                    }}
                  />
                  <div>
                    <Link to={`/relationships/${architect!.id}`} className="text-sm font-medium text-primary hover:underline">
                      {architect!.name}
                    </Link>
                    <p className="text-[10px] text-muted-foreground line-clamp-1">{signal.headline}</p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onGenerateDraft(architect!, signal.headline)}
                  className="gap-1.5"
                >
                  <Sparkles className="h-3 w-3" /> Draft
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Follow-up needed */}
      {followUps.length > 0 && (
        <div>
          <h3 className="mb-2 flex items-center gap-2 text-sm font-medium">
            <Clock className="h-4 w-4" style={{ color: '#71717a' }} />
            Follow-up needed
          </h3>
          <div className="flex flex-col gap-2">
            {followUps.map(({ draft, architect }) => (
              <div
                key={draft.id}
                className="flex items-center justify-between rounded-xl border border-border bg-white p-3"
                style={{ borderWidth: '0.5px' }}
              >
                <div className="flex items-center gap-3">
                  <User className="h-3.5 w-3.5 text-muted-foreground" />
                  <div>
                    <Link to={`/relationships/${architect!.id}`} className="text-sm font-medium text-primary hover:underline">
                      {architect!.name}
                    </Link>
                    <p className="text-[10px] text-muted-foreground">
                      Sent "{draft.subject || 'outreach'}" {draft.sent_at ? `${daysAgo(draft.sent_at)}d ago` : ''} - no follow-up
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onGenerateDraft(architect!, `Follow-up on ${draft.subject || 'previous outreach'}`)}
                  className="gap-1.5"
                >
                  <Sparkles className="h-3 w-3" /> Draft
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
