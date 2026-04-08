import { useState } from 'react'
import { APIProvider, Map, AdvancedMarker, InfoWindow } from '@vis.gl/react-google-maps'
import { Link } from 'react-router-dom'
import type { Architect, Competitor } from '@/types'
import { STAGE_STYLES } from '@/types'
import { StageBadge } from '@/components/crm/StageBadge'
import { PulseBar } from '@/components/crm/PulseBar'
import type { DiscoveredPlace } from '@/hooks/useDiscoveredPlaces'
import { Button } from '@/components/ui/button'
import { Plus, Star, Swords, Globe, Instagram } from 'lucide-react'

interface ArchitectMapProps {
  architects: Architect[]
  competitors?: Competitor[]
  discoveredPlaces?: DiscoveredPlace[]
  center: { lat: number; lng: number }
  zoom?: number
  onAddToCRM?: (place: DiscoveredPlace) => void
}

export function ArchitectMap({
  architects,
  competitors = [],
  discoveredPlaces = [],
  center,
  zoom = 10,
  onAddToCRM,
}: ArchitectMapProps) {
  const [selectedArchitect, setSelectedArchitect] = useState<Architect | null>(null)
  const [selectedPlace, setSelectedPlace] = useState<DiscoveredPlace | null>(null)
  const [selectedCompetitor, setSelectedCompetitor] = useState<Competitor | null>(null)
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY

  const crmPlaceIds = new Set(architects.map((a) => a.google_place_id).filter(Boolean))
  // Only show discovered places that aren't already in CRM
  const undiscovered = discoveredPlaces.filter(
    (p) => !p.added_to_crm && !crmPlaceIds.has(p.google_place_id) && p.lat && p.lng
  )

  if (!apiKey) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-muted-foreground">
          Set VITE_GOOGLE_MAPS_API_KEY to enable the map
        </p>
      </div>
    )
  }

  return (
    <APIProvider apiKey={apiKey}>
      <Map
        defaultCenter={center}
        defaultZoom={zoom}
        mapId="bldg-vision-map"
        style={{ width: '100%', height: '100%' }}
        gestureHandling="greedy"
        onClick={() => {
          setSelectedArchitect(null)
          setSelectedPlace(null)
        }}
      >
        {/* Layer 1: Discovered places (gray dots) */}
        {undiscovered.map((place) => (
          <AdvancedMarker
            key={`dp-${place.id}`}
            position={{ lat: Number(place.lat), lng: Number(place.lng) }}
            onClick={() => {
              setSelectedArchitect(null)
              setSelectedPlace(place)
            }}
          >
            <div
              className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-white shadow-md"
              style={{ backgroundColor: '#6366f1' }}
            >
              <div className="h-2 w-2 rounded-full bg-[#1A1A24]" />
            </div>
          </AdvancedMarker>
        ))}

        {/* Layer 2: Competitors (red pins) */}
        {competitors.map((comp) => {
          if (!comp.lat || !comp.lng) return null
          return (
            <AdvancedMarker
              key={`comp-${comp.id}`}
              position={{ lat: Number(comp.lat), lng: Number(comp.lng) }}
              onClick={() => {
                setSelectedArchitect(null)
                setSelectedPlace(null)
                setSelectedCompetitor(comp)
              }}
            >
              <div
                className="flex h-4 w-4 items-center justify-center rounded-sm border-2"
                style={{ backgroundColor: '#FEE2E2', borderColor: '#A32D2D' }}
              >
                <Swords className="h-2 w-2" style={{ color: '#A32D2D' }} />
              </div>
            </AdvancedMarker>
          )
        })}

        {/* Layer 3: CRM architects (colored stage pins) */}
        {architects.map((architect) => {
          if (!architect.lat || !architect.lng) return null
          const style = STAGE_STYLES[architect.stage]
          return (
            <AdvancedMarker
              key={`crm-${architect.id}`}
              position={{ lat: architect.lat, lng: architect.lng }}
              onClick={() => {
                setSelectedPlace(null)
                setSelectedArchitect(architect)
              }}
            >
              <div
                className="flex h-5 w-5 items-center justify-center rounded-full border-2"
                style={{
                  backgroundColor: style.bg,
                  borderColor: style.border,
                }}
              >
                <div
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: style.text }}
                />
              </div>
            </AdvancedMarker>
          )
        })}

        {/* InfoWindow for CRM architect */}
        {selectedArchitect && selectedArchitect.lat && selectedArchitect.lng && (
          <InfoWindow
            position={{ lat: selectedArchitect.lat, lng: selectedArchitect.lng }}
            onCloseClick={() => setSelectedArchitect(null)}
          >
            <div className="flex flex-col gap-1.5 p-1" style={{ minWidth: 200 }}>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{selectedArchitect.name}</span>
                <StageBadge stage={selectedArchitect.stage} />
              </div>
              {selectedArchitect.firm && (
                <span className="text-xs text-muted-foreground">
                  {selectedArchitect.firm}
                </span>
              )}
              {selectedArchitect.location && (
                <span className="text-xs text-muted-foreground">
                  {selectedArchitect.location}
                </span>
              )}
              <PulseBar score={selectedArchitect.pulse_score} />
              {/* Social links */}
              <div className="flex items-center gap-2 pt-0.5">
                {selectedArchitect.website && (
                  <a
                    href={selectedArchitect.website.startsWith('http') ? selectedArchitect.website : `https://${selectedArchitect.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    <Globe className="h-3 w-3" />
                    Website
                  </a>
                )}
                {selectedArchitect.instagram_handle && (
                  <a
                    href={`https://instagram.com/${selectedArchitect.instagram_handle.replace('@', '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    <Instagram className="h-3 w-3" />
                    IG
                  </a>
                )}
                {selectedArchitect.linkedin_url && (
                  <a
                    href={selectedArchitect.linkedin_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline"
                  >
                    LinkedIn
                  </a>
                )}
              </div>
              {selectedArchitect.active_lead && (
                <span className="text-xs" style={{ color: '#0F6E56' }}>
                  Active lead: {selectedArchitect.active_lead}
                </span>
              )}
              <Link
                to={`/crm/${selectedArchitect.id}`}
                className="mt-0.5 text-xs text-primary hover:underline"
              >
                View profile
              </Link>
            </div>
          </InfoWindow>
        )}

        {/* InfoWindow for discovered place */}
        {selectedPlace && selectedPlace.lat && selectedPlace.lng && (
          <InfoWindow
            position={{ lat: Number(selectedPlace.lat), lng: Number(selectedPlace.lng) }}
            onCloseClick={() => setSelectedPlace(null)}
          >
            <div className="flex flex-col gap-1.5 p-1">
              <span className="text-sm font-medium">{selectedPlace.name}</span>
              {selectedPlace.address && (
                <span className="text-xs text-muted-foreground">
                  {selectedPlace.address}
                </span>
              )}
              <div className="flex items-center gap-2">
                {selectedPlace.rating && (
                  <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                    <Star className="h-3 w-3" style={{ color: '#BA7517' }} />
                    {selectedPlace.rating}
                    {selectedPlace.review_count && ` (${selectedPlace.review_count})`}
                  </span>
                )}
                {selectedPlace.website && (
                  <a
                    href={selectedPlace.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline"
                  >
                    Website
                  </a>
                )}
              </div>
              {onAddToCRM && (
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-1 gap-1 text-xs"
                  onClick={() => onAddToCRM(selectedPlace)}
                >
                  <Plus className="h-3 w-3" /> Add to CRM
                </Button>
              )}
            </div>
          </InfoWindow>
        )}
        {/* InfoWindow for competitor */}
        {selectedCompetitor && selectedCompetitor.lat && selectedCompetitor.lng && (
          <InfoWindow
            position={{ lat: Number(selectedCompetitor.lat), lng: Number(selectedCompetitor.lng) }}
            onCloseClick={() => setSelectedCompetitor(null)}
          >
            <div className="flex flex-col gap-1.5 p-1">
              <div className="flex items-center gap-2">
                <Swords className="h-3 w-3" style={{ color: '#A32D2D' }} />
                <span className="text-sm font-medium">{selectedCompetitor.name}</span>
              </div>
              {selectedCompetitor.location && (
                <span className="text-xs text-muted-foreground">{selectedCompetitor.location}</span>
              )}
              {selectedCompetitor.google_rating && (
                <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                  <Star className="h-3 w-3" style={{ color: '#BA7517' }} />
                  {selectedCompetitor.google_rating}
                  {selectedCompetitor.google_review_count && ` (${selectedCompetitor.google_review_count})`}
                </span>
              )}
              <span className="text-xs font-medium" style={{ color: '#A32D2D' }}>
                Displacement: {selectedCompetitor.displacement_score}
              </span>
              <Link
                to={`/competitors/${selectedCompetitor.id}`}
                className="mt-1 text-xs text-primary hover:underline"
              >
                View profile
              </Link>
            </div>
          </InfoWindow>
        )}
      </Map>
    </APIProvider>
  )
}
