import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { PermitsIndex } from '@/pages/permits/PermitsIndex'
import { BoardsIndex } from '@/pages/boards/BoardsIndex'
import { RadarIndex } from '@/pages/radar/RadarIndex'
import { SignalsIndex } from '@/pages/signals/SignalsIndex'
import { Button } from '@/components/ui/button'
import { RefreshCw, ChevronDown, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'

export function IntelligenceIndex() {
  const [scanning, setScanning] = useState(false)
  const [view, setView] = useState<'all' | 'permits' | 'boards' | 'radar' | 'signals'>('all')
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['permits', 'boards', 'radar', 'signals'])
  )

  function toggleSection(section: string) {
    setExpandedSections((prev) => {
      const next = new Set(prev)
      if (next.has(section)) next.delete(section)
      else next.add(section)
      return next
    })
  }

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

      const results = await Promise.allSettled([
        fetch(`${supabaseUrl}/functions/v1/board-monitor`, {
          method: 'POST', headers,
          body: JSON.stringify({ action: 'scan_all' }),
        }).then(r => r.json()),
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

      toast.success(parts.length > 0 ? `Scan complete: ${parts.join(', ')}` : 'Scan complete. No new data found.')
    } catch {
      toast.error('Scan failed')
    }
    setScanning(false)
  }

  const sections = [
    { key: 'permits', label: 'Permits' },
    { key: 'boards', label: 'Board Meetings' },
    { key: 'radar', label: 'Radar Discovery' },
    { key: 'signals', label: 'Signals' },
  ]

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-medium">Opportunities</h1>
          <p className="text-sm text-muted-foreground">
            Permits, board meetings, and discovery sources for new work
          </p>
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

      {/* View filter */}
      <div className="mb-4 flex items-center gap-2">
        {[
          { key: 'all', label: 'All sources' },
          { key: 'permits', label: 'Permits' },
          { key: 'boards', label: 'Boards' },
          { key: 'radar', label: 'Radar' },
          { key: 'signals', label: 'Signals' },
        ].map((v) => (
          <button
            key={v.key}
            onClick={() => setView(v.key as typeof view)}
            className="rounded-full px-3 py-1 text-xs font-medium transition-colors"
            style={{
              backgroundColor: view === v.key ? '#0F6E56' : 'transparent',
              color: view === v.key ? '#fff' : '#71717a',
              border: `1px solid ${view === v.key ? '#0F6E56' : '#e4e4e7'}`,
            }}
          >
            {v.label}
          </button>
        ))}
      </div>

      {/* Unified view with collapsible sections */}
      {view === 'all' ? (
        <div className="flex flex-col gap-6">
          {sections.map((section) => (
            <div key={section.key}>
              <button
                onClick={() => toggleSection(section.key)}
                className="mb-2 flex items-center gap-2 text-sm font-medium text-foreground hover:text-primary"
              >
                {expandedSections.has(section.key) ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
                {section.label}
              </button>
              {expandedSections.has(section.key) && (
                <div>
                  {section.key === 'permits' && <PermitsIndex />}
                  {section.key === 'boards' && <BoardsIndex />}
                  {section.key === 'radar' && <RadarIndex />}
                  {section.key === 'signals' && <SignalsIndex />}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div>
          {view === 'permits' && <PermitsIndex />}
          {view === 'boards' && <BoardsIndex />}
          {view === 'radar' && <RadarIndex />}
          {view === 'signals' && <SignalsIndex />}
        </div>
      )}
    </div>
  )
}
