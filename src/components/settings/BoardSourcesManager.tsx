import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useOrg } from '@/hooks/useOrg'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Plus, Trash2, MapPin, RefreshCw, Check, X, Globe,
  FileText, Eye, EyeOff, ChevronDown, ChevronRight,
} from 'lucide-react'
import { toast } from 'sonner'

interface BoardSource {
  id: string
  town_name: string
  board_type: string
  meeting_page_url: string
  base_url: string
  county?: string
  enabled: boolean
  last_checked_at?: string
  documents_found: number
  items_extracted: number
}

const BOARD_TYPES = [
  { value: 'planning', label: 'Planning Board' },
  { value: 'zoning', label: 'Zoning Board' },
  { value: 'architectural_review', label: 'Architectural Review' },
]

const BOARD_TYPE_LABELS: Record<string, string> = {
  planning: 'Planning',
  zoning: 'Zoning',
  architectural_review: 'ARB',
}

// Known board meeting pages for Rockland County towns
const KNOWN_SOURCES = [
  { town_name: 'Clarkstown', county: 'Rockland', lat: 41.1220, lng: -73.9590, boards: [
    { board_type: 'planning', meeting_page_url: 'https://www.clarkstown.org/boards-committees/planning-board', base_url: 'https://www.clarkstown.org' },
    { board_type: 'zoning', meeting_page_url: 'https://www.clarkstown.org/boards-committees/zoning-board-of-appeals', base_url: 'https://www.clarkstown.org' },
  ]},
  { town_name: 'Ramapo', county: 'Rockland', lat: 41.1404, lng: -74.1121, boards: [
    { board_type: 'planning', meeting_page_url: 'https://ramapo.org/planning-board', base_url: 'https://ramapo.org' },
    { board_type: 'zoning', meeting_page_url: 'https://ramapo.org/zoning-board', base_url: 'https://ramapo.org' },
  ]},
  { town_name: 'Haverstraw', county: 'Rockland', lat: 41.1976, lng: -73.9640, boards: [
    { board_type: 'planning', meeting_page_url: 'https://www.townofhaverstraw.us/planning-board', base_url: 'https://www.townofhaverstraw.us' },
    { board_type: 'zoning', meeting_page_url: 'https://www.townofhaverstraw.us/zoning-board', base_url: 'https://www.townofhaverstraw.us' },
  ]},
  { town_name: 'Stony Point', county: 'Rockland', lat: 41.2293, lng: -73.9871, boards: [
    { board_type: 'planning', meeting_page_url: 'https://www.townofstonypoint.org/planning-board', base_url: 'https://www.townofstonypoint.org' },
    { board_type: 'zoning', meeting_page_url: 'https://www.townofstonypoint.org/zoning-board', base_url: 'https://www.townofstonypoint.org' },
  ]},
]

