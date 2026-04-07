import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { usePermits } from '@/hooks/usePermits'
import { PermitPreviewCard } from '@/components/permits/PermitPreviewCard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Database,
  Loader2,
  Search,
  FileText,
  Download,
  CheckSquare,
  Square,
  MapPin,
  Calendar,
  DollarSign,
  ExternalLink,
} from 'lucide-react'
import { toast } from 'sonner'
import type { EnerGovPermitPreview } from '@/types'
import { categorizePermit, CONSTRUCTION_TYPE_STYLES, RELEVANCE_STYLES, type ConstructionType, type PermitRelevance } from '@/lib/permitCategories'

export function PermitsIndex() {
  const { permits: importedPermits, loading: loadingImported, refetch } = usePermits()
  const [tab, setTab] = useState<'fetch' | 'imported'>('fetch')
  const [keyword, setKeyword] = useState('building permit')
  const [maxPages, setMaxPages] = useState('3')
  const [fetching, setFetching] = useState(false)
  const [importing, setImporting] = useState(false)
  const [previews, setPreviews] = useState<EnerGovPermitPreview[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [fetched, setFetched] = useState(false)
  const [typeFilter, setTypeFilter] = useState<ConstructionType | 'all'>('all')
  const [relevanceFilter, setRelevanceFilter] = useState<PermitRelevance | 'all'>('all')

  const filteredPreviews = previews.filter((p) => {
    const { constructionType, relevance } = categorizePermit(p.permitType, p.description)
    if (typeFilter !== 'all' && constructionType !== typeFilter) return false
    if (relevanceFilter !== 'all' && relevance !== relevanceFilter) return false
    return true
  })

  async function handleFetch() {
    setFetching(true)
    setFetched(false)
    setPreviews([])
    setSelected(new Set())

    try {
      const session = await supabase.auth.getSession()
      const token = session.data.session?.access_token
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

      const res = await fetch(`${supabaseUrl}/functions/v1/energov-sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'apikey': anonKey,
        },
        body: JSON.stringify({
          action: 'fetch',
          keyword,
          maxPages: parseInt(maxPages) || 3,
        }),
      })

      const data = await res.json()
      if (data.error) {
        toast.error(data.error)
      } else {
        setPreviews(data.previews || [])
        setFetched(true)
        toast.success(`Fetched ${data.previews?.length || 0} permits for review`)
      }
    } catch (err) {
      toast.error('Fetch failed')
    }
    setFetching(false)
  }

  function toggleSelect(caseId: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(caseId)) next.delete(caseId)
      else next.add(caseId)
      return next
    })
  }

  function selectAll() {
    setSelected(new Set(filteredPreviews.map((p) => p.caseId)))
  }

  function selectNone() {
    setSelected(new Set())
  }

  async function handleImport() {
    if (selected.size === 0) {
      toast.error('Select permits to import')
      return
    }
    setImporting(true)

    const selectedPermits = previews.filter((p) => selected.has(p.caseId))

    // Extract unique contractors and architects from selected permits
    const contractorsToTrack: Array<{ name: string; address: string; phone: string; email: string }> = []
    const architectsToAdd: Array<{ name: string; location: string; email: string; phone: string }> = []
    const seenContractors = new Set<string>()
    const seenArchitects = new Set<string>()

    for (const permit of selectedPermits) {
      for (const contact of permit.contacts) {
        const name = contact.company || `${contact.firstName} ${contact.lastName}`.trim()
        if (!name) continue

        if (contact.type === 'Contractor' && !seenContractors.has(name.toLowerCase())) {
          seenContractors.add(name.toLowerCase())
          contractorsToTrack.push({
            name,
            address: contact.address,
            phone: contact.phone,
            email: contact.email,
          })
        }

        if (contact.type?.includes('Architect') && !seenArchitects.has(name.toLowerCase())) {
          seenArchitects.add(name.toLowerCase())
          architectsToAdd.push({
            name,
            location: contact.address,
            email: contact.email,
            phone: contact.phone,
          })
        }
      }
    }

    // Enrich permits with contractor/architect names for storage
    const permitsToImport = selectedPermits.map((p) => {
      const contractor = p.contacts.find((c) => c.type === 'Contractor')
      const architect = p.contacts.find((c) => c.type?.includes('Architect'))
      return {
        ...p,
        contractorName: contractor?.company || (contractor ? `${contractor.firstName} ${contractor.lastName}`.trim() : null),
        architectName: architect?.company || (architect ? `${architect.firstName} ${architect.lastName}`.trim() : null),
      }
    })

    try {
      const session = await supabase.auth.getSession()
      const token = session.data.session?.access_token
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

      const res = await fetch(`${supabaseUrl}/functions/v1/energov-sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'apikey': anonKey,
        },
        body: JSON.stringify({
          action: 'import',
          permits: permitsToImport,
          contractorsToTrack,
          architectsToAdd,
        }),
      })

      const data = await res.json()
      if (data.error) {
        toast.error(data.error)
      } else {
        const parts = []
        if (data.permitsImported) parts.push(`${data.permitsImported} permits`)
        if (data.competitorsCreated) parts.push(`${data.competitorsCreated} contractors`)
        if (data.architectsCreated) parts.push(`${data.architectsCreated} architects`)
        toast.success(`Imported: ${parts.join(', ')}`)

        // Remove imported from previews
        setPreviews((prev) => prev.filter((p) => !selected.has(p.caseId)))
        setSelected(new Set())
        refetch()
      }
    } catch (err) {
      toast.error('Import failed')
    }
    setImporting(false)
  }

  const selectedCount = selected.size
  const contractorCount = new Set(
    previews
      .filter((p) => selected.has(p.caseId))
      .flatMap((p) => p.contacts.filter((c) => c.type === 'Contractor').map((c) => c.company || `${c.firstName} ${c.lastName}`))
      .filter(Boolean)
  ).size

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6">
        <h1 className="text-xl font-medium">Permits</h1>
        <p className="text-sm text-muted-foreground">
          Pull permits from county databases. Review before importing.
        </p>
      </div>

      {/* Tabs */}
      <div className="mb-4 flex items-center gap-4 border-b border-border">
        <button
          onClick={() => setTab('fetch')}
          className="pb-2 text-sm font-medium"
          style={{
            color: tab === 'fetch' ? '#0F6E56' : '#71717a',
            borderBottom: tab === 'fetch' ? '2px solid #0F6E56' : '2px solid transparent',
          }}
        >
          Fetch and review
        </button>
        <button
          onClick={() => setTab('imported')}
          className="pb-2 text-sm font-medium"
          style={{
            color: tab === 'imported' ? '#0F6E56' : '#71717a',
            borderBottom: tab === 'imported' ? '2px solid #0F6E56' : '2px solid transparent',
          }}
        >
          Imported ({importedPermits.length})
        </button>
      </div>

      {/* Fetch tab */}
      {tab === 'fetch' && (
        <div className="flex flex-col gap-4">
          {/* Search controls */}
          <div className="flex items-end gap-3 rounded-xl border border-border bg-white p-4" style={{ borderWidth: '0.5px' }}>
            <div className="flex flex-1 flex-col gap-1.5">
              <label className="text-xs text-muted-foreground">Search keyword</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder="building permit"
                  className="pl-9"
                  onKeyDown={(e) => e.key === 'Enter' && handleFetch()}
                />
              </div>
            </div>
            <div className="flex w-24 flex-col gap-1.5">
              <label className="text-xs text-muted-foreground">Pages</label>
              <Input
                type="number"
                min={1}
                max={10}
                value={maxPages}
                onChange={(e) => setMaxPages(e.target.value)}
              />
            </div>
            <Button onClick={handleFetch} disabled={fetching} className="gap-2">
              {fetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4" />}
              {fetching ? 'Fetching...' : 'Fetch from Rockland County'}
            </Button>
          </div>

          {/* Results */}
          {/* Filters */}
          {fetched && previews.length > 0 && (
            <div className="flex flex-wrap items-center gap-3">
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as ConstructionType | 'all')}
                className="rounded-md border border-border bg-white px-2 py-1.5 text-sm"
              >
                <option value="all">All types</option>
                <option value="New Construction">New Construction</option>
                <option value="Renovation">Renovation</option>
                <option value="Addition">Addition</option>
                <option value="Demolition">Demolition</option>
                <option value="Mechanical/Electrical/Plumbing">MEP</option>
                <option value="Site Work">Site Work</option>
                <option value="Other">Other</option>
              </select>
              <select
                value={relevanceFilter}
                onChange={(e) => setRelevanceFilter(e.target.value as PermitRelevance | 'all')}
                className="rounded-md border border-border bg-white px-2 py-1.5 text-sm"
              >
                <option value="all">All relevance</option>
                <option value="high">High relevance</option>
                <option value="medium">Medium relevance</option>
                <option value="low">Low relevance</option>
              </select>
              <span className="text-xs text-muted-foreground">
                Showing {filteredPreviews.length} of {previews.length}
              </span>
            </div>
          )}

          {fetched && previews.length > 0 && (
            <>
              {/* Action bar */}
              <div className="flex items-center justify-between rounded-lg bg-muted/50 px-4 py-2">
                <div className="flex items-center gap-3">
                  <button onClick={selectedCount === filteredPreviews.length ? selectNone : selectAll} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
                    {selectedCount === filteredPreviews.length ? <CheckSquare className="h-3.5 w-3.5" /> : <Square className="h-3.5 w-3.5" />}
                    {selectedCount === filteredPreviews.length ? 'Deselect all' : 'Select all'}
                  </button>
                  <span className="text-xs text-muted-foreground">
                    {selectedCount} of {filteredPreviews.length} selected
                    {contractorCount > 0 && ` (${contractorCount} contractor${contractorCount !== 1 ? 's' : ''})`}
                  </span>
                </div>
                <Button
                  onClick={handleImport}
                  disabled={selectedCount === 0 || importing}
                  size="sm"
                  className="gap-1.5"
                >
                  {importing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                  {importing ? 'Importing...' : `Import ${selectedCount} permit${selectedCount !== 1 ? 's' : ''}`}
                </Button>
              </div>

              {/* Permit cards */}
              <div className="flex flex-col gap-2">
                {filteredPreviews.map((permit) => (
                  <PermitPreviewCard
                    key={permit.caseId}
                    permit={permit}
                    selected={selected.has(permit.caseId)}
                    onToggle={() => toggleSelect(permit.caseId)}
                  />
                ))}
              </div>
            </>
          )}

          {fetched && previews.length === 0 && !fetching && (
            <div className="flex h-40 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border">
              <FileText className="h-6 w-6 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No permits found. Try a different keyword.</p>
            </div>
          )}

          {!fetched && !fetching && (
            <div className="flex h-40 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border">
              <Database className="h-6 w-6 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Click "Fetch from Rockland County" to pull permits for review
              </p>
            </div>
          )}
        </div>
      )}

      {/* Imported tab */}
      {tab === 'imported' && (
        <div className="flex flex-col gap-2">
          {loadingImported ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : importedPermits.length === 0 ? (
            <div className="flex h-40 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border">
              <FileText className="h-6 w-6 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No permits imported yet</p>
            </div>
          ) : (
            importedPermits.map((permit) => {
              const cat = categorizePermit(permit.permit_type ?? '', permit.scope_description ?? '')
              const ctStyle = CONSTRUCTION_TYPE_STYLES[cat.constructionType]
              const relStyle = RELEVANCE_STYLES[cat.relevance]
              return (
                <div
                  key={permit.id}
                  className="rounded-xl border border-border bg-white p-4"
                  style={{ borderWidth: '0.5px' }}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-sm font-medium">{permit.permit_number}</span>
                        <span
                          className="rounded-full px-2 py-0.5 text-[10px] font-medium"
                          style={{ backgroundColor: ctStyle.bg, color: ctStyle.text }}
                        >
                          {cat.constructionType}
                        </span>
                        <span
                          className="rounded-full px-2 py-0.5 text-[10px] font-medium capitalize"
                          style={{ backgroundColor: relStyle.bg, color: relStyle.text }}
                        >
                          {cat.relevance}
                        </span>
                        {permit.status && (
                          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                            {permit.status}
                          </span>
                        )}
                      </div>
                      {permit.permit_type && (
                        <p className="text-xs text-muted-foreground">{permit.permit_type}</p>
                      )}
                    </div>
                    {permit.source_url && (
                      <a href={permit.source_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-primary hover:underline">
                        <ExternalLink className="h-3 w-3" /> Source
                      </a>
                    )}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                    {permit.project_address && (
                      <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {permit.project_address}</span>
                    )}
                    {permit.filed_date && (
                      <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {new Date(permit.filed_date).toLocaleDateString()}</span>
                    )}
                    {permit.estimated_value ? (
                      <span className="flex items-center gap-1"><DollarSign className="h-3 w-3" /> ${permit.estimated_value.toLocaleString()}</span>
                    ) : null}
                    {permit.contractor_name && (
                      <span className="flex items-center gap-1 font-medium" style={{ color: '#A32D2D' }}>Contractor: {permit.contractor_name}</span>
                    )}
                  </div>
                  {permit.scope_description && (
                    <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{permit.scope_description}</p>
                  )}
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
