import { useState, useEffect, useCallback, useRef } from 'react'
import { useOrg } from '@/hooks/useOrg'
import { useArchitects } from '@/hooks/useArchitects'
import { useDiscoveredPlaces, type DiscoveredPlace } from '@/hooks/useDiscoveredPlaces'
import { useCompetitors } from '@/hooks/useCompetitors'
import { supabase } from '@/lib/supabase'
import { APIProvider, Map, AdvancedMarker, InfoWindow, useMap } from '@vis.gl/react-google-maps'
import { Link } from 'react-router-dom'
import { Map as MapIcon, Layers, Eye, EyeOff, Zap, User, Shield, Building2, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { computeTerritoryCenter, type CountyData } from '@/data/counties'
import { STAGE_STYLES } from '@/types'
import { StageBadge } from '@/components/crm/StageBadge'
import { PulseBar } from '@/components/crm/PulseBar'
import { getPulseColor } from '@/lib/pulse'
import { toast } from 'sonner'
import type { Architect, Competitor } from '@/types'

interface HeatPoint {
  lat: number
  lng: number
  weight: number
  type: 'activity' | 'relationship' | 'competitor' | 'opportunity'
}

function HeatmapLayer({ points, map }: { points: HeatPoint[]; map: any }) {
  const heatmapRef = useRef<any>(null)

  useEffect(() => {
    const g = (window as any).google
    if (!map || !g?.maps?.visualization || points.length === 0) return

    if (heatmapRef.current) {
      heatmapRef.current.setMap(null)
    }

    const heatmapData = points.map(p => ({
      location: new g.maps.LatLng(p.lat, p.lng),
      weight: p.weight,
    }))

    heatmapRef.current = new g.maps.visualization.HeatmapLayer({
      data: heatmapData,
      map,
      radius: 40,
      opacity: 0.6,
      gradient: [
        'rgba(0, 0, 0, 0)',
        'rgba(99, 102, 241, 0.3)',
        'rgba(99, 102, 241, 0.5)',
        'rgba(6, 182, 212, 0.6)',
        'rgba(6, 182, 212, 0.8)',
        'rgba(245, 158, 11, 0.8)',
        'rgba(239, 68, 68, 0.9)',
      ],
    })

    return () => {
      if (heatmapRef.current) {
        heatmapRef.current.setMap(null)
      }
    }
  }, [points, map])

  return null
}

function MapContent({
  architects, competitors, discoveredPlaces, projects, center, zoom, onAddToCRM,
  showHeatmap, showRelationships, showCompetitors, showActivity, showProjects,
  timeRange,
}: {
  architects: Architect[]
  competitors: Competitor[]
  discoveredPlaces: DiscoveredPlace[]
  projects: Array<{ lat: number; lng: number; name: string; value: number; status: string }>
  center: { lat: number; lng: number }
  zoom: number
  onAddToCRM: (place: DiscoveredPlace) => void
  showHeatmap: boolean
  showRelationships: boolean
  showCompetitors: boolean
  showActivity: boolean
  showProjects: boolean
  timeRange: number
}) {
  const map = useMap()
  const [selectedArchitect, setSelectedArchitect] = useState<Architect | null>(null)
  const [selectedCompetitor, setSelectedCompetitor] = useState<Competitor | null>(null)

  // Build heat points
  const heatPoints: HeatPoint[] = []

  if (showActivity) {
    discoveredPlaces.forEach(p => {
      if (p.lat && p.lng) {
        heatPoints.push({ lat: Number(p.lat), lng: Number(p.lng), weight: 2, type: 'activity' })
      }
    })
  }

  if (showRelationships) {
    architects.forEach(a => {
      if (a.lat && a.lng) {
        const weight = Math.max(1, Math.min(10, a.pulse_score / 10))
        heatPoints.push({ lat: Number(a.lat), lng: Number(a.lng), weight, type: 'relationship' })
      }
    })
  }

  if (showProjects) {
    projects.forEach(p => {
      if (p.lat && p.lng) {
        heatPoints.push({ lat: p.lat, lng: p.lng, weight: 5, type: 'activity' })
      }
    })
  }

  const crmPlaceIds = new Set(architects.map(a => a.google_place_id).filter(Boolean))

  return (
    <>
      {showHeatmap && <HeatmapLayer points={heatPoints} map={map} />}

      {/* Relationship markers */}
      {showRelationships && architects.filter(a => a.lat && a.lng).map(arch => {
        const stage = STAGE_STYLES[arch.stage]
        const pulseColor = getPulseColor(arch.pulse_score)
        return (
          <AdvancedMarker
            key={`arch-${arch.id}`}
            position={{ lat: Number(arch.lat), lng: Number(arch.lng) }}
            onClick={() => setSelectedArchitect(arch)}
          >
            <div
              className="flex h-6 w-6 items-center justify-center rounded-full border-2 text-[8px] font-bold"
              style={{
                backgroundColor: stage.bg,
                borderColor: pulseColor,
                color: stage.text,
                boxShadow: `0 0 8px ${pulseColor}40`,
              }}
            >
              {arch.pulse_score}
            </div>
          </AdvancedMarker>
        )
      })}

      {/* Competitor markers */}
      {showCompetitors && competitors.filter(c => c.lat && c.lng).map(comp => (
        <AdvancedMarker
          key={`comp-${comp.id}`}
          position={{ lat: Number(comp.lat), lng: Number(comp.lng) }}
          onClick={() => setSelectedCompetitor(comp)}
        >
          <div
            className="flex h-5 w-5 items-center justify-center rounded-sm"
            style={{ backgroundColor: '#EF4444', boxShadow: '0 0 8px rgba(239,68,68,0.4)' }}
          >
            <Shield className="h-3 w-3 text-white" />
          </div>
        </AdvancedMarker>
      ))}

      {/* Project markers */}
      {showProjects && projects.filter(p => p.lat && p.lng).map((proj, i) => (
        <AdvancedMarker
          key={`proj-${i}`}
          position={{ lat: proj.lat, lng: proj.lng }}
        >
          <div
            className="flex h-5 w-5 items-center justify-center rounded-md"
            style={{ backgroundColor: proj.status === 'active' ? '#06B6D4' : '#7C7C7C', boxShadow: '0 0 8px rgba(6,182,212,0.3)' }}
          >
            <Building2 className="h-3 w-3 text-white" />
          </div>
        </AdvancedMarker>
      ))}

      {/* Info windows */}
      {selectedArchitect && selectedArchitect.lat && (
        <InfoWindow
          position={{ lat: Number(selectedArchitect.lat), lng: Number(selectedArchitect.lng) }}
          onCloseClick={() => setSelectedArchitect(null)}
        >
          <div style={{ padding: '8px', maxWidth: '240px', color: '#111' }}>
            <Link to={`/relationships/${selectedArchitect.id}`} style={{ fontWeight: 600, fontSize: '14px', color: '#111' }}>
              {selectedArchitect.name}
            </Link>
            {selectedArchitect.firm && <p style={{ fontSize: '12px', color: '#666', marginTop: '2px' }}>{selectedArchitect.firm}</p>}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
              <span style={{ fontSize: '11px', color: '#666' }}>Pulse: {selectedArchitect.pulse_score}</span>
              <span style={{ fontSize: '11px', color: '#666' }}>Stage: {selectedArchitect.stage}</span>
              <span style={{ fontSize: '11px', color: '#666' }}>Projects: {selectedArchitect.projects_together}</span>
            </div>
          </div>
        </InfoWindow>
      )}

      {selectedCompetitor && selectedCompetitor.lat && (
        <InfoWindow
          position={{ lat: Number(selectedCompetitor.lat), lng: Number(selectedCompetitor.lng) }}
          onCloseClick={() => setSelectedCompetitor(null)}
        >
          <div style={{ padding: '8px', maxWidth: '200px', color: '#111' }}>
            <p style={{ fontWeight: 600, fontSize: '14px' }}>{selectedCompetitor.name}</p>
            {selectedCompetitor.google_rating && (
              <p style={{ fontSize: '12px', color: '#666' }}>{selectedCompetitor.google_rating} stars ({selectedCompetitor.google_review_count} reviews)</p>
            )}
          </div>
        </InfoWindow>
      )}
    </>
  )
}

export function MapIndex() {
  const { org } = useOrg()
  const { architects, loading, createArchitect } = useArchitects()
  const { places: discoveredPlaces, markAddedToCRM } = useDiscoveredPlaces()
  const { competitors } = useCompetitors()
  const [projects, setProjects] = useState<Array<{ lat: number; lng: number; name: string; value: number; status: string }>>([])

  // Layer toggles
  const [showHeatmap, setShowHeatmap] = useState(true)
  const [showRelationships, setShowRelationships] = useState(true)
  const [showCompetitors, setShowCompetitors] = useState(true)
  const [showActivity, setShowActivity] = useState(true)
  const [showProjects, setShowProjects] = useState(true)
  const [timeRange, setTimeRange] = useState(12) // months

  // Fetch projects with coordinates
  useEffect(() => {
    if (!org) return
    supabase
      .from('kb_projects')
      .select('name, lat, lng, budget_value, status')
      .eq('org_id', org.id)
      .not('lat', 'is', null)
      .then(({ data }) => {
        if (data) setProjects(data.map(p => ({ lat: Number(p.lat), lng: Number(p.lng), name: p.name, value: p.budget_value || 0, status: p.status || 'active' })))
      })
  }, [org])

  const counties = (org?.service_counties ?? []) as CountyData[]
  const hasTerritory = counties.length > 0 || (org?.territory_lat && org?.territory_lng)
  const center = counties.length > 0
    ? computeTerritoryCenter(counties)
    : { lat: Number(org?.territory_lat ?? 0), lng: Number(org?.territory_lng ?? 0), radiusMiles: 50 }
  const zoom = center.radiusMiles > 100 ? 7 : center.radiusMiles > 60 ? 8 : center.radiusMiles > 30 ? 9 : 10

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY

  async function handleAddToCRM(place: DiscoveredPlace) {
    const result = await createArchitect({
      name: place.name, firm: place.name, location: place.address,
      website: place.website, lat: Number(place.lat), lng: Number(place.lng),
      google_place_id: place.google_place_id, source: 'radar', is_in_radar: true,
      stage: 'Cold', tier: 'Prospect', projects_together: 0, referral_value: 0,
    })
    if (result) { await markAddedToCRM(place.google_place_id, result.id); toast.success(`${place.name} added`) }
  }

  if (!hasTerritory || !apiKey) {
    return (
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-6 text-xl font-medium">War Map</h1>
        <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border">
          <MapIcon className="h-8 w-8" style={{ color: '#7C7C7C' }} />
          <p className="text-sm" style={{ color: '#7C7C7C' }}>
            {!apiKey ? 'Google Maps API key not configured' : 'Set your service counties in Settings'}
          </p>
        </div>
      </div>
    )
  }

  // Stats
  const relCount = architects.filter(a => a.lat && a.lng).length
  const compCount = competitors.filter(c => c.lat && c.lng).length
  const projCount = projects.length
  const totalPoints = discoveredPlaces.filter(p => p.lat && p.lng).length + relCount + projCount

  return (
    <div>
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-medium" style={{ color: '#E8E8F0' }}>War Map</h1>
          <p className="text-[13px]" style={{ color: '#7C7C7C' }}>
            {totalPoints} data points across {counties.length} counties
          </p>
        </div>
      </div>

      {/* Layer controls */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1 rounded-lg px-2 py-1" style={{ backgroundColor: '#1C1C1C', border: '1px solid #2A2A2A' }}>
          <Layers className="h-3.5 w-3.5" style={{ color: '#7C7C7C' }} />
          <span className="text-[11px] font-medium" style={{ color: '#7C7C7C' }}>Layers:</span>
        </div>
        {[
          { key: 'heatmap', label: 'Heat Map', active: showHeatmap, toggle: () => setShowHeatmap(!showHeatmap), color: '#6366F1' },
          { key: 'relationships', label: `Relationships (${relCount})`, active: showRelationships, toggle: () => setShowRelationships(!showRelationships), color: '#06B6D4' },
          { key: 'competitors', label: `Competitors (${compCount})`, active: showCompetitors, toggle: () => setShowCompetitors(!showCompetitors), color: '#EF4444' },
          { key: 'projects', label: `Projects (${projCount})`, active: showProjects, toggle: () => setShowProjects(!showProjects), color: '#06B6D4' },
          { key: 'activity', label: 'Discovery Activity', active: showActivity, toggle: () => setShowActivity(!showActivity), color: '#818CF8' },
        ].map(layer => (
          <button
            key={layer.key}
            onClick={layer.toggle}
            className="nav-item flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-medium"
            style={{
              backgroundColor: layer.active ? `${layer.color}15` : '#1C1C1C',
              color: layer.active ? layer.color : '#4A4A4A',
              border: `1px solid ${layer.active ? `${layer.color}40` : '#2A2A2A'}`,
            }}
          >
            {layer.active ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
            {layer.label}
          </button>
        ))}
      </div>

      {/* Legend */}
      <div className="mb-3 flex items-center gap-4">
        <div className="flex items-center gap-1.5 text-[10px]" style={{ color: '#7C7C7C' }}>
          <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: '#06B6D4', boxShadow: '0 0 4px #06B6D4' }} />
          Strong relationship
        </div>
        <div className="flex items-center gap-1.5 text-[10px]" style={{ color: '#7C7C7C' }}>
          <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: '#F59E0B', boxShadow: '0 0 4px #F59E0B' }} />
          Cooling
        </div>
        <div className="flex items-center gap-1.5 text-[10px]" style={{ color: '#7C7C7C' }}>
          <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: '#EF4444', boxShadow: '0 0 4px #EF4444' }} />
          Competitor
        </div>
        <div className="flex items-center gap-1.5 text-[10px]" style={{ color: '#7C7C7C' }}>
          <div className="h-2.5 w-2.5 rounded-md" style={{ backgroundColor: '#06B6D4' }} />
          Your project
        </div>
        <div className="flex items-center gap-1.5 text-[10px]" style={{ color: '#7C7C7C' }}>
          <div className="h-2.5 w-8 rounded" style={{ background: 'linear-gradient(to right, rgba(99,102,241,0.3), rgba(6,182,212,0.6), rgba(245,158,11,0.8), rgba(239,68,68,0.9))' }} />
          Activity density
        </div>
      </div>

      {/* Map */}
      {loading ? (
        <div className="flex h-96 items-center justify-center"><p style={{ color: '#7C7C7C' }}>Loading...</p></div>
      ) : (
        <div className="overflow-hidden rounded-xl" style={{ height: 'calc(100vh - 240px)', border: '1px solid #2A2A2A' }}>
          <APIProvider apiKey={apiKey} libraries={['visualization']}>
            <Map
              defaultCenter={{ lat: center.lat, lng: center.lng }}
              defaultZoom={zoom}
              mapId="war-map"
              gestureHandling="greedy"
              disableDefaultUI={false}
              colorScheme="DARK"
              style={{ width: '100%', height: '100%' }}
            >
              <MapContent
                architects={architects.filter(a => a.lat && a.lng)}
                competitors={competitors}
                discoveredPlaces={discoveredPlaces}
                projects={projects}
                center={{ lat: center.lat, lng: center.lng }}
                zoom={zoom}
                onAddToCRM={handleAddToCRM}
                showHeatmap={showHeatmap}
                showRelationships={showRelationships}
                showCompetitors={showCompetitors}
                showActivity={showActivity}
                showProjects={showProjects}
                timeRange={timeRange}
              />
            </Map>
          </APIProvider>
        </div>
      )}
    </div>
  )
}
