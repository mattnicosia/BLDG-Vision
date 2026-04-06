import { useVECases } from '@/hooks/useKB'
import { Button } from '@/components/ui/button'
import { Link } from 'react-router-dom'
import { Plus, ArrowRight, DollarSign } from 'lucide-react'

export function VETab() {
  const { cases, loading } = useVECases()

  if (loading) return <p className="text-sm text-muted-foreground">Loading...</p>

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {cases.length} VE case{cases.length !== 1 ? 's' : ''}
        </p>
        <Link to="/kb/ve/new">
          <Button size="sm" className="gap-1.5">
            <Plus className="h-3.5 w-3.5" /> Add VE case
          </Button>
        </Link>
      </div>

      {cases.length === 0 ? (
        <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-border">
          <p className="text-sm text-muted-foreground">
            No VE cases yet. Document your value engineering wins.
          </p>
        </div>
      ) : (
        cases.map((c) => (
          <div
            key={c.id}
            className="rounded-xl border border-border bg-white p-4"
            style={{ borderWidth: '0.5px' }}
          >
            <div className="flex items-start justify-between">
              <h3 className="text-sm font-medium">{c.title}</h3>
              {c.savings_amount ? (
                <div className="flex items-center gap-1 text-sm font-medium" style={{ color: '#0F6E56' }}>
                  <DollarSign className="h-3.5 w-3.5" />
                  {c.savings_amount.toLocaleString()} saved
                </div>
              ) : null}
            </div>
            {(c.original_spec || c.ve_spec) && (
              <div className="mt-3 flex items-center gap-3 text-xs">
                {c.original_spec && (
                  <span className="rounded-lg bg-muted px-2 py-1">
                    {c.original_spec}
                  </span>
                )}
                <ArrowRight className="h-3 w-3 text-muted-foreground" />
                {c.ve_spec && (
                  <span
                    className="rounded-lg px-2 py-1"
                    style={{ backgroundColor: '#E1F5EE', color: '#085041' }}
                  >
                    {c.ve_spec}
                  </span>
                )}
              </div>
            )}
            {c.how_it_worked && (
              <p className="mt-2 text-sm text-muted-foreground">{c.how_it_worked}</p>
            )}
          </div>
        ))
      )}
    </div>
  )
}
