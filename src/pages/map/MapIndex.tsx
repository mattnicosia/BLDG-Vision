import { useState } from 'react'
import { useOrg } from '@/hooks/useOrg'
import { useArchitects } from '@/hooks/useArchitects'
import { useDiscoveredPlaces, type DiscoveredPlace } from '@/hooks/useDiscoveredPlaces'
import { useCompetitors } from '@/hooks/useCompetitors'
import { ArchitectMap } from '@/components/map/ArchitectMap'
import { Map as MapIcon } from 'lucide-react'
import type { ArchitectStage } from '@/types'
import { computeTerritoryCenter, type CountyData } from '@/data/counties'
import { toast } from 'sonner'

const STAGES: ArchitectStage[] = ['Active', 'Warm', 'Cooling', 'Cold']

export function MapIndex() {
  const { org } = useOrg()
  const { architects, loading, createArchitect } = useArchitects()
  const { places: discoveredPlaces, markAddedToCRM } = useDiscoveredPlaces()
  const { competitors } = useCompetitors()
  const [stageFilter, setStageFilter] = useState<ArchitectStage | 'all'>('all')
  const [showDiscovered, setShowDiscovered] = useState(true)
  const [showCompetitors, setShowCompetitors] = useState(true)

  const filtered = architects.filter((a) => {
    if (stageFilter !== 'all' && a.stage !== stageFilter) return false
    return a.lat != null && a.lng != null
  })

  const counties = (org?.service_counties ?? []) as CountyData[]
  const hasTerritory = counties.length > 0 || (org?.territory_lat && org?.territory_lng)

  const center = counties.length > 0
    ? computeTerritoryCenter(counties)
    : { lat: Number(org?.territory_lat ?? 0), lng: Number(org?.territory_lng ?? 0), radiusMiles: 50 }

  const zoom = center.radiusMiles > 100 ? 7 : center.radiusMiles > 60 ? 8 : center.radiusMiles > 30 ? 9 : 10

  async function handleAddToCRM(place: DiscoveredPlace) {
    const result = await createArchitect({
      name: place.name,
      firm: place.name,
      location: place.address,
      website: place.website,
      lat: Number(place.lat),
      lng: Number(place.lng),
      google_place_id: place.google_place_id,
      source: 'radar',
      is_in_radar: true,
      stage: 'Cold',
      tier: 'Prospect',
      projects_together: 0,
      referral_value: 0,
    })
    if (result) {
      await markAddedToCRM(place.google_place_id, result.id)
      toast.success(`${place.name} added to CRM`)
    }
  }

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

  const undiscoveredCount = discoveredPlaces.filter(
    (p) => !p.added_to_crm && p.lat && p.lng
  ).length

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-medium">Territory Map</h1>
          <p className="text-sm text-muted-foreground">
            {filtered.length} in CRM
            {undiscoveredCount > 0 && showDiscovered && ` + ${undiscoveredCount} discovered`}
            {counties.length > 0 && ` across ${counties.length} counties`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {competitors.length > 0 && (
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={showCompetitors}
                onChange={(e) => setShowCompetitors(e.target.checked)}
                className="rounded"
              />
              Competitors ({competitors.filter((c) => c.lat).length})
            </label>
          )}
          {undiscoveredCount > 0 && (
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={showDiscovered}
                onChange={(e) => setShowDiscovered(e.target.checked)}
                className="rounded"
              />
              Discovered ({undiscoveredCount})
            </label>
          )}
          <select
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value as ArchitectStage | 'all')}
            className="rounded-md border border-border bg-[#1A1A24] px-2 py-1.5 text-sm"
          >
            <option value="all">All stages</option>
            {STAGES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Legend */}
      <div className="mb-3 flex items-center gap-4">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <div className="h-3 w-3 rounded-full border border-white" style={{ backgroundColor: '#6366f1' }} />
          Discovered
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <div className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: '#FEE2E2', border: '1px solid #A32D2D' }} />
          Competitor
        </div>
        {STAGES.map((s) => (
          <div key={s} className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <div
              className="h-2.5 w-2.5 rounded-full border"
              style={{ backgroundColor: STAGE_STYLES[s].bg, borderColor: STAGE_STYLES[s].border }}
            />
            {s}
          </div>
        ))}
      </div>

      {loading ? (
        <div className="flex h-96 items-center justify-center">
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      ) : (
        <div
          className="overflow-hidden rounded-xl border border-border"
          style={{ height: 'calc(100vh - 220px)', borderWidth: '0.5px' }}
        >
          <ArchitectMap
            architects={filtered}
            competitors={showCompetitors ? competitors : []}
            discoveredPlaces={showDiscovered ? discoveredPlaces : []}
            center={{ lat: center.lat, lng: center.lng }}
            zoom={zoom}
            onAddToCRM={handleAddToCRM}
          />
        </div>
      )}
    </div>
  )
}

// Need to import STAGE_STYLES for the legend
import { STAGE_STYLES } from '@/types'
