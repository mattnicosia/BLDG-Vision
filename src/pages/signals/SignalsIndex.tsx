import { useState } from 'react'
import { useSignals } from '@/hooks/useSignals'
import { SignalCard } from '@/components/signals/SignalCard'
import { AddSignalDialog } from '@/components/signals/AddSignalDialog'
import { Button } from '@/components/ui/button'
import { Plus, Zap } from 'lucide-react'
import type { SignalType } from '@/types'

export function SignalsIndex() {
  const { signals, loading, createSignal, actionSignal, dismissSignal } = useSignals()
  const [showAdd, setShowAdd] = useState(false)
  const [priorityFilter, setPriorityFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all')
  const [typeFilter, setTypeFilter] = useState<'all' | SignalType>('all')
  const [showActioned, setShowActioned] = useState(false)

  const filtered = signals.filter((s) => {
    if (!showActioned && (s.actioned_at || s.dismissed_at)) return false
    if (priorityFilter !== 'all' && s.priority !== priorityFilter) return false
    if (typeFilter !== 'all' && s.type !== typeFilter) return false
    return true
  })

  const activeCount = signals.filter((s) => !s.actioned_at && !s.dismissed_at).length

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-muted-foreground">Loading signals...</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-medium">Signal Feed</h1>
          <p className="text-sm text-muted-foreground">
            {activeCount} active signal{activeCount !== 1 ? 's' : ''}
          </p>
        </div>
        <Button onClick={() => setShowAdd(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Add signal
        </Button>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <select
          value={priorityFilter}
          onChange={(e) =>
            setPriorityFilter(e.target.value as 'all' | 'high' | 'medium' | 'low')
          }
          className="rounded-md border border-border bg-[#1A1A24] px-2 py-1.5 text-sm"
        >
          <option value="all">All priorities</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as 'all' | SignalType)}
          className="rounded-md border border-border bg-[#1A1A24] px-2 py-1.5 text-sm"
        >
          <option value="all">All types</option>
          <option value="new_permit">Permits</option>
          <option value="new_post">Social</option>
          <option value="new_review">Reviews</option>
          <option value="award">Awards</option>
          <option value="opportunity">Opportunities</option>
          <option value="planning_board">Planning Board</option>
          <option value="lien_filed">Liens</option>
        </select>
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <input
            type="checkbox"
            checked={showActioned}
            onChange={(e) => setShowActioned(e.target.checked)}
            className="rounded"
          />
          Show actioned
        </label>
      </div>

      <div className="flex flex-col gap-2">
        {filtered.length === 0 ? (
          <div className="flex h-40 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border">
            <Zap className="h-6 w-6 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {signals.length === 0
                ? 'No signals yet. Add one manually or import permits.'
                : 'No signals match your filters.'}
            </p>
          </div>
        ) : (
          filtered.map((signal) => (
            <SignalCard
              key={signal.id}
              signal={signal}
              onAction={actionSignal}
              onDismiss={dismissSignal}
            />
          ))
        )}
      </div>

      {showAdd && (
        <AddSignalDialog
          onClose={() => setShowAdd(false)}
          onCreate={createSignal}
        />
      )}

    </div>
  )
}
