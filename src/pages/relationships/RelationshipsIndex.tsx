import { useState } from 'react'
import { CRMIndex } from '@/pages/crm/CRMIndex'
import { RadarIndex } from '@/pages/radar/RadarIndex'

export function RelationshipsIndex() {
  const [tab, setTab] = useState<'contacts' | 'discover'>('contacts')

  return (
    <div>
      <div className="mb-4 flex items-center gap-4 border-b border-border">
        {([
          { key: 'contacts', label: 'Contacts' },
          { key: 'discover', label: 'Discover' },
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

      {tab === 'contacts' && <CRMIndex />}
      {tab === 'discover' && <RadarIndex />}
    </div>
  )
}
