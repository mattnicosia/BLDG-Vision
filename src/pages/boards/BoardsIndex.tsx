import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useOrg } from '@/hooks/useOrg'
import { Button } from '@/components/ui/button'
import { Link } from 'react-router-dom'
import {
  ScanLine,
  Loader2,
  FileText,
  MapPin,
  User,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  Sparkles,
} from 'lucide-react'
import { toast } from 'sonner'

const BOARD_TYPE_LABELS: Record<string, string> = {
  planning: 'Planning Board',
  zoning: 'Zoning Board',
  architectural_review: 'Architectural Review',
  historic: 'Historic Board',
  town_board: 'Town Board',
}

const BOARD_TYPE_STYLES: Record<string, { bg: string; text: string }> = {
  planning: { bg: '#E1F5EE', text: '#085041' },
  zoning: { bg: '#FAEEDA', text: '#854F0B' },
  architectural_review: { bg: '#EEEDFE', text: '#3C3489' },
  historic: { bg: '#F1EFE8', text: '#5F5E5A' },
  town_board: { bg: '#F1EFE8', text: '#5F5E5A' },
}

const DECISION_STYLES: Record<string, { icon: typeof CheckCircle; color: string }> = {
  approved: { icon: CheckCircle, color: '#0F6E56' },
  denied: { icon: XCircle, color: '#A32D2D' },
  tabled: { icon: Clock, color: '#BA7517' },
  adjourned: { icon: Clock, color: '#BA7517' },
  pending: { icon: Clock, color: '#71717a' },
  discussed: { icon: FileText, color: '#71717a' },
}

interface BoardItem {
  id: string
  town_name: string
  board_type: string
  meeting_date: string
  project_address: string
  applicant_name: string
  architect_name: string
  architect_id: string | null
  engineer_name: string
  project_type: string
  project_description: string
  decision: string
  conditions: string
  estimated_scope: string
}

