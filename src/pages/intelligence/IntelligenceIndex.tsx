import { useState } from 'react'
import { SignalsIndex } from '@/pages/signals/SignalsIndex'
import { PermitsIndex } from '@/pages/permits/PermitsIndex'
import { BoardsIndex } from '@/pages/boards/BoardsIndex'
import { CompetitorsIndex } from '@/pages/competitors/CompetitorsIndex'
import { RadarIndex } from '@/pages/radar/RadarIndex'

export function IntelligenceIndex() {
  const [tab, setTab] = useState<'signals' | 'permits' | 'boards' | 'competitors' | 'radar'>('signals')

  return (
    <div>
      <div className="mb-4 flex items-center gap-4 border-b border-border">
        {([
          { key: 'signals', label: 'Signals' },
          { key: 'permits', label: 'Permits' },
          { key: 'boards', label: 'Boards' },
          { key: 'competitors', label: 'Competitors' },
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

      {tab === 'signals' && <SignalsIndex />}
      {tab === 'permits' && <PermitsIndex />}
      {tab === 'boards' && <BoardsIndex />}
      {tab === 'competitors' && <CompetitorsIndex />}
      {tab === 'radar' && <RadarIndex />}
    </div>
  )
}
