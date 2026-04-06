import { useState } from 'react'
import { APIProvider, Map, AdvancedMarker, InfoWindow } from '@vis.gl/react-google-maps'
import { Link } from 'react-router-dom'
import type { Architect } from '@/types'
import { STAGE_STYLES } from '@/types'
import { StageBadge } from '@/components/crm/StageBadge'
import { PulseBar } from '@/components/crm/PulseBar'

interface ArchitectMapProps {
  architects: Architect[]
  center: { lat: number; lng: number }
  zoom?: number
}

export function ArchitectMap({ architects, center, zoom = 10 }: ArchitectMapProps) {
  const [selected, setSelected] = useState<Architect | null>(null)
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY

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
      >
        {architects.map((architect) => {
          if (!architect.lat || !architect.lng) return null
          const style = STAGE_STYLES[architect.stage]
          return (
            <AdvancedMarker
              key={architect.id}
              position={{ lat: architect.lat, lng: architect.lng }}
              onClick={() => setSelected(architect)}
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

        {selected && selected.lat && selected.lng && (
          <InfoWindow
            position={{ lat: selected.lat, lng: selected.lng }}
            onCloseClick={() => setSelected(null)}
          >
            <div className="flex flex-col gap-1 p-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{selected.name}</span>
                <StageBadge stage={selected.stage} />
              </div>
              {selected.firm && (
                <span className="text-xs text-muted-foreground">
                  {selected.firm}
                </span>
              )}
              <PulseBar score={selected.pulse_score} />
              {selected.active_lead && (
                <span className="text-xs" style={{ color: '#0F6E56' }}>
                  Active lead: {selected.active_lead}
                </span>
              )}
              <Link
                to={`/crm/${selected.id}`}
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