export function BoardsIndex() {
  const { org } = useOrg()
  const [items, setItems] = useState<BoardItem[]>([])
  const [loading, setLoading] = useState(true)
  const [scanning, setScanning] = useState(false)
  const [parsing, setParsing] = useState(false)
  const [boardFilter, setBoardFilter] = useState<string>('all')
  const [decisionFilter, setDecisionFilter] = useState<string>('all')

  const fetchItems = useCallback(async () => {
    if (!org) return
    setLoading(true)
    const { data } = await supabase
      .from('board_items')
      .select('*')
      .eq('org_id', org.id)
      .order('meeting_date', { ascending: false })
      .limit(100)
    if (data) setItems(data)
    setLoading(false)
  }, [org])

  useEffect(() => {
    fetchItems()
  }, [fetchItems])

  async function handleScan() {
    setScanning(true)
    toast('Scanning Orangetown board meeting pages...')

    try {
      const session = await supabase.auth.getSession()
      const token = session.data.session?.access_token
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

      const res = await fetch(`${supabaseUrl}/functions/v1/board-monitor`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'apikey': anonKey,
        },
        body: JSON.stringify({ action: 'scan_all' }),
      })

      const data = await res.json()
      if (data.error) {
        toast.error(data.error)
      } else {
        const totalNew = data.sources?.reduce((s: number, r: any) => s + r.newDocs, 0) ?? 0
        toast.success(`Scan complete. ${totalNew} new documents found.`)
      }
    } catch {
      toast.error('Scan failed')
    }
    setScanning(false)
  }

  async function handleParse() {
    setParsing(true)
    toast('Analyzing documents with AI...')

    try {
      const session = await supabase.auth.getSession()
      const token = session.data.session?.access_token
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

      const res = await fetch(`${supabaseUrl}/functions/v1/board-monitor`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'apikey': anonKey,
        },
        body: JSON.stringify({ action: 'parse_unparsed' }),
      })

      const data = await res.json()
      if (data.error) {
        toast.error(data.error)
      } else {
        toast.success(`Extracted ${data.itemsExtracted} projects from ${data.documentsParsed} documents. ${data.signalsGenerated} signals created.`)
        fetchItems()
      }
    } catch {
      toast.error('Parse failed')
    }
    setParsing(false)
  }

  const filtered = items.filter((item) => {
    if (boardFilter !== 'all' && item.board_type !== boardFilter) return false
    if (decisionFilter !== 'all' && item.decision !== decisionFilter) return false
    return true
  })

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-medium">Board Intelligence</h1>
          <p className="text-sm text-muted-foreground">
            Planning, zoning, and architectural review board activity
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleScan}
            disabled={scanning}
            className="gap-2"
          >
            {scanning ? <Loader2 className="h-4 w-4 animate-spin" /> : <ScanLine className="h-4 w-4" />}
            {scanning ? 'Scanning...' : 'Scan for new documents'}
          </Button>
          <Button
            onClick={handleParse}
            disabled={parsing}
            className="gap-2"
          >
            {parsing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {parsing ? 'Analyzing...' : 'AI extract projects'}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <select
          value={boardFilter}
          onChange={(e) => setBoardFilter(e.target.value)}
          className="rounded-md border border-border bg-white px-2 py-1.5 text-sm"
        >
          <option value="all">All boards</option>
          <option value="planning">Planning Board</option>
          <option value="zoning">Zoning Board</option>
          <option value="architectural_review">Architectural Review</option>
        </select>
        <select
          value={decisionFilter}
          onChange={(e) => setDecisionFilter(e.target.value)}
          className="rounded-md border border-border bg-white px-2 py-1.5 text-sm"
        >
          <option value="all">All decisions</option>
          <option value="approved">Approved</option>
          <option value="denied">Denied</option>
          <option value="tabled">Tabled</option>
          <option value="pending">Pending</option>
        </select>
        <span className="text-xs text-muted-foreground">
          {filtered.length} item{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Items */}
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : filtered.length === 0 ? (
        <div className="flex h-48 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border">
          <FileText className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            {items.length === 0
              ? 'No board items yet. Click "Scan for new documents" then "AI extract projects".'
              : 'No items match your filters.'}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((item) => {
            const boardStyle = BOARD_TYPE_STYLES[item.board_type] ?? BOARD_TYPE_STYLES.planning
            const decisionInfo = DECISION_STYLES[item.decision] ?? DECISION_STYLES.discussed
            const DecisionIcon = decisionInfo.icon
            return (
              <div
                key={item.id}
                className="rounded-xl border border-border bg-white p-4"
                style={{ borderWidth: '0.5px' }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span
                        className="rounded-full px-2 py-0.5 text-[10px] font-medium"
                        style={{ backgroundColor: boardStyle.bg, color: boardStyle.text }}
                      >
                        {BOARD_TYPE_LABELS[item.board_type] ?? item.board_type}
                      </span>
                      <span className="text-xs text-muted-foreground">{item.town_name}</span>
                      {item.meeting_date && (
                        <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                          <Calendar className="h-2.5 w-2.5" />
                          {new Date(item.meeting_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      )}
                    </div>
                    {item.project_address && (
                      <div className="flex items-center gap-1 text-sm font-medium">
                        <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                        {item.project_address}
                      </div>
                    )}
                  </div>
                  {item.decision && (
                    <div className="flex items-center gap-1">
                      <DecisionIcon className="h-3.5 w-3.5" style={{ color: decisionInfo.color }} />
                      <span className="text-xs font-medium capitalize" style={{ color: decisionInfo.color }}>
                        {item.decision}
                      </span>
                    </div>
                  )}
                </div>

                {item.project_description && (
                  <p className="mt-1 text-sm text-muted-foreground">{item.project_description}</p>
                )}

                <div className="mt-2 flex flex-wrap gap-3 text-xs">
                  {item.architect_name && (
                    <span className="flex items-center gap-1">
                      <User className="h-3 w-3 text-muted-foreground" />
                      {item.architect_id ? (
                        <Link to={`/crm/${item.architect_id}`} className="text-primary hover:underline">
                          {item.architect_name}
                        </Link>
                      ) : (
                        <span className="text-muted-foreground">{item.architect_name}</span>
                      )}
                    </span>
                  )}
                  {item.applicant_name && (
                    <span className="text-muted-foreground">Applicant: {item.applicant_name}</span>
                  )}
                  {item.engineer_name && (
                    <span className="text-muted-foreground">Engineer: {item.engineer_name}</span>
                  )}
                  {item.estimated_scope && (
                    <span className="font-medium" style={{ color: '#0F6E56' }}>{item.estimated_scope}</span>
                  )}
                </div>

                {item.conditions && (
                  <p className="mt-1 text-[10px] text-muted-foreground">Conditions: {item.conditions}</p>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
