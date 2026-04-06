import { useState } from 'react'
import { useOrg } from '@/hooks/useOrg'
import { useArchitects } from '@/hooks/useArchitects'
import { ArchitectMap } from '@/components/map/ArchitectMap'
import { Map as MapIcon } from 'lucide-react'
import type { ArchitectStage } from '@/types'
import { computeTerritoryCenter, type CountyData } from '@/data/counties'

const STAGES: ArchitectStage[] = ['Active', 'Warm', 'Cooling', 'Cold']

export function MapIndex() {
  const { org } = useOrg()
  const { architects, loading } = useArchitects()
  const [stageFilter, setStageFilter] = useState<ArchitectStage | 'all'>('all')

  const filtered = architects.filter((a) => {
    if (stageFilter !== 'all' && a.stage !== stageFilter) return false
    return a.lat != null && a.lng != null
  })

  const counties = (org?.service_counties ?? []) as CountyData[]
  const hasTerritory = counties.length > 0 || (org?.territory_lat && org?.territory_lng)

  // Compute center from counties, fall back to org territory
  const center = counties.length > 0
    ? computeTerritoryCenter(counties)
    : { lat: Number(org?.territory_lat ?? 0), lng: Number(org?.territory_lng ?? 0), radiusMiles: 50 }

  // Auto-calculate zoom from radius
  const zoom = center.radiusMiles > 100 ? 7 : center.radiusMiles > 60 ? 8 : center.radiusMiles > 30 ? 9 : 10

  if (!hasTerritory) {
    return (
      <div className="mx-auto max-w-4xl">
        <div className="mb-6">
          <h1 className="text-xl font-medium">Territory Map</h1>
        </div>
        <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border">
          <MapIcon className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Set your service counties in Settings to use the map
          </p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-medium">Territory Map</h1>
          <p className="text-sm text-muted-foreground">
            {filtered.length} architect{filtered.length !== 1 ? 's' : ''} with
            coordinates
            {counties.length > 0 && ` across ${counties.length} counties`}
          </p>
        </div>
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
      </div>

      {loading ? (
        <div className="flex h-96 items-center justify-center">
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      ) : (
        <div
          className="overflow-hidden rounded-xl border border-border"
          style={{ height: 'calc(100vh - 200px)', borderWidth: '0.5px' }}
        >
          <ArchitectMap
            architects={filtered}
            center={{ lat: center.lat, lng: center.lng }}
            zoom={zoom}
          />
        </div>
      )}
    </div>
  )
}
