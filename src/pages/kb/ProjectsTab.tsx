import { useState } from 'react'
import { useKBProjects } from '@/hooks/useKB'
import { Link } from 'react-router-dom'
import { User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Plus, MapPin, Calendar, DollarSign } from 'lucide-react'
import type { ProjectCategory } from '@/types'

const CATEGORY_STYLES: Record<ProjectCategory, { bg: string; text: string }> = {
  residential: { bg: '#E1F5EE', text: '#085041' },
  commercial: { bg: '#EEEDFE', text: '#3C3489' },
  hospitality: { bg: '#FAEEDA', text: '#854F0B' },
}

export function ProjectsTab() {
  const { projects, loading } = useKBProjects()
  const [categoryFilter, setCategoryFilter] = useState<ProjectCategory | 'all'>('all')

  const filtered = projects.filter((p) => {
    if (categoryFilter === 'all') return true
    return p.category === categoryFilter
  })

  if (loading) return <p className="text-sm text-muted-foreground">Loading...</p>

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <p className="text-sm text-muted-foreground">
            {filtered.length} project{filtered.length !== 1 ? 's' : ''}
          </p>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as ProjectCategory | 'all')}
            className="rounded-md border border-border bg-[#1A1A24] px-2 py-1 text-xs"
          >
            <option value="all">All categories</option>
            <option value="residential">Residential</option>
            <option value="commercial">Commercial</option>
            <option value="hospitality">Hospitality</option>
          </select>
        </div>
        <Link to="/kb/projects/new">
          <Button size="sm" className="gap-1.5">
            <Plus className="h-3.5 w-3.5" /> Add project
          </Button>
        </Link>
      </div>

      {filtered.length === 0 ? (
        <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-border">
          <p className="text-sm text-muted-foreground">
            {projects.length === 0
              ? 'No projects yet. Add your first completed project.'
              : 'No projects match this filter.'}
          </p>
        </div>
      ) : (
        filtered.map((p) => {
          const catStyle = CATEGORY_STYLES[p.category] ?? CATEGORY_STYLES.residential
          return (
            <div
              key={p.id}
              className="rounded-xl border border-border bg-[#1A1A24] p-4"
              style={{ borderWidth: '0.5px' }}
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-medium">{p.name}</h3>
                  {p.architect_name && (
                    <p className="flex items-center gap-1 text-xs text-muted-foreground">
                      <User className="h-3 w-3" />
                      {p.architect_id ? (
                        <Link
                          to={`/crm/${p.architect_id}`}
                          className="text-primary hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {p.architect_name}
                        </Link>
                      ) : (
                        p.architect_name
                      )}
                    </p>
                  )}
                </div>
                <div className="flex gap-1.5">
                  <span
                    className="rounded-full px-2 py-0.5 text-[10px] font-medium capitalize"
                    style={{ backgroundColor: catStyle.bg, color: catStyle.text }}
                  >
                    {p.category}
                  </span>
                  {p.is_showcase && (
                    <span
                      className="rounded-full px-2 py-0.5 text-[10px] font-medium"
                      style={{ backgroundColor: '#F1EFE8', color: '#5F5E5A' }}
                    >
                      Showcase
                    </span>
                  )}
                </div>
              </div>
              <div className="mt-2 flex gap-4">
                {p.location && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" /> {p.location}
                  </div>
                )}
                {p.year && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" /> {p.year}
                  </div>
                )}
                {p.budget_value ? (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <DollarSign className="h-3 w-3" />{' '}
                    {(p.budget_value / 1000000).toFixed(1)}M
                  </div>
                ) : null}
              </div>
              {p.description && (
                <p className="mt-2 text-sm text-muted-foreground">{p.description}</p>
              )}
            </div>
          )
        })
      )}
    </div>
  )
}
