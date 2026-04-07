import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { SignalsIndex } from '@/pages/signals/SignalsIndex'
import { PermitsIndex } from '@/pages/permits/PermitsIndex'
import { BoardsIndex } from '@/pages/boards/BoardsIndex'
import { CompetitorsIndex } from '@/pages/competitors/CompetitorsIndex'
import { RadarIndex } from '@/pages/radar/RadarIndex'
import { Button } from '@/components/ui/button'
import { RefreshCw } from 'lucide-react'
import { toast } from 'sonner'

export function IntelligenceIndex() {
  const [tab, setTab] = useState<'signals' | 'permits' | 'boards' | 'competitors' | 'radar'>('permits')
  const [scanning, setScanning] = useState(false)

  async function handleRescanAll() {
    setScanning(true)
    toast('Scanning all sources for new opportunities...')

    try {
      const session = await supabase.auth.getSession()
      const token = session.data.session?.access_token
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'apikey': anonKey,
      }

      // Run all scans in parallel
      const results = await Promise.allSettled([
        // Board scan
        fetch(`${supabaseUrl}/functions/v1/board-monitor`, {
          method: 'POST', headers,
          body: JSON.stringify({ action: 'scan_all' }),
        }).then(r => r.json()),
        // Permit fetch (1 page to keep it fast)
        fetch(`${supabaseUrl}/functions/v1/energov-sync`, {
          method: 'POST', headers,
          body: JSON.stringify({ action: 'fetch', keyword: 'building permit', maxPages: 1 }),
        }).then(r => r.json()),
      ])

      const parts: string[] = []
      if (results[0].status === 'fulfilled' && results[0].value.sources) {
        const boardDocs = results[0].value.sources.reduce((s: number, r: any) => s + (r.newDocs || 0), 0)
        if (boardDocs > 0) parts.push(`${boardDocs} new board documents`)
      }
      if (results[1].status === 'fulfilled' && results[1].value.total) {
        parts.push(`${results[1].value.total} permits available`)
      }

      if (parts.length > 0) {
        toast.success(`Scan complete: ${parts.join(', ')}`)
      } else {
        toast.success('Scan complete. No new data found.')
      }
    } catch {
      toast.error('Scan failed')
    }
    setScanning(false)
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-4 border-b border-border">
          {([
            { key: 'permits', label: 'Permits' },
            { key: 'boards', label: 'Boards' },
            { key: 'competitors', label: 'Competitors' },
            { key: 'radar', label: 'Radar' },
            { key: 'signals', label: 'Signals' },
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
        <Button
          variant="outline"
          size="sm"
          onClick={handleRescanAll}
          disabled={scanning}
          className="gap-2"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${scanning ? 'animate-spin' : ''}`} />
          {scanning ? 'Scanning...' : 'Rescan all sources'}
        </Button>
      </div>

      {tab === 'permits' && <PermitsIndex />}
      {tab === 'boards' && <BoardsIndex />}
      {tab === 'competitors' && <CompetitorsIndex />}
      {tab === 'radar' && <RadarIndex />}
      {tab === 'signals' && <SignalsIndex />}
    </div>
  )
}
