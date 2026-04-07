import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { AIDraft, Architect } from '@/types'
import { Send, User, ChevronDown, ChevronRight } from 'lucide-react'

interface SentEmailsProps {
  sentDrafts: AIDraft[]
  architects: Architect[]
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

export function SentEmails({ sentDrafts, architects }: SentEmailsProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [archFilter, setArchFilter] = useState('')

  const archMap = new Map(architects.map((a) => [a.id, a]))

  const filtered = sentDrafts.filter((d) => {
    if (!archFilter) return true
    return d.architect_id === archFilter
  })

  if (sentDrafts.length === 0) {
    return (
      <div className="flex h-48 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border">
        <Send className="h-8 w-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">No emails sent yet. Compose one or generate with AI.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Filter */}
      <div className="flex items-center gap-2">
        <select
          value={archFilter}
          onChange={(e) => setArchFilter(e.target.value)}
          className="rounded-md border border-border bg-white px-2 py-1.5 text-sm"
        >
          <option value="">All recipients</option>
          {[...new Set(sentDrafts.map((d) => d.architect_id).filter(Boolean))].map((id) => {
            const arch = archMap.get(id!)
            return arch ? (
              <option key={id} value={id!}>{arch.name}</option>
            ) : null
          })}
        </select>
        <span className="text-xs text-muted-foreground">{filtered.length} email{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {filtered.map((draft) => {
        const arch = draft.architect_id ? archMap.get(draft.architect_id) : null
        const isExpanded = expandedId === draft.id

        return (
          <div
            key={draft.id}
            className="rounded-xl border border-border bg-white"
            style={{ borderWidth: '0.5px' }}
          >
            <button
              onClick={() => setExpandedId(isExpanded ? null : draft.id)}
              className="flex w-full items-center justify-between p-3 text-left"
            >
              <div className="flex items-center gap-2">
                {isExpanded ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
                <Send className="h-3 w-3" style={{ color: '#0F6E56' }} />
                <span className="text-sm font-medium">{draft.subject || draft.type}</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                {arch && (
                  <Link
                    to={`/relationships/${arch.id}`}
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center gap-1 text-primary hover:underline"
                  >
                    <User className="h-2.5 w-2.5" /> {arch.name}
                  </Link>
                )}
                <span>{draft.sent_at ? formatDate(draft.sent_at) : formatDate(draft.created_at)}</span>
              </div>
            </button>
            {isExpanded && (
              <div className="border-t border-border p-3">
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                  {draft.edited_body || draft.body}
                </p>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
