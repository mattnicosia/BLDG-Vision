import { useState } from 'react'
import { useCompetitors } from '@/hooks/useCompetitors'
import { CompetitorCard } from '@/components/competitors/CompetitorCard'
import { AddCompetitorDialog } from './AddCompetitorDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Search, Swords } from 'lucide-react'

export function CompetitorsIndex() {
  const { competitors, loading, createCompetitor } = useCompetitors()
  const [search, setSearch] = useState('')
  const [showAdd, setShowAdd] = useState(false)

  const filtered = competitors.filter((c) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      c.name.toLowerCase().includes(q) ||
      (c.location?.toLowerCase().includes(q) ?? false)
    )
  })

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-muted-foreground">Loading competitors...</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-medium">Competitors</h1>
          <p className="text-sm text-muted-foreground">
            {competitors.length} competitor{competitors.length !== 1 ? 's' : ''} tracked
          </p>
        </div>
        <Button onClick={() => setShowAdd(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Add competitor
        </Button>
      </div>

      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or location..."
            className="pl-9"
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {filtered.length === 0 ? (
          <div className="flex h-40 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border">
            <Swords className="h-6 w-6 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {competitors.length === 0
                ? 'No competitors tracked yet.'
                : 'No competitors match your search.'}
            </p>
          </div>
        ) : (
          filtered.map((c) => <CompetitorCard key={c.id} competitor={c} />)
        )}
      </div>

      {showAdd && (
        <AddCompetitorDialog
          onClose={() => setShowAdd(false)}
          onCreate={createCompetitor}
        />
      )}
    </div>
  )
}
