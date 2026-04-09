import { CRMIndex } from '@/pages/crm/CRMIndex'
import { RadarIndex } from '@/pages/radar/RadarIndex'
import { usePersistedState } from '@/hooks/usePersistedState'

export function RelationshipsIndex() {
  const [tab, setTab] = usePersistedState<'contacts' | 'discover'>('relationships-tab', 'contacts')

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
              color: tab === t.key ? '#06B6D4' : '#7C7C7C',
              borderBottom: tab === t.key ? '2px solid #06B6D4' : '2px solid transparent',
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
