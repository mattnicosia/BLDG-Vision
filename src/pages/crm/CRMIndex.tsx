import { useState } from 'react'
import { useArchitects } from '@/hooks/useArchitects'
import { useBlockedPlaces } from '@/hooks/useBlockedPlaces'
import { ArchitectCard } from '@/components/crm/ArchitectCard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Search, Filter } from 'lucide-react'
import { toast } from 'sonner'
import type { Architect, ArchitectStage } from '@/types'
import { AddArchitectDialog } from './AddArchitectDialog'

const STAGES: ArchitectStage[] = ['Active', 'Warm', 'Cooling', 'Cold']

export function CRMIndex() {
  const { architects, loading, createArchitect, deleteArchitect } = useArchitects()
  const { blockPlace } = useBlockedPlaces()
  const [search, setSearch] = useState('')
  const [stageFilter, setStageFilter] = useState<ArchitectStage | 'all'>('all')
  const [sortBy, setSortBy] = useState<'pulse' | 'name' | 'contact'>('pulse')
  const [showAdd, setShowAdd] = useState(false)

  async function handleDelete(id: string) {
    await deleteArchitect(id)
    toast.success('Architect removed from CRM')
  }

  async function handleBlock(architect: Architect) {
    await blockPlace(architect.google_place_id ?? undefined, architect.name)
    await deleteArchitect(architect.id)
    toast.success(`${architect.name} blocked and removed`)
  }

  const filtered = architects
    .filter((a) => {
      if (stageFilter !== 'all' && a.stage !== stageFilter) return false
      if (search) {
        const q = search.toLowerCase()
        return (
          a.name.toLowerCase().includes(q) ||
          (a.firm?.toLowerCase().includes(q) ?? false) ||
          (a.location?.toLowerCase().includes(q) ?? false)
        )
      }
      return true
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name)
        case 'contact': {
          const aDate = a.last_contact_date ? new Date(a.last_contact_date).getTime() : 0
          const bDate = b.last_contact_date ? new Date(b.last_contact_date).getTime() : 0
          return bDate - aDate
        }
        default:
          return b.pulse_score - a.pulse_score
      }
    })

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-muted-foreground">Loading architects...</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-medium">Architects</h1>
          <p className="text-sm text-muted-foreground">
            {architects.length} relationship{architects.length !== 1 ? 's' : ''} tracked
          </p>
        </div>
        <Button onClick={() => setShowAdd(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Add architect
        </Button>
      </div>

      <div className="mb-4 flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, firm, or location..."
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-1">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <select
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value as ArchitectStage | 'all')}
            className="rounded-md border border-border bg-white px-2 py-1.5 text-sm"
          >
            <option value="all">All stages</option>
            {STAGES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'pulse' | 'name' | 'contact')}
            className="rounded-md border border-border bg-white px-2 py-1.5 text-sm"
          >
            <option value="pulse">Sort by Pulse</option>
            <option value="name">Sort by Name</option>
            <option value="contact">Sort by Last Contact</option>
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {filtered.length === 0 ? (
          <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-border">
            <p className="text-sm text-muted-foreground">
              {architects.length === 0
                ? 'No architects yet. Add your first one to get started.'
                : 'No architects match your filters.'}
            </p>
          </div>
        ) : (
          filtered.map((architect) => (
            <ArchitectCard
              key={architect.id}
              architect={architect}
              onDelete={handleDelete}
              onBlock={handleBlock}
            />
          ))
        )}
      </div>

      {showAdd && (
        <AddArchitectDialog
          onClose={() => setShowAdd(false)}
          onCreate={createArchitect}
        />
      )}
    </div>
  )
}
