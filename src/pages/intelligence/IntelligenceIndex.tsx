import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { PermitsIndex } from '@/pages/permits/PermitsIndex'
import { BoardsIndex } from '@/pages/boards/BoardsIndex'
import { SignalsIndex } from '@/pages/signals/SignalsIndex'
import { ProjectLifecycle } from '@/components/opportunities/ProjectLifecycle'
import { Button } from '@/components/ui/button'
import { RefreshCw, ChevronDown, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'

export function IntelligenceIndex() {
  const [scanning, setScanning] = useState(false)
  const [view, setView] = useState<'all' | 'permits' | 'boards' | 'signals'>('all')
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['permits', 'boards', 'signals'])
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

      const parts: string[] = []

      // Step 1: Scan boards for new documents
      toast('Scanning board meetings...')
      const boardScan = await fetch(`${supabaseUrl}/functions/v1/board-monitor`, {
        method: 'POST', headers,
        body: JSON.stringify({ action: 'scan_all' }),
      }).then(r => r.json()).catch(() => null)

      if (boardScan?.sources) {
        const newDocs = boardScan.sources.reduce((s: number, r: any) => s + (r.newDocs || 0), 0)
        if (newDocs > 0) parts.push(`${newDocs} new board documents`)
      }

      // Step 2: Parse any unparsed board documents with AI
      toast('Analyzing board documents with AI...')
      const boardParse = await fetch(`${supabaseUrl}/functions/v1/board-monitor`, {
        method: 'POST', headers,
        body: JSON.stringify({ action: 'parse_unparsed' }),
      }).then(r => r.json()).catch(() => null)

      if (boardParse?.itemsExtracted > 0) {
        parts.push(`${boardParse.itemsExtracted} projects extracted`)
      }
      if (boardParse?.signalsGenerated > 0) {
        parts.push(`${boardParse.signalsGenerated} signals created`)
      }

      // Step 3: Fetch land transactions
      toast('Scanning land transactions...')
      const landResult = await fetch(`${supabaseUrl}/functions/v1/land-transactions`, {
        method: 'POST', headers,
        body: JSON.stringify({ action: 'fetch', county: 'Rockland', minPrice: 300000, monthsBack: 6 }),
      }).then(r => r.json()).catch(() => null)

      if (landResult?.inserted > 0) {
        parts.push(`${landResult.inserted} land transactions`)
      }
      if (landResult?.signalsCreated > 0) {
        parts.push(`${landResult.signalsCreated} land signals`)
      }

      // Step 4: Fetch and auto-import permits
      toast('Fetching permits...')
      const permitSync = await fetch(`${supabaseUrl}/functions/v1/energov-sync`, {
        method: 'POST', headers,
        body: JSON.stringify({ action: 'sync', keyword: 'building permit', maxPages: 2 }),
      }).then(r => r.json()).catch(() => null)

      if (permitSync?.permitsImported > 0) {
        parts.push(`${permitSync.permitsImported} permits imported`)
      }
      if (permitSync?.newCompetitorsCreated > 0) {
        parts.push(`${permitSync.newCompetitorsCreated} new contractors found`)
      }

      // Step 5: AI value estimation
      toast('Estimating project values...')
      const valueResult = await fetch(`${supabaseUrl}/functions/v1/estimate-values`, {
        method: 'POST', headers,
        body: JSON.stringify({}),
      }).then(r => r.json()).catch(() => null)

      if (valueResult?.estimated > 0) {
        parts.push(`${valueResult.estimated} values estimated`)
      }

      // Step 6: Enrich people/contacts at architect firms
      toast('Finding decision makers at firms...')
      const peopleResult = await fetch(`${supabaseUrl}/functions/v1/enrich-people`, {
        method: 'POST', headers,
        body: JSON.stringify({}),
      }).then(r => r.json()).catch(() => null)

      if (peopleResult?.enriched > 0) {
        const totalContacts = peopleResult.results?.reduce((s: number, r: any) => s + (r.contacts?.length || 0), 0) || 0
        parts.push(`${totalContacts} contacts found at ${peopleResult.enriched} firms`)
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
          {scanning ? 'Scanning...' : 'Scan all sources'}
        </Button>
      </div>

      {/* Project lifecycle Kanban */}
      <ProjectLifecycle />

      {/* View filter */}
      <div className="mb-4 flex items-center gap-2">
        {[
          { key: 'all', label: 'All sources' },
          { key: 'permits', label: 'Permits' },
          { key: 'boards', label: 'Boards' },
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
          {view === 'signals' && <SignalsIndex />}
        </div>
      )}
    </div>
  )
}
