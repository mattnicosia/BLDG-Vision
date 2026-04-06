import { useKBProjects } from '@/hooks/useKB'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Plus, MapPin, Calendar, DollarSign } from 'lucide-react'

export function ProjectsTab() {
  const { projects, loading } = useKBProjects()

  if (loading) return <p className="text-sm text-muted-foreground">Loading...</p>

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {projects.length} project{projects.length !== 1 ? 's' : ''}
        </p>
        <Link to="/kb/projects/new">
          <Button size="sm" className="gap-1.5">
            <Plus className="h-3.5 w-3.5" /> Add project
          </Button>
        </Link>
      </div>

      {projects.length === 0 ? (
        <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-border">
          <p className="text-sm text-muted-foreground">
            No projects yet. Add your first completed project.
          </p>
        </div>
      ) : (
        projects.map((p) => (
          <div
            key={p.id}
            className="rounded-xl border border-border bg-white p-4"
            style={{ borderWidth: '0.5px' }}
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-sm font-medium">{p.name}</h3>
                {p.architect_name && (
                  <p className="text-xs text-muted-foreground">
                    Architect: {p.architect_name}
                  </p>
                )}
              </div>
              {p.is_showcase && (
                <span
                  className="rounded-full px-2 py-0.5 text-[10px] font-medium"
                  style={{ backgroundColor: '#E1F5EE', color: '#085041' }}
                >
                  Showcase
                </span>
              )}
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
        ))
      )}
    </div>
  )
}
