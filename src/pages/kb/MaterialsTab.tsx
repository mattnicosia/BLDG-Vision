import { useKBMaterials } from '@/hooks/useKB'
import { Clock, DollarSign } from 'lucide-react'

export function MaterialsTab() {
  const { materials, loading } = useKBMaterials()

  if (loading) return <p className="text-sm text-muted-foreground">Loading...</p>

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        {materials.length} material{materials.length !== 1 ? 's' : ''}
      </p>

      {materials.length === 0 ? (
        <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-border">
          <p className="text-sm text-muted-foreground">
            No materials yet. Add materials with lead times and pricing notes.
          </p>
        </div>
      ) : (
        materials.map((m) => (
          <div
            key={m.id}
            className="rounded-xl border border-border bg-[#1C1C1C] p-4"
            style={{ borderWidth: '0.5px' }}
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium">{m.name}</h3>
                {m.category && (
                  <p className="text-xs text-muted-foreground">{m.category}</p>
                )}
              </div>
              <span
                className="rounded-full px-2 py-0.5 text-[10px] font-medium"
                style={{
                  backgroundColor:
                    m.status === 'active'
                      ? '#E1F5EE'
                      : m.status === 'emerging'
                        ? '#FAEEDA'
                        : '#F1EFE8',
                  color:
                    m.status === 'active'
                      ? '#085041'
                      : m.status === 'emerging'
                        ? '#854F0B'
                        : '#5F5E5A',
                }}
              >
                {m.status}
              </span>
            </div>
            <div className="mt-2 flex gap-4">
              {(m.lead_time_min_weeks || m.lead_time_max_weeks) && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {m.lead_time_min_weeks}
                  {m.lead_time_max_weeks ? `-${m.lead_time_max_weeks}` : ''} weeks
                </div>
              )}
              {(m.price_range_low || m.price_range_high) && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <DollarSign className="h-3 w-3" />
                  {m.price_range_low}
                  {m.price_range_high ? `-${m.price_range_high}` : ''}{' '}
                  {m.price_unit ?? ''}
                </div>
              )}
            </div>
            {m.expertise && (
              <p className="mt-2 text-sm text-muted-foreground">{m.expertise}</p>
            )}
          </div>
        ))
      )}
    </div>
  )
}
