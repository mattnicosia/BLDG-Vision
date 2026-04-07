import { useState } from 'react'
import { MapIndex } from '@/pages/map/MapIndex'
import { RadarIndex } from '@/pages/radar/RadarIndex'

export function TerritoryIndex() {
  const [tab, setTab] = useState<'map' | 'radar'>('map')

  return (
    <div>
      <div className="mb-4 flex items-center gap-4 border-b border-border">
        {([
          { key: 'map', label: 'Map' },
          { key: 'radar', label: 'Radar' },
        ] as const).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className="pb-2 text-sm font-medium transition-colors"
            style={{
              color: tab === t.key ? '#0F6E56' : '#71717a',
              borderBottom: tab === t.key ? '2px solid #0F6E56' : '2px solid transparent',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'map' && <MapIndex />}
      {tab === 'radar' && <RadarIndex />}
    </div>
  )
}