export function BoardSourcesManager() {
  const { org } = useOrg()
  const [sources, setSources] = useState<BoardSource[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [expanded, setExpanded] = useState(true)

  // Add form state
  const [newTown, setNewTown] = useState('')
  const [newBoardType, setNewBoardType] = useState('planning')
  const [newUrl, setNewUrl] = useState('')
  const [newCounty, setNewCounty] = useState('')

  const fetchSources = useCallback(async () => {
    if (!org) return
    const { data } = await supabase
      .from('board_sources')
      .select('*')
      .eq('org_id', org.id)
      .order('town_name')
    if (data) setSources(data)
    setLoading(false)
  }, [org])

  useEffect(() => { fetchSources() }, [fetchSources])

  async function addSource() {
    if (!org || !newTown || !newUrl) {
      toast.error('Town name and meeting page URL are required')
      return
    }
    const { error } = await supabase.from('board_sources').insert({
      org_id: org.id,
      town_name: newTown,
      board_type: newBoardType,
      meeting_page_url: newUrl,
      base_url: new URL(newUrl).origin,
      county: newCounty || null,
      enabled: true,
    })
    if (error) toast.error(error.message)
    else {
      toast.success(`Added ${newTown} ${BOARD_TYPE_LABELS[newBoardType]}`)
      setNewTown(''); setNewUrl(''); setNewCounty(''); setShowAdd(false)
      fetchSources()
    }
  }

  async function addKnownSource(town: typeof KNOWN_SOURCES[0], board: typeof KNOWN_SOURCES[0]['boards'][0]) {
    if (!org) return
    // Check if already exists
    const exists = sources.some(s => s.town_name === town.town_name && s.board_type === board.board_type)
    if (exists) {
      toast('Already added')
      return
    }
    const { error } = await supabase.from('board_sources').insert({
      org_id: org.id,
      town_name: town.town_name,
      board_type: board.board_type,
      meeting_page_url: board.meeting_page_url,
      base_url: board.base_url,
      county: town.county,
      lat: town.lat,
      lng: town.lng,
      enabled: true,
    })
    if (error) toast.error(error.message)
    else {
      toast.success(`Added ${town.town_name} ${BOARD_TYPE_LABELS[board.board_type]}`)
      fetchSources()
    }
  }

  async function toggleEnabled(source: BoardSource) {
    await supabase.from('board_sources').update({ enabled: !source.enabled }).eq('id', source.id)
    fetchSources()
  }

  async function deleteSource(source: BoardSource) {
    if (!confirm(`Remove ${source.town_name} ${BOARD_TYPE_LABELS[source.board_type]}?`)) return
    await supabase.from('board_sources').delete().eq('id', source.id)
    toast.success('Source removed')
    fetchSources()
  }

  // Group sources by town
  const byTown = new Map<string, BoardSource[]>()
  for (const s of sources) {
    const list = byTown.get(s.town_name) || []
    list.push(s)
    byTown.set(s.town_name, list)
  }

  // Known sources not yet added
  const existingTownBoards = new Set(sources.map(s => `${s.town_name}:${s.board_type}`))
  const availableToAdd = KNOWN_SOURCES.flatMap(town =>
    town.boards.filter(b => !existingTownBoards.has(`${town.town_name}:${b.board_type}`))
      .map(b => ({ town, board: b }))
  )

  if (loading) return null

  return (
    <div className="rounded-xl p-5" style={{ backgroundColor: '#1C1C1C', border: '1px solid #2A2A2A' }}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between"
      >
        <div className="flex items-center gap-2">
          {expanded ? <ChevronDown className="h-4 w-4" style={{ color: '#7C7C7C' }} /> : <ChevronRight className="h-4 w-4" style={{ color: '#7C7C7C' }} />}
          <h2 className="text-base font-medium" style={{ color: '#E8E8F0' }}>Board Meeting Sources</h2>
          <span className="text-[11px]" style={{ color: '#7C7C7C' }}>{sources.length} active</span>
        </div>
      </button>

      {expanded && (
        <div className="mt-4 flex flex-col gap-3">
          <p className="text-[12px]" style={{ color: '#7C7C7C' }}>
            Add town planning, zoning, and architectural review boards to monitor. The scanner will check these pages for new meeting documents.
          </p>

          {/* Current sources grouped by town */}
          {Array.from(byTown.entries()).map(([town, townSources]) => (
            <div key={town} className="rounded-lg p-3" style={{ backgroundColor: '#141414' }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MapPin className="h-3.5 w-3.5" style={{ color: '#6366F1' }} />
                  <span className="text-[13px] font-medium" style={{ color: '#E8E8F0' }}>{town}</span>
                  {townSources[0]?.county && (
                    <span className="text-[10px]" style={{ color: '#7C7C7C' }}>{townSources[0].county} County</span>
                  )}
                </div>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {townSources.map(src => (
                  <div key={src.id} className="flex items-center gap-1.5 rounded-md px-2 py-1" style={{ backgroundColor: '#1C1C1C', border: '1px solid #2A2A2A' }}>
                    <button onClick={() => toggleEnabled(src)}>
                      {src.enabled ? <Eye className="h-3 w-3" style={{ color: '#06B6D4' }} /> : <EyeOff className="h-3 w-3" style={{ color: '#4A4A4A' }} />}
                    </button>
                    <span className="text-[11px] font-medium" style={{ color: src.enabled ? '#E8E8F0' : '#4A4A4A' }}>
                      {BOARD_TYPE_LABELS[src.board_type] || src.board_type}
                    </span>
                    {src.last_checked_at && (
                      <span className="text-[9px]" style={{ color: '#4A4A4A' }}>
                        checked {new Date(src.last_checked_at).toLocaleDateString()}
                      </span>
                    )}
                    <button onClick={() => deleteSource(src)} className="ml-1" style={{ color: '#4A4A4A' }}>
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Quick-add known sources */}
          {availableToAdd.length > 0 && (
            <div>
              <p className="mb-2 text-[11px] font-medium uppercase" style={{ color: '#7C7C7C', letterSpacing: '0.5px' }}>
                Nearby towns to add
              </p>
              <div className="flex flex-wrap gap-2">
                {availableToAdd.map(({ town, board }) => (
                  <button
                    key={`${town.town_name}:${board.board_type}`}
                    onClick={() => addKnownSource(town, board)}
                    className="nav-item flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-medium"
                    style={{ backgroundColor: '#141414', border: '1px solid #2A2A2A', color: '#7C7C7C' }}
                  >
                    <Plus className="h-3 w-3" style={{ color: '#6366F1' }} />
                    {town.town_name} {BOARD_TYPE_LABELS[board.board_type]}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Custom source form */}
          {showAdd ? (
            <div className="rounded-lg p-3" style={{ backgroundColor: '#141414', border: '1px solid #2A2A2A' }}>
              <p className="mb-2 text-[12px] font-medium" style={{ color: '#E8E8F0' }}>Add custom source</p>
              <div className="flex flex-col gap-2">
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px]" style={{ color: '#7C7C7C' }}>Town name</label>
                    <Input value={newTown} onChange={e => setNewTown(e.target.value)} placeholder="e.g. Clarkstown" />
                  </div>
                  <div>
                    <label className="text-[10px]" style={{ color: '#7C7C7C' }}>Board type</label>
                    <select value={newBoardType} onChange={e => setNewBoardType(e.target.value)} className="w-full rounded-md border px-2 py-2 text-sm" style={{ backgroundColor: '#141414', borderColor: '#2A2A2A', color: '#E8E8F0' }}>
                      {BOARD_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px]" style={{ color: '#7C7C7C' }}>County</label>
                    <Input value={newCounty} onChange={e => setNewCounty(e.target.value)} placeholder="e.g. Rockland" />
                  </div>
                </div>
                <div>
                  <label className="text-[10px]" style={{ color: '#7C7C7C' }}>Meeting page URL</label>
                  <Input value={newUrl} onChange={e => setNewUrl(e.target.value)} placeholder="https://www.townname.org/meetings/planning-board" />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setShowAdd(false)}>Cancel</Button>
                  <Button size="sm" onClick={addSource} className="gap-1"><Check className="h-3 w-3" /> Add source</Button>
                </div>
              </div>
            </div>
          ) : (
            <Button variant="outline" size="sm" onClick={() => setShowAdd(true)} className="gap-1.5 self-start" style={{ backgroundColor: '#141414', borderColor: '#2A2A2A', color: '#E8E8F0' }}>
              <Globe className="h-3.5 w-3.5" /> Add custom source
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
